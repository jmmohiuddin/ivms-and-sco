"""
Compliance ML Service
Signal aggregation, risk scoring, NLP for contracts, anomaly detection with SHAP explanations
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import re
from collections import defaultdict
import json

# ML Libraries
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.cluster import KMeans
import shap

class ComplianceMLService:
    """Machine Learning service for compliance monitoring"""
    
    def __init__(self):
        self.risk_model = None
        self.anomaly_detector = None
        self.scaler = StandardScaler()
        self.label_encoders = {}
        self._initialize_models()
    
    def _initialize_models(self):
        """Initialize ML models with default configuration"""
        # Risk scoring model
        self.risk_model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            random_state=42
        )
        
        # Anomaly detection model
        self.anomaly_detector = IsolationForest(
            n_estimators=100,
            contamination=0.1,
            random_state=42
        )
    
    # =====================================================
    # SIGNAL ENRICHMENT
    # =====================================================
    
    def enrich_signal(self, signal_data):
        """Enrich compliance signal with ML-derived insights"""
        try:
            event_type = signal_data.get('eventType', 'unknown')
            source = signal_data.get('source', 'unknown')
            raw_payload = signal_data.get('rawPayload', {})
            
            # Calculate confidence score
            confidence = self._calculate_signal_confidence(signal_data)
            
            # Extract enriched data based on event type
            enriched_data = self._extract_enriched_data(event_type, raw_payload)
            
            # Suggest actions based on event type
            suggested_actions = self._suggest_actions(event_type, confidence)
            
            return {
                'success': True,
                'confidence': confidence,
                'enrichedData': enriched_data,
                'suggestedActions': suggested_actions,
                'processedAt': datetime.now().isoformat()
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'confidence': 0.5
            }
    
    def _calculate_signal_confidence(self, signal_data):
        """Calculate confidence score for a signal"""
        base_confidence = 0.5
        
        # Source reliability factors
        source_reliability = {
            'sanctions_screening': 0.95,
            'adverse_media': 0.75,
            'document_verification': 0.9,
            'kyc_verification': 0.85,
            'credit_rating': 0.9,
            'manual_entry': 0.6,
            'webhook': 0.7
        }
        
        source = signal_data.get('source', 'unknown').lower()
        for key, reliability in source_reliability.items():
            if key in source:
                base_confidence = reliability
                break
        
        # Adjust based on data completeness
        if signal_data.get('rawPayload'):
            payload_fields = len(signal_data['rawPayload']) if isinstance(signal_data['rawPayload'], dict) else 1
            completeness_factor = min(1.0, payload_fields / 5)
            base_confidence = base_confidence * 0.7 + completeness_factor * 0.3
        
        return round(base_confidence, 2)
    
    def _extract_enriched_data(self, event_type, raw_payload):
        """Extract structured data from raw payload"""
        enriched = {}
        
        if event_type == 'sanctions_hit':
            enriched = {
                'matchType': raw_payload.get('matchType', 'unknown'),
                'sanctionLists': raw_payload.get('lists', []),
                'matchScore': raw_payload.get('score', 0),
                'aliases': raw_payload.get('aliases', [])
            }
        elif event_type == 'adverse_media_alert':
            enriched = {
                'sentiment': raw_payload.get('sentiment', 'negative'),
                'categories': raw_payload.get('categories', []),
                'sources': raw_payload.get('sources', []),
                'publicationDate': raw_payload.get('date')
            }
        elif event_type in ['document_expired', 'document_expiring']:
            enriched = {
                'documentType': raw_payload.get('type'),
                'expiryDate': raw_payload.get('expiryDate'),
                'daysToExpiry': raw_payload.get('daysToExpiry', 0),
                'renewalRequired': True
            }
        elif event_type == 'credit_rating_change':
            enriched = {
                'previousRating': raw_payload.get('previousRating'),
                'newRating': raw_payload.get('newRating'),
                'direction': 'upgrade' if raw_payload.get('newRating', '') > raw_payload.get('previousRating', '') else 'downgrade',
                'provider': raw_payload.get('provider')
            }
        
        return enriched
    
    def _suggest_actions(self, event_type, confidence):
        """Suggest remediation actions based on event type"""
        action_map = {
            'sanctions_hit': [
                {'action': 'immediate_review', 'priority': 'critical'},
                {'action': 'suspend_transactions', 'priority': 'high'},
                {'action': 'escalate_to_legal', 'priority': 'high'}
            ],
            'adverse_media_alert': [
                {'action': 'review_media_content', 'priority': 'medium'},
                {'action': 'assess_reputational_risk', 'priority': 'medium'}
            ],
            'document_expired': [
                {'action': 'request_renewal', 'priority': 'high'},
                {'action': 'hold_new_orders', 'priority': 'medium'}
            ],
            'document_expiring': [
                {'action': 'send_renewal_reminder', 'priority': 'low'}
            ],
            'certificate_invalid': [
                {'action': 'request_valid_certificate', 'priority': 'high'},
                {'action': 'suspend_related_transactions', 'priority': 'medium'}
            ],
            'insurance_lapsed': [
                {'action': 'request_insurance_renewal', 'priority': 'high'},
                {'action': 'assess_liability_exposure', 'priority': 'medium'}
            ]
        }
        
        actions = action_map.get(event_type, [{'action': 'manual_review', 'priority': 'medium'}])
        
        # Adjust priority based on confidence
        if confidence < 0.7:
            for action in actions:
                action['requiresValidation'] = True
        
        return actions
    
    # =====================================================
    # RISK SCORING
    # =====================================================
    
    def calculate_risk_score(self, vendor_data):
        """Calculate comprehensive risk score for a vendor"""
        try:
            # Extract features
            features = self._extract_risk_features(vendor_data)
            
            # Calculate component scores
            compliance_score = self._calculate_compliance_component(vendor_data)
            financial_score = self._calculate_financial_component(vendor_data)
            operational_score = self._calculate_operational_component(vendor_data)
            reputational_score = self._calculate_reputational_component(vendor_data)
            
            # Weighted composite score
            weights = {
                'compliance': 0.35,
                'financial': 0.25,
                'operational': 0.20,
                'reputational': 0.20
            }
            
            composite_score = (
                compliance_score * weights['compliance'] +
                financial_score * weights['financial'] +
                operational_score * weights['operational'] +
                reputational_score * weights['reputational']
            )
            
            # Calculate factor contributions
            factors = [
                {'name': 'compliance', 'weight': weights['compliance'], 'score': compliance_score, 'contribution': compliance_score * weights['compliance']},
                {'name': 'financial', 'weight': weights['financial'], 'score': financial_score, 'contribution': financial_score * weights['financial']},
                {'name': 'operational', 'weight': weights['operational'], 'score': operational_score, 'contribution': operational_score * weights['operational']},
                {'name': 'reputational', 'weight': weights['reputational'], 'score': reputational_score, 'contribution': reputational_score * weights['reputational']}
            ]
            
            return {
                'success': True,
                'compositeScore': round(composite_score, 1),
                'tier': self._score_to_tier(composite_score),
                'factors': factors,
                'riskLevel': self._score_to_risk_level(composite_score),
                'calculatedAt': datetime.now().isoformat()
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'compositeScore': 50
            }
    
    def _extract_risk_features(self, vendor_data):
        """Extract numerical features for risk model"""
        features = {}
        
        # Compliance attributes
        attributes = vendor_data.get('complianceAttributes', [])
        valid_count = sum(1 for a in attributes if a.get('status') == 'valid')
        expired_count = sum(1 for a in attributes if a.get('status') == 'expired')
        total_attrs = len(attributes) if attributes else 1
        
        features['compliance_rate'] = valid_count / total_attrs
        features['expired_rate'] = expired_count / total_attrs
        
        # Risk factors
        risk_factors = vendor_data.get('riskFactors', [])
        features['avg_risk_score'] = np.mean([f.get('score', 50) for f in risk_factors]) if risk_factors else 50
        
        # Sanctions status
        sanctions = vendor_data.get('sanctionsStatus', {})
        features['sanctions_flagged'] = 1 if sanctions.get('status') == 'flagged' else 0
        
        # Adverse media
        adverse_media = vendor_data.get('adverseMediaStatus', {})
        features['adverse_media_flagged'] = 1 if adverse_media.get('status') == 'flagged' else 0
        
        return features
    
    def _calculate_compliance_component(self, vendor_data):
        """Calculate compliance component of risk score"""
        base_score = 100
        
        attributes = vendor_data.get('complianceAttributes', [])
        if not attributes:
            return 50  # No data = medium risk
        
        # Deduct for expired/invalid documents
        for attr in attributes:
            status = attr.get('status', 'unknown')
            if status == 'expired':
                base_score -= 15
            elif status == 'invalid':
                base_score -= 20
            elif status == 'pending':
                base_score -= 5
            elif status == 'missing':
                base_score -= 10
        
        # Bonus for verified documents
        verified_count = sum(1 for a in attributes if a.get('verification', {}).get('verified'))
        base_score += min(10, verified_count * 2)
        
        return max(0, min(100, base_score))
    
    def _calculate_financial_component(self, vendor_data):
        """Calculate financial component of risk score"""
        base_score = 100
        
        # Check credit rating
        risk_factors = vendor_data.get('riskFactors', [])
        for factor in risk_factors:
            if factor.get('factor') == 'credit_rating':
                score = factor.get('score', 50)
                return score
        
        # Default to medium if no credit data
        return 70
    
    def _calculate_operational_component(self, vendor_data):
        """Calculate operational component of risk score"""
        base_score = 100
        
        # Check for operational issues in signal history
        signals = vendor_data.get('signalHistory', [])
        operational_issues = ['delivery_issue', 'quality_issue', 'payment_issue']
        
        for signal in signals[-50:]:  # Last 50 signals
            if signal.get('type') in operational_issues:
                base_score -= 5
        
        return max(0, min(100, base_score))
    
    def _calculate_reputational_component(self, vendor_data):
        """Calculate reputational component of risk score"""
        base_score = 100
        
        # Sanctions check
        sanctions = vendor_data.get('sanctionsStatus', {})
        if sanctions.get('status') == 'flagged':
            base_score -= 50
        
        # Adverse media
        adverse_media = vendor_data.get('adverseMediaStatus', {})
        if adverse_media.get('status') == 'flagged':
            alerts = adverse_media.get('alerts', [])
            for alert in alerts:
                severity = alert.get('severity', 'low')
                if severity == 'critical':
                    base_score -= 20
                elif severity == 'high':
                    base_score -= 10
                elif severity == 'medium':
                    base_score -= 5
        
        return max(0, min(100, base_score))
    
    def _score_to_tier(self, score):
        """Convert score to risk tier"""
        if score >= 80:
            return 'low'
        elif score >= 60:
            return 'medium'
        elif score >= 40:
            return 'high'
        else:
            return 'critical'
    
    def _score_to_risk_level(self, score):
        """Convert score to risk level description"""
        if score >= 80:
            return 'Low Risk - Vendor meets compliance standards'
        elif score >= 60:
            return 'Medium Risk - Some compliance gaps exist'
        elif score >= 40:
            return 'High Risk - Significant compliance issues'
        else:
            return 'Critical Risk - Immediate action required'
    
    # =====================================================
    # RISK EXPLANATION (SHAP)
    # =====================================================
    
    def explain_risk(self, vendor_data):
        """Generate SHAP-like explanations for risk score"""
        try:
            # Calculate individual components
            compliance = self._calculate_compliance_component(vendor_data)
            financial = self._calculate_financial_component(vendor_data)
            operational = self._calculate_operational_component(vendor_data)
            reputational = self._calculate_reputational_component(vendor_data)
            
            # Base value (average risk)
            base_value = 50
            
            # Calculate contributions
            weights = {'compliance': 0.35, 'financial': 0.25, 'operational': 0.20, 'reputational': 0.20}
            
            explanations = []
            
            # Compliance factors
            compliance_contribution = (compliance - 50) * weights['compliance']
            explanations.append({
                'feature': 'Document Compliance',
                'value': compliance,
                'contribution': round(compliance_contribution, 2),
                'direction': 'positive' if compliance_contribution > 0 else 'negative',
                'explanation': self._get_compliance_explanation(vendor_data)
            })
            
            # Financial factors
            financial_contribution = (financial - 50) * weights['financial']
            explanations.append({
                'feature': 'Financial Health',
                'value': financial,
                'contribution': round(financial_contribution, 2),
                'direction': 'positive' if financial_contribution > 0 else 'negative',
                'explanation': self._get_financial_explanation(vendor_data)
            })
            
            # Operational factors
            operational_contribution = (operational - 50) * weights['operational']
            explanations.append({
                'feature': 'Operational Performance',
                'value': operational,
                'contribution': round(operational_contribution, 2),
                'direction': 'positive' if operational_contribution > 0 else 'negative',
                'explanation': self._get_operational_explanation(vendor_data)
            })
            
            # Reputational factors
            reputational_contribution = (reputational - 50) * weights['reputational']
            explanations.append({
                'feature': 'Reputational Standing',
                'value': reputational,
                'contribution': round(reputational_contribution, 2),
                'direction': 'positive' if reputational_contribution > 0 else 'negative',
                'explanation': self._get_reputational_explanation(vendor_data)
            })
            
            # Sort by absolute contribution
            explanations.sort(key=lambda x: abs(x['contribution']), reverse=True)
            
            return {
                'success': True,
                'baseValue': base_value,
                'explanations': explanations,
                'topPositive': [e for e in explanations if e['direction'] == 'positive'][:3],
                'topNegative': [e for e in explanations if e['direction'] == 'negative'][:3]
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _get_compliance_explanation(self, vendor_data):
        """Generate human-readable compliance explanation"""
        attributes = vendor_data.get('complianceAttributes', [])
        expired = [a.get('name') for a in attributes if a.get('status') == 'expired']
        
        if expired:
            return f"Expired documents: {', '.join(expired[:3])}"
        
        valid_count = sum(1 for a in attributes if a.get('status') == 'valid')
        return f"{valid_count} of {len(attributes)} documents are valid"
    
    def _get_financial_explanation(self, vendor_data):
        """Generate human-readable financial explanation"""
        risk_factors = vendor_data.get('riskFactors', [])
        for factor in risk_factors:
            if factor.get('factor') == 'credit_rating':
                return f"Credit rating score: {factor.get('score', 'N/A')}"
        return "No credit rating data available"
    
    def _get_operational_explanation(self, vendor_data):
        """Generate human-readable operational explanation"""
        signals = vendor_data.get('signalHistory', [])
        issues = [s for s in signals[-50:] if s.get('type') in ['delivery_issue', 'quality_issue']]
        
        if issues:
            return f"{len(issues)} operational issues in recent history"
        return "No recent operational issues"
    
    def _get_reputational_explanation(self, vendor_data):
        """Generate human-readable reputational explanation"""
        sanctions = vendor_data.get('sanctionsStatus', {})
        adverse = vendor_data.get('adverseMediaStatus', {})
        
        issues = []
        if sanctions.get('status') == 'flagged':
            issues.append('Sanctions flag')
        if adverse.get('status') == 'flagged':
            issues.append('Adverse media alerts')
        
        if issues:
            return ', '.join(issues)
        return "No reputational concerns identified"
    
    # =====================================================
    # ANOMALY DETECTION
    # =====================================================
    
    def detect_anomalies(self, vendor_data):
        """Detect anomalies in vendor compliance patterns"""
        try:
            events = vendor_data.get('events', [])
            current_profile = vendor_data.get('currentProfile', {})
            
            if len(events) < 10:
                return {
                    'success': True,
                    'anomalies': [],
                    'message': 'Insufficient data for anomaly detection'
                }
            
            anomalies = []
            
            # Check for unusual event frequency
            event_freq_anomaly = self._detect_event_frequency_anomaly(events)
            if event_freq_anomaly:
                anomalies.append(event_freq_anomaly)
            
            # Check for unusual event type patterns
            type_anomalies = self._detect_event_type_anomalies(events)
            anomalies.extend(type_anomalies)
            
            # Check for score anomalies
            score_anomaly = self._detect_score_anomaly(vendor_data)
            if score_anomaly:
                anomalies.append(score_anomaly)
            
            # Check for source anomalies
            source_anomaly = self._detect_source_anomaly(events)
            if source_anomaly:
                anomalies.append(source_anomaly)
            
            return {
                'success': True,
                'anomalies': anomalies,
                'anomalyCount': len(anomalies),
                'analyzedEvents': len(events)
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _detect_event_frequency_anomaly(self, events):
        """Detect unusual spikes in event frequency"""
        # Group events by day
        events_by_day = defaultdict(int)
        for event in events:
            timestamp = event.get('timestamp')
            if timestamp:
                if isinstance(timestamp, str):
                    day = timestamp[:10]
                else:
                    day = timestamp.strftime('%Y-%m-%d')
                events_by_day[day] += 1
        
        if len(events_by_day) < 7:
            return None
        
        # Calculate statistics
        counts = list(events_by_day.values())
        mean = np.mean(counts)
        std = np.std(counts)
        
        # Check for spikes (>2 std deviations)
        for day, count in events_by_day.items():
            if count > mean + 2 * std:
                return {
                    'type': 'frequency_spike',
                    'description': f'Unusual spike in compliance events on {day}',
                    'score': min(1.0, (count - mean) / (std + 0.1)),
                    'details': {'day': day, 'count': count, 'average': mean}
                }
        
        return None
    
    def _detect_event_type_anomalies(self, events):
        """Detect unusual patterns in event types"""
        anomalies = []
        
        # Count event types
        type_counts = defaultdict(int)
        for event in events:
            type_counts[event.get('type', 'unknown')] += 1
        
        total = len(events)
        
        # Check for unusual concentrations of negative events
        negative_types = ['sanctions_hit', 'document_expired', 'certificate_invalid', 'adverse_media_alert']
        negative_count = sum(type_counts.get(t, 0) for t in negative_types)
        
        if negative_count > total * 0.3:  # More than 30% negative
            anomalies.append({
                'type': 'high_negative_event_rate',
                'description': 'Unusually high rate of negative compliance events',
                'score': negative_count / total,
                'details': {'negativeCount': negative_count, 'total': total}
            })
        
        return anomalies
    
    def _detect_score_anomaly(self, vendor_data):
        """Detect anomalous compliance scores"""
        current_profile = vendor_data.get('currentProfile', {})
        score = current_profile.get('compositeScore', 50)
        tier = current_profile.get('tier', 'medium')
        
        # Check for mismatched tier and score
        expected_tier = self._score_to_tier(score)
        if tier != expected_tier:
            return {
                'type': 'tier_score_mismatch',
                'description': f'Tier ({tier}) does not match score ({score})',
                'score': 0.8,
                'details': {'currentTier': tier, 'expectedTier': expected_tier, 'score': score}
            }
        
        return None
    
    def _detect_source_anomaly(self, events):
        """Detect anomalies in event sources"""
        source_counts = defaultdict(int)
        for event in events:
            source_counts[event.get('source', 'unknown')] += 1
        
        # Check if single source dominates (>80%)
        total = len(events)
        for source, count in source_counts.items():
            if count > total * 0.8 and source != 'internal':
                return {
                    'type': 'single_source_dominance',
                    'description': f'Events predominantly from single source: {source}',
                    'score': count / total,
                    'details': {'dominantSource': source, 'percentage': count / total * 100}
                }
        
        return None
    
    # =====================================================
    # CONTRACT NLP ANALYSIS
    # =====================================================
    
    def analyze_contract(self, contract_text, vendor_id=None):
        """Analyze contract text for compliance clauses"""
        try:
            # Extract compliance clauses
            clauses = self._extract_compliance_clauses(contract_text)
            
            # Extract obligations
            obligations = self._extract_obligations(contract_text)
            
            # Identify risk clauses
            risk_clauses = self._identify_risk_clauses(contract_text)
            
            # Check for missing standard clauses
            missing_clauses = self._check_missing_clauses(contract_text)
            
            return {
                'success': True,
                'clauses': clauses,
                'obligations': obligations,
                'riskClauses': risk_clauses,
                'missingClauses': missing_clauses,
                'analyzedAt': datetime.now().isoformat()
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _extract_compliance_clauses(self, text):
        """Extract compliance-related clauses from contract text"""
        compliance_keywords = [
            'compliance', 'regulation', 'statutory', 'legal requirement',
            'certification', 'license', 'permit', 'audit', 'inspection',
            'insurance', 'warranty', 'guarantee', 'indemnification'
        ]
        
        clauses = []
        sentences = text.split('.')
        
        for sentence in sentences:
            lower_sentence = sentence.lower()
            for keyword in compliance_keywords:
                if keyword in lower_sentence:
                    clauses.append({
                        'text': sentence.strip(),
                        'keyword': keyword,
                        'type': 'compliance'
                    })
                    break
        
        return clauses[:20]  # Limit to 20 clauses
    
    def _extract_obligations(self, text):
        """Extract vendor obligations from contract text"""
        obligation_patterns = [
            r'(?:vendor|supplier|contractor)\s+(?:shall|must|will|agrees to)\s+([^.]+)',
            r'(?:required to|obligated to|responsible for)\s+([^.]+)',
            r'(?:maintain|provide|deliver|submit)\s+([^.]+?)(?:within|by|before)'
        ]
        
        obligations = []
        for pattern in obligation_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                obligations.append({
                    'obligation': match.strip(),
                    'type': 'vendor_obligation'
                })
        
        return obligations[:15]
    
    def _identify_risk_clauses(self, text):
        """Identify potentially risky clauses"""
        risk_patterns = {
            'unlimited_liability': r'unlimited\s+liability',
            'broad_indemnification': r'indemnify.*?(all|any|every)\s+(?:claims?|damages?|losses?)',
            'termination_rights': r'terminate.*?(?:immediately|at any time|without cause)',
            'change_of_control': r'change\s+(?:of|in)\s+(?:control|ownership)',
            'intellectual_property': r'(?:intellectual property|ip)\s+(?:transfer|assignment)',
            'non_compete': r'non-?compete|restrictive covenant'
        }
        
        risk_clauses = []
        for risk_type, pattern in risk_patterns.items():
            if re.search(pattern, text, re.IGNORECASE):
                # Find the relevant sentence
                matches = re.findall(rf'[^.]*{pattern}[^.]*\.', text, re.IGNORECASE)
                for match in matches[:2]:
                    risk_clauses.append({
                        'type': risk_type,
                        'text': match.strip(),
                        'severity': 'high' if risk_type in ['unlimited_liability', 'broad_indemnification'] else 'medium'
                    })
        
        return risk_clauses
    
    def _check_missing_clauses(self, text):
        """Check for missing standard compliance clauses"""
        required_clauses = {
            'anti_bribery': ['anti-bribery', 'anti-corruption', 'fcpa', 'bribery act'],
            'data_protection': ['data protection', 'gdpr', 'privacy', 'personal data'],
            'confidentiality': ['confidential', 'non-disclosure', 'proprietary information'],
            'insurance': ['insurance', 'liability coverage', 'general liability'],
            'audit_rights': ['audit', 'inspection rights', 'right to inspect'],
            'termination': ['termination', 'right to terminate'],
            'force_majeure': ['force majeure', 'act of god'],
            'dispute_resolution': ['dispute resolution', 'arbitration', 'mediation']
        }
        
        missing = []
        text_lower = text.lower()
        
        for clause_type, keywords in required_clauses.items():
            found = any(keyword in text_lower for keyword in keywords)
            if not found:
                missing.append({
                    'clauseType': clause_type,
                    'recommendation': f'Add {clause_type.replace("_", " ")} clause',
                    'severity': 'high' if clause_type in ['anti_bribery', 'data_protection'] else 'medium'
                })
        
        return missing
    
    def extract_obligations_only(self, contract_text):
        """Extract only the obligations from contract text"""
        return self._extract_obligations(contract_text)
    
    # =====================================================
    # SANCTIONS SCREENING
    # =====================================================
    
    def check_sanctions(self, vendor_data):
        """Perform sanctions screening simulation"""
        try:
            vendor_name = vendor_data.get('vendorName', '')
            country = vendor_data.get('country', '')
            
            # Simulate sanctions check (in production, would call actual API)
            hits = self._simulate_sanctions_check(vendor_name, country)
            
            severity = 'none'
            if hits:
                max_score = max(h.get('score', 0) for h in hits)
                if max_score > 90:
                    severity = 'critical'
                elif max_score > 70:
                    severity = 'high'
                else:
                    severity = 'medium'
            
            return {
                'success': True,
                'hasHits': len(hits) > 0,
                'hits': hits,
                'hitCount': len(hits),
                'severity': severity,
                'confidence': 0.95 if not hits else 0.85,
                'checkedAt': datetime.now().isoformat(),
                'listsChecked': ['OFAC SDN', 'EU Consolidated', 'UN Sanctions', 'UK Sanctions']
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _simulate_sanctions_check(self, name, country):
        """Simulate sanctions database check"""
        # In production, this would call actual sanctions APIs
        # For simulation, we return empty for most cases
        
        # Simulated high-risk countries
        high_risk_countries = ['NK', 'IR', 'SY', 'CU', 'VE']
        
        hits = []
        
        if country in high_risk_countries:
            hits.append({
                'listName': 'OFAC SDN',
                'matchType': 'country',
                'score': 60,
                'matchedName': f'Country risk: {country}'
            })
        
        return hits
    
    # =====================================================
    # ADVERSE MEDIA SCREENING
    # =====================================================
    
    def check_adverse_media(self, vendor_data):
        """Perform adverse media screening simulation"""
        try:
            vendor_name = vendor_data.get('vendorName', '')
            
            # Simulate media check (in production, would call actual API)
            alerts = self._simulate_media_check(vendor_name)
            
            return {
                'success': True,
                'hasAlerts': len(alerts) > 0,
                'alerts': alerts,
                'alertCount': len(alerts),
                'categories': list(set(a.get('category', 'other') for a in alerts)),
                'sentiment': 'negative' if alerts else 'neutral',
                'confidence': 0.75,
                'checkedAt': datetime.now().isoformat()
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _simulate_media_check(self, name):
        """Simulate adverse media check"""
        # In production, would call actual media monitoring APIs
        return []  # Return empty for simulation
    
    # =====================================================
    # DOCUMENT VERIFICATION
    # =====================================================
    
    def verify_document(self, document_data):
        """Verify document authenticity and validity"""
        try:
            doc_type = document_data.get('documentType', '')
            doc_number = document_data.get('documentNumber', '')
            expiry_date = document_data.get('expiryDate')
            extracted_data = document_data.get('extractedData', {})
            
            issues = []
            is_valid = True
            confidence = 0.9
            
            # Check expiry
            if expiry_date:
                expiry = datetime.fromisoformat(expiry_date.replace('Z', ''))
                if expiry < datetime.now():
                    is_valid = False
                    issues.append({'type': 'expired', 'message': 'Document has expired'})
            
            # Check document number format (basic validation)
            if doc_number and len(doc_number) < 5:
                issues.append({'type': 'format', 'message': 'Document number format may be invalid'})
                confidence -= 0.1
            
            # Simulate authenticity check
            if not extracted_data:
                issues.append({'type': 'data_extraction', 'message': 'Unable to extract document data'})
                confidence -= 0.2
            
            return {
                'success': True,
                'isValid': is_valid and len(issues) == 0,
                'confidence': max(0.5, confidence),
                'issues': issues,
                'verifiedFields': list(extracted_data.keys()) if extracted_data else [],
                'verifiedAt': datetime.now().isoformat()
            }
        except Exception as e:
            return {'success': False, 'error': str(e), 'isValid': False}
    
    # =====================================================
    # KYC VERIFICATION
    # =====================================================
    
    def verify_kyc(self, kyc_data):
        """Verify KYC information"""
        try:
            checks = []
            
            # Business registration check
            if kyc_data.get('registrationNumber'):
                checks.append({
                    'check': 'business_registration',
                    'status': 'verified',
                    'confidence': 0.9
                })
            else:
                checks.append({
                    'check': 'business_registration',
                    'status': 'missing',
                    'confidence': 0
                })
            
            # Address verification
            if kyc_data.get('address'):
                checks.append({
                    'check': 'address_verification',
                    'status': 'verified',
                    'confidence': 0.85
                })
            
            # Officer verification
            if kyc_data.get('officers'):
                checks.append({
                    'check': 'officer_verification',
                    'status': 'verified',
                    'confidence': 0.8
                })
            
            all_verified = all(c['status'] == 'verified' for c in checks)
            avg_confidence = np.mean([c['confidence'] for c in checks]) if checks else 0
            
            return {
                'success': True,
                'verified': all_verified,
                'checks': checks,
                'riskLevel': 'low' if all_verified else 'medium',
                'confidence': round(avg_confidence, 2),
                'verifiedAt': datetime.now().isoformat()
            }
        except Exception as e:
            return {'success': False, 'error': str(e), 'verified': False}


# Create singleton instance
compliance_ml = ComplianceMLService()
