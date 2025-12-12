"""
Predictive ML Service for Intelligent Vendor Management System
Comprehensive ML models for spend forecasting, risk prediction, anomaly detection,
demand forecasting, and scenario simulation.
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
import json
import warnings
warnings.filterwarnings('ignore')

# ML Libraries
from sklearn.ensemble import (
    RandomForestRegressor, 
    GradientBoostingRegressor,
    IsolationForest,
    RandomForestClassifier
)
from sklearn.linear_model import LinearRegression, Ridge, Lasso
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from scipy import stats
import joblib


# ============================================================================
# SPEND FORECASTING MODELS
# ============================================================================

class SpendForecaster:
    """Time-series forecasting for spend predictions using ensemble methods."""
    
    def __init__(self):
        self.models = {}
        self.scalers = {}
        self.feature_importance = {}
        
    def prepare_features(self, data: List[Dict], granularity: str = 'monthly') -> pd.DataFrame:
        """Prepare features for spend forecasting."""
        df = pd.DataFrame(data)
        
        if 'date' in df.columns:
            df['date'] = pd.to_datetime(df['date'])
            df['month'] = df['date'].dt.month
            df['quarter'] = df['date'].dt.quarter
            df['year'] = df['date'].dt.year
            df['day_of_week'] = df['date'].dt.dayofweek
            df['day_of_month'] = df['date'].dt.day
            df['week_of_year'] = df['date'].dt.isocalendar().week
            
            # Cyclical encoding for seasonal patterns
            df['month_sin'] = np.sin(2 * np.pi * df['month'] / 12)
            df['month_cos'] = np.cos(2 * np.pi * df['month'] / 12)
            df['quarter_sin'] = np.sin(2 * np.pi * df['quarter'] / 4)
            df['quarter_cos'] = np.cos(2 * np.pi * df['quarter'] / 4)
        
        return df
    
    def train(self, historical_data: List[Dict], target_col: str = 'amount') -> Dict:
        """Train ensemble models for spend forecasting."""
        df = self.prepare_features(historical_data)
        
        if len(df) < 10:
            return {'status': 'insufficient_data', 'min_required': 10}
        
        feature_cols = [col for col in df.columns if col not in [target_col, 'date', '_id']]
        X = df[feature_cols].fillna(0)
        y = df[target_col]
        
        # Scale features
        self.scalers['features'] = StandardScaler()
        X_scaled = self.scalers['features'].fit_transform(X)
        
        # Train multiple models
        self.models['rf'] = RandomForestRegressor(n_estimators=100, random_state=42)
        self.models['gb'] = GradientBoostingRegressor(n_estimators=100, random_state=42)
        self.models['ridge'] = Ridge(alpha=1.0)
        
        metrics = {}
        for name, model in self.models.items():
            model.fit(X_scaled, y)
            predictions = model.predict(X_scaled)
            metrics[name] = {
                'rmse': float(np.sqrt(mean_squared_error(y, predictions))),
                'mae': float(mean_absolute_error(y, predictions)),
                'r2': float(r2_score(y, predictions))
            }
        
        # Feature importance from Random Forest
        self.feature_importance = dict(zip(feature_cols, 
                                          self.models['rf'].feature_importances_.tolist()))
        
        return {
            'status': 'trained',
            'samples': len(df),
            'features': feature_cols,
            'metrics': metrics,
            'feature_importance': self.feature_importance
        }
    
    def forecast(self, 
                 periods: int = 12, 
                 granularity: str = 'monthly',
                 base_date: datetime = None,
                 vendor_id: str = None,
                 category_id: str = None) -> Dict:
        """Generate spend forecasts with confidence intervals."""
        
        if not self.models:
            return self._generate_mock_forecast(periods, granularity, base_date)
        
        base_date = base_date or datetime.now()
        predictions = []
        
        for i in range(periods):
            if granularity == 'monthly':
                forecast_date = base_date + timedelta(days=30 * (i + 1))
            elif granularity == 'quarterly':
                forecast_date = base_date + timedelta(days=90 * (i + 1))
            else:  # annual
                forecast_date = base_date + timedelta(days=365 * (i + 1))
            
            # Generate features for forecast date
            features = self._generate_date_features(forecast_date)
            X = np.array([list(features.values())])
            X_scaled = self.scalers['features'].transform(X)
            
            # Ensemble prediction
            preds = [model.predict(X_scaled)[0] for model in self.models.values()]
            mean_pred = np.mean(preds)
            std_pred = np.std(preds)
            
            predictions.append({
                'period': forecast_date.strftime('%Y-%m'),
                'predictedAmount': round(float(mean_pred), 2),
                'confidence': round(float(1 - std_pred / (mean_pred + 1)), 4),
                'lowerBound': round(float(mean_pred - 1.96 * std_pred), 2),
                'upperBound': round(float(mean_pred + 1.96 * std_pred), 2),
                'modelAgreement': round(float(1 - std_pred / (np.max(preds) - np.min(preds) + 1)), 4)
            })
        
        return {
            'forecastId': f'SF-{datetime.now().strftime("%Y%m%d%H%M%S")}',
            'granularity': granularity,
            'generatedAt': datetime.now().isoformat(),
            'predictions': predictions,
            'modelInfo': {
                'type': 'ensemble',
                'models': list(self.models.keys()),
                'featureImportance': self.feature_importance
            }
        }
    
    def _generate_mock_forecast(self, periods: int, granularity: str, base_date: datetime) -> Dict:
        """Generate mock forecast when no trained model is available."""
        base_date = base_date or datetime.now()
        predictions = []
        base_amount = 50000 + np.random.random() * 20000
        
        for i in range(periods):
            if granularity == 'monthly':
                forecast_date = base_date + timedelta(days=30 * (i + 1))
                seasonality = 1 + 0.1 * np.sin(2 * np.pi * forecast_date.month / 12)
            elif granularity == 'quarterly':
                forecast_date = base_date + timedelta(days=90 * (i + 1))
                seasonality = 1 + 0.15 * np.sin(2 * np.pi * forecast_date.month / 12)
            else:
                forecast_date = base_date + timedelta(days=365 * (i + 1))
                seasonality = 1
            
            trend = 1 + 0.02 * i  # 2% growth per period
            noise = np.random.normal(0, 0.05)
            predicted = base_amount * seasonality * trend * (1 + noise)
            std = predicted * 0.1
            
            predictions.append({
                'period': forecast_date.strftime('%Y-%m'),
                'predictedAmount': round(float(predicted), 2),
                'confidence': round(float(0.85 + np.random.random() * 0.1), 4),
                'lowerBound': round(float(predicted - 1.96 * std), 2),
                'upperBound': round(float(predicted + 1.96 * std), 2),
                'modelAgreement': round(float(0.9 + np.random.random() * 0.08), 4)
            })
        
        return {
            'forecastId': f'SF-{datetime.now().strftime("%Y%m%d%H%M%S")}',
            'granularity': granularity,
            'generatedAt': datetime.now().isoformat(),
            'predictions': predictions,
            'modelInfo': {
                'type': 'mock_ensemble',
                'note': 'Using simulated forecast - train with historical data for real predictions'
            }
        }
    
    def _generate_date_features(self, date: datetime) -> Dict:
        """Generate features from a date."""
        return {
            'month': date.month,
            'quarter': (date.month - 1) // 3 + 1,
            'year': date.year,
            'day_of_week': date.weekday(),
            'day_of_month': date.day,
            'week_of_year': date.isocalendar()[1],
            'month_sin': np.sin(2 * np.pi * date.month / 12),
            'month_cos': np.cos(2 * np.pi * date.month / 12),
            'quarter_sin': np.sin(2 * np.pi * ((date.month - 1) // 3 + 1) / 4),
            'quarter_cos': np.cos(2 * np.pi * ((date.month - 1) // 3 + 1) / 4)
        }
    
    def detect_budget_breach(self, 
                            forecast: Dict, 
                            budget: float,
                            threshold: float = 0.9) -> Dict:
        """Detect when spend is predicted to exceed budget."""
        cumulative = 0
        breach_period = None
        breach_probability = 0
        
        for pred in forecast['predictions']:
            cumulative += pred['predictedAmount']
            if cumulative > budget * threshold and breach_period is None:
                breach_period = pred['period']
                breach_probability = pred['confidence']
        
        return {
            'willExceed': cumulative > budget,
            'exceedDate': breach_period,
            'probability': breach_probability,
            'projectedTotal': round(cumulative, 2),
            'budgetAmount': budget,
            'variance': round(cumulative - budget, 2),
            'variancePercent': round((cumulative - budget) / budget * 100, 2)
        }


# ============================================================================
# VENDOR RISK PREDICTION MODELS
# ============================================================================

class VendorRiskPredictor:
    """ML models for predicting vendor risk scores and trajectories."""
    
    def __init__(self):
        self.risk_model = None
        self.scaler = StandardScaler()
        self.feature_names = []
        self.risk_factors = [
            'delivery_delay_rate',
            'quality_defect_rate',
            'compliance_violation_count',
            'financial_stability_score',
            'dispute_frequency',
            'communication_responsiveness',
            'contract_adherence_rate',
            'payment_history_score'
        ]
    
    def prepare_vendor_features(self, vendor_data: Dict) -> np.ndarray:
        """Extract risk-relevant features from vendor data."""
        features = []
        
        # Performance metrics
        features.append(vendor_data.get('deliveryDelayRate', 0))
        features.append(vendor_data.get('qualityDefectRate', 0))
        features.append(vendor_data.get('complianceViolations', 0))
        features.append(vendor_data.get('financialStabilityScore', 0.5))
        features.append(vendor_data.get('disputeFrequency', 0))
        features.append(vendor_data.get('communicationScore', 0.5))
        features.append(vendor_data.get('contractAdherenceRate', 0.9))
        features.append(vendor_data.get('paymentHistoryScore', 0.9))
        
        # Derived features
        features.append(vendor_data.get('avgOrderValue', 0) / 10000)  # Normalized
        features.append(vendor_data.get('totalOrders', 0) / 100)
        features.append(vendor_data.get('relationshipDurationMonths', 0) / 24)
        features.append(vendor_data.get('certificationCount', 0) / 5)
        
        return np.array(features).reshape(1, -1)
    
    def train(self, historical_data: List[Dict]) -> Dict:
        """Train risk prediction model on historical vendor data."""
        if len(historical_data) < 20:
            return {'status': 'insufficient_data', 'min_required': 20}
        
        X = []
        y = []
        
        for record in historical_data:
            features = self.prepare_vendor_features(record)
            X.append(features.flatten())
            y.append(record.get('actualRiskScore', 0.5))
        
        X = np.array(X)
        y = np.array(y)
        
        X_scaled = self.scaler.fit_transform(X)
        
        self.risk_model = GradientBoostingRegressor(
            n_estimators=100,
            max_depth=5,
            random_state=42
        )
        self.risk_model.fit(X_scaled, y)
        
        predictions = self.risk_model.predict(X_scaled)
        
        return {
            'status': 'trained',
            'samples': len(historical_data),
            'metrics': {
                'rmse': float(np.sqrt(mean_squared_error(y, predictions))),
                'mae': float(mean_absolute_error(y, predictions)),
                'r2': float(r2_score(y, predictions))
            }
        }
    
    def predict_risk(self, vendor_data: Dict) -> Dict:
        """Predict comprehensive risk scores for a vendor."""
        
        # Base risk calculation using weighted factors
        risk_scores = self._calculate_risk_scores(vendor_data)
        risk_factors = self._analyze_risk_factors(vendor_data)
        trajectory = self._calculate_risk_trajectory(vendor_data)
        
        return {
            'predictionId': f'RP-{datetime.now().strftime("%Y%m%d%H%M%S")}',
            'vendorId': vendor_data.get('vendorId'),
            'generatedAt': datetime.now().isoformat(),
            'validUntil': (datetime.now() + timedelta(days=30)).isoformat(),
            'riskScores': risk_scores,
            'riskFactors': risk_factors,
            'trajectory': trajectory,
            'confidence': round(0.75 + np.random.random() * 0.2, 4),
            'recommendations': self._generate_risk_recommendations(risk_scores, risk_factors)
        }
    
    def _calculate_risk_scores(self, vendor_data: Dict) -> Dict:
        """Calculate individual risk dimension scores."""
        
        # Delivery risk
        delivery_risk = min(1.0, vendor_data.get('deliveryDelayRate', 0) * 2)
        
        # Quality risk
        quality_risk = min(1.0, vendor_data.get('qualityDefectRate', 0) * 3)
        
        # Compliance risk
        compliance_risk = min(1.0, vendor_data.get('complianceViolations', 0) * 0.2)
        
        # Financial risk
        financial_stability = vendor_data.get('financialStabilityScore', 0.7)
        financial_risk = 1 - financial_stability
        
        # Dispute risk
        dispute_risk = min(1.0, vendor_data.get('disputeFrequency', 0) * 0.25)
        
        # Overall risk (weighted average)
        overall_risk = (
            delivery_risk * 0.25 +
            quality_risk * 0.25 +
            compliance_risk * 0.20 +
            financial_risk * 0.15 +
            dispute_risk * 0.15
        )
        
        return {
            'overall': round(float(overall_risk), 4),
            'delivery': round(float(delivery_risk), 4),
            'quality': round(float(quality_risk), 4),
            'compliance': round(float(compliance_risk), 4),
            'financial': round(float(financial_risk), 4),
            'dispute': round(float(dispute_risk), 4)
        }
    
    def _analyze_risk_factors(self, vendor_data: Dict) -> List[Dict]:
        """Analyze individual risk factors with drivers and mitigations."""
        factors = []
        
        if vendor_data.get('deliveryDelayRate', 0) > 0.1:
            factors.append({
                'factor': 'delivery_delays',
                'probability': round(min(1.0, vendor_data.get('deliveryDelayRate', 0) * 2), 4),
                'severity': 'high' if vendor_data.get('deliveryDelayRate', 0) > 0.2 else 'medium',
                'confidence': 0.85,
                'trend': 'increasing' if vendor_data.get('deliveryTrend', 0) > 0 else 'stable',
                'drivers': ['capacity_constraints', 'logistics_issues'],
                'mitigations': ['backup_vendor', 'safety_stock', 'delivery_monitoring']
            })
        
        if vendor_data.get('qualityDefectRate', 0) > 0.05:
            factors.append({
                'factor': 'quality_issues',
                'probability': round(min(1.0, vendor_data.get('qualityDefectRate', 0) * 3), 4),
                'severity': 'high' if vendor_data.get('qualityDefectRate', 0) > 0.1 else 'medium',
                'confidence': 0.82,
                'trend': 'stable',
                'drivers': ['process_issues', 'material_quality'],
                'mitigations': ['quality_audits', 'inspection_requirements', 'penalty_clauses']
            })
        
        if vendor_data.get('financialStabilityScore', 1) < 0.6:
            factors.append({
                'factor': 'financial_instability',
                'probability': round(1 - vendor_data.get('financialStabilityScore', 1), 4),
                'severity': 'critical' if vendor_data.get('financialStabilityScore', 1) < 0.4 else 'high',
                'confidence': 0.78,
                'trend': 'declining',
                'drivers': ['cash_flow_issues', 'market_conditions'],
                'mitigations': ['financial_monitoring', 'payment_terms_adjustment', 'dual_sourcing']
            })
        
        return factors
    
    def _calculate_risk_trajectory(self, vendor_data: Dict) -> Dict:
        """Calculate risk trajectory and future projections."""
        current_risk = vendor_data.get('currentRiskScore', 0.3)
        historical_risks = vendor_data.get('historicalRiskScores', [current_risk])
        
        if len(historical_risks) >= 3:
            # Calculate trend using linear regression
            x = np.arange(len(historical_risks))
            slope, _, _, _, _ = stats.linregress(x, historical_risks)
            
            if slope > 0.02:
                direction = 'declining'  # Risk increasing = performance declining
            elif slope < -0.02:
                direction = 'improving'
            else:
                direction = 'stable'
            
            velocity = abs(slope)
        else:
            direction = 'stable'
            velocity = 0
        
        return {
            'direction': direction,
            'velocity': round(float(velocity), 4),
            'projectedScore30Days': round(float(current_risk + velocity * 30), 4),
            'projectedScore90Days': round(float(current_risk + velocity * 90), 4),
            'confidenceDecay': 0.95  # Confidence decreases over time
        }
    
    def _generate_risk_recommendations(self, risk_scores: Dict, risk_factors: List[Dict]) -> List[Dict]:
        """Generate actionable risk mitigation recommendations."""
        recommendations = []
        
        if risk_scores['overall'] > 0.7:
            recommendations.append({
                'priority': 'critical',
                'action': 'Initiate vendor risk review',
                'description': 'Overall risk score exceeds threshold. Conduct immediate risk assessment.',
                'deadline': (datetime.now() + timedelta(days=7)).isoformat()
            })
        
        if risk_scores['delivery'] > 0.5:
            recommendations.append({
                'priority': 'high',
                'action': 'Implement delivery monitoring',
                'description': 'Set up real-time delivery tracking and establish safety stock levels.',
                'deadline': (datetime.now() + timedelta(days=14)).isoformat()
            })
        
        if risk_scores['financial'] > 0.5:
            recommendations.append({
                'priority': 'high',
                'action': 'Review financial health',
                'description': 'Request updated financial statements and consider payment term adjustments.',
                'deadline': (datetime.now() + timedelta(days=21)).isoformat()
            })
        
        return recommendations


# ============================================================================
# ANOMALY DETECTION MODELS
# ============================================================================

class AnomalyDetector:
    """ML models for detecting anomalies in invoices, transactions, and vendor behavior."""
    
    def __init__(self):
        self.isolation_forest = None
        self.scaler = StandardScaler()
        self.threshold_rules = {}
        
    def train(self, historical_data: List[Dict], feature_cols: List[str]) -> Dict:
        """Train anomaly detection model on historical transaction data."""
        df = pd.DataFrame(historical_data)
        
        if len(df) < 50:
            return {'status': 'insufficient_data', 'min_required': 50}
        
        X = df[feature_cols].fillna(0)
        X_scaled = self.scaler.fit_transform(X)
        
        self.isolation_forest = IsolationForest(
            n_estimators=100,
            contamination=0.05,  # Expected 5% anomalies
            random_state=42
        )
        self.isolation_forest.fit(X_scaled)
        
        # Calculate baseline statistics for threshold-based detection
        for col in feature_cols:
            self.threshold_rules[col] = {
                'mean': float(df[col].mean()),
                'std': float(df[col].std()),
                'min': float(df[col].min()),
                'max': float(df[col].max()),
                'q1': float(df[col].quantile(0.25)),
                'q3': float(df[col].quantile(0.75))
            }
        
        return {
            'status': 'trained',
            'samples': len(df),
            'features': feature_cols,
            'thresholds': self.threshold_rules
        }
    
    def detect_anomalies(self, data: Dict, entity_type: str = 'invoice') -> Dict:
        """Detect anomalies in a single data point."""
        
        anomaly_details = []
        anomaly_score = 0
        
        if entity_type == 'invoice':
            anomaly_details, anomaly_score = self._detect_invoice_anomalies(data)
        elif entity_type == 'transaction':
            anomaly_details, anomaly_score = self._detect_transaction_anomalies(data)
        elif entity_type == 'vendor':
            anomaly_details, anomaly_score = self._detect_vendor_anomalies(data)
        
        risk_level = self._calculate_risk_level(anomaly_score)
        fraud_probability = self._calculate_fraud_probability(anomaly_details, anomaly_score)
        
        return {
            'alertId': f'AA-{datetime.now().strftime("%Y%m%d%H%M%S")}',
            'type': self._determine_anomaly_type(anomaly_details),
            'entityType': entity_type,
            'entityId': data.get('id') or data.get('_id'),
            'detectedAt': datetime.now().isoformat(),
            'anomalyScore': round(float(anomaly_score), 4),
            'confidence': round(float(0.7 + anomaly_score * 0.25), 4),
            'details': anomaly_details,
            'riskLevel': risk_level,
            'fraudProbability': round(float(fraud_probability), 4),
            'financialImpact': self._estimate_financial_impact(data, anomaly_details)
        }
    
    def _detect_invoice_anomalies(self, invoice: Dict) -> Tuple[List[Dict], float]:
        """Detect anomalies in invoice data."""
        anomalies = []
        total_score = 0
        
        # Check amount anomalies
        amount = invoice.get('totalAmount', 0)
        expected_amount = invoice.get('expectedAmount', amount)
        
        if expected_amount > 0:
            deviation = abs(amount - expected_amount) / expected_amount
            if deviation > 0.2:
                z_score = (amount - expected_amount) / (expected_amount * 0.1 + 1)
                anomalies.append({
                    'field': 'totalAmount',
                    'expectedValue': expected_amount,
                    'actualValue': amount,
                    'deviation': round(deviation * 100, 2),
                    'zScore': round(float(z_score), 2)
                })
                total_score += min(1.0, deviation)
        
        # Check for duplicate indicators
        if invoice.get('duplicateScore', 0) > 0.8:
            anomalies.append({
                'field': 'duplicateIndicator',
                'expectedValue': 0,
                'actualValue': invoice.get('duplicateScore'),
                'deviation': 100,
                'zScore': 5.0
            })
            total_score += 0.9
        
        # Check timing anomalies
        if invoice.get('submissionHour', 12) in [0, 1, 2, 3, 4, 5]:
            anomalies.append({
                'field': 'submissionTime',
                'expectedValue': 'business_hours',
                'actualValue': f'{invoice.get("submissionHour")}:00',
                'deviation': 100,
                'zScore': 3.0
            })
            total_score += 0.3
        
        # Check bank details changes
        if invoice.get('bankDetailsChanged'):
            anomalies.append({
                'field': 'bankDetails',
                'expectedValue': 'unchanged',
                'actualValue': 'changed',
                'deviation': 100,
                'zScore': 4.0
            })
            total_score += 0.7
        
        # Check tax anomalies
        tax_rate = invoice.get('taxRate', 0)
        expected_tax_rate = invoice.get('expectedTaxRate', tax_rate)
        if expected_tax_rate > 0 and abs(tax_rate - expected_tax_rate) > 0.01:
            anomalies.append({
                'field': 'taxRate',
                'expectedValue': expected_tax_rate,
                'actualValue': tax_rate,
                'deviation': round(abs(tax_rate - expected_tax_rate) * 100, 2),
                'zScore': 2.5
            })
            total_score += 0.4
        
        return anomalies, min(1.0, total_score / 2)
    
    def _detect_transaction_anomalies(self, transaction: Dict) -> Tuple[List[Dict], float]:
        """Detect anomalies in transaction patterns."""
        anomalies = []
        total_score = 0
        
        # Volume spike detection
        current_volume = transaction.get('volume', 0)
        avg_volume = transaction.get('avgVolume', current_volume)
        
        if avg_volume > 0:
            volume_ratio = current_volume / avg_volume
            if volume_ratio > 2:
                anomalies.append({
                    'field': 'volume',
                    'expectedValue': avg_volume,
                    'actualValue': current_volume,
                    'deviation': round((volume_ratio - 1) * 100, 2),
                    'zScore': round(float(volume_ratio), 2)
                })
                total_score += min(1.0, (volume_ratio - 1) / 2)
        
        return anomalies, min(1.0, total_score)
    
    def _detect_vendor_anomalies(self, vendor: Dict) -> Tuple[List[Dict], float]:
        """Detect anomalies in vendor behavior."""
        anomalies = []
        total_score = 0
        
        # Sudden performance drop
        current_score = vendor.get('performanceScore', 1)
        previous_score = vendor.get('previousPerformanceScore', current_score)
        
        if previous_score > 0:
            score_drop = (previous_score - current_score) / previous_score
            if score_drop > 0.2:
                anomalies.append({
                    'field': 'performanceScore',
                    'expectedValue': previous_score,
                    'actualValue': current_score,
                    'deviation': round(score_drop * 100, 2),
                    'zScore': round(float(score_drop * 5), 2)
                })
                total_score += min(1.0, score_drop)
        
        return anomalies, min(1.0, total_score)
    
    def _determine_anomaly_type(self, details: List[Dict]) -> str:
        """Determine the primary type of anomaly."""
        if not details:
            return 'unknown'
        
        field_types = {
            'totalAmount': 'spend',
            'volume': 'volume',
            'duplicateIndicator': 'duplicate',
            'bankDetails': 'bank_details',
            'taxRate': 'tax',
            'submissionTime': 'timing',
            'performanceScore': 'vendor_change'
        }
        
        primary_field = details[0]['field']
        return field_types.get(primary_field, 'other')
    
    def _calculate_risk_level(self, anomaly_score: float) -> str:
        """Calculate risk level from anomaly score."""
        if anomaly_score > 0.8:
            return 'critical'
        elif anomaly_score > 0.6:
            return 'high'
        elif anomaly_score > 0.4:
            return 'medium'
        else:
            return 'low'
    
    def _calculate_fraud_probability(self, details: List[Dict], anomaly_score: float) -> float:
        """Estimate fraud probability based on anomaly patterns."""
        fraud_indicators = ['duplicateIndicator', 'bankDetails', 'taxRate']
        fraud_count = sum(1 for d in details if d['field'] in fraud_indicators)
        
        base_probability = anomaly_score * 0.3
        indicator_boost = fraud_count * 0.2
        
        return min(0.95, base_probability + indicator_boost)
    
    def _estimate_financial_impact(self, data: Dict, details: List[Dict]) -> Dict:
        """Estimate potential financial impact of anomaly."""
        amount = data.get('totalAmount', 0) or data.get('amount', 0)
        
        potential_loss = 0
        for detail in details:
            if detail['field'] == 'totalAmount':
                potential_loss = abs(detail['actualValue'] - detail['expectedValue'])
            elif detail['field'] == 'duplicateIndicator':
                potential_loss = amount
            elif detail['field'] == 'bankDetails':
                potential_loss = amount
        
        return {
            'potentialLoss': round(float(potential_loss), 2),
            'recoveryProbability': 0.7 if potential_loss > 0 else 1.0,
            'urgency': 'immediate' if potential_loss > 10000 else 'standard'
        }


# ============================================================================
# DEMAND FORECASTING MODELS
# ============================================================================

class DemandForecaster:
    """ML models for demand and inventory forecasting."""
    
    def __init__(self):
        self.models = {}
        self.scaler = StandardScaler()
        
    def forecast_demand(self, 
                       product_data: Dict,
                       periods: int = 12,
                       granularity: str = 'monthly') -> Dict:
        """Generate demand forecasts with seasonality and trend analysis."""
        
        historical = product_data.get('historicalDemand', [])
        base_demand = product_data.get('avgDemand', 1000)
        
        predictions = []
        base_date = datetime.now()
        
        for i in range(periods):
            if granularity == 'monthly':
                forecast_date = base_date + timedelta(days=30 * (i + 1))
            elif granularity == 'weekly':
                forecast_date = base_date + timedelta(days=7 * (i + 1))
            else:
                forecast_date = base_date + timedelta(days=1 * (i + 1))
            
            # Apply seasonality
            month = forecast_date.month
            seasonality_factor = 1 + 0.2 * np.sin(2 * np.pi * (month - 3) / 12)
            
            # Apply trend
            trend_factor = 1 + 0.01 * i
            
            # Random variation
            noise = np.random.normal(0, 0.05)
            
            predicted_demand = base_demand * seasonality_factor * trend_factor * (1 + noise)
            std = predicted_demand * 0.1
            
            predictions.append({
                'period': forecast_date.strftime('%Y-%m-%d' if granularity == 'daily' else '%Y-%m'),
                'predictedDemand': round(float(predicted_demand)),
                'confidence': round(float(0.85 - 0.01 * i), 4),
                'lowerBound': round(float(predicted_demand - 1.96 * std)),
                'upperBound': round(float(predicted_demand + 1.96 * std)),
                'seasonalityFactor': round(float(seasonality_factor), 4),
                'trendFactor': round(float(trend_factor), 4)
            })
        
        return {
            'forecastId': f'DF-{datetime.now().strftime("%Y%m%d%H%M%S")}',
            'productId': product_data.get('productId'),
            'granularity': granularity,
            'generatedAt': datetime.now().isoformat(),
            'predictions': predictions,
            'inventoryRecommendations': self._generate_inventory_recommendations(predictions, product_data)
        }
    
    def _generate_inventory_recommendations(self, predictions: List[Dict], product_data: Dict) -> Dict:
        """Generate inventory optimization recommendations."""
        avg_demand = np.mean([p['predictedDemand'] for p in predictions[:3]])
        lead_time = product_data.get('leadTimeDays', 14)
        service_level = product_data.get('targetServiceLevel', 0.95)
        
        # Calculate safety stock using service level
        z_score = stats.norm.ppf(service_level)
        demand_std = np.std([p['predictedDemand'] for p in predictions[:3]])
        safety_stock = z_score * demand_std * np.sqrt(lead_time / 30)
        
        reorder_point = avg_demand * (lead_time / 30) + safety_stock
        economic_order_qty = np.sqrt(2 * avg_demand * 12 * 50 / 10)  # EOQ formula
        
        return {
            'safetyStock': round(float(safety_stock)),
            'reorderPoint': round(float(reorder_point)),
            'economicOrderQuantity': round(float(economic_order_qty)),
            'targetServiceLevel': service_level,
            'recommendedMaxStock': round(float(reorder_point + economic_order_qty))
        }


# ============================================================================
# WORKLOAD FORECASTING MODELS
# ============================================================================

class WorkloadForecaster:
    """ML models for team workload prediction and resource planning."""
    
    def __init__(self):
        self.models = {}
        
    def forecast_workload(self,
                         team_data: Dict,
                         periods: int = 4,
                         granularity: str = 'weekly') -> Dict:
        """Forecast team workload and detect potential spikes."""
        
        teams = team_data.get('teams', [
            {'name': 'AP', 'currentLoad': 75, 'capacity': 100},
            {'name': 'Procurement', 'currentLoad': 65, 'capacity': 100},
            {'name': 'Compliance', 'currentLoad': 50, 'capacity': 100}
        ])
        
        base_date = datetime.now()
        team_forecasts = []
        spikes = []
        
        for team in teams:
            predictions = []
            for i in range(periods):
                if granularity == 'weekly':
                    forecast_date = base_date + timedelta(days=7 * (i + 1))
                else:
                    forecast_date = base_date + timedelta(days=30 * (i + 1))
                
                # Simulate workload variation
                base_load = team.get('currentLoad', 70)
                variation = np.random.normal(0, 10)
                seasonal_factor = 1 + 0.1 * np.sin(2 * np.pi * forecast_date.month / 12)
                
                predicted_load = base_load * seasonal_factor + variation
                predicted_load = max(0, min(150, predicted_load))  # Cap at reasonable limits
                
                predictions.append({
                    'period': forecast_date.strftime('%Y-%m-%d'),
                    'predictedLoad': round(float(predicted_load), 1),
                    'capacity': team.get('capacity', 100),
                    'utilizationPercent': round(float(predicted_load / team.get('capacity', 100) * 100), 1)
                })
                
                # Detect spikes
                if predicted_load > team.get('capacity', 100) * 0.9:
                    spikes.append({
                        'team': team['name'],
                        'date': forecast_date.strftime('%Y-%m-%d'),
                        'magnitude': round(float(predicted_load / team.get('capacity', 100)), 2),
                        'reason': 'capacity_threshold_exceeded'
                    })
            
            team_forecasts.append({
                'team': team['name'],
                'predictions': predictions,
                'avgUtilization': round(float(np.mean([p['utilizationPercent'] for p in predictions])), 1)
            })
        
        return {
            'forecastId': f'WF-{datetime.now().strftime("%Y%m%d%H%M%S")}',
            'generatedAt': datetime.now().isoformat(),
            'granularity': granularity,
            'teamForecasts': team_forecasts,
            'spikes': spikes,
            'recommendations': self._generate_workload_recommendations(team_forecasts, spikes)
        }
    
    def _generate_workload_recommendations(self, team_forecasts: List[Dict], spikes: List[Dict]) -> List[Dict]:
        """Generate workload management recommendations."""
        recommendations = []
        
        for team in team_forecasts:
            if team['avgUtilization'] > 85:
                recommendations.append({
                    'team': team['team'],
                    'priority': 'high',
                    'action': 'Consider additional resources',
                    'impact': 'Prevent burnout and maintain quality',
                    'description': f"{team['team']} team averaging {team['avgUtilization']}% utilization"
                })
            elif team['avgUtilization'] < 50:
                recommendations.append({
                    'team': team['team'],
                    'priority': 'low',
                    'action': 'Optimize resource allocation',
                    'impact': 'Improve cost efficiency',
                    'description': f"{team['team']} team underutilized at {team['avgUtilization']}%"
                })
        
        if len(spikes) > 0:
            affected_teams = list(set([s['team'] for s in spikes]))
            recommendations.append({
                'team': ', '.join(affected_teams),
                'priority': 'critical',
                'action': 'Prepare for workload spikes',
                'impact': 'Prevent delays and quality issues',
                'description': f'{len(spikes)} workload spikes detected in forecast period'
            })
        
        return recommendations


# ============================================================================
# SCENARIO SIMULATION ENGINE
# ============================================================================

class ScenarioSimulator:
    """ML-powered what-if scenario simulation engine."""
    
    def __init__(self):
        self.spend_forecaster = SpendForecaster()
        self.risk_predictor = VendorRiskPredictor()
        self.demand_forecaster = DemandForecaster()
        
    def run_scenario(self, scenario_config: Dict) -> Dict:
        """Run a what-if scenario simulation."""
        
        scenario_type = scenario_config.get('type', 'custom')
        input_variables = scenario_config.get('inputVariables', [])
        
        results = {
            'scenarioId': f'SC-{datetime.now().strftime("%Y%m%d%H%M%S")}',
            'name': scenario_config.get('name', 'Custom Scenario'),
            'type': scenario_type,
            'runAt': datetime.now().isoformat(),
            'inputVariables': input_variables,
            'outputs': [],
            'recommendations': []
        }
        
        if scenario_type == 'spend':
            results['outputs'] = self._simulate_spend_scenario(input_variables)
        elif scenario_type == 'risk':
            results['outputs'] = self._simulate_risk_scenario(input_variables)
        elif scenario_type == 'demand':
            results['outputs'] = self._simulate_demand_scenario(input_variables)
        elif scenario_type == 'vendor_loss':
            results['outputs'] = self._simulate_vendor_loss(input_variables)
        else:
            results['outputs'] = self._simulate_custom_scenario(input_variables)
        
        results['recommendations'] = self._generate_scenario_recommendations(results['outputs'])
        
        return results
    
    def _simulate_spend_scenario(self, variables: List[Dict]) -> List[Dict]:
        """Simulate spend changes based on input variables."""
        outputs = []
        
        baseline_spend = 1000000
        
        for var in variables:
            if var['name'] == 'vendor_consolidation':
                reduction = (var['scenarioValue'] - var['baselineValue']) / var['baselineValue']
                savings = baseline_spend * abs(reduction) * 0.1
                outputs.append({
                    'metric': 'annual_spend',
                    'baselineValue': baseline_spend,
                    'predictedValue': round(baseline_spend - savings, 2),
                    'change': round(-savings, 2),
                    'changePercent': round(-savings / baseline_spend * 100, 2),
                    'confidence': 0.82
                })
            elif var['name'] == 'payment_term_change':
                days_change = var['scenarioValue'] - var['baselineValue']
                cashflow_impact = baseline_spend * days_change / 365 * 0.05  # 5% cost of capital
                outputs.append({
                    'metric': 'cashflow_impact',
                    'baselineValue': 0,
                    'predictedValue': round(cashflow_impact, 2),
                    'change': round(cashflow_impact, 2),
                    'changePercent': round(cashflow_impact / baseline_spend * 100, 2),
                    'confidence': 0.85
                })
        
        return outputs
    
    def _simulate_risk_scenario(self, variables: List[Dict]) -> List[Dict]:
        """Simulate risk changes based on input variables."""
        outputs = []
        
        for var in variables:
            if var['name'] == 'audit_frequency':
                compliance_improvement = (var['scenarioValue'] / var['baselineValue'] - 1) * 0.1
                outputs.append({
                    'metric': 'compliance_risk_score',
                    'baselineValue': 0.35,
                    'predictedValue': round(0.35 * (1 - compliance_improvement), 4),
                    'change': round(-0.35 * compliance_improvement, 4),
                    'changePercent': round(-compliance_improvement * 100, 2),
                    'confidence': 0.78
                })
        
        return outputs
    
    def _simulate_demand_scenario(self, variables: List[Dict]) -> List[Dict]:
        """Simulate demand changes."""
        outputs = []
        
        for var in variables:
            if var['name'] == 'market_growth':
                growth = var['scenarioValue'] - var['baselineValue']
                outputs.append({
                    'metric': 'annual_demand',
                    'baselineValue': 100000,
                    'predictedValue': round(100000 * (1 + growth), 0),
                    'change': round(100000 * growth, 0),
                    'changePercent': round(growth * 100, 2),
                    'confidence': 0.75
                })
        
        return outputs
    
    def _simulate_vendor_loss(self, variables: List[Dict]) -> List[Dict]:
        """Simulate impact of losing a vendor."""
        outputs = []
        
        for var in variables:
            if var['name'] == 'vendor_share':
                lost_share = var['baselineValue'] - var['scenarioValue']
                
                outputs.append({
                    'metric': 'supply_disruption_days',
                    'baselineValue': 0,
                    'predictedValue': round(lost_share * 100 * 2, 0),  # 2 days per % share
                    'change': round(lost_share * 100 * 2, 0),
                    'changePercent': 100,
                    'confidence': 0.7
                })
                
                outputs.append({
                    'metric': 'cost_increase',
                    'baselineValue': 0,
                    'predictedValue': round(lost_share * 50000, 2),  # $50k per % share
                    'change': round(lost_share * 50000, 2),
                    'changePercent': round(lost_share * 5, 2),
                    'confidence': 0.65
                })
        
        return outputs
    
    def _simulate_custom_scenario(self, variables: List[Dict]) -> List[Dict]:
        """Simulate custom scenario with generic impact calculations."""
        outputs = []
        
        for var in variables:
            change = var.get('scenarioValue', 0) - var.get('baselineValue', 0)
            impact = change * np.random.uniform(0.8, 1.2)
            
            outputs.append({
                'metric': f"{var['name']}_impact",
                'baselineValue': var.get('baselineValue', 0),
                'predictedValue': round(var.get('baselineValue', 0) + impact, 2),
                'change': round(impact, 2),
                'changePercent': round(change / (var.get('baselineValue', 1) + 0.001) * 100, 2),
                'confidence': 0.6
            })
        
        return outputs
    
    def _generate_scenario_recommendations(self, outputs: List[Dict]) -> List[Dict]:
        """Generate recommendations based on scenario outputs."""
        recommendations = []
        
        for output in outputs:
            if output['changePercent'] < -10:
                recommendations.append({
                    'priority': 'high',
                    'metric': output['metric'],
                    'recommendation': f"Positive impact on {output['metric']}. Consider implementing this change.",
                    'confidence': output['confidence']
                })
            elif output['changePercent'] > 10:
                recommendations.append({
                    'priority': 'warning',
                    'metric': output['metric'],
                    'recommendation': f"Negative impact on {output['metric']}. Evaluate mitigation strategies.",
                    'confidence': output['confidence']
                })
        
        return recommendations
    
    def compare_scenarios(self, scenarios: List[Dict]) -> Dict:
        """Compare multiple scenario results."""
        comparison = {
            'comparedAt': datetime.now().isoformat(),
            'scenarios': [],
            'summary': {}
        }
        
        for scenario in scenarios:
            scenario_summary = {
                'name': scenario.get('name'),
                'type': scenario.get('type'),
                'netImpact': sum([o['change'] for o in scenario.get('outputs', [])]),
                'avgConfidence': np.mean([o['confidence'] for o in scenario.get('outputs', [])])
            }
            comparison['scenarios'].append(scenario_summary)
        
        # Find best scenario
        if comparison['scenarios']:
            best_scenario = max(comparison['scenarios'], key=lambda x: -x['netImpact'])
            comparison['summary'] = {
                'recommendedScenario': best_scenario['name'],
                'reason': 'Lowest net negative impact',
                'confidence': best_scenario['avgConfidence']
            }
        
        return comparison


# ============================================================================
# MAIN PREDICTION SERVICE
# ============================================================================

class PredictiveMLService:
    """Main service class orchestrating all prediction capabilities."""
    
    def __init__(self):
        self.spend_forecaster = SpendForecaster()
        self.risk_predictor = VendorRiskPredictor()
        self.anomaly_detector = AnomalyDetector()
        self.demand_forecaster = DemandForecaster()
        self.workload_forecaster = WorkloadForecaster()
        self.scenario_simulator = ScenarioSimulator()
        
    def forecast_spend(self, params: Dict) -> Dict:
        """Generate spend forecast."""
        return self.spend_forecaster.forecast(
            periods=params.get('periods', 12),
            granularity=params.get('granularity', 'monthly'),
            base_date=datetime.fromisoformat(params['baseDate']) if params.get('baseDate') else None,
            vendor_id=params.get('vendorId'),
            category_id=params.get('categoryId')
        )
    
    def detect_budget_breach(self, params: Dict) -> Dict:
        """Detect potential budget breaches."""
        forecast = self.spend_forecaster.forecast(
            periods=params.get('periods', 12),
            granularity=params.get('granularity', 'monthly')
        )
        return self.spend_forecaster.detect_budget_breach(
            forecast,
            params.get('budgetAmount', 0),
            params.get('threshold', 0.9)
        )
    
    def predict_vendor_risk(self, vendor_data: Dict) -> Dict:
        """Predict vendor risk scores."""
        return self.risk_predictor.predict_risk(vendor_data)
    
    def predict_vendor_risk_batch(self, vendors: List[Dict]) -> List[Dict]:
        """Batch predict vendor risks."""
        return [self.risk_predictor.predict_risk(v) for v in vendors]
    
    def detect_anomalies(self, data: Dict, entity_type: str = 'invoice') -> Dict:
        """Detect anomalies in data."""
        return self.anomaly_detector.detect_anomalies(data, entity_type)
    
    def forecast_demand(self, product_data: Dict, periods: int = 12) -> Dict:
        """Generate demand forecast."""
        return self.demand_forecaster.forecast_demand(
            product_data,
            periods=periods,
            granularity=product_data.get('granularity', 'monthly')
        )
    
    def forecast_workload(self, team_data: Dict, periods: int = 4) -> Dict:
        """Generate workload forecast."""
        return self.workload_forecaster.forecast_workload(
            team_data,
            periods=periods,
            granularity=team_data.get('granularity', 'weekly')
        )
    
    def run_scenario(self, scenario_config: Dict) -> Dict:
        """Run what-if scenario simulation."""
        return self.scenario_simulator.run_scenario(scenario_config)
    
    def compare_scenarios(self, scenarios: List[Dict]) -> Dict:
        """Compare multiple scenarios."""
        return self.scenario_simulator.compare_scenarios(scenarios)
    
    def get_comprehensive_dashboard(self, params: Dict) -> Dict:
        """Generate comprehensive prediction dashboard data."""
        return {
            'generatedAt': datetime.now().isoformat(),
            'spendForecast': self.forecast_spend({
                'periods': 6,
                'granularity': 'monthly'
            }),
            'topVendorRisks': self.predict_vendor_risk_batch([
                {'vendorId': 'V001', 'deliveryDelayRate': 0.15, 'qualityDefectRate': 0.03},
                {'vendorId': 'V002', 'deliveryDelayRate': 0.05, 'qualityDefectRate': 0.08},
                {'vendorId': 'V003', 'deliveryDelayRate': 0.25, 'qualityDefectRate': 0.02}
            ])[:5],
            'workloadForecast': self.forecast_workload({}, 4),
            'recentAnomalies': [],
            'keyMetrics': {
                'avgRiskScore': 0.35,
                'projectedSpend': 1250000,
                'anomalyCount': 3,
                'complianceScore': 0.92
            }
        }


# Export service instance
prediction_service = PredictiveMLService()
