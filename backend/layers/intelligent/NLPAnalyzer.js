/**
 * NLP Analyzer
 * 
 * Natural Language Processing for contract and document analysis:
 * - Contract clause extraction
 * - Risk clause identification
 * - Sentiment analysis
 * - Entity extraction
 * - Compliance gap detection
 */

const axios = require('axios');
const Contract = require('../../models/Contract');
const Compliance = require('../../models/Compliance');

class NLPAnalyzer {
  constructor() {
    this.mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:5001';
    
    // Risk keywords and patterns
    this.riskPatterns = {
      liability: [
        'unlimited liability', 'full liability', 'solely responsible',
        'indemnify', 'hold harmless', 'defend and indemnify'
      ],
      termination: [
        'immediate termination', 'without cause', 'at any time',
        'unilateral termination', 'convenience termination'
      ],
      payment: [
        'late payment', 'penalty', 'interest charges', 'acceleration',
        'withhold payment', 'set-off'
      ],
      intellectual_property: [
        'work for hire', 'all rights', 'exclusive license',
        'perpetual license', 'irrevocable'
      ],
      confidentiality: [
        'perpetual confidentiality', 'unlimited duration',
        'broad definition', 'including derivatives'
      ],
      compliance: [
        'regulatory changes', 'law changes', 'compliance costs',
        'audit rights', 'inspection rights'
      ]
    };

    // Compliance keywords
    this.complianceKeywords = {
      gdpr: ['personal data', 'data protection', 'gdpr', 'data subject', 'consent'],
      hipaa: ['phi', 'protected health', 'hipaa', 'healthcare', 'medical records'],
      pci: ['payment card', 'pci', 'cardholder', 'credit card data'],
      sox: ['sarbanes', 'sox', 'financial controls', 'audit trail'],
      iso: ['iso 27001', 'information security', 'isms']
    };
  }

  /**
   * Analyze contract with full NLP processing
   */
  async analyzeContract(contractId) {
    try {
      const contract = await Contract.findById(contractId);
      if (!contract) {
        throw new Error('Contract not found');
      }

      // Get contract text (from OCR or document)
      const contractText = await this.getContractText(contract);

      // Run NLP analysis
      const analysis = {
        processed: true,
        processedAt: new Date(),
        extractedClauses: this.extractClauses(contractText),
        keyEntities: this.extractEntities(contractText),
        riskClauses: this.identifyRiskClauses(contractText),
        summary: this.generateSummary(contractText),
        sentiment: this.analyzeSentiment(contractText),
        complianceGaps: this.detectComplianceGaps(contractText)
      };

      // Update contract with analysis
      await Contract.findByIdAndUpdate(contractId, {
        nlpAnalysis: analysis,
        riskLevel: this.calculateRiskLevel(analysis.riskClauses)
      });

      return analysis;
    } catch (error) {
      console.error('NLP analysis error:', error);
      throw error;
    }
  }

  /**
   * Get contract text for analysis
   */
  async getContractText(contract) {
    // If OCR was processed, use that text
    if (contract.nlpAnalysis?.summary) {
      return contract.nlpAnalysis.summary;
    }
    
    // Otherwise, construct from available data
    let text = `${contract.title || ''}\n`;
    text += `${contract.description || ''}\n`;
    
    if (contract.keyTerms) {
      contract.keyTerms.forEach(term => {
        text += `${term.term}: ${term.description}\n`;
      });
    }
    
    if (contract.obligations) {
      text += `Vendor Obligations: ${contract.obligations.vendor?.join(', ') || ''}\n`;
      text += `Company Obligations: ${contract.obligations.company?.join(', ') || ''}\n`;
    }

    return text;
  }

  /**
   * Extract clauses from contract text
   */
  extractClauses(text) {
    const clauses = [];
    const clausePatterns = [
      { type: 'payment', pattern: /payment\s+terms?[:\s]+(.*?)(?=\n\n|\z)/gi },
      { type: 'termination', pattern: /termination[:\s]+(.*?)(?=\n\n|\z)/gi },
      { type: 'liability', pattern: /liability[:\s]+(.*?)(?=\n\n|\z)/gi },
      { type: 'confidentiality', pattern: /confidential[ity]*[:\s]+(.*?)(?=\n\n|\z)/gi },
      { type: 'warranty', pattern: /warrant[y|ies][:\s]+(.*?)(?=\n\n|\z)/gi },
      { type: 'indemnification', pattern: /indemnif[y|ication][:\s]+(.*?)(?=\n\n|\z)/gi },
      { type: 'dispute', pattern: /dispute\s+resolution[:\s]+(.*?)(?=\n\n|\z)/gi },
      { type: 'force_majeure', pattern: /force\s+majeure[:\s]+(.*?)(?=\n\n|\z)/gi }
    ];

    for (const { type, pattern } of clausePatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        clauses.push({
          type,
          content: match[1].trim().substring(0, 500),
          importance: this.assessClauseImportance(type, match[1]),
          riskIndicator: this.hasRiskIndicators(type, match[1])
        });
      }
    }

    return clauses;
  }

  /**
   * Extract named entities from text
   */
  extractEntities(text) {
    const entities = [];

    // Extract organization names (simple pattern)
    const orgPatterns = [
      /(?:company|corporation|inc|llc|ltd|gmbh|corp)[:\s]+([A-Z][A-Za-z\s&]+)/gi,
      /between\s+([A-Z][A-Za-z\s&]+)\s+and/gi
    ];

    for (const pattern of orgPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        entities.push({
          entity: match[1].trim(),
          type: 'organization',
          context: match[0]
        });
      }
    }

    // Extract dates
    const datePattern = /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}|\w+\s+\d{1,2},?\s+\d{4})/gi;
    const dateMatches = text.matchAll(datePattern);
    for (const match of dateMatches) {
      entities.push({
        entity: match[1],
        type: 'date',
        context: text.substring(Math.max(0, match.index - 20), match.index + match[0].length + 20)
      });
    }

    // Extract monetary values
    const moneyPattern = /\$[\d,]+(?:\.\d{2})?|\d+(?:,\d{3})*(?:\.\d{2})?\s*(?:USD|EUR|GBP)/gi;
    const moneyMatches = text.matchAll(moneyPattern);
    for (const match of moneyMatches) {
      entities.push({
        entity: match[0],
        type: 'monetary',
        context: text.substring(Math.max(0, match.index - 30), match.index + match[0].length + 30)
      });
    }

    return entities;
  }

  /**
   * Identify risk clauses in contract
   */
  identifyRiskClauses(text) {
    const riskClauses = [];
    const textLower = text.toLowerCase();

    for (const [riskType, patterns] of Object.entries(this.riskPatterns)) {
      for (const pattern of patterns) {
        if (textLower.includes(pattern.toLowerCase())) {
          // Find the context around the pattern
          const index = textLower.indexOf(pattern.toLowerCase());
          const context = text.substring(
            Math.max(0, index - 100),
            Math.min(text.length, index + pattern.length + 100)
          );

          riskClauses.push({
            clause: pattern,
            riskType,
            severity: this.assessRiskSeverity(riskType, pattern),
            recommendation: this.generateRiskRecommendation(riskType, pattern),
            context
          });
        }
      }
    }

    return riskClauses;
  }

  /**
   * Assess clause importance
   */
  assessClauseImportance(type, content) {
    const highImportanceTypes = ['payment', 'termination', 'liability', 'indemnification'];
    const mediumImportanceTypes = ['warranty', 'confidentiality'];

    if (highImportanceTypes.includes(type)) return 'high';
    if (mediumImportanceTypes.includes(type)) return 'medium';
    return 'low';
  }

  /**
   * Check for risk indicators in clause
   */
  hasRiskIndicators(type, content) {
    const patterns = this.riskPatterns[type] || [];
    const contentLower = content.toLowerCase();
    return patterns.some(p => contentLower.includes(p.toLowerCase()));
  }

  /**
   * Assess risk severity
   */
  assessRiskSeverity(riskType, pattern) {
    const criticalPatterns = [
      'unlimited liability', 'full liability', 'immediate termination',
      'perpetual', 'irrevocable', 'solely responsible'
    ];

    const highPatterns = [
      'indemnify', 'hold harmless', 'without cause', 'work for hire'
    ];

    if (criticalPatterns.some(p => pattern.toLowerCase().includes(p))) return 'critical';
    if (highPatterns.some(p => pattern.toLowerCase().includes(p))) return 'high';
    return 'medium';
  }

  /**
   * Generate risk recommendation
   */
  generateRiskRecommendation(riskType, pattern) {
    const recommendations = {
      liability: 'Consider negotiating liability caps or mutual limitation clauses',
      termination: 'Ensure adequate notice periods and cure rights are included',
      payment: 'Review payment terms for reasonableness and potential penalties',
      intellectual_property: 'Clarify IP ownership and ensure appropriate licensing terms',
      confidentiality: 'Consider time limits on confidentiality obligations',
      compliance: 'Allocate compliance responsibilities clearly between parties'
    };

    return recommendations[riskType] || 'Review this clause with legal counsel';
  }

  /**
   * Generate contract summary
   */
  generateSummary(text) {
    // Extract key sentences
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const keySentences = sentences.slice(0, 5).map(s => s.trim()).join('. ');
    
    return keySentences.substring(0, 500) + (keySentences.length > 500 ? '...' : '');
  }

  /**
   * Analyze sentiment of contract
   */
  analyzeSentiment(text) {
    const positiveWords = ['benefit', 'mutual', 'cooperation', 'partnership', 'support', 'flexible'];
    const negativeWords = ['penalty', 'breach', 'terminate', 'liable', 'damages', 'forfeit'];
    
    const textLower = text.toLowerCase();
    let score = 0;
    
    positiveWords.forEach(word => {
      if (textLower.includes(word)) score += 1;
    });
    
    negativeWords.forEach(word => {
      if (textLower.includes(word)) score -= 1;
    });
    
    if (score > 2) return 'positive';
    if (score < -2) return 'negative';
    return 'neutral';
  }

  /**
   * Detect compliance gaps
   */
  detectComplianceGaps(text) {
    const gaps = [];
    const textLower = text.toLowerCase();

    for (const [regulation, keywords] of Object.entries(this.complianceKeywords)) {
      const hasDataReferences = keywords.some(k => textLower.includes(k));
      
      if (hasDataReferences) {
        // Check if compliance clauses exist
        const hasComplianceClause = textLower.includes(`${regulation} complian`) ||
                                    textLower.includes(`comply with ${regulation}`);
        
        if (!hasComplianceClause) {
          gaps.push({
            regulation: regulation.toUpperCase(),
            issue: `Contract references ${regulation.toUpperCase()}-related data but lacks explicit compliance clause`,
            recommendation: `Add explicit ${regulation.toUpperCase()} compliance requirements and data handling procedures`
          });
        }
      }
    }

    return gaps;
  }

  /**
   * Calculate overall risk level
   */
  calculateRiskLevel(riskClauses) {
    if (!riskClauses || riskClauses.length === 0) return 'low';
    
    const criticalCount = riskClauses.filter(c => c.severity === 'critical').length;
    const highCount = riskClauses.filter(c => c.severity === 'high').length;
    
    if (criticalCount > 0) return 'critical';
    if (highCount >= 3) return 'high';
    if (highCount >= 1 || riskClauses.length >= 5) return 'medium';
    return 'low';
  }

  /**
   * Analyze compliance document
   */
  async analyzeComplianceDocument(complianceId) {
    try {
      const compliance = await Compliance.findById(complianceId);
      if (!compliance) {
        throw new Error('Compliance record not found');
      }

      // Extract text from evidence documents
      const text = compliance.description || '';

      const analysis = {
        processed: true,
        processedAt: new Date(),
        extractedTerms: this.extractComplianceTerms(text),
        riskIndicators: this.identifyComplianceRisks(text),
        sentiment: this.analyzeSentiment(text),
        summary: this.generateSummary(text)
      };

      await Compliance.findByIdAndUpdate(complianceId, {
        nlpAnalysis: analysis
      });

      return analysis;
    } catch (error) {
      console.error('Compliance NLP analysis error:', error);
      throw error;
    }
  }

  /**
   * Extract compliance-related terms
   */
  extractComplianceTerms(text) {
    const terms = [];
    const allKeywords = Object.values(this.complianceKeywords).flat();
    const textLower = text.toLowerCase();

    for (const keyword of allKeywords) {
      if (textLower.includes(keyword.toLowerCase())) {
        terms.push(keyword);
      }
    }

    return [...new Set(terms)];
  }

  /**
   * Identify compliance risks
   */
  identifyComplianceRisks(text) {
    const risks = [];
    const riskIndicators = [
      { indicator: 'non-compliant', confidence: 0.9, severity: 'high' },
      { indicator: 'violation', confidence: 0.95, severity: 'critical' },
      { indicator: 'breach', confidence: 0.85, severity: 'high' },
      { indicator: 'expired', confidence: 0.8, severity: 'medium' },
      { indicator: 'pending review', confidence: 0.7, severity: 'low' }
    ];

    const textLower = text.toLowerCase();
    
    for (const { indicator, confidence, severity } of riskIndicators) {
      if (textLower.includes(indicator)) {
        const index = textLower.indexOf(indicator);
        risks.push({
          indicator,
          confidence,
          severity,
          context: text.substring(Math.max(0, index - 50), index + indicator.length + 50)
        });
      }
    }

    return risks;
  }

  /**
   * Compare two contracts
   */
  async compareContracts(contractId1, contractId2) {
    const [contract1, contract2] = await Promise.all([
      Contract.findById(contractId1),
      Contract.findById(contractId2)
    ]);

    if (!contract1 || !contract2) {
      throw new Error('One or both contracts not found');
    }

    const text1 = await this.getContractText(contract1);
    const text2 = await this.getContractText(contract2);

    const clauses1 = this.extractClauses(text1);
    const clauses2 = this.extractClauses(text2);

    const comparison = {
      contract1: { id: contractId1, title: contract1.title },
      contract2: { id: contractId2, title: contract2.title },
      clauseComparison: this.compareClauses(clauses1, clauses2),
      riskComparison: {
        contract1Risks: this.identifyRiskClauses(text1),
        contract2Risks: this.identifyRiskClauses(text2)
      },
      valueComparison: {
        contract1Value: contract1.totalValue,
        contract2Value: contract2.totalValue,
        difference: (contract2.totalValue || 0) - (contract1.totalValue || 0)
      }
    };

    return comparison;
  }

  /**
   * Compare clauses between contracts
   */
  compareClauses(clauses1, clauses2) {
    const comparison = {
      onlyInFirst: [],
      onlyInSecond: [],
      inBoth: [],
      differences: []
    };

    const types1 = new Set(clauses1.map(c => c.type));
    const types2 = new Set(clauses2.map(c => c.type));

    for (const type of types1) {
      if (!types2.has(type)) {
        comparison.onlyInFirst.push(type);
      } else {
        comparison.inBoth.push(type);
      }
    }

    for (const type of types2) {
      if (!types1.has(type)) {
        comparison.onlyInSecond.push(type);
      }
    }

    return comparison;
  }

  /**
   * Batch analyze contracts
   */
  async batchAnalyzeContracts(contractIds) {
    const results = {
      analyzed: [],
      failed: []
    };

    for (const contractId of contractIds) {
      try {
        const analysis = await this.analyzeContract(contractId);
        results.analyzed.push({ id: contractId, analysis });
      } catch (error) {
        results.failed.push({ id: contractId, error: error.message });
      }
    }

    return results;
  }
}

module.exports = new NLPAnalyzer();
