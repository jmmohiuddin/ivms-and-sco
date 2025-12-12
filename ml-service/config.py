"""
ML Service Configuration
"""
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Flask settings
    DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'
    HOST = os.getenv('ML_SERVICE_HOST', '0.0.0.0')
    PORT = int(os.getenv('ML_SERVICE_PORT', 5002))
    
    # MongoDB settings
    MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/ivms_db')
    
    # Model settings
    FORECAST_HORIZON = int(os.getenv('FORECAST_HORIZON', 30))
    MIN_TRAINING_DATA = int(os.getenv('MIN_TRAINING_DATA', 30))
    
    # API settings
    BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:5000')
