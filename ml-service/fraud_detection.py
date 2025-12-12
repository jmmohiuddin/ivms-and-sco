"""
Fraud Detection Service
ML-based fraud detection for invoices and transactions
"""

import numpy as np
import pandas as pd
import logging
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from collections import defaultdict
import joblib
import os

logger = logging.getLogger(__name__)


class FraudDetectionService:
    """ML-based fraud detection for invoices and vendor transactions"""
    
    def __init__(self):
        # Initialize models
        self.isolation_forest = IsolationForest(
            n_estimators=100,
            contamination=0.1,
            random_state=42
        )
        self.scaler = StandardScaler()
        self.models_trained = False
        
        # Fraud indicators and their weights
        self.fraud_weights = {
            'duplicate_invoice': 0.35,
            'price_anomaly': 0.25,
            'rush_payment': 0.15,
            'round_amount': 0.05,
            'new_vendor': 0.10,
            'frequency_anomaly': 0.10
        }
        
        # Thresholds
        self.thresholds = {
            'price_variance_pct': 20,      # Flag if price varies by > 20%
            'duplicate_time_window': 7,     # Days to check for duplicates
            'rush_payment_days': 3,         # Flag if payment requested within 3 days
            'round_amount_threshold': 1000, # Flag round amounts above this
            'new_vendor_days': 30,          # New vendor warning threshold
            'frequency_multiplier': 2       # Flag if frequency is 2x normal
        }
        
        # Cache for vendor statistics
        self.vendor_stats_cache = {}
    
    def analyze_invoice(self, invoice_data: Dict, 
                       historical_data: Optional[List[Dict]] = None,
                       vendor_data: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Analyze an invoice for fraud indicators
        
        Args:
            invoice_data: Invoice to analyze
            historical_data: Historical invoices for comparison
            vendor_data: Vendor information
            
        Returns:
            Dictionary with fraud analysis results
        """
        try:
            analysis = {
                'analyzed': True,
                'analyzed_at': datetime.now().isoformat(),
                'invoice_id': invoice_data.get('_id') or invoice_data.get('invoice_id'),
                'duplicate_check': self._check_duplicate(invoice_data, historical_data),
                'price_analysis': self._analyze_price(invoice_data, historical_data),
                'vendor_analysis': self._analyze_vendor(vendor_data),
                'pattern_analysis': self._analyze_patterns(invoice_data),
                'rush_payment_check': self._check_rush_payment(invoice_data),
                'round_amount_check': self._check_round_amount(invoice_data),
                'anomaly_score': 0,
                'fraud_indicators': []
            }
            
            # Calculate overall anomaly score
            analysis['anomaly_score'] = self._calculate_anomaly_score(analysis)
            analysis['risk_level'] = self._determine_risk_level(analysis['anomaly_score'])
            analysis['fraud_indicators'] = self._compile_fraud_indicators(analysis)
            analysis['recommendations'] = self._generate_recommendations(analysis)
            
            return {
                'success': True,
                **analysis
            }
            
        except Exception as e:
            logger.error(f"Fraud analysis error: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def batch_analyze(self, invoices: List[Dict], 
                     historical_data: Optional[List[Dict]] = None) -> Dict[str, Any]:
        """
        Batch analyze multiple invoices
        
        Args:
            invoices: List of invoices to analyze
            historical_data: Historical invoices for comparison
            
        Returns:
            Batch analysis results
        """
        results = {
            'success': True,
            'analyzed_at': datetime.now().isoformat(),
            'total_invoices': len(invoices),
            'analyzed': [],
            'high_risk': [],
            'failed': []
        }
        
        for invoice in invoices:
            try:
                analysis = self.analyze_invoice(invoice, historical_data)
                if analysis['success']:
                    results['analyzed'].append({
                        'invoice_id': analysis['invoice_id'],
                        'risk_level': analysis['risk_level'],
                        'anomaly_score': analysis['anomaly_score']
                    })
                    
                    if analysis['risk_level'] in ['high', 'critical']:
                        results['high_risk'].append({
                            'invoice_id': analysis['invoice_id'],
                            'risk_level': analysis['risk_level'],
                            'indicators': analysis['fraud_indicators']
                        })
                else:
                    results['failed'].append({
                        'invoice_id': invoice.get('_id') or invoice.get('invoice_id'),
                        'error': analysis.get('error')
                    })
            except Exception as e:
                results['failed'].append({
                    'invoice_id': invoice.get('_id') or invoice.get('invoice_id'),
                    'error': str(e)
                })
        
        return results
    
    def train_model(self, historical_data: List[Dict]) -> Dict[str, Any]:
        """
        Train fraud detection model on historical data
        
        Args:
            historical_data: Historical invoice data with fraud labels if available
            
        Returns:
            Training results
        """
        try:
            if len(historical_data) < 10:
                return {
                    'success': False,
                    'error': 'Insufficient data for training (minimum 10 records)'
                }
            
            # Extract features
            features = self._extract_features(historical_data)
            
            if features.empty:
                return {
                    'success': False,
                    'error': 'Failed to extract features from data'
                }
            
            # Scale features
            scaled_features = self.scaler.fit_transform(features)
            
            # Train isolation forest
            self.isolation_forest.fit(scaled_features)
            self.models_trained = True
            
            # Calculate training metrics
            predictions = self.isolation_forest.predict(scaled_features)
            anomaly_count = sum(1 for p in predictions if p == -1)
            
            return {
                'success': True,
                'trained_at': datetime.now().isoformat(),
                'records_used': len(historical_data),
                'features_extracted': len(features.columns),
                'anomalies_detected': anomaly_count,
                'anomaly_rate': anomaly_count / len(historical_data)
            }
            
        except Exception as e:
            logger.error(f"Model training error: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def predict_fraud(self, invoice_features: Dict) -> Dict[str, Any]:
        """
        Predict fraud probability for invoice using trained model
        
        Args:
            invoice_features: Extracted features for invoice
            
        Returns:
            Fraud prediction results
        """
        try:
            if not self.models_trained:
                return {
                    'success': False,
                    'error': 'Model not trained. Call train_model first.'
                }
            
            # Convert to DataFrame
            features_df = pd.DataFrame([invoice_features])
            scaled_features = self.scaler.transform(features_df)
            
            # Get prediction and score
            prediction = self.isolation_forest.predict(scaled_features)[0]
            score = -self.isolation_forest.score_samples(scaled_features)[0]
            
            # Normalize score to 0-1 range
            normalized_score = min(1.0, max(0.0, (score + 0.5)))
            
            return {
                'success': True,
                'is_anomaly': prediction == -1,
                'anomaly_score': normalized_score,
                'risk_level': self._determine_risk_level(normalized_score),
                'predicted_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Prediction error: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_statistics(self, historical_data: List[Dict]) -> Dict[str, Any]:
        """
        Get fraud detection statistics
        
        Args:
            historical_data: Historical invoice data
            
        Returns:
            Statistics summary
        """
        try:
            if not historical_data:
                return {
                    'success': True,
                    'total_analyzed': 0,
                    'by_risk_level': {},
                    'by_indicator_type': {}
                }
            
            # Analyze all invoices
            results = self.batch_analyze(historical_data)
            
            # Calculate statistics
            risk_levels = defaultdict(int)
            indicator_types = defaultdict(int)
            total_score = 0
            
            for inv in results['analyzed']:
                risk_levels[inv['risk_level']] += 1
                total_score += inv['anomaly_score']
            
            for risk_inv in results['high_risk']:
                for indicator in risk_inv.get('indicators', []):
                    indicator_types[indicator.get('type', 'unknown')] += 1
            
            return {
                'success': True,
                'total_analyzed': len(results['analyzed']),
                'by_risk_level': dict(risk_levels),
                'by_indicator_type': dict(indicator_types),
                'total_flagged': len(results['high_risk']),
                'average_risk_score': total_score / len(results['analyzed']) if results['analyzed'] else 0
            }
            
        except Exception as e:
            logger.error(f"Statistics error: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    # Private helper methods
    def _check_duplicate(self, invoice: Dict, historical: Optional[List[Dict]]) -> Dict:
        """Check for duplicate invoices"""
        if not historical:
            return {
                'is_duplicate': False,
                'duplicate_count': 0,
                'confidence': 0,
                'risk': 'none'
            }
        
        duplicates = []
        invoice_number = invoice.get('invoice_number', '')
        invoice_amount = invoice.get('total_amount', 0)
        invoice_date = invoice.get('invoice_date')
        vendor_id = invoice.get('vendor') or invoice.get('vendor_id')
        
        for hist in historical:
            if hist.get('_id') == invoice.get('_id'):
                continue
                
            match_reasons = []
            
            # Check invoice number match
            if hist.get('invoice_number') == invoice_number and invoice_number:
                match_reasons.append('same_invoice_number')
            
            # Check amount match (within 1%)
            hist_amount = hist.get('total_amount', 0)
            if hist_amount and invoice_amount:
                if abs(hist_amount - invoice_amount) / max(hist_amount, 1) < 0.01:
                    match_reasons.append('same_amount')
            
            # Check vendor match
            if (hist.get('vendor') or hist.get('vendor_id')) == vendor_id:
                if match_reasons:  # Only count if other matches exist
                    match_reasons.append('same_vendor')
            
            if match_reasons:
                duplicates.append({
                    'invoice_id': hist.get('_id') or hist.get('invoice_id'),
                    'match_reasons': match_reasons
                })
        
        is_duplicate = len(duplicates) > 0
        return {
            'is_duplicate': is_duplicate,
            'duplicate_count': len(duplicates),
            'potential_duplicates': duplicates[:5],  # Limit to 5
            'confidence': 0.85 if is_duplicate else 0,
            'risk': 'high' if is_duplicate else 'none'
        }
    
    def _analyze_price(self, invoice: Dict, historical: Optional[List[Dict]]) -> Dict:
        """Analyze price for anomalies"""
        if not historical:
            return {
                'has_anomaly': False,
                'reason': 'No historical data for comparison',
                'confidence': 0
            }
        
        # Filter to same vendor
        vendor_id = invoice.get('vendor') or invoice.get('vendor_id')
        vendor_invoices = [h for h in historical if 
                          (h.get('vendor') or h.get('vendor_id')) == vendor_id]
        
        if len(vendor_invoices) < 3:
            return {
                'has_anomaly': False,
                'reason': 'Insufficient historical data',
                'confidence': 0
            }
        
        # Calculate statistics
        amounts = [h.get('total_amount', 0) for h in vendor_invoices if h.get('total_amount')]
        if not amounts:
            return {
                'has_anomaly': False,
                'reason': 'No amount data available',
                'confidence': 0
            }
        
        avg = np.mean(amounts)
        std = np.std(amounts)
        current_amount = invoice.get('total_amount', 0)
        
        # Calculate z-score
        z_score = abs(current_amount - avg) / std if std > 0 else 0
        variance_pct = ((current_amount - avg) / avg * 100) if avg > 0 else 0
        
        has_anomaly = z_score > 2 or abs(variance_pct) > self.thresholds['price_variance_pct']
        
        return {
            'has_anomaly': has_anomaly,
            'current_amount': current_amount,
            'average_amount': round(avg, 2),
            'standard_deviation': round(std, 2),
            'z_score': round(z_score, 2),
            'variance_percent': round(variance_pct, 1),
            'direction': 'above' if variance_pct > 0 else 'below',
            'confidence': min(0.9, z_score * 0.3) if has_anomaly else 0,
            'risk': 'high' if z_score > 3 else ('medium' if has_anomaly else 'none')
        }
    
    def _analyze_vendor(self, vendor: Optional[Dict]) -> Dict:
        """Analyze vendor behavior patterns"""
        if not vendor:
            return {
                'has_anomaly': False,
                'reason': 'Vendor data not available',
                'confidence': 0
            }
        
        created_at = vendor.get('created_at') or vendor.get('createdAt')
        if created_at:
            if isinstance(created_at, str):
                created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            vendor_age = (datetime.now() - created_at.replace(tzinfo=None)).days
        else:
            vendor_age = 365  # Default to established vendor
        
        is_new = vendor_age < self.thresholds['new_vendor_days']
        
        return {
            'has_anomaly': is_new,
            'vendor_age_days': vendor_age,
            'is_new_vendor': is_new,
            'confidence': 0.6 if is_new else 0,
            'risk': 'medium' if is_new else 'low'
        }
    
    def _analyze_patterns(self, invoice: Dict) -> Dict:
        """Analyze patterns in invoice data"""
        patterns = {
            'has_weekend_submission': False,
            'has_after_hours_submission': False,
            'unusual_line_items': False
        }
        
        # Check submission timing
        created_at = invoice.get('created_at') or invoice.get('createdAt')
        if created_at:
            if isinstance(created_at, str):
                created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            patterns['has_weekend_submission'] = created_at.weekday() >= 5
            patterns['has_after_hours_submission'] = created_at.hour < 6 or created_at.hour > 22
        
        # Check line items
        items = invoice.get('items', [])
        if items:
            generic_terms = ['services', 'consulting', 'misc', 'other', 'various']
            generic_count = sum(1 for item in items 
                               if any(term in str(item.get('description', '')).lower() 
                                     for term in generic_terms))
            patterns['unusual_line_items'] = generic_count == len(items) and len(items) > 0
        
        anomaly_count = sum(patterns.values())
        
        return {
            **patterns,
            'anomaly_count': anomaly_count,
            'has_anomaly': anomaly_count >= 2,
            'confidence': 0.5 + (anomaly_count * 0.1) if anomaly_count >= 2 else 0,
            'risk': 'high' if anomaly_count >= 3 else ('medium' if anomaly_count >= 2 else 'low')
        }
    
    def _check_rush_payment(self, invoice: Dict) -> Dict:
        """Check for rush payment requests"""
        due_date = invoice.get('due_date') or invoice.get('dueDate')
        
        if not due_date:
            return {'is_rush': False, 'confidence': 0}
        
        if isinstance(due_date, str):
            due_date = datetime.fromisoformat(due_date.replace('Z', '+00:00'))
        
        days_until_due = (due_date.replace(tzinfo=None) - datetime.now()).days
        is_rush = days_until_due <= self.thresholds['rush_payment_days']
        
        return {
            'is_rush': is_rush,
            'days_until_due': days_until_due,
            'confidence': 0.6 if is_rush else 0,
            'risk': 'medium' if is_rush else 'none'
        }
    
    def _check_round_amount(self, invoice: Dict) -> Dict:
        """Check for suspicious round amounts"""
        amount = invoice.get('total_amount', 0)
        is_round = (amount >= self.thresholds['round_amount_threshold'] and 
                    amount % 100 == 0)
        
        # Check line items
        items = invoice.get('items', [])
        all_items_round = False
        if items:
            all_items_round = all(
                (item.get('amount', 0) or 
                 item.get('quantity', 1) * item.get('unit_price', 0)) % 10 == 0
                for item in items
            )
        
        is_suspicious = is_round and all_items_round
        
        return {
            'is_round': is_round,
            'all_items_round': all_items_round,
            'is_suspicious': is_suspicious,
            'amount': amount,
            'confidence': 0.4 if is_suspicious else 0,
            'risk': 'low' if is_suspicious else 'none'
        }
    
    def _calculate_anomaly_score(self, analysis: Dict) -> float:
        """Calculate overall anomaly score"""
        score = 0
        
        if analysis['duplicate_check'].get('is_duplicate'):
            score += self.fraud_weights['duplicate_invoice'] * analysis['duplicate_check']['confidence']
        
        if analysis['price_analysis'].get('has_anomaly'):
            score += self.fraud_weights['price_anomaly'] * analysis['price_analysis']['confidence']
        
        if analysis['rush_payment_check'].get('is_rush'):
            score += self.fraud_weights['rush_payment'] * analysis['rush_payment_check']['confidence']
        
        if analysis['round_amount_check'].get('is_suspicious'):
            score += self.fraud_weights['round_amount'] * analysis['round_amount_check']['confidence']
        
        if analysis['vendor_analysis'].get('is_new_vendor'):
            score += self.fraud_weights['new_vendor'] * analysis['vendor_analysis']['confidence']
        
        if analysis['pattern_analysis'].get('has_anomaly'):
            score += self.fraud_weights['frequency_anomaly'] * analysis['pattern_analysis']['confidence']
        
        return min(1.0, score)
    
    def _determine_risk_level(self, score: float) -> str:
        """Determine risk level from score"""
        if score >= 0.7:
            return 'critical'
        elif score >= 0.5:
            return 'high'
        elif score >= 0.3:
            return 'medium'
        elif score >= 0.1:
            return 'low'
        return 'none'
    
    def _compile_fraud_indicators(self, analysis: Dict) -> List[Dict]:
        """Compile list of fraud indicators"""
        indicators = []
        
        if analysis['duplicate_check'].get('is_duplicate'):
            indicators.append({
                'type': 'DUPLICATE_INVOICE',
                'severity': 'high',
                'description': f"Potential duplicate invoice detected ({analysis['duplicate_check']['duplicate_count']} matches)",
                'confidence': analysis['duplicate_check']['confidence']
            })
        
        if analysis['price_analysis'].get('has_anomaly'):
            indicators.append({
                'type': 'PRICE_ANOMALY',
                'severity': analysis['price_analysis']['risk'],
                'description': f"Invoice amount {analysis['price_analysis']['variance_percent']:.1f}% {analysis['price_analysis']['direction']} average",
                'confidence': analysis['price_analysis']['confidence']
            })
        
        if analysis['vendor_analysis'].get('is_new_vendor'):
            indicators.append({
                'type': 'NEW_VENDOR',
                'severity': 'medium',
                'description': f"Vendor account is only {analysis['vendor_analysis']['vendor_age_days']} days old",
                'confidence': analysis['vendor_analysis']['confidence']
            })
        
        if analysis['rush_payment_check'].get('is_rush'):
            indicators.append({
                'type': 'RUSH_PAYMENT',
                'severity': 'medium',
                'description': f"Payment due in {analysis['rush_payment_check']['days_until_due']} days",
                'confidence': analysis['rush_payment_check']['confidence']
            })
        
        if analysis['round_amount_check'].get('is_suspicious'):
            indicators.append({
                'type': 'ROUND_AMOUNT',
                'severity': 'low',
                'description': 'Invoice contains only round amounts',
                'confidence': analysis['round_amount_check']['confidence']
            })
        
        if analysis['pattern_analysis'].get('has_anomaly'):
            pattern_issues = []
            if analysis['pattern_analysis'].get('has_weekend_submission'):
                pattern_issues.append('weekend submission')
            if analysis['pattern_analysis'].get('has_after_hours_submission'):
                pattern_issues.append('after-hours submission')
            if analysis['pattern_analysis'].get('unusual_line_items'):
                pattern_issues.append('generic line items')
            
            if pattern_issues:
                indicators.append({
                    'type': 'PATTERN_ANOMALY',
                    'severity': analysis['pattern_analysis']['risk'],
                    'description': f"Unusual patterns: {', '.join(pattern_issues)}",
                    'confidence': analysis['pattern_analysis']['confidence']
                })
        
        return indicators
    
    def _generate_recommendations(self, analysis: Dict) -> List[Dict]:
        """Generate recommendations based on analysis"""
        recommendations = []
        
        if analysis['anomaly_score'] >= 0.7:
            recommendations.append({
                'priority': 'critical',
                'action': 'Hold payment and escalate to fraud team immediately'
            })
        elif analysis['anomaly_score'] >= 0.5:
            recommendations.append({
                'priority': 'high',
                'action': 'Require additional approval before processing'
            })
        
        if analysis['duplicate_check'].get('is_duplicate'):
            recommendations.append({
                'priority': 'high',
                'action': 'Verify this is not a duplicate submission before payment'
            })
        
        if analysis['price_analysis'].get('has_anomaly'):
            recommendations.append({
                'priority': 'medium',
                'action': 'Request itemized breakdown and compare with contract rates'
            })
        
        if analysis['vendor_analysis'].get('is_new_vendor'):
            recommendations.append({
                'priority': 'medium',
                'action': 'Verify vendor credentials and banking information'
            })
        
        return recommendations
    
    def _extract_features(self, invoices: List[Dict]) -> pd.DataFrame:
        """Extract features for ML model training"""
        features = []
        
        for inv in invoices:
            try:
                created_at = inv.get('created_at') or inv.get('createdAt')
                if created_at and isinstance(created_at, str):
                    created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                
                feature_row = {
                    'amount': inv.get('total_amount', 0),
                    'item_count': len(inv.get('items', [])),
                    'is_round_amount': 1 if inv.get('total_amount', 0) % 100 == 0 else 0,
                    'hour_of_day': created_at.hour if created_at else 12,
                    'day_of_week': created_at.weekday() if created_at else 0,
                    'is_weekend': 1 if created_at and created_at.weekday() >= 5 else 0
                }
                features.append(feature_row)
            except Exception as e:
                logger.warning(f"Feature extraction error: {str(e)}")
                continue
        
        return pd.DataFrame(features)


# Singleton instance
fraud_detection_service = FraudDetectionService()
