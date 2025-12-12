"""
NLP Service
Natural Language Processing for contract and document analysis
"""

import re
import logging
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
from collections import Counter

logger = logging.getLogger(__name__)

# Try to import optional NLP libraries
try:
    from textblob import TextBlob
    TEXTBLOB_AVAILABLE = True
except ImportError:
    TEXTBLOB_AVAILABLE = False
    logger.warning("TextBlob not available, some NLP features will be limited")


class NLPService:
    """NLP processing for contracts, compliance documents, and vendor communications"""
    
    def __init__(self):
        # Risk keywords and patterns
        self.risk_patterns = {
            'liability': [
                'unlimited liability', 'full liability', 'solely responsible',
                'indemnify', 'hold harmless', 'defend and indemnify',
                'waiver of liability', 'limited liability'
            ],
            'termination': [
                'immediate termination', 'without cause', 'at any time',
                'unilateral termination', 'convenience termination',
                'termination for cause', 'notice of termination'
            ],
            'payment': [
                'late payment', 'penalty', 'interest charges', 'acceleration',
                'withhold payment', 'set-off', 'net 30', 'net 60', 'payment terms'
            ],
            'intellectual_property': [
                'work for hire', 'all rights', 'exclusive license',
                'perpetual license', 'irrevocable', 'intellectual property',
                'proprietary', 'trade secret', 'confidential information'
            ],
            'confidentiality': [
                'perpetual confidentiality', 'unlimited duration',
                'broad definition', 'including derivatives', 'non-disclosure'
            ],
            'compliance': [
                'regulatory changes', 'law changes', 'compliance costs',
                'audit rights', 'inspection rights', 'regulatory compliance'
            ],
            'force_majeure': [
                'force majeure', 'act of god', 'natural disaster',
                'pandemic', 'unforeseeable circumstances'
            ]
        }
        
        # Compliance framework keywords
        self.compliance_keywords = {
            'gdpr': ['personal data', 'data protection', 'gdpr', 'data subject', 
                     'consent', 'right to erasure', 'data controller', 'data processor'],
            'hipaa': ['phi', 'protected health', 'hipaa', 'healthcare', 
                      'medical records', 'health information'],
            'pci': ['payment card', 'pci', 'cardholder', 'credit card data',
                    'pci dss', 'card data security'],
            'sox': ['sarbanes', 'sox', 'financial controls', 'audit trail',
                    'internal controls', 'financial reporting'],
            'iso27001': ['iso 27001', 'information security', 'isms',
                         'security controls', 'risk assessment'],
            'soc2': ['soc 2', 'trust services', 'security', 'availability',
                     'processing integrity', 'confidentiality']
        }
        
        # Sentiment indicators
        self.positive_words = [
            'benefit', 'mutual', 'cooperation', 'partnership', 'support',
            'flexible', 'collaborative', 'reasonable', 'fair', 'equitable'
        ]
        
        self.negative_words = [
            'penalty', 'breach', 'terminate', 'liable', 'damages', 'forfeit',
            'default', 'violation', 'restriction', 'limitation', 'indemnify'
        ]
    
    def analyze_contract(self, text: str) -> Dict[str, Any]:
        """
        Comprehensive contract analysis using NLP
        
        Args:
            text: Contract text to analyze
            
        Returns:
            Dictionary with analysis results
        """
        try:
            # Run all analyses
            clauses = self.extract_clauses(text)
            entities = self.extract_entities(text)
            risk_clauses = self.identify_risk_clauses(text)
            sentiment = self.analyze_sentiment(text)
            compliance_gaps = self.detect_compliance_gaps(text)
            key_terms = self.extract_key_terms(text)
            summary = self.generate_summary(text)
            
            # Calculate overall risk score
            risk_score = self.calculate_risk_score(risk_clauses)
            
            return {
                'success': True,
                'analyzed_at': datetime.now().isoformat(),
                'summary': summary,
                'extracted_clauses': clauses,
                'key_entities': entities,
                'key_terms': key_terms,
                'risk_analysis': {
                    'risk_clauses': risk_clauses,
                    'risk_score': risk_score,
                    'risk_level': self.get_risk_level(risk_score)
                },
                'sentiment': sentiment,
                'compliance_gaps': compliance_gaps,
                'word_count': len(text.split()),
                'recommendations': self.generate_recommendations(risk_clauses, compliance_gaps)
            }
            
        except Exception as e:
            logger.error(f"Contract analysis error: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def extract_clauses(self, text: str) -> List[Dict]:
        """Extract clauses from contract text"""
        clauses = []
        clause_patterns = [
            ('payment', r'payment\s+terms?[:\s]+(.*?)(?=\n\n|\Z)', 'high'),
            ('termination', r'termination[:\s]+(.*?)(?=\n\n|\Z)', 'high'),
            ('liability', r'liability[:\s]+(.*?)(?=\n\n|\Z)', 'high'),
            ('confidentiality', r'confidential[ity]*[:\s]+(.*?)(?=\n\n|\Z)', 'medium'),
            ('warranty', r'warrant[y|ies][:\s]+(.*?)(?=\n\n|\Z)', 'medium'),
            ('indemnification', r'indemnif[y|ication][:\s]+(.*?)(?=\n\n|\Z)', 'high'),
            ('dispute', r'dispute\s+resolution[:\s]+(.*?)(?=\n\n|\Z)', 'medium'),
            ('force_majeure', r'force\s+majeure[:\s]+(.*?)(?=\n\n|\Z)', 'low'),
            ('intellectual_property', r'intellectual\s+property[:\s]+(.*?)(?=\n\n|\Z)', 'high'),
            ('governing_law', r'governing\s+law[:\s]+(.*?)(?=\n\n|\Z)', 'low')
        ]
        
        for clause_type, pattern, importance in clause_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE | re.DOTALL)
            for match in matches:
                content = match.group(1).strip()[:500]  # Limit content length
                clauses.append({
                    'type': clause_type,
                    'content': content,
                    'importance': importance,
                    'has_risk_indicators': self._has_risk_indicators(clause_type, content),
                    'position': match.start()
                })
        
        return sorted(clauses, key=lambda x: x['position'])
    
    def extract_entities(self, text: str) -> List[Dict]:
        """Extract named entities from text"""
        entities = []
        
        # Organizations
        org_patterns = [
            r'(?:company|corporation|inc|llc|ltd|gmbh|corp)[:\s]+([A-Z][A-Za-z\s&]+)',
            r'between\s+([A-Z][A-Za-z\s&]+)\s+and',
            r'([A-Z][A-Za-z\s&]+)\s+(?:Inc\.|LLC|Ltd\.|Corp\.)'
        ]
        for pattern in org_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                if len(match.strip()) > 2:
                    entities.append({
                        'entity': match.strip(),
                        'type': 'organization'
                    })
        
        # Dates
        date_pattern = r'(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\w+\s+\d{1,2},?\s+\d{4})'
        date_matches = re.findall(date_pattern, text)
        for match in date_matches[:10]:  # Limit to 10 dates
            entities.append({
                'entity': match,
                'type': 'date'
            })
        
        # Monetary values
        money_pattern = r'\$[\d,]+(?:\.\d{2})?|\d+(?:,\d{3})*(?:\.\d{2})?\s*(?:USD|EUR|GBP|dollars)'
        money_matches = re.findall(money_pattern, text, re.IGNORECASE)
        for match in money_matches[:10]:
            entities.append({
                'entity': match,
                'type': 'monetary'
            })
        
        # Percentages
        pct_pattern = r'\d+(?:\.\d+)?\s*%'
        pct_matches = re.findall(pct_pattern, text)
        for match in pct_matches[:5]:
            entities.append({
                'entity': match,
                'type': 'percentage'
            })
        
        # Remove duplicates
        seen = set()
        unique_entities = []
        for entity in entities:
            key = (entity['entity'].lower(), entity['type'])
            if key not in seen:
                seen.add(key)
                unique_entities.append(entity)
        
        return unique_entities
    
    def identify_risk_clauses(self, text: str) -> List[Dict]:
        """Identify risk clauses in contract"""
        risk_clauses = []
        text_lower = text.lower()
        
        for risk_type, patterns in self.risk_patterns.items():
            for pattern in patterns:
                if pattern.lower() in text_lower:
                    # Find context around the pattern
                    idx = text_lower.find(pattern.lower())
                    context = text[max(0, idx-100):min(len(text), idx+len(pattern)+100)]
                    
                    severity = self._assess_severity(risk_type, pattern)
                    
                    risk_clauses.append({
                        'clause': pattern,
                        'risk_type': risk_type,
                        'severity': severity,
                        'context': context.strip(),
                        'recommendation': self._get_risk_recommendation(risk_type, pattern)
                    })
        
        return risk_clauses
    
    def analyze_sentiment(self, text: str) -> Dict[str, Any]:
        """Analyze sentiment of contract text"""
        text_lower = text.lower()
        
        # Count positive and negative words
        positive_count = sum(1 for word in self.positive_words if word in text_lower)
        negative_count = sum(1 for word in self.negative_words if word in text_lower)
        
        # Calculate sentiment score
        total = positive_count + negative_count
        if total > 0:
            score = (positive_count - negative_count) / total
        else:
            score = 0
        
        # Use TextBlob if available for more sophisticated analysis
        if TEXTBLOB_AVAILABLE:
            try:
                blob = TextBlob(text[:5000])  # Limit text length
                polarity = blob.sentiment.polarity
                subjectivity = blob.sentiment.subjectivity
            except:
                polarity = score
                subjectivity = 0.5
        else:
            polarity = score
            subjectivity = 0.5
        
        # Determine overall sentiment
        if polarity > 0.1:
            sentiment = 'positive'
        elif polarity < -0.1:
            sentiment = 'negative'
        else:
            sentiment = 'neutral'
        
        return {
            'overall': sentiment,
            'polarity': round(polarity, 3),
            'subjectivity': round(subjectivity, 3),
            'positive_indicators': positive_count,
            'negative_indicators': negative_count
        }
    
    def detect_compliance_gaps(self, text: str) -> List[Dict]:
        """Detect compliance gaps in document"""
        gaps = []
        text_lower = text.lower()
        
        for regulation, keywords in self.compliance_keywords.items():
            # Check if document references this regulation's data types
            has_references = any(kw in text_lower for kw in keywords)
            
            if has_references:
                # Check if proper compliance clauses exist
                compliance_phrases = [
                    f'{regulation} complian',
                    f'comply with {regulation}',
                    f'{regulation} requirements',
                    f'accordance with {regulation}'
                ]
                has_compliance_clause = any(phrase in text_lower for phrase in compliance_phrases)
                
                if not has_compliance_clause:
                    gaps.append({
                        'regulation': regulation.upper(),
                        'severity': 'high',
                        'issue': f'Document references {regulation.upper()}-related data but lacks explicit compliance clause',
                        'recommendation': f'Add explicit {regulation.upper()} compliance requirements and data handling procedures',
                        'keywords_found': [kw for kw in keywords if kw in text_lower]
                    })
        
        return gaps
    
    def extract_key_terms(self, text: str) -> List[Dict]:
        """Extract key terms and their definitions"""
        key_terms = []
        
        # Look for defined terms (usually in quotes or capitalized)
        definition_patterns = [
            r'"([A-Z][A-Za-z\s]+)"\s+(?:means|refers to|shall mean)\s+([^.]+)',
            r'([A-Z][A-Za-z]+)\s+(?:means|refers to|shall mean)\s+([^.]+)',
            r'(?:The term|For purposes)\s+"?([A-Za-z\s]+)"?\s+(?:means|refers to)\s+([^.]+)'
        ]
        
        for pattern in definition_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches[:20]:
                term = match[0].strip()
                definition = match[1].strip()[:200]
                if len(term) > 2 and len(term) < 50:
                    key_terms.append({
                        'term': term,
                        'definition': definition
                    })
        
        return key_terms
    
    def generate_summary(self, text: str, max_sentences: int = 5) -> str:
        """Generate a summary of the document"""
        # Split into sentences
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if len(s.strip()) > 30]
        
        if not sentences:
            return text[:500] + '...' if len(text) > 500 else text
        
        # Score sentences based on key terms
        key_indicators = [
            'agreement', 'contract', 'terms', 'parties', 'obligations',
            'effective', 'payment', 'delivery', 'warranty', 'termination'
        ]
        
        scored_sentences = []
        for i, sentence in enumerate(sentences):
            score = sum(1 for kw in key_indicators if kw in sentence.lower())
            # Boost score for earlier sentences
            score += max(0, (10 - i) / 10)
            scored_sentences.append((sentence, score))
        
        # Get top sentences
        top_sentences = sorted(scored_sentences, key=lambda x: x[1], reverse=True)[:max_sentences]
        
        # Reorder by original position
        summary_sentences = []
        for sentence, _ in top_sentences:
            summary_sentences.append((sentences.index(sentence), sentence))
        summary_sentences.sort(key=lambda x: x[0])
        
        return '. '.join([s for _, s in summary_sentences]) + '.'
    
    def calculate_risk_score(self, risk_clauses: List[Dict]) -> float:
        """Calculate overall risk score from risk clauses"""
        if not risk_clauses:
            return 0.0
        
        severity_weights = {
            'critical': 1.0,
            'high': 0.7,
            'medium': 0.4,
            'low': 0.2
        }
        
        total_weight = sum(severity_weights.get(rc['severity'], 0.5) for rc in risk_clauses)
        max_possible = len(risk_clauses) * 1.0  # Max if all were critical
        
        return min(1.0, total_weight / max(max_possible, 1))
    
    def get_risk_level(self, score: float) -> str:
        """Convert risk score to risk level"""
        if score >= 0.7:
            return 'critical'
        elif score >= 0.5:
            return 'high'
        elif score >= 0.3:
            return 'medium'
        elif score >= 0.1:
            return 'low'
        return 'minimal'
    
    def generate_recommendations(self, risk_clauses: List[Dict], 
                                compliance_gaps: List[Dict]) -> List[Dict]:
        """Generate recommendations based on analysis"""
        recommendations = []
        
        # Risk-based recommendations
        high_severity = [rc for rc in risk_clauses if rc['severity'] in ['critical', 'high']]
        if high_severity:
            recommendations.append({
                'priority': 'high',
                'category': 'risk',
                'recommendation': f'Review {len(high_severity)} high-severity risk clauses with legal counsel',
                'details': [rc['clause'] for rc in high_severity[:5]]
            })
        
        # Compliance recommendations
        if compliance_gaps:
            recommendations.append({
                'priority': 'high',
                'category': 'compliance',
                'recommendation': f'Address {len(compliance_gaps)} compliance gaps',
                'details': [gap['regulation'] for gap in compliance_gaps]
            })
        
        # Group by risk type
        risk_types = Counter(rc['risk_type'] for rc in risk_clauses)
        for risk_type, count in risk_types.most_common(3):
            if count >= 2:
                recommendations.append({
                    'priority': 'medium',
                    'category': risk_type,
                    'recommendation': f'Review {count} {risk_type} related clauses',
                    'details': self._get_risk_recommendation(risk_type, '')
                })
        
        return recommendations
    
    def compare_contracts(self, text1: str, text2: str) -> Dict[str, Any]:
        """Compare two contracts"""
        analysis1 = self.analyze_contract(text1)
        analysis2 = self.analyze_contract(text2)
        
        if not analysis1['success'] or not analysis2['success']:
            return {
                'success': False,
                'error': 'Failed to analyze one or both contracts'
            }
        
        # Compare clauses
        clauses1 = set(c['type'] for c in analysis1['extracted_clauses'])
        clauses2 = set(c['type'] for c in analysis2['extracted_clauses'])
        
        return {
            'success': True,
            'comparison': {
                'clauses_only_in_first': list(clauses1 - clauses2),
                'clauses_only_in_second': list(clauses2 - clauses1),
                'clauses_in_both': list(clauses1 & clauses2)
            },
            'risk_comparison': {
                'contract1_risk': analysis1['risk_analysis']['risk_level'],
                'contract2_risk': analysis2['risk_analysis']['risk_level'],
                'contract1_score': analysis1['risk_analysis']['risk_score'],
                'contract2_score': analysis2['risk_analysis']['risk_score']
            },
            'sentiment_comparison': {
                'contract1': analysis1['sentiment']['overall'],
                'contract2': analysis2['sentiment']['overall']
            },
            'word_count_comparison': {
                'contract1': analysis1['word_count'],
                'contract2': analysis2['word_count']
            }
        }
    
    # Helper methods
    def _has_risk_indicators(self, clause_type: str, content: str) -> bool:
        """Check if clause has risk indicators"""
        patterns = self.risk_patterns.get(clause_type, [])
        content_lower = content.lower()
        return any(p.lower() in content_lower for p in patterns)
    
    def _assess_severity(self, risk_type: str, pattern: str) -> str:
        """Assess severity of a risk pattern"""
        critical_patterns = [
            'unlimited liability', 'full liability', 'immediate termination',
            'perpetual', 'irrevocable', 'solely responsible', 'waiver'
        ]
        high_patterns = [
            'indemnify', 'hold harmless', 'without cause', 'work for hire',
            'terminate', 'penalty', 'default'
        ]
        
        pattern_lower = pattern.lower()
        if any(p in pattern_lower for p in critical_patterns):
            return 'critical'
        if any(p in pattern_lower for p in high_patterns):
            return 'high'
        return 'medium'
    
    def _get_risk_recommendation(self, risk_type: str, pattern: str) -> str:
        """Get recommendation for a risk type"""
        recommendations = {
            'liability': 'Consider negotiating liability caps or mutual limitation clauses',
            'termination': 'Ensure adequate notice periods and cure rights are included',
            'payment': 'Review payment terms for reasonableness and potential penalties',
            'intellectual_property': 'Clarify IP ownership and ensure appropriate licensing terms',
            'confidentiality': 'Consider time limits on confidentiality obligations',
            'compliance': 'Allocate compliance responsibilities clearly between parties',
            'force_majeure': 'Review force majeure provisions for adequate coverage'
        }
        return recommendations.get(risk_type, 'Review this clause with legal counsel')


# Singleton instance
nlp_service = NLPService()
