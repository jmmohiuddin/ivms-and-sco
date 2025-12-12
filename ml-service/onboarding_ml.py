"""
Onboarding ML Service
Advanced risk scoring with SHAP explainability and document verification
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.preprocessing import StandardScaler, LabelEncoder
import warnings
warnings.filterwarnings('ignore')

# Try to import SHAP for explainability
try:
    import shap
    SHAP_AVAILABLE = True
except ImportError:
    SHAP_AVAILABLE = False
    print("SHAP not available. Install with: pip install shap")


class OnboardingRiskScorer:
    """
    ML-based risk scoring for vendor onboarding with SHAP explainability
    """
    
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.label_encoders = {}
        self.feature_names = []
        self.is_trained = False
        self.explainer = None
        
        # Risk weights for different factors
        self.risk_weights = {
            'sanctions_match': 50,
            'adverse_media': 30,
            'high_risk_jurisdiction': 25,
            'pep_connection': 20,
            'financial_instability': 15,
            'document_fraud': 40,
            'missing_documents': 10,
            'inconsistent_data': 15,
            'new_company': 5,
            'incomplete_kyc': 10
        }
        
        # Country risk tiers
        self.country_risk = {
            'high': ['AF', 'BY', 'CF', 'CD', 'CU', 'ER', 'IR', 'IQ', 'LY', 'KP', 'SO', 'SS', 'SD', 'SY', 'VE', 'YE', 'ZW'],
            'medium': ['RU', 'CN', 'MM', 'BD', 'PK', 'NG', 'KE', 'ET', 'EG', 'UA', 'VN', 'ID', 'PH'],
            'low': ['US', 'CA', 'GB', 'DE', 'FR', 'AU', 'JP', 'SG', 'NZ', 'CH', 'NL', 'SE', 'NO', 'DK', 'FI']
        }
        
        # Initialize with synthetic data for demo
        self._initialize_demo_model()
    
    def _initialize_demo_model(self):
        """Initialize model with synthetic training data"""
        np.random.seed(42)
        n_samples = 1000
        
        # Generate synthetic features
        data = {
            'years_in_business': np.random.randint(0, 50, n_samples),
            'annual_revenue': np.random.lognormal(15, 2, n_samples),
            'employee_count': np.random.lognormal(3, 1.5, n_samples).astype(int),
            'documents_complete': np.random.uniform(0.5, 1.0, n_samples),
            'document_confidence': np.random.uniform(0.6, 1.0, n_samples),
            'country_risk_score': np.random.choice([1, 2, 3], n_samples, p=[0.6, 0.3, 0.1]),
            'industry_risk_score': np.random.choice([1, 2, 3], n_samples, p=[0.5, 0.35, 0.15]),
            'sanctions_flag': np.random.choice([0, 1], n_samples, p=[0.95, 0.05]),
            'adverse_media_flag': np.random.choice([0, 1], n_samples, p=[0.9, 0.1]),
            'pep_flag': np.random.choice([0, 1], n_samples, p=[0.95, 0.05]),
            'previous_violations': np.random.poisson(0.2, n_samples),
            'financial_stability_score': np.random.uniform(0.3, 1.0, n_samples),
            'kyc_completion': np.random.uniform(0.5, 1.0, n_samples),
            'data_consistency_score': np.random.uniform(0.6, 1.0, n_samples)
        }
        
        df = pd.DataFrame(data)
        
        # Generate target (risk tier) based on features
        risk_score = (
            df['sanctions_flag'] * 50 +
            df['adverse_media_flag'] * 30 +
            df['pep_flag'] * 20 +
            df['country_risk_score'] * 10 +
            df['industry_risk_score'] * 8 +
            df['previous_violations'] * 15 +
            (1 - df['documents_complete']) * 15 +
            (1 - df['document_confidence']) * 10 +
            (1 - df['financial_stability_score']) * 12 +
            (1 - df['kyc_completion']) * 10 +
            (1 - df['data_consistency_score']) * 10 -
            np.clip(df['years_in_business'] / 5, 0, 10) -
            np.clip(np.log10(df['annual_revenue']) - 14, 0, 5)
        )
        
        # Convert to risk tiers
        df['risk_tier'] = pd.cut(
            risk_score,
            bins=[-np.inf, 20, 40, 60, np.inf],
            labels=['low', 'medium', 'high', 'critical']
        )
        
        self.feature_names = [col for col in df.columns if col != 'risk_tier']
        
        X = df[self.feature_names].values
        y = df['risk_tier'].astype(str).values
        
        # Encode labels
        self.label_encoder = LabelEncoder()
        y_encoded = self.label_encoder.fit_transform(y)
        
        # Scale features
        X_scaled = self.scaler.fit_transform(X)
        
        # Train model
        self.model = GradientBoostingClassifier(
            n_estimators=100,
            max_depth=5,
            random_state=42
        )
        self.model.fit(X_scaled, y_encoded)
        
        # Initialize SHAP explainer
        if SHAP_AVAILABLE:
            # self.explainer = shap.TreeExplainer(self.model)  # Disabled: requires binary classification
            self.explainer = None
        else:
            self.explainer = None
        
        self.is_trained = True
    
    def calculate_risk_score(self, vendor_data: dict) -> dict:
        """
        Calculate comprehensive risk score for a vendor
        
        Args:
            vendor_data: Dictionary containing vendor information
            
        Returns:
            Dictionary with risk score, tier, and feature contributions
        """
        # Extract and prepare features
        features = self._extract_features(vendor_data)
        feature_array = np.array([features[name] for name in self.feature_names]).reshape(1, -1)
        feature_scaled = self.scaler.transform(feature_array)
        
        # Get prediction probabilities
        proba = self.model.predict_proba(feature_scaled)[0]
        predicted_tier_idx = np.argmax(proba)
        predicted_tier = self.label_encoder.inverse_transform([predicted_tier_idx])[0]
        
        # Calculate overall score (0-100)
        tier_weights = {'low': 0, 'medium': 1, 'high': 2, 'critical': 3}
        overall_score = sum(proba[i] * tier_weights.get(self.label_encoder.inverse_transform([i])[0], 0) 
                          for i in range(len(proba))) / 3 * 100
        
        # Get feature contributions
        feature_contributions = self._get_feature_contributions(feature_scaled, features)
        
        # Get SHAP values if available
        shap_values = None
        if SHAP_AVAILABLE and self.explainer:
            shap_values = self._get_shap_explanation(feature_scaled)
        
        # Generate risk signals
        risk_signals = self._generate_risk_signals(features, vendor_data)
        
        return {
            'overallScore': round(overall_score, 2),
            'riskTier': predicted_tier,
            'tierProbabilities': {
                self.label_encoder.inverse_transform([i])[0]: round(proba[i] * 100, 2)
                for i in range(len(proba))
            },
            'featureContributions': feature_contributions,
            'shapValues': shap_values,
            'riskSignals': risk_signals,
            'confidenceScore': round(max(proba) * 100, 2),
            'modelVersion': '1.0.0',
            'timestamp': pd.Timestamp.now().isoformat()
        }
    
    def _extract_features(self, vendor_data: dict) -> dict:
        """Extract ML features from vendor data"""
        
        # Default values
        features = {name: 0 for name in self.feature_names}
        
        # Business information
        features['years_in_business'] = vendor_data.get('yearsInBusiness', 0)
        features['annual_revenue'] = vendor_data.get('annualRevenue', 1000000)
        features['employee_count'] = vendor_data.get('employeeCount', 10)
        
        # Document scores
        documents = vendor_data.get('documents', {})
        total_docs = vendor_data.get('requiredDocuments', 5)
        uploaded_docs = documents.get('uploadedCount', 0)
        features['documents_complete'] = uploaded_docs / max(total_docs, 1)
        features['document_confidence'] = documents.get('averageConfidence', 0.8)
        
        # Country risk
        country = vendor_data.get('country', 'US')
        if country in self.country_risk['high']:
            features['country_risk_score'] = 3
        elif country in self.country_risk['medium']:
            features['country_risk_score'] = 2
        else:
            features['country_risk_score'] = 1
        
        # Industry risk
        industry = vendor_data.get('industry', 'general')
        high_risk_industries = ['defense', 'gambling', 'cryptocurrency', 'adult', 'weapons']
        medium_risk_industries = ['financial', 'pharma', 'chemicals', 'mining', 'energy']
        
        if industry.lower() in high_risk_industries:
            features['industry_risk_score'] = 3
        elif industry.lower() in medium_risk_industries:
            features['industry_risk_score'] = 2
        else:
            features['industry_risk_score'] = 1
        
        # Verification flags
        verifications = vendor_data.get('verifications', {})
        features['sanctions_flag'] = 1 if verifications.get('sanctionsMatch', False) else 0
        features['adverse_media_flag'] = 1 if verifications.get('adverseMedia', False) else 0
        features['pep_flag'] = 1 if verifications.get('pepConnection', False) else 0
        
        # History
        features['previous_violations'] = vendor_data.get('previousViolations', 0)
        
        # Financial
        features['financial_stability_score'] = vendor_data.get('financialStabilityScore', 0.7)
        
        # KYC
        kyc = vendor_data.get('kyc', {})
        features['kyc_completion'] = kyc.get('completionRate', 0.8)
        
        # Data consistency
        features['data_consistency_score'] = vendor_data.get('dataConsistencyScore', 0.9)
        
        return features
    
    def _get_feature_contributions(self, feature_scaled: np.ndarray, features: dict) -> list:
        """Calculate feature contributions to risk score"""
        contributions = []
        
        # Get feature importances
        importances = self.model.feature_importances_
        
        for i, name in enumerate(self.feature_names):
            value = features[name]
            importance = importances[i]
            
            # Determine contribution direction
            if name in ['documents_complete', 'document_confidence', 'financial_stability_score', 
                        'kyc_completion', 'data_consistency_score', 'years_in_business']:
                # Higher is better (reduces risk)
                direction = 'negative' if value > 0.7 else 'positive'
            else:
                # Higher is worse (increases risk)
                direction = 'positive' if value > 0 else 'neutral'
            
            contributions.append({
                'feature': name,
                'value': round(float(value), 4),
                'importance': round(float(importance), 4),
                'direction': direction,
                'description': self._get_feature_description(name, value)
            })
        
        # Sort by importance
        contributions.sort(key=lambda x: x['importance'], reverse=True)
        
        return contributions[:10]  # Return top 10
    
    def _get_shap_explanation(self, feature_scaled: np.ndarray) -> dict:
        """Get SHAP-based explanation for the prediction"""
        if not SHAP_AVAILABLE or not self.explainer:
            return None
        
        shap_values = self.explainer.shap_values(feature_scaled)
        
        # For multi-class, get values for highest risk class
        if isinstance(shap_values, list):
            shap_vals = shap_values[-1][0]  # Critical class values
        else:
            shap_vals = shap_values[0]
        
        explanations = []
        for i, name in enumerate(self.feature_names):
            explanations.append({
                'feature': name,
                'shapValue': round(float(shap_vals[i]), 4),
                'impact': 'increases_risk' if shap_vals[i] > 0 else 'decreases_risk'
            })
        
        explanations.sort(key=lambda x: abs(x['shapValue']), reverse=True)
        
        return {
            'baseValue': round(float(self.explainer.expected_value[-1]) if isinstance(self.explainer.expected_value, np.ndarray) else float(self.explainer.expected_value), 4),
            'explanations': explanations[:10]
        }
    
    def _generate_risk_signals(self, features: dict, vendor_data: dict) -> dict:
        """Generate categorized risk signals"""
        signals = {
            'sanctions': {
                'status': 'clear',
                'details': [],
                'score': 0
            },
            'adverseMedia': {
                'status': 'clear',
                'details': [],
                'score': 0
            },
            'jurisdiction': {
                'status': 'low_risk',
                'details': [],
                'score': 0
            },
            'financial': {
                'status': 'stable',
                'details': [],
                'score': 0
            },
            'compliance': {
                'status': 'compliant',
                'details': [],
                'score': 0
            }
        }
        
        # Sanctions signals
        if features['sanctions_flag']:
            signals['sanctions']['status'] = 'match_found'
            signals['sanctions']['details'].append('Potential sanctions list match detected')
            signals['sanctions']['score'] = 50
        
        if features['pep_flag']:
            signals['sanctions']['details'].append('PEP connection identified')
            signals['sanctions']['score'] += 20
        
        # Adverse media signals
        if features['adverse_media_flag']:
            signals['adverseMedia']['status'] = 'findings'
            signals['adverseMedia']['details'].append('Adverse media coverage detected')
            signals['adverseMedia']['score'] = 30
        
        # Jurisdiction signals
        if features['country_risk_score'] == 3:
            signals['jurisdiction']['status'] = 'high_risk'
            signals['jurisdiction']['details'].append(f"High-risk jurisdiction: {vendor_data.get('country', 'Unknown')}")
            signals['jurisdiction']['score'] = 25
        elif features['country_risk_score'] == 2:
            signals['jurisdiction']['status'] = 'medium_risk'
            signals['jurisdiction']['details'].append(f"Medium-risk jurisdiction: {vendor_data.get('country', 'Unknown')}")
            signals['jurisdiction']['score'] = 10
        
        # Financial signals
        if features['financial_stability_score'] < 0.5:
            signals['financial']['status'] = 'concerning'
            signals['financial']['details'].append('Below-average financial stability score')
            signals['financial']['score'] = 15
        
        if features['years_in_business'] < 2:
            signals['financial']['details'].append('New company (less than 2 years)')
            signals['financial']['score'] += 5
        
        # Compliance signals
        if features['documents_complete'] < 0.8:
            signals['compliance']['status'] = 'incomplete'
            signals['compliance']['details'].append('Missing required documents')
            signals['compliance']['score'] = 10
        
        if features['kyc_completion'] < 0.8:
            signals['compliance']['details'].append('Incomplete KYC verification')
            signals['compliance']['score'] += 10
        
        if features['data_consistency_score'] < 0.8:
            signals['compliance']['details'].append('Data inconsistencies detected')
            signals['compliance']['score'] += 15
        
        return signals
    
    def _get_feature_description(self, name: str, value: float) -> str:
        """Get human-readable description for feature"""
        descriptions = {
            'years_in_business': f"Company operating for {int(value)} years",
            'annual_revenue': f"Annual revenue: ${value:,.0f}",
            'employee_count': f"Employee count: {int(value)}",
            'documents_complete': f"Document completion: {value*100:.0f}%",
            'document_confidence': f"Document confidence: {value*100:.0f}%",
            'country_risk_score': f"Country risk level: {'Low' if value == 1 else 'Medium' if value == 2 else 'High'}",
            'industry_risk_score': f"Industry risk level: {'Low' if value == 1 else 'Medium' if value == 2 else 'High'}",
            'sanctions_flag': 'Sanctions match detected' if value else 'No sanctions match',
            'adverse_media_flag': 'Adverse media found' if value else 'No adverse media',
            'pep_flag': 'PEP connection found' if value else 'No PEP connection',
            'previous_violations': f"Previous violations: {int(value)}",
            'financial_stability_score': f"Financial stability: {value*100:.0f}%",
            'kyc_completion': f"KYC completion: {value*100:.0f}%",
            'data_consistency_score': f"Data consistency: {value*100:.0f}%"
        }
        return descriptions.get(name, f"{name}: {value}")


class DocumentVerificationML:
    """
    ML-based document verification and fraud detection
    """
    
    def __init__(self):
        self.fraud_indicators = {
            'low_resolution': 0.2,
            'metadata_tampering': 0.8,
            'font_inconsistency': 0.6,
            'copy_paste_artifacts': 0.7,
            'duplicate_elements': 0.5,
            'suspicious_edits': 0.6,
            'watermark_issues': 0.4,
            'date_inconsistency': 0.5,
            'format_anomaly': 0.3
        }
    
    def verify_document(self, document_data: dict) -> dict:
        """
        Verify document authenticity and detect potential fraud
        
        Args:
            document_data: Dictionary containing document information and extracted text
            
        Returns:
            Dictionary with verification results
        """
        fraud_signals = []
        authenticity_score = 100
        
        # Check document metadata
        metadata = document_data.get('metadata', {})
        
        # Check for metadata tampering
        if metadata.get('creationDate') and metadata.get('modificationDate'):
            creation = pd.to_datetime(metadata['creationDate'])
            modification = pd.to_datetime(metadata['modificationDate'])
            if modification < creation:
                fraud_signals.append({
                    'type': 'metadata_tampering',
                    'description': 'Modification date before creation date',
                    'severity': 'high'
                })
                authenticity_score -= 30
        
        # Check for producer/creator consistency
        if metadata.get('producer') and 'Adobe' in metadata.get('producer', ''):
            if 'Photoshop' in metadata.get('producer', ''):
                fraud_signals.append({
                    'type': 'suspicious_edits',
                    'description': 'Document may have been edited with image software',
                    'severity': 'medium'
                })
                authenticity_score -= 15
        
        # Analyze extracted text for anomalies
        extracted_text = document_data.get('extractedText', '')
        
        # Check for common fraud patterns in text
        fraud_patterns = [
            ('duplicate_elements', r'(\b\w{10,}\b).*\1.*\1', 'Suspicious repeated elements'),
            ('date_inconsistency', r'202[5-9]|20[3-9]\d', 'Future date detected'),
        ]
        
        import re
        for pattern_name, pattern, description in fraud_patterns:
            if re.search(pattern, extracted_text):
                fraud_signals.append({
                    'type': pattern_name,
                    'description': description,
                    'severity': 'medium'
                })
                authenticity_score -= 10
        
        # Check OCR confidence
        ocr_confidence = document_data.get('ocrConfidence', 0.9)
        if ocr_confidence < 0.7:
            fraud_signals.append({
                'type': 'low_resolution',
                'description': 'Low OCR confidence may indicate poor quality or manipulated document',
                'severity': 'low'
            })
            authenticity_score -= 5
        
        # Check for data consistency with vendor profile
        vendor_data = document_data.get('vendorData', {})
        extracted_data = document_data.get('extractedData', {})
        
        consistency_issues = self._check_data_consistency(vendor_data, extracted_data)
        for issue in consistency_issues:
            fraud_signals.append({
                'type': 'data_inconsistency',
                'description': issue,
                'severity': 'medium'
            })
            authenticity_score -= 10
        
        # Ensure score doesn't go below 0
        authenticity_score = max(0, authenticity_score)
        
        # Determine verification status
        if authenticity_score >= 80:
            status = 'verified'
        elif authenticity_score >= 60:
            status = 'needs_review'
        else:
            status = 'failed'
        
        return {
            'authenticityScore': authenticity_score,
            'verificationStatus': status,
            'fraudSignals': fraud_signals,
            'fraudRisk': 'high' if authenticity_score < 60 else 'medium' if authenticity_score < 80 else 'low',
            'recommendedAction': self._get_recommended_action(status, fraud_signals),
            'timestamp': pd.Timestamp.now().isoformat()
        }
    
    def _check_data_consistency(self, vendor_data: dict, extracted_data: dict) -> list:
        """Check consistency between vendor profile and extracted document data"""
        issues = []
        
        # Check company name consistency
        if vendor_data.get('legalName') and extracted_data.get('companyName'):
            if vendor_data['legalName'].lower() not in extracted_data['companyName'].lower():
                issues.append(f"Company name mismatch: Profile '{vendor_data['legalName']}' vs Document '{extracted_data['companyName']}'")
        
        # Check registration number
        if vendor_data.get('registrationNumber') and extracted_data.get('registrationNumber'):
            if vendor_data['registrationNumber'] != extracted_data['registrationNumber']:
                issues.append(f"Registration number mismatch")
        
        # Check address
        if vendor_data.get('address') and extracted_data.get('address'):
            # Simple check - could be more sophisticated
            vendor_addr = vendor_data['address'].lower()
            doc_addr = extracted_data['address'].lower()
            if not any(word in doc_addr for word in vendor_addr.split()[:3]):
                issues.append("Address information doesn't match")
        
        return issues
    
    def _get_recommended_action(self, status: str, fraud_signals: list) -> str:
        """Get recommended action based on verification results"""
        if status == 'failed':
            return 'Manual review required. Document shows multiple fraud indicators.'
        elif status == 'needs_review':
            high_severity = [s for s in fraud_signals if s['severity'] == 'high']
            if high_severity:
                return 'Escalate to compliance team for detailed review.'
            return 'Request additional supporting documentation.'
        else:
            return 'Document verified. Proceed with onboarding.'


class SanctionsScreener:
    """
    Mock sanctions screening service
    In production, would integrate with real screening providers
    """
    
    def __init__(self):
        # Mock sanctions data (in production, would use real APIs)
        self.mock_sanctions = {
            'ofac_sdn': ['ACME Evil Corp', 'Bad Actor LLC', 'Sanctioned Entity Inc'],
            'un_sanctions': ['Global Bad Co', 'International Evil Inc'],
            'eu_sanctions': ['European Bad Actor GmbH'],
            'pep_list': ['John Politically Exposed', 'Jane Public Official']
        }
    
    def screen_entity(self, entity_data: dict) -> dict:
        """
        Screen entity against sanctions lists
        
        Args:
            entity_data: Dictionary containing entity name, aliases, principals, country
            
        Returns:
            Screening results
        """
        entity_name = entity_data.get('name', '')
        aliases = entity_data.get('aliases', [])
        principals = entity_data.get('principals', [])
        country = entity_data.get('country', '')
        
        matches = []
        all_names = [entity_name] + aliases + [p.get('name', '') for p in principals]
        
        # Screen against each list
        for list_name, entries in self.mock_sanctions.items():
            for entry in entries:
                for name in all_names:
                    similarity = self._calculate_similarity(name.lower(), entry.lower())
                    if similarity > 0.8:
                        matches.append({
                            'listName': list_name,
                            'matchedName': entry,
                            'searchedName': name,
                            'matchScore': round(similarity * 100, 2),
                            'matchType': 'exact' if similarity > 0.95 else 'fuzzy'
                        })
        
        # Check high-risk country
        high_risk_countries = ['CU', 'IR', 'KP', 'SY', 'RU', 'BY']
        country_risk = country.upper() in high_risk_countries
        
        # Determine overall status
        if matches:
            status = 'match_found'
            risk_level = 'critical'
        elif country_risk:
            status = 'review_required'
            risk_level = 'high'
        else:
            status = 'clear'
            risk_level = 'low'
        
        return {
            'status': status,
            'riskLevel': risk_level,
            'matches': matches,
            'countryRisk': {
                'country': country,
                'isHighRisk': country_risk,
                'restrictions': self._get_country_restrictions(country) if country_risk else []
            },
            'listsChecked': list(self.mock_sanctions.keys()),
            'screenedAt': pd.Timestamp.now().isoformat(),
            'provider': 'internal_mock',
            'recommendedAction': self._get_screening_recommendation(status, matches)
        }
    
    def _calculate_similarity(self, s1: str, s2: str) -> float:
        """Calculate string similarity using simple ratio"""
        if not s1 or not s2:
            return 0
        
        # Exact match
        if s1 == s2:
            return 1.0
        
        # Contains match
        if s1 in s2 or s2 in s1:
            return 0.9
        
        # Word overlap
        words1 = set(s1.split())
        words2 = set(s2.split())
        if words1 and words2:
            overlap = len(words1 & words2) / max(len(words1), len(words2))
            return overlap * 0.85
        
        return 0
    
    def _get_country_restrictions(self, country: str) -> list:
        """Get restrictions for high-risk countries"""
        restrictions = {
            'CU': ['OFAC Cuban Assets Control Regulations', 'US Trade Embargo'],
            'IR': ['OFAC Iran Sanctions', 'EU Restrictive Measures'],
            'KP': ['UN Security Council Resolutions', 'Complete Trade Embargo'],
            'SY': ['OFAC Syria Sanctions', 'EU Syria Sanctions'],
            'RU': ['Sectoral Sanctions', 'Certain Persons Sanctions'],
            'BY': ['Belarus Sanctions', 'EU Restrictive Measures']
        }
        return restrictions.get(country.upper(), ['Enhanced due diligence required'])
    
    def _get_screening_recommendation(self, status: str, matches: list) -> str:
        """Get recommended action based on screening results"""
        if status == 'match_found':
            exact_matches = [m for m in matches if m['matchType'] == 'exact']
            if exact_matches:
                return 'BLOCK: Exact sanctions match found. Do not proceed with onboarding.'
            return 'ESCALATE: Potential sanctions match requires manual review.'
        elif status == 'review_required':
            return 'REVIEW: High-risk jurisdiction requires enhanced due diligence.'
        return 'PROCEED: No sanctions matches found.'


# Create singleton instances
onboarding_risk_scorer = OnboardingRiskScorer()
document_verification_ml = DocumentVerificationML()
sanctions_screener = SanctionsScreener()
