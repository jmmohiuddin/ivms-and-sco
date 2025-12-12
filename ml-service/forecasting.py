"""
Demand Forecasting Module
Implements multiple forecasting models
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any
import logging

logger = logging.getLogger(__name__)


class DemandForecaster:
    """
    Demand forecasting using multiple models:
    - Prophet (Facebook's time series library)
    - ARIMA
    - Exponential Smoothing
    - Simple ensemble
    """
    
    def __init__(self):
        self.models = {}
        
    def predict(self, df: pd.DataFrame, horizon: int, model_type: str = 'prophet') -> Dict[str, Any]:
        """
        Generate demand forecast
        
        Args:
            df: DataFrame with 'date' and 'demand' columns
            horizon: Number of periods to forecast
            model_type: Type of model to use
            
        Returns:
            Dictionary with predictions, confidence intervals, and metrics
        """
        if len(df) < 10:
            return self._simple_forecast(df, horizon)
        
        if model_type == 'prophet':
            return self._prophet_forecast(df, horizon)
        elif model_type == 'arima':
            return self._arima_forecast(df, horizon)
        elif model_type == 'ensemble':
            return self._ensemble_forecast(df, horizon)
        else:
            return self._exponential_smoothing(df, horizon)
    
    def _simple_forecast(self, df: pd.DataFrame, horizon: int) -> Dict[str, Any]:
        """Simple moving average forecast for limited data"""
        avg = df['demand'].mean()
        std = df['demand'].std() if len(df) > 1 else avg * 0.2
        
        predictions = []
        last_date = df['date'].max()
        
        for i in range(1, horizon + 1):
            predictions.append({
                'date': (last_date + timedelta(days=i)).isoformat(),
                'forecast': round(avg, 2),
                'lower_bound': round(max(0, avg - 1.96 * std), 2),
                'upper_bound': round(avg + 1.96 * std, 2)
            })
        
        return {
            'predictions': predictions,
            'confidence': 50,
            'metrics': {
                'model': 'simple_average',
                'mape': None,
                'rmse': None
            }
        }
    
    def _prophet_forecast(self, df: pd.DataFrame, horizon: int) -> Dict[str, Any]:
        """Facebook Prophet forecasting"""
        try:
            from prophet import Prophet
            
            # Prepare data for Prophet
            prophet_df = df.rename(columns={'date': 'ds', 'demand': 'y'})
            
            # Initialize and fit model
            model = Prophet(
                yearly_seasonality=True,
                weekly_seasonality=True,
                daily_seasonality=False,
                changepoint_prior_scale=0.05
            )
            model.fit(prophet_df)
            
            # Create future dataframe
            future = model.make_future_dataframe(periods=horizon)
            forecast = model.predict(future)
            
            # Extract predictions
            predictions = []
            for _, row in forecast.tail(horizon).iterrows():
                predictions.append({
                    'date': row['ds'].isoformat(),
                    'forecast': round(max(0, row['yhat']), 2),
                    'lower_bound': round(max(0, row['yhat_lower']), 2),
                    'upper_bound': round(row['yhat_upper'], 2)
                })
            
            # Calculate accuracy metrics on training data
            train_forecast = model.predict(prophet_df[['ds']])
            mape = self._calculate_mape(prophet_df['y'].values, train_forecast['yhat'].values)
            rmse = self._calculate_rmse(prophet_df['y'].values, train_forecast['yhat'].values)
            
            return {
                'predictions': predictions,
                'confidence': min(95, max(60, 100 - mape)),
                'metrics': {
                    'model': 'prophet',
                    'mape': round(mape, 2),
                    'rmse': round(rmse, 2)
                }
            }
            
        except ImportError:
            logger.warning("Prophet not installed, falling back to exponential smoothing")
            return self._exponential_smoothing(df, horizon)
        except Exception as e:
            logger.error(f"Prophet forecast error: {e}")
            return self._exponential_smoothing(df, horizon)
    
    def _arima_forecast(self, df: pd.DataFrame, horizon: int) -> Dict[str, Any]:
        """ARIMA forecasting"""
        try:
            from statsmodels.tsa.arima.model import ARIMA
            
            # Fit ARIMA model
            model = ARIMA(df['demand'].values, order=(1, 1, 1))
            fitted = model.fit()
            
            # Forecast
            forecast = fitted.forecast(steps=horizon)
            conf_int = fitted.get_forecast(steps=horizon).conf_int()
            
            predictions = []
            last_date = df['date'].max()
            
            for i, (pred, (lower, upper)) in enumerate(zip(forecast, conf_int)):
                predictions.append({
                    'date': (last_date + timedelta(days=i+1)).isoformat(),
                    'forecast': round(max(0, pred), 2),
                    'lower_bound': round(max(0, lower), 2),
                    'upper_bound': round(upper, 2)
                })
            
            return {
                'predictions': predictions,
                'confidence': 75,
                'metrics': {
                    'model': 'arima',
                    'aic': round(fitted.aic, 2),
                    'bic': round(fitted.bic, 2)
                }
            }
            
        except Exception as e:
            logger.error(f"ARIMA forecast error: {e}")
            return self._exponential_smoothing(df, horizon)
    
    def _exponential_smoothing(self, df: pd.DataFrame, horizon: int) -> Dict[str, Any]:
        """Holt-Winters exponential smoothing"""
        values = df['demand'].values
        n = len(values)
        
        # Parameters
        alpha = 0.3
        beta = 0.1
        
        # Initialize
        level = values[0]
        trend = values[1] - values[0] if n > 1 else 0
        
        # Smooth
        for i in range(1, n):
            prev_level = level
            level = alpha * values[i] + (1 - alpha) * (level + trend)
            trend = beta * (level - prev_level) + (1 - beta) * trend
        
        # Forecast
        predictions = []
        last_date = df['date'].max()
        std = df['demand'].std()
        
        for i in range(1, horizon + 1):
            forecast_val = level + i * trend
            predictions.append({
                'date': (last_date + timedelta(days=i)).isoformat(),
                'forecast': round(max(0, forecast_val), 2),
                'lower_bound': round(max(0, forecast_val - 1.96 * std), 2),
                'upper_bound': round(forecast_val + 1.96 * std, 2)
            })
        
        return {
            'predictions': predictions,
            'confidence': 70,
            'metrics': {
                'model': 'exponential_smoothing',
                'alpha': alpha,
                'beta': beta
            }
        }
    
    def _ensemble_forecast(self, df: pd.DataFrame, horizon: int) -> Dict[str, Any]:
        """Ensemble of multiple models"""
        forecasts = []
        
        # Get forecasts from multiple models
        try:
            prophet_fc = self._prophet_forecast(df, horizon)
            forecasts.append(prophet_fc['predictions'])
        except:
            pass
        
        try:
            exp_fc = self._exponential_smoothing(df, horizon)
            forecasts.append(exp_fc['predictions'])
        except:
            pass
        
        if not forecasts:
            return self._simple_forecast(df, horizon)
        
        # Average the forecasts
        predictions = []
        for i in range(horizon):
            avg_forecast = np.mean([f[i]['forecast'] for f in forecasts])
            avg_lower = np.mean([f[i]['lower_bound'] for f in forecasts])
            avg_upper = np.mean([f[i]['upper_bound'] for f in forecasts])
            
            predictions.append({
                'date': forecasts[0][i]['date'],
                'forecast': round(avg_forecast, 2),
                'lower_bound': round(avg_lower, 2),
                'upper_bound': round(avg_upper, 2)
            })
        
        return {
            'predictions': predictions,
            'confidence': 80,
            'metrics': {
                'model': 'ensemble',
                'models_used': len(forecasts)
            }
        }
    
    def analyze_trends(self, df: pd.DataFrame, frequency: str = 'monthly') -> Dict[str, Any]:
        """Analyze trends and seasonality"""
        values = df['demand'].values
        
        # Calculate trend using linear regression
        x = np.arange(len(values))
        slope, intercept = np.polyfit(x, values, 1)
        trend_direction = 'increasing' if slope > 0.1 else 'decreasing' if slope < -0.1 else 'stable'
        
        # Detect seasonality
        seasonality = self._detect_seasonality(values)
        
        return {
            'trend': {
                'direction': trend_direction,
                'slope': round(slope, 4),
                'strength': abs(slope) / (np.std(values) + 0.001)
            },
            'seasonality': seasonality,
            'components': {
                'mean': round(np.mean(values), 2),
                'std': round(np.std(values), 2),
                'min': round(np.min(values), 2),
                'max': round(np.max(values), 2)
            }
        }
    
    def _detect_seasonality(self, values: np.ndarray) -> Dict[str, Any]:
        """Detect seasonal patterns"""
        if len(values) < 24:
            return {'detected': False, 'period': None, 'strength': 0}
        
        # Simple autocorrelation for seasonality detection
        from numpy.fft import fft
        
        # Remove trend
        detrended = values - np.polyval(np.polyfit(range(len(values)), values, 1), range(len(values)))
        
        # FFT for periodicity
        f = fft(detrended)
        power = np.abs(f) ** 2
        
        # Find dominant period
        peak_idx = np.argmax(power[1:len(power)//2]) + 1
        period = len(values) / peak_idx if peak_idx > 0 else None
        
        strength = power[peak_idx] / np.sum(power) if peak_idx > 0 else 0
        
        return {
            'detected': strength > 0.1,
            'period': round(period, 1) if period else None,
            'strength': round(strength, 4)
        }
    
    def _calculate_mape(self, actual: np.ndarray, predicted: np.ndarray) -> float:
        """Calculate Mean Absolute Percentage Error"""
        mask = actual != 0
        return np.mean(np.abs((actual[mask] - predicted[mask]) / actual[mask])) * 100
    
    def _calculate_rmse(self, actual: np.ndarray, predicted: np.ndarray) -> float:
        """Calculate Root Mean Square Error"""
        return np.sqrt(np.mean((actual - predicted) ** 2))
