"""
IVMS Machine Learning Service
Advanced forecasting and optimization using ML models
Includes OCR, NLP, and Fraud Detection capabilities
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import logging
import base64
import os

from config import Config
from forecasting import DemandForecaster
from optimization import SupplyChainOptimizer
from anomaly_detection import AnomalyDetector
from ocr_service import ocr_service
from nlp_service import nlp_service
from fraud_detection import fraud_detection_service
from predictive_ml import prediction_service
from llm_service import llm_service

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Configure upload folder
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Initialize services
forecaster = DemandForecaster()
optimizer = SupplyChainOptimizer()
anomaly_detector = AnomalyDetector()


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'OK',
        'service': 'IVMS ML Service',
        'timestamp': datetime.now().isoformat(),
        'version': '2.0.0',
        'modules': {
            'forecasting': True,
            'optimization': True,
            'anomaly_detection': True,
            'ocr': True,
            'nlp': True,
            'fraud_detection': True
        }
    })


@app.route('/forecast', methods=['POST'])
def generate_forecast():
    """
    Generate demand forecast for a product
    
    Request body:
    {
        "product_id": "string",
        "historical_data": [{"date": "YYYY-MM-DD", "demand": number}],
        "horizon": number (days),
        "model": "prophet" | "arima" | "lstm" | "ensemble"
    }
    """
    try:
        data = request.json
        product_id = data.get('product_id')
        historical_data = data.get('historical_data', [])
        horizon = data.get('horizon', 30)
        model_type = data.get('model', 'prophet')
        
        if not historical_data:
            return jsonify({'error': 'No historical data provided'}), 400
        
        # Convert to DataFrame
        df = pd.DataFrame(historical_data)
        df['date'] = pd.to_datetime(df['date'])
        df = df.sort_values('date')
        
        # Generate forecast
        forecast = forecaster.predict(df, horizon, model_type)
        
        return jsonify({
            'success': True,
            'product_id': product_id,
            'model': model_type,
            'forecast': forecast['predictions'],
            'confidence': forecast['confidence'],
            'metrics': forecast['metrics']
        })
        
    except Exception as e:
        logger.error(f"Forecast error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/optimize/inventory', methods=['POST'])
def optimize_inventory():
    """
    Optimize inventory levels
    
    Request body:
    {
        "products": [
            {
                "product_id": "string",
                "current_stock": number,
                "demand_forecast": [number],
                "lead_time": number,
                "holding_cost": number,
                "ordering_cost": number,
                "stockout_cost": number
            }
        ],
        "constraints": {
            "max_budget": number,
            "max_storage": number
        }
    }
    """
    try:
        data = request.json
        products = data.get('products', [])
        constraints = data.get('constraints', {})
        
        result = optimizer.optimize_inventory(products, constraints)
        
        return jsonify({
            'success': True,
            'recommendations': result['recommendations'],
            'total_savings': result['total_savings'],
            'optimization_score': result['score']
        })
        
    except Exception as e:
        logger.error(f"Inventory optimization error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/optimize/vendor', methods=['POST'])
def optimize_vendor_selection():
    """
    Multi-criteria vendor selection optimization
    
    Request body:
    {
        "vendors": [
            {
                "vendor_id": "string",
                "price": number,
                "quality_score": number,
                "delivery_reliability": number,
                "capacity": number,
                "lead_time": number
            }
        ],
        "requirements": {
            "quantity": number,
            "max_lead_time": number,
            "min_quality": number
        },
        "weights": {
            "price": number,
            "quality": number,
            "delivery": number,
            "capacity": number
        }
    }
    """
    try:
        data = request.json
        vendors = data.get('vendors', [])
        requirements = data.get('requirements', {})
        weights = data.get('weights', {})
        
        result = optimizer.select_vendors(vendors, requirements, weights)
        
        return jsonify({
            'success': True,
            'rankings': result['rankings'],
            'recommended_allocation': result['allocation'],
            'analysis': result['analysis']
        })
        
    except Exception as e:
        logger.error(f"Vendor optimization error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/detect/anomalies', methods=['POST'])
def detect_anomalies():
    """
    Detect anomalies in supply chain data
    
    Request body:
    {
        "data_type": "demand" | "delivery" | "quality" | "price",
        "time_series": [{"date": "YYYY-MM-DD", "value": number}],
        "sensitivity": "low" | "medium" | "high"
    }
    """
    try:
        data = request.json
        data_type = data.get('data_type')
        time_series = data.get('time_series', [])
        sensitivity = data.get('sensitivity', 'medium')
        
        if not time_series:
            return jsonify({'error': 'No time series data provided'}), 400
        
        df = pd.DataFrame(time_series)
        df['date'] = pd.to_datetime(df['date'])
        
        anomalies = anomaly_detector.detect(df, sensitivity)
        
        return jsonify({
            'success': True,
            'data_type': data_type,
            'anomalies': anomalies['points'],
            'summary': anomalies['summary'],
            'alerts': anomalies['alerts']
        })
        
    except Exception as e:
        logger.error(f"Anomaly detection error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/analyze/trends', methods=['POST'])
def analyze_trends():
    """
    Analyze trends and seasonality in data
    
    Request body:
    {
        "time_series": [{"date": "YYYY-MM-DD", "value": number}],
        "frequency": "daily" | "weekly" | "monthly"
    }
    """
    try:
        data = request.json
        time_series = data.get('time_series', [])
        frequency = data.get('frequency', 'monthly')
        
        df = pd.DataFrame(time_series)
        df['date'] = pd.to_datetime(df['date'])
        
        analysis = forecaster.analyze_trends(df, frequency)
        
        return jsonify({
            'success': True,
            'trend': analysis['trend'],
            'seasonality': analysis['seasonality'],
            'components': analysis['components']
        })
        
    except Exception as e:
        logger.error(f"Trend analysis error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/simulate/scenario', methods=['POST'])
def simulate_scenario():
    """
    Run what-if scenario simulation
    
    Request body:
    {
        "base_scenario": {...},
        "changes": {
            "demand_change_pct": number,
            "lead_time_change": number,
            "price_change_pct": number
        },
        "duration_days": number
    }
    """
    try:
        data = request.json
        base = data.get('base_scenario', {})
        changes = data.get('changes', {})
        duration = data.get('duration_days', 30)
        
        result = optimizer.simulate_scenario(base, changes, duration)
        
        return jsonify({
            'success': True,
            'baseline': result['baseline'],
            'simulated': result['simulated'],
            'impact': result['impact'],
            'recommendations': result['recommendations']
        })
        
    except Exception as e:
        logger.error(f"Scenario simulation error: {str(e)}")
        return jsonify({'error': str(e)}), 500


# ============================================================
# OCR ENDPOINTS
# ============================================================

@app.route('/ocr/invoice', methods=['POST'])
def ocr_process_invoice():
    """
    Process invoice document using OCR
    
    Request body:
    {
        "image_base64": "base64_encoded_image",
        "image_path": "path_to_image" (alternative)
    }
    """
    try:
        data = request.json
        image_path = None
        
        # Handle base64 image
        if data.get('image_base64'):
            image_data = base64.b64decode(data['image_base64'])
            image_path = os.path.join(UPLOAD_FOLDER, f"invoice_{datetime.now().timestamp()}.png")
            with open(image_path, 'wb') as f:
                f.write(image_data)
        elif data.get('image_path'):
            image_path = data['image_path']
        else:
            return jsonify({'error': 'No image provided'}), 400
        
        result = ocr_service.process_invoice(image_path)
        
        # Clean up temp file
        if data.get('image_base64') and os.path.exists(image_path):
            os.remove(image_path)
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"OCR invoice error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/ocr/certificate', methods=['POST'])
def ocr_process_certificate():
    """
    Process certificate document using OCR
    
    Request body:
    {
        "image_base64": "base64_encoded_image",
        "certificate_type": "iso" | "compliance" | "general"
    }
    """
    try:
        data = request.json
        image_path = None
        
        if data.get('image_base64'):
            image_data = base64.b64decode(data['image_base64'])
            image_path = os.path.join(UPLOAD_FOLDER, f"cert_{datetime.now().timestamp()}.png")
            with open(image_path, 'wb') as f:
                f.write(image_data)
        elif data.get('image_path'):
            image_path = data['image_path']
        else:
            return jsonify({'error': 'No image provided'}), 400
        
        cert_type = data.get('certificate_type', 'general')
        result = ocr_service.extract_certificate_data(image_path, cert_type)
        
        if data.get('image_base64') and os.path.exists(image_path):
            os.remove(image_path)
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"OCR certificate error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/ocr/contract', methods=['POST'])
def ocr_process_contract():
    """
    Process contract document using OCR
    
    Request body:
    {
        "image_base64": "base64_encoded_image"
    }
    """
    try:
        data = request.json
        image_path = None
        
        if data.get('image_base64'):
            image_data = base64.b64decode(data['image_base64'])
            image_path = os.path.join(UPLOAD_FOLDER, f"contract_{datetime.now().timestamp()}.png")
            with open(image_path, 'wb') as f:
                f.write(image_data)
        elif data.get('image_path'):
            image_path = data['image_path']
        else:
            return jsonify({'error': 'No image provided'}), 400
        
        result = ocr_service.extract_contract_data(image_path)
        
        if data.get('image_base64') and os.path.exists(image_path):
            os.remove(image_path)
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"OCR contract error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/ocr/validate', methods=['POST'])
def ocr_validate_document():
    """
    Validate document quality for OCR processing
    
    Request body:
    {
        "image_base64": "base64_encoded_image"
    }
    """
    try:
        data = request.json
        image_path = None
        
        if data.get('image_base64'):
            image_data = base64.b64decode(data['image_base64'])
            image_path = os.path.join(UPLOAD_FOLDER, f"validate_{datetime.now().timestamp()}.png")
            with open(image_path, 'wb') as f:
                f.write(image_data)
        elif data.get('image_path'):
            image_path = data['image_path']
        else:
            return jsonify({'error': 'No image provided'}), 400
        
        result = ocr_service.validate_document(image_path)
        
        if data.get('image_base64') and os.path.exists(image_path):
            os.remove(image_path)
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"OCR validation error: {str(e)}")
        return jsonify({'error': str(e)}), 500


# ============================================================
# NLP ENDPOINTS
# ============================================================

@app.route('/nlp/analyze-contract', methods=['POST'])
def nlp_analyze_contract():
    """
    Analyze contract text using NLP
    
    Request body:
    {
        "text": "contract text content",
        "contract_id": "optional_contract_id"
    }
    """
    try:
        data = request.json
        text = data.get('text')
        contract_id = data.get('contract_id')
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        result = nlp_service.analyze_contract(text, contract_id)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"NLP contract analysis error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/nlp/extract-clauses', methods=['POST'])
def nlp_extract_clauses():
    """
    Extract key clauses from contract text
    
    Request body:
    {
        "text": "contract text content"
    }
    """
    try:
        data = request.json
        text = data.get('text')
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        result = nlp_service.extract_key_clauses(text)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"NLP clause extraction error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/nlp/assess-risk', methods=['POST'])
def nlp_assess_risk():
    """
    Assess risk in contract text
    
    Request body:
    {
        "text": "contract text content"
    }
    """
    try:
        data = request.json
        text = data.get('text')
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        result = nlp_service.assess_risk(text)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"NLP risk assessment error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/nlp/sentiment', methods=['POST'])
def nlp_analyze_sentiment():
    """
    Analyze sentiment in text
    
    Request body:
    {
        "text": "text content"
    }
    """
    try:
        data = request.json
        text = data.get('text')
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        result = nlp_service.analyze_sentiment(text)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"NLP sentiment analysis error: {str(e)}")
        return jsonify({'error': str(e)}), 500


# ============================================================
# FRAUD DETECTION ENDPOINTS
# ============================================================

@app.route('/fraud/analyze-invoice', methods=['POST'])
def fraud_analyze_invoice():
    """
    Analyze invoice for fraud indicators
    
    Request body:
    {
        "invoice": {
            "_id": "invoice_id",
            "invoice_number": "INV-001",
            "total_amount": 5000,
            "vendor": "vendor_id",
            "items": [...],
            "due_date": "YYYY-MM-DD"
        },
        "historical_data": [...],  // Optional
        "vendor_data": {...}       // Optional
    }
    """
    try:
        data = request.json
        invoice = data.get('invoice')
        
        if not invoice:
            return jsonify({'error': 'No invoice data provided'}), 400
        
        historical = data.get('historical_data', [])
        vendor = data.get('vendor_data')
        
        result = fraud_detection_service.analyze_invoice(invoice, historical, vendor)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Fraud analysis error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/fraud/batch-analyze', methods=['POST'])
def fraud_batch_analyze():
    """
    Batch analyze multiple invoices for fraud
    
    Request body:
    {
        "invoices": [...],
        "historical_data": [...]  // Optional
    }
    """
    try:
        data = request.json
        invoices = data.get('invoices', [])
        
        if not invoices:
            return jsonify({'error': 'No invoices provided'}), 400
        
        historical = data.get('historical_data', [])
        
        result = fraud_detection_service.batch_analyze(invoices, historical)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Fraud batch analysis error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/fraud/train', methods=['POST'])
def fraud_train_model():
    """
    Train fraud detection model on historical data
    
    Request body:
    {
        "historical_data": [...]
    }
    """
    try:
        data = request.json
        historical = data.get('historical_data', [])
        
        if len(historical) < 10:
            return jsonify({'error': 'Minimum 10 records required for training'}), 400
        
        result = fraud_detection_service.train_model(historical)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Fraud model training error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/fraud/predict', methods=['POST'])
def fraud_predict():
    """
    Predict fraud probability using trained model
    
    Request body:
    {
        "features": {
            "amount": number,
            "item_count": number,
            ...
        }
    }
    """
    try:
        data = request.json
        features = data.get('features', {})
        
        if not features:
            return jsonify({'error': 'No features provided'}), 400
        
        result = fraud_detection_service.predict_fraud(features)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Fraud prediction error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/fraud/statistics', methods=['POST'])
def fraud_statistics():
    """
    Get fraud detection statistics
    
    Request body:
    {
        "historical_data": [...]
    }
    """
    try:
        data = request.json
        historical = data.get('historical_data', [])
        
        result = fraud_detection_service.get_statistics(historical)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Fraud statistics error: {str(e)}")
        return jsonify({'error': str(e)}), 500


# ============================================================
# ONBOARDING ML ENDPOINTS
# ============================================================

from onboarding_ml import onboarding_risk_scorer, document_verification_ml, sanctions_screener
from invoice_ml import invoice_ml_service


@app.route('/onboarding/risk-score', methods=['POST'])
def onboarding_calculate_risk():
    """
    Calculate risk score for vendor onboarding
    
    Request body:
    {
        "vendorData": {
            "yearsInBusiness": number,
            "annualRevenue": number,
            "employeeCount": number,
            "country": "country_code",
            "industry": "industry_name",
            "documents": {...},
            "verifications": {...},
            "kyc": {...}
        }
    }
    """
    try:
        data = request.json
        vendor_data = data.get('vendorData', {})
        
        if not vendor_data:
            return jsonify({'error': 'No vendor data provided'}), 400
        
        result = onboarding_risk_scorer.calculate_risk_score(vendor_data)
        return jsonify({
            'success': True,
            **result
        })
        
    except Exception as e:
        logger.error(f"Risk score calculation error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/onboarding/verify-document', methods=['POST'])
def onboarding_verify_document():
    """
    Verify document authenticity and detect fraud
    
    Request body:
    {
        "documentData": {
            "metadata": {...},
            "extractedText": "text content",
            "ocrConfidence": number,
            "extractedData": {...},
            "vendorData": {...}
        }
    }
    """
    try:
        data = request.json
        document_data = data.get('documentData', {})
        
        if not document_data:
            return jsonify({'error': 'No document data provided'}), 400
        
        result = document_verification_ml.verify_document(document_data)
        return jsonify({
            'success': True,
            **result
        })
        
    except Exception as e:
        logger.error(f"Document verification error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/onboarding/sanctions-check', methods=['POST'])
def onboarding_sanctions_check():
    """
    Screen entity against sanctions lists
    
    Request body:
    {
        "entityData": {
            "name": "Company Name",
            "aliases": ["Alias 1", "Alias 2"],
            "principals": [{"name": "Person Name"}],
            "country": "country_code"
        }
    }
    """
    try:
        data = request.json
        entity_data = data.get('entityData', {})
        
        if not entity_data.get('name'):
            return jsonify({'error': 'Entity name is required'}), 400
        
        result = sanctions_screener.screen_entity(entity_data)
        return jsonify({
            'success': True,
            **result
        })
        
    except Exception as e:
        logger.error(f"Sanctions check error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/onboarding/process-document', methods=['POST'])
def onboarding_process_document():
    """
    Full document processing pipeline: OCR + Extraction + Verification
    
    Request body:
    {
        "image_base64": "base64_encoded_image",
        "documentType": "business_registration" | "tax_certificate" | "bank_statement" | "contract" | "id_document",
        "vendorData": {...}  // Optional, for cross-validation
    }
    """
    try:
        data = request.json
        document_type = data.get('documentType', 'general')
        vendor_data = data.get('vendorData', {})
        image_path = None
        
        # Handle image
        if data.get('image_base64'):
            image_data = base64.b64decode(data['image_base64'])
            image_path = os.path.join(UPLOAD_FOLDER, f"onboarding_{datetime.now().timestamp()}.png")
            with open(image_path, 'wb') as f:
                f.write(image_data)
        elif data.get('image_path'):
            image_path = data['image_path']
        else:
            return jsonify({'error': 'No image provided'}), 400
        
        # Step 1: OCR extraction based on document type
        if document_type == 'contract':
            ocr_result = ocr_service.extract_contract_data(image_path)
        elif document_type in ['iso', 'compliance', 'tax_certificate']:
            ocr_result = ocr_service.extract_certificate_data(image_path, document_type)
        else:
            ocr_result = ocr_service.process_invoice(image_path)  # Default
        
        # Step 2: Verify document authenticity
        document_data = {
            'metadata': ocr_result.get('metadata', {}),
            'extractedText': ocr_result.get('raw_text', ''),
            'ocrConfidence': ocr_result.get('confidence', 0.9),
            'extractedData': ocr_result.get('extracted_data', {}),
            'vendorData': vendor_data
        }
        
        verification_result = document_verification_ml.verify_document(document_data)
        
        # Cleanup temp file
        if data.get('image_base64') and os.path.exists(image_path):
            os.remove(image_path)
        
        return jsonify({
            'success': True,
            'extraction': ocr_result,
            'verification': verification_result,
            'documentType': document_type
        })
        
    except Exception as e:
        logger.error(f"Document processing error: {str(e)}")
        # Cleanup on error
        if image_path and os.path.exists(image_path):
            os.remove(image_path)
        return jsonify({'error': str(e)}), 500


@app.route('/onboarding/full-assessment', methods=['POST'])
def onboarding_full_assessment():
    """
    Full vendor risk assessment combining all ML models
    
    Request body:
    {
        "vendorData": {...},
        "documents": [{documentData}, ...],
        "entityData": {...}
    }
    """
    try:
        data = request.json
        vendor_data = data.get('vendorData', {})
        documents = data.get('documents', [])
        entity_data = data.get('entityData', {})
        
        results = {
            'success': True,
            'timestamp': datetime.now().isoformat()
        }
        
        # Risk scoring
        if vendor_data:
            results['riskScore'] = onboarding_risk_scorer.calculate_risk_score(vendor_data)
        
        # Document verifications
        if documents:
            doc_results = []
            for doc in documents:
                doc_result = document_verification_ml.verify_document(doc)
                doc_results.append(doc_result)
            results['documentVerifications'] = doc_results
            
            # Aggregate document score
            avg_authenticity = sum(d['authenticityScore'] for d in doc_results) / len(doc_results)
            results['aggregateDocumentScore'] = round(avg_authenticity, 2)
        
        # Sanctions screening
        if entity_data.get('name'):
            results['sanctionsCheck'] = sanctions_screener.screen_entity(entity_data)
        
        # Overall assessment
        results['overallAssessment'] = _calculate_overall_assessment(results)
        
        return jsonify(results)
        
    except Exception as e:
        logger.error(f"Full assessment error: {str(e)}")
        return jsonify({'error': str(e)}), 500


def _calculate_overall_assessment(results: dict) -> dict:
    """Calculate overall onboarding assessment"""
    assessment = {
        'recommendation': 'approve',
        'requiresReview': False,
        'riskLevel': 'low',
        'flags': []
    }
    
    # Check risk score
    if results.get('riskScore'):
        risk_tier = results['riskScore'].get('riskTier', 'low')
        if risk_tier == 'critical':
            assessment['recommendation'] = 'reject'
            assessment['riskLevel'] = 'critical'
            assessment['flags'].append('Critical risk tier')
        elif risk_tier == 'high':
            assessment['recommendation'] = 'review'
            assessment['requiresReview'] = True
            assessment['riskLevel'] = 'high'
            assessment['flags'].append('High risk tier requires manual review')
        elif risk_tier == 'medium':
            assessment['riskLevel'] = 'medium'
    
    # Check documents
    if results.get('aggregateDocumentScore'):
        if results['aggregateDocumentScore'] < 60:
            assessment['recommendation'] = 'reject'
            assessment['flags'].append('Document authenticity concerns')
        elif results['aggregateDocumentScore'] < 80:
            assessment['requiresReview'] = True
            assessment['flags'].append('Documents require verification')
    
    # Check sanctions
    if results.get('sanctionsCheck'):
        sanctions = results['sanctionsCheck']
        if sanctions.get('status') == 'match_found':
            assessment['recommendation'] = 'reject'
            assessment['riskLevel'] = 'critical'
            assessment['flags'].append('Sanctions match detected')
        elif sanctions.get('status') == 'review_required':
            assessment['requiresReview'] = True
            assessment['flags'].append('High-risk jurisdiction')
    
    return assessment


# ============================================================
# INVOICE ML ENDPOINTS
# ============================================================

@app.route('/invoice/ocr-process', methods=['POST'])
def invoice_ocr_process():
    """
    Advanced OCR processing for invoices
    
    Request body:
    {
        "image_base64": "base64_encoded_image",
        "image_path": "path_to_image" (alternative)
    }
    """
    try:
        data = request.json
        image_path = None
        
        # Handle base64 image
        if data.get('image_base64'):
            image_data = base64.b64decode(data['image_base64'])
            image_path = os.path.join(UPLOAD_FOLDER, f"invoice_{datetime.now().timestamp()}.png")
            with open(image_path, 'wb') as f:
                f.write(image_data)
        elif data.get('image_path'):
            image_path = data['image_path']
        else:
            return jsonify({'error': 'No image provided'}), 400
        
        result = invoice_ml_service.process_with_ocr(image_path)
        
        # Clean up temp file
        if data.get('image_base64') and os.path.exists(image_path):
            os.remove(image_path)
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Invoice OCR processing error: {str(e)}")
        if image_path and os.path.exists(image_path):
            os.remove(image_path)
        return jsonify({'error': str(e)}), 500


@app.route('/invoice/three-way-match', methods=['POST'])
def invoice_three_way_match():
    """
    Perform 3-way matching: Invoice ↔ PO ↔ GRN
    
    Request body:
    {
        "invoice_data": {
            "invoice_number": "INV-001",
            "po_number": "PO-001",
            "vendor_name": "Vendor ABC",
            "line_items": [...]
        },
        "po_data": {
            "po_number": "PO-001",
            "vendor_name": "Vendor ABC",
            "line_items": [...]
        },
        "grn_data": {
            "grn_number": "GRN-001",
            "line_items": [...]
        },
        "tolerance": 0.05  // Optional, default 5%
    }
    """
    try:
        data = request.json
        invoice_data = data.get('invoice_data', {})
        po_data = data.get('po_data', {})
        grn_data = data.get('grn_data', {})
        tolerance = data.get('tolerance', 0.05)
        
        if not all([invoice_data, po_data, grn_data]):
            return jsonify({'error': 'Invoice, PO, and GRN data required'}), 400
        
        result = invoice_ml_service.perform_three_way_match(
            invoice_data,
            po_data,
            grn_data,
            tolerance
        )
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"3-way matching error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/invoice/semantic-match', methods=['POST'])
def invoice_semantic_match():
    """
    Semantic matching of invoice line items to catalog
    
    Request body:
    {
        "invoice_line": {
            "description": "HP LaserJet Pro M404dn Printer",
            "sku": "HP-M404DN",
            "quantity": 2,
            "unit_price": 399.99
        },
        "catalog_items": [
            {
                "name": "HP LaserJet Pro M404dn",
                "description": "Monochrome laser printer",
                "sku": "HPLJ-M404",
                "price": 399.99
            },
            ...
        ]
    }
    """
    try:
        data = request.json
        invoice_line = data.get('invoice_line', {})
        catalog_items = data.get('catalog_items', [])
        
        if not invoice_line or not catalog_items:
            return jsonify({'error': 'Invoice line and catalog items required'}), 400
        
        result = invoice_ml_service.perform_semantic_matching(
            invoice_line,
            catalog_items
        )
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Semantic matching error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/invoice/detect-duplicate', methods=['POST'])
def invoice_detect_duplicate():
    """
    Detect duplicate invoices
    
    Request body:
    {
        "invoice_data": {
            "invoice_number": "INV-001",
            "vendor_name": "Vendor ABC",
            "total_amount": 5000.00,
            "invoice_date": "2025-12-01",
            "line_items": [...]
        },
        "historical_invoices": [
            {
                "_id": "invoice_id_1",
                "invoice_number": "INV-001",
                "vendor_name": "Vendor ABC",
                "total_amount": 5000.00,
                "invoice_date": "2025-11-30"
            },
            ...
        ]
    }
    """
    try:
        data = request.json
        invoice_data = data.get('invoice_data', {})
        historical_invoices = data.get('historical_invoices', [])
        
        if not invoice_data:
            return jsonify({'error': 'Invoice data required'}), 400
        
        result = invoice_ml_service.detect_duplicate(
            invoice_data,
            historical_invoices
        )
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Duplicate detection error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/invoice/detect-fraud', methods=['POST'])
def invoice_detect_fraud():
    """
    Detect fraud in invoice
    
    Request body:
    {
        "invoice_data": {
            "invoice_number": "INV-001",
            "vendor_name": "Vendor ABC",
            "total_amount": 9999.99,
            "invoice_date": "2025-12-01",
            "bank_account": "12345678",
            "bank_account_changed": false,
            "line_items": [...]
        }
    }
    """
    try:
        data = request.json
        invoice_data = data.get('invoice_data', {})
        
        if not invoice_data:
            return jsonify({'error': 'Invoice data required'}), 400
        
        result = invoice_ml_service.detect_fraud(invoice_data)
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Fraud detection error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/invoice/suggest-gl-coding', methods=['POST'])
def invoice_suggest_gl_coding():
    """
    Suggest GL account coding for line item
    
    Request body:
    {
        "line_item": {
            "description": "Office supplies - Paper and pens",
            "quantity": 50,
            "unit_price": 15.00
        },
        "gl_accounts": [
            {
                "account_code": "5100",
                "account_name": "Office Supplies",
                "category": "office_supplies"
            },
            {
                "account_code": "5200",
                "account_name": "Computer Equipment",
                "category": "computer_equipment"
            },
            ...
        ]
    }
    """
    try:
        data = request.json
        line_item = data.get('line_item', {})
        gl_accounts = data.get('gl_accounts', [])
        
        if not line_item or not gl_accounts:
            return jsonify({'error': 'Line item and GL accounts required'}), 400
        
        result = invoice_ml_service.suggest_gl_coding(
            line_item,
            gl_accounts
        )
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"GL coding suggestion error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/invoice/validate-tax', methods=['POST'])
def invoice_validate_tax():
    """
    Validate tax calculations and compliance
    
    Request body:
    {
        "invoice_data": {
            "subtotal": 1000.00,
            "tax_amount": 130.00,
            "total_amount": 1130.00,
            "jurisdiction": "CA"  // Optional
        },
        "tax_rules": {
            "default_jurisdiction": "CA",
            "rates": {
                "CA": 0.13,
                "NY": 0.08875,
                "TX": 0.0825
            },
            "tolerance": 0.05  // $0.05 tolerance
        }
    }
    """
    try:
        data = request.json
        invoice_data = data.get('invoice_data', {})
        tax_rules = data.get('tax_rules', {})
        
        if not invoice_data or not tax_rules:
            return jsonify({'error': 'Invoice data and tax rules required'}), 400
        
        result = invoice_ml_service.validate_tax(
            invoice_data,
            tax_rules
        )
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Tax validation error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/invoice/full-process', methods=['POST'])
def invoice_full_process():
    """
    Full invoice processing pipeline:
    OCR → Extraction → Matching → Tax Validation → Fraud Detection → GL Coding
    
    Request body:
    {
        "image_base64": "base64_encoded_image",
        "po_data": {...},  // Optional
        "grn_data": {...},  // Optional
        "catalog_items": [...],  // Optional
        "gl_accounts": [...],  // Optional
        "tax_rules": {...},  // Optional
        "historical_invoices": [...]  // Optional
    }
    """
    try:
        data = request.json
        image_path = None
        
        # Step 1: OCR Processing
        if data.get('image_base64'):
            image_data = base64.b64decode(data['image_base64'])
            image_path = os.path.join(UPLOAD_FOLDER, f"invoice_{datetime.now().timestamp()}.png")
            with open(image_path, 'wb') as f:
                f.write(image_data)
        elif data.get('image_path'):
            image_path = data['image_path']
        else:
            return jsonify({'error': 'No image provided'}), 400
        
        ocr_result = invoice_ml_service.process_with_ocr(image_path)
        
        # Clean up temp file
        if data.get('image_base64') and os.path.exists(image_path):
            os.remove(image_path)
        
        if not ocr_result.get('success'):
            return jsonify({'error': 'OCR processing failed', 'details': ocr_result}), 500
        
        # Build full result
        full_result = {
            'success': True,
            'ocr': ocr_result,
            'matching': None,
            'duplicate_check': None,
            'fraud_detection': None,
            'gl_coding': None,
            'tax_validation': None
        }
        
        invoice_data = ocr_result.get('extracted_data', {})
        
        # Step 2: 3-Way Matching (if PO and GRN provided)
        if data.get('po_data') and data.get('grn_data'):
            matching_result = invoice_ml_service.perform_three_way_match(
                invoice_data,
                data['po_data'],
                data['grn_data'],
                data.get('tolerance', 0.05)
            )
            full_result['matching'] = matching_result
        
        # Step 3: Duplicate Detection
        if data.get('historical_invoices'):
            duplicate_result = invoice_ml_service.detect_duplicate(
                invoice_data,
                data['historical_invoices']
            )
            full_result['duplicate_check'] = duplicate_result
        
        # Step 4: Fraud Detection
        fraud_result = invoice_ml_service.detect_fraud(invoice_data)
        full_result['fraud_detection'] = fraud_result
        
        # Step 5: GL Coding for line items
        if data.get('gl_accounts') and invoice_data.get('line_items'):
            gl_coding_results = []
            for line_item in invoice_data['line_items']:
                gl_result = invoice_ml_service.suggest_gl_coding(
                    line_item,
                    data['gl_accounts']
                )
                gl_coding_results.append({
                    'line_item': line_item,
                    'gl_suggestion': gl_result
                })
            full_result['gl_coding'] = gl_coding_results
        
        # Step 6: Tax Validation
        if data.get('tax_rules'):
            tax_result = invoice_ml_service.validate_tax(
                invoice_data,
                data['tax_rules']
            )
            full_result['tax_validation'] = tax_result
        
        # Overall recommendation
        recommendation = 'auto_approve'
        if fraud_result.get('fraud_score', 0) >= 25:
            recommendation = 'manual_review'
        if full_result.get('duplicate_check', {}).get('is_duplicate'):
            recommendation = 'reject'
        if full_result.get('matching', {}).get('status') == 'exception':
            recommendation = 'manual_review'
        
        full_result['recommendation'] = recommendation
        
        return jsonify(full_result)
        
    except Exception as e:
        logger.error(f"Full invoice processing error: {str(e)}")
        if image_path and os.path.exists(image_path):
            os.remove(image_path)
        return jsonify({'error': str(e)}), 500


# =====================================================
# COMPLIANCE ML ENDPOINTS
# =====================================================

from compliance_ml import compliance_ml

@app.route('/compliance/enrich-signal', methods=['POST'])
def enrich_compliance_signal():
    """Enrich compliance signal with ML-derived insights"""
    try:
        data = request.json
        result = compliance_ml.enrich_signal(data)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Signal enrichment error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/compliance/calculate-risk', methods=['POST'])
def calculate_compliance_risk():
    """Calculate comprehensive risk score for vendor"""
    try:
        data = request.json
        result = compliance_ml.calculate_risk_score(data)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Risk calculation error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/compliance/risk-explanation', methods=['POST'])
def explain_compliance_risk():
    """Generate SHAP-like explanations for risk score"""
    try:
        data = request.json
        result = compliance_ml.explain_risk(data)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Risk explanation error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/compliance/detect-anomalies', methods=['POST'])
def detect_compliance_anomalies():
    """Detect anomalies in vendor compliance patterns"""
    try:
        data = request.json
        result = compliance_ml.detect_anomalies(data)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Anomaly detection error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/compliance/analyze-contract', methods=['POST'])
def analyze_compliance_contract():
    """Analyze contract for compliance clauses and obligations"""
    try:
        data = request.json
        contract_text = data.get('contractText', '')
        vendor_id = data.get('vendorId')
        result = compliance_ml.analyze_contract(contract_text, vendor_id)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Contract analysis error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/compliance/extract-obligations', methods=['POST'])
def extract_compliance_obligations():
    """Extract obligations from contract text"""
    try:
        data = request.json
        contract_text = data.get('contractText', '')
        obligations = compliance_ml.extract_obligations_only(contract_text)
        return jsonify({'success': True, 'obligations': obligations})
    except Exception as e:
        logger.error(f"Obligation extraction error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/compliance/sanctions-check', methods=['POST'])
def check_sanctions():
    """Perform sanctions screening"""
    try:
        data = request.json
        result = compliance_ml.check_sanctions(data)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Sanctions check error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/compliance/adverse-media', methods=['POST'])
def check_adverse_media():
    """Perform adverse media screening"""
    try:
        data = request.json
        result = compliance_ml.check_adverse_media(data)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Adverse media check error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/compliance/verify-document', methods=['POST'])
def verify_compliance_document():
    """Verify document authenticity and validity"""
    try:
        data = request.json
        result = compliance_ml.verify_document(data)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Document verification error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/compliance/kyc-verify', methods=['POST'])
def verify_kyc():
    """Verify KYC information"""
    try:
        data = request.json
        result = compliance_ml.verify_kyc(data)
        return jsonify(result)
    except Exception as e:
        logger.error(f"KYC verification error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ============================================================
# PREDICTIVE ANALYTICS ENDPOINTS
# ============================================================

@app.route('/predictions/spend/forecast', methods=['POST'])
def forecast_spend():
    """
    Generate spend forecast
    
    Request body:
    {
        "periods": number,
        "granularity": "monthly" | "quarterly" | "annual",
        "baseDate": "YYYY-MM-DD",
        "vendorId": "string",
        "categoryId": "string"
    }
    """
    try:
        data = request.json
        result = prediction_service.forecast_spend(data)
        return jsonify({'success': True, **result})
    except Exception as e:
        logger.error(f"Spend forecast error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/predictions/spend/budget-breach', methods=['POST'])
def detect_budget_breach():
    """
    Detect potential budget breaches
    
    Request body:
    {
        "periods": number,
        "granularity": "monthly" | "quarterly",
        "budgetAmount": number,
        "threshold": number (0-1)
    }
    """
    try:
        data = request.json
        result = prediction_service.detect_budget_breach(data)
        return jsonify({'success': True, **result})
    except Exception as e:
        logger.error(f"Budget breach detection error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/predictions/risk/vendor', methods=['POST'])
def predict_vendor_risk():
    """
    Predict vendor risk scores
    
    Request body:
    {
        "vendorId": "string",
        "deliveryDelayRate": number,
        "qualityDefectRate": number,
        "complianceViolations": number,
        "financialStabilityScore": number,
        "disputeFrequency": number,
        ...
    }
    """
    try:
        data = request.json
        result = prediction_service.predict_vendor_risk(data)
        return jsonify({'success': True, **result})
    except Exception as e:
        logger.error(f"Vendor risk prediction error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/predictions/risk/vendor/batch', methods=['POST'])
def predict_vendor_risk_batch():
    """
    Batch predict vendor risks
    
    Request body:
    {
        "vendors": [{vendor_data}, ...]
    }
    """
    try:
        data = request.json
        vendors = data.get('vendors', [])
        results = prediction_service.predict_vendor_risk_batch(vendors)
        return jsonify({'success': True, 'predictions': results})
    except Exception as e:
        logger.error(f"Batch vendor risk prediction error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/predictions/anomaly/detect', methods=['POST'])
def detect_prediction_anomalies():
    """
    Detect anomalies in data (invoice, transaction, vendor)
    
    Request body:
    {
        "entityType": "invoice" | "transaction" | "vendor",
        "data": {...}
    }
    """
    try:
        data = request.json
        entity_type = data.get('entityType', 'invoice')
        entity_data = data.get('data', data)
        result = prediction_service.detect_anomalies(entity_data, entity_type)
        return jsonify({'success': True, **result})
    except Exception as e:
        logger.error(f"Anomaly detection error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/predictions/demand/forecast', methods=['POST'])
def forecast_demand():
    """
    Generate demand forecast
    
    Request body:
    {
        "productId": "string",
        "avgDemand": number,
        "historicalDemand": [number],
        "granularity": "monthly" | "weekly" | "daily",
        "periods": number
    }
    """
    try:
        data = request.json
        periods = data.get('periods', 12)
        result = prediction_service.forecast_demand(data, periods)
        return jsonify({'success': True, **result})
    except Exception as e:
        logger.error(f"Demand forecast error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/predictions/workload/forecast', methods=['POST'])
def forecast_workload():
    """
    Forecast team workload
    
    Request body:
    {
        "teams": [{"name": "string", "currentLoad": number, "capacity": number}],
        "granularity": "weekly" | "monthly",
        "periods": number
    }
    """
    try:
        data = request.json
        periods = data.get('periods', 4)
        result = prediction_service.forecast_workload(data, periods)
        return jsonify({'success': True, **result})
    except Exception as e:
        logger.error(f"Workload forecast error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/predictions/scenario/run', methods=['POST'])
def run_scenario():
    """
    Run what-if scenario simulation
    
    Request body:
    {
        "name": "string",
        "type": "spend" | "risk" | "demand" | "vendor_loss" | "custom",
        "inputVariables": [
            {"name": "string", "baselineValue": number, "scenarioValue": number, "unit": "string"}
        ]
    }
    """
    try:
        data = request.json
        result = prediction_service.run_scenario(data)
        return jsonify({'success': True, **result})
    except Exception as e:
        logger.error(f"Scenario simulation error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/predictions/scenario/compare', methods=['POST'])
def compare_scenarios():
    """
    Compare multiple scenario results
    
    Request body:
    {
        "scenarios": [{scenario_result}, ...]
    }
    """
    try:
        data = request.json
        scenarios = data.get('scenarios', [])
        result = prediction_service.compare_scenarios(scenarios)
        return jsonify({'success': True, **result})
    except Exception as e:
        logger.error(f"Scenario comparison error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/predictions/dashboard', methods=['GET'])
def get_prediction_dashboard():
    """
    Get comprehensive prediction dashboard data
    """
    try:
        result = prediction_service.get_comprehensive_dashboard({})
        return jsonify({'success': True, **result})
    except Exception as e:
        logger.error(f"Dashboard generation error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ============================================================
# LLM / AI INTELLIGENCE ENDPOINTS
# ============================================================

@app.route('/llm/health', methods=['GET'])
def llm_health_check():
    """Check LLM service health and available providers"""
    try:
        health = llm_service.health_check()
        return jsonify({
            'success': True,
            'providers': health,
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"LLM health check error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/llm/contract/analyze', methods=['POST'])
def llm_analyze_contract():
    """
    Analyze contract using LLM
    
    Request body:
    {
        "contract_text": "full contract text..."
    }
    """
    try:
        data = request.json
        contract_text = data.get('contract_text', '')
        
        if not contract_text:
            return jsonify({'success': False, 'error': 'No contract text provided'}), 400
        
        result = llm_service.analyze_contract(contract_text)
        return jsonify({'success': True, **result})
    except Exception as e:
        logger.error(f"Contract analysis error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/llm/fraud/explain', methods=['POST'])
def llm_explain_fraud():
    """
    Generate human-readable fraud alert explanation
    
    Request body:
    {
        "invoice_data": {
            "invoiceNumber": "...",
            "vendorName": "...",
            "totalAmount": 1000,
            ...
        },
        "fraud_indicators": ["duplicate", "unusual_amount", ...],
        "anomaly_details": [...]
    }
    """
    try:
        data = request.json
        
        result = llm_service.explain_fraud_alert(
            invoice_data=data.get('invoice_data', {}),
            fraud_indicators=data.get('fraud_indicators', []),
            anomaly_details=data.get('anomaly_details', [])
        )
        
        return jsonify(result)
    except Exception as e:
        logger.error(f"Fraud explanation error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/llm/vendor/risk-narrative', methods=['POST'])
def llm_vendor_risk_narrative():
    """
    Generate vendor risk assessment narrative
    
    Request body:
    {
        "vendorName": "...",
        "overall": 0.65,
        "delivery": 0.45,
        "quality": 0.52,
        "compliance": 0.48,
        "financial": 0.35,
        "trajectory": "declining",
        "riskFactors": [...]
    }
    """
    try:
        data = request.json
        result = llm_service.generate_vendor_risk_narrative(data)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Risk narrative error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/llm/compliance/actions', methods=['POST'])
def llm_compliance_actions():
    """
    Generate compliance remediation action plan
    
    Request body:
    {
        "requirement": "ISO 27001 certification",
        "vendorName": "TechCorp",
        "severity": "high",
        "status": "non-compliant",
        "description": "...",
        "dueDate": "2024-12-31"
    }
    """
    try:
        data = request.json
        result = llm_service.suggest_compliance_actions(data)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Compliance actions error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/llm/exceptions/summarize', methods=['POST'])
def llm_summarize_exceptions():
    """
    Summarize invoice exceptions and generate insights
    
    Request body:
    {
        "exceptions": [
            {"type": "...", "invoiceNumber": "...", "description": "..."},
            ...
        ]
    }
    """
    try:
        data = request.json
        exceptions = data.get('exceptions', [])
        
        if not exceptions:
            return jsonify({'success': False, 'error': 'No exceptions provided'}), 400
        
        result = llm_service.summarize_invoice_exceptions(exceptions)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Exception summary error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/llm/invoice/insights', methods=['POST'])
def llm_invoice_insights():
    """
    Extract insights from invoice in context of historical data
    
    Request body:
    {
        "invoice_data": {...},
        "historical_data": [...]
    }
    """
    try:
        data = request.json
        
        result = llm_service.extract_invoice_insights(
            invoice_data=data.get('invoice_data', {}),
            historical_data=data.get('historical_data', [])
        )
        
        return jsonify(result)
    except Exception as e:
        logger.error(f"Invoice insights error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/llm/chatbot', methods=['POST'])
def llm_chatbot():
    """
    Chatbot endpoint for conversational queries
    
    Request body:
    {
        "message": "What's the status of my invoice?",
        "context": {
            "role": "vendor",
            "vendorName": "TechCorp",
            "recentActivity": "Submitted invoice INV-001"
        }
    }
    """
    try:
        data = request.json
        
        result = llm_service.chatbot_response(
            user_message=data.get('message', ''),
            context=data.get('context', {})
        )
        
        return jsonify(result)
    except Exception as e:
        logger.error(f"Chatbot error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/llm/generate', methods=['POST'])
def llm_generate_custom():
    """
    Custom LLM generation endpoint for ad-hoc queries
    
    Request body:
    {
        "prompt": "Your prompt here",
        "system_prompt": "Optional system prompt",
        "model_preference": "default|analysis|code|fast",
        "temperature": 0.7,
        "max_tokens": 1000
    }
    """
    try:
        data = request.json
        
        result = llm_service.generate(
            prompt=data.get('prompt', ''),
            system_prompt=data.get('system_prompt', 'You are a helpful AI assistant.'),
            model_preference=data.get('model_preference', 'default'),
            temperature=data.get('temperature', 0.7),
            max_tokens=data.get('max_tokens', 1000)
        )
        
        return jsonify(result)
    except Exception as e:
        logger.error(f"LLM generation error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


if __name__ == '__main__':
    app.run(
        host=Config.HOST,
        port=Config.PORT,
        debug=Config.DEBUG
    )
