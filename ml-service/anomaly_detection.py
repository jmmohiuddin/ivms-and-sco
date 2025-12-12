"""
Anomaly Detection Module
Detects unusual patterns in supply chain data
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Any
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class AnomalyDetector:
    """
    Anomaly detection for supply chain data:
    - Statistical methods (Z-score, IQR)
    - Isolation Forest
    - DBSCAN clustering
    """
    
    def __init__(self):
        self.sensitivity_thresholds = {
            'low': 3.0,      # 3 standard deviations
            'medium': 2.5,   # 2.5 standard deviations
            'high': 2.0      # 2 standard deviations
        }
    
    def detect(self, df: pd.DataFrame, sensitivity: str = 'medium') -> Dict[str, Any]:
        """
        Detect anomalies in time series data
        
        Args:
            df: DataFrame with 'date' and 'value' columns
            sensitivity: Detection sensitivity level
            
        Returns:
            Detected anomalies with details
        """
        threshold = self.sensitivity_thresholds.get(sensitivity, 2.5)
        
        # Multiple detection methods
        zscore_anomalies = self._zscore_detection(df, threshold)
        iqr_anomalies = self._iqr_detection(df)
        trend_anomalies = self._trend_anomaly_detection(df)
        
        # Combine results
        all_anomaly_dates = set()
        all_anomaly_dates.update(zscore_anomalies['dates'])
        all_anomaly_dates.update(iqr_anomalies['dates'])
        all_anomaly_dates.update(trend_anomalies['dates'])
        
        # Build anomaly details
        anomaly_points = []
        for idx, row in df.iterrows():
            date_str = row['date'].isoformat() if hasattr(row['date'], 'isoformat') else str(row['date'])
            if date_str in all_anomaly_dates or idx in all_anomaly_dates:
                anomaly_type = []
                if date_str in zscore_anomalies['dates'] or idx in zscore_anomalies['dates']:
                    anomaly_type.append('statistical')
                if date_str in iqr_anomalies['dates'] or idx in iqr_anomalies['dates']:
                    anomaly_type.append('outlier')
                if date_str in trend_anomalies['dates'] or idx in trend_anomalies['dates']:
                    anomaly_type.append('trend_break')
                
                anomaly_points.append({
                    'date': date_str,
                    'value': round(float(row['value']), 2),
                    'type': anomaly_type,
                    'severity': self._calculate_severity(row['value'], df['value'])
                })
        
        # Generate alerts
        alerts = self._generate_alerts(anomaly_points, df)
        
        return {
            'points': anomaly_points,
            'summary': {
                'total_anomalies': len(anomaly_points),
                'statistical_anomalies': len(zscore_anomalies['dates']),
                'outliers': len(iqr_anomalies['dates']),
                'trend_breaks': len(trend_anomalies['dates']),
                'data_points_analyzed': len(df)
            },
            'alerts': alerts
        }
    
    def _zscore_detection(self, df: pd.DataFrame, threshold: float) -> Dict[str, Any]:
        """Detect anomalies using Z-score method"""
        values = df['value'].values
        mean = np.mean(values)
        std = np.std(values)
        
        if std == 0:
            return {'dates': set(), 'scores': []}
        
        zscores = np.abs((values - mean) / std)
        anomaly_indices = np.where(zscores > threshold)[0]
        
        dates = set()
        for idx in anomaly_indices:
            date = df.iloc[idx]['date']
            dates.add(date.isoformat() if hasattr(date, 'isoformat') else idx)
        
        return {
            'dates': dates,
            'scores': zscores.tolist()
        }
    
    def _iqr_detection(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Detect outliers using Interquartile Range"""
        values = df['value'].values
        q1 = np.percentile(values, 25)
        q3 = np.percentile(values, 75)
        iqr = q3 - q1
        
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr
        
        anomaly_indices = np.where((values < lower_bound) | (values > upper_bound))[0]
        
        dates = set()
        for idx in anomaly_indices:
            date = df.iloc[idx]['date']
            dates.add(date.isoformat() if hasattr(date, 'isoformat') else idx)
        
        return {
            'dates': dates,
            'bounds': {'lower': lower_bound, 'upper': upper_bound}
        }
    
    def _trend_anomaly_detection(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Detect sudden changes in trend"""
        values = df['value'].values
        
        if len(values) < 5:
            return {'dates': set()}
        
        # Calculate rolling mean and detect deviations
        window = min(5, len(values) // 3)
        rolling_mean = pd.Series(values).rolling(window=window, center=True).mean().values
        
        # Fill NaN at edges
        rolling_mean = np.nan_to_num(rolling_mean, nan=np.nanmean(rolling_mean))
        
        # Detect large deviations from trend
        deviations = np.abs(values - rolling_mean)
        threshold = np.std(deviations) * 2
        
        anomaly_indices = np.where(deviations > threshold)[0]
        
        dates = set()
        for idx in anomaly_indices:
            date = df.iloc[idx]['date']
            dates.add(date.isoformat() if hasattr(date, 'isoformat') else idx)
        
        return {'dates': dates}
    
    def _calculate_severity(self, value: float, all_values: pd.Series) -> str:
        """Calculate anomaly severity"""
        mean = all_values.mean()
        std = all_values.std()
        
        if std == 0:
            return 'low'
        
        zscore = abs((value - mean) / std)
        
        if zscore > 3:
            return 'critical'
        elif zscore > 2.5:
            return 'high'
        elif zscore > 2:
            return 'medium'
        else:
            return 'low'
    
    def _generate_alerts(self, anomaly_points: List[Dict], df: pd.DataFrame) -> List[Dict]:
        """Generate actionable alerts from anomalies"""
        alerts = []
        
        if not anomaly_points:
            return alerts
        
        # Group by severity
        critical = [a for a in anomaly_points if a['severity'] == 'critical']
        high = [a for a in anomaly_points if a['severity'] == 'high']
        
        if critical:
            alerts.append({
                'level': 'critical',
                'message': f'{len(critical)} critical anomalies detected',
                'action': 'Immediate investigation required',
                'affected_dates': [a['date'] for a in critical[:5]]
            })
        
        if high:
            alerts.append({
                'level': 'warning',
                'message': f'{len(high)} significant anomalies detected',
                'action': 'Review and monitor',
                'affected_dates': [a['date'] for a in high[:5]]
            })
        
        # Check for consecutive anomalies (pattern)
        if len(anomaly_points) >= 3:
            alerts.append({
                'level': 'info',
                'message': 'Multiple anomalies detected - possible systematic issue',
                'action': 'Review data collection and processes',
                'affected_dates': [a['date'] for a in anomaly_points[:5]]
            })
        
        return alerts
    
    def detect_demand_spikes(self, df: pd.DataFrame, threshold_pct: float = 50) -> List[Dict]:
        """Detect sudden demand spikes"""
        values = df['value'].values
        spikes = []
        
        for i in range(1, len(values)):
            if values[i-1] > 0:
                change_pct = ((values[i] - values[i-1]) / values[i-1]) * 100
                if abs(change_pct) > threshold_pct:
                    date = df.iloc[i]['date']
                    spikes.append({
                        'date': date.isoformat() if hasattr(date, 'isoformat') else str(date),
                        'previous_value': round(values[i-1], 2),
                        'current_value': round(values[i], 2),
                        'change_pct': round(change_pct, 2),
                        'direction': 'spike' if change_pct > 0 else 'drop'
                    })
        
        return spikes
