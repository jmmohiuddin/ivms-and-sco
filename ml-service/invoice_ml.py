"""
Invoice ML Service
Advanced invoice processing with OCR, matching, fraud detection, and GL coding
"""

import pytesseract
from PIL import Image
import re
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
import os
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import hashlib
import json

logger = logging.getLogger(__name__)


class InvoiceMLService:
    """Advanced ML service for invoice processing"""
    
    def __init__(self):
        self.vectorizer = TfidfVectorizer(ngram_range=(1, 3), max_features=1000)
        
        # Enhanced patterns for invoice extraction
        self.patterns = {
            'invoice_number': [
                r'(?:Invoice|Inv|Bill)[\s#:]*([A-Z0-9-]+)',
                r'(?:Number|No|#)[\s:]*([A-Z0-9-]+)',
                r'(?:Document|Doc)[\s#:]*([A-Z0-9-]+)'
            ],
            'po_number': [
                r'(?:PO|Purchase\s+Order)[\s#:]*([A-Z0-9-]+)',
                r'(?:Order|Ref)[\s#:]*([A-Z0-9-]+)'
            ],
            'date': [
                r'\b(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b',
                r'\b(\w+\s+\d{1,2},?\s+\d{4})\b',
                r'\b(\d{4}[-/]\d{1,2}[-/]\d{1,2})\b'
            ],
            'amount': [
                r'\$\s*[\d,]+(?:\.\d{2})?',
                r'[\d,]+(?:\.\d{2})?\s*(?:USD|EUR|GBP|CAD)',
                r'(?:Total|Amount|Due|Balance)[\s:]*\$?\s*[\d,]+(?:\.\d{2})?'
            ],
            'tax': [
                r'(?:Tax|VAT|GST|HST)[\s:]*\$?\s*([\d,]+(?:\.\d{2})?)',
                r'(?:Sales\s+Tax)[\s:]*\$?\s*([\d,]+(?:\.\d{2})?)'
            ],
            'vendor': [
                r'^([A-Z][A-Za-z\s&,.-]+?)(?:\n|$)',
                r'(?:From|Vendor|Supplier|Seller)[\s:]*([A-Za-z\s&,.-]+?)(?:\n|$)'
            ],
            'line_item': r'(\d+)\s+([A-Za-z0-9\s-]+?)\s+([\d,]+(?:\.\d{2})?)\s+([\d,]+(?:\.\d{2})?)',
            'email': r'[\w\.-]+@[\w\.-]+\.\w+',
            'phone': r'(?:\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}',
            'bank_account': r'(?:Account|Acct)[\s#:]*(\d{8,17})',
            'routing_number': r'(?:Routing|ABA|RTN)[\s#:]*(\d{9})'
        }
        
        # GL account mapping patterns
        self.gl_patterns = {
            'office_supplies': ['paper', 'pen', 'stapler', 'folder', 'envelope', 'office'],
            'computer_equipment': ['laptop', 'desktop', 'monitor', 'keyboard', 'mouse', 'computer'],
            'software': ['license', 'subscription', 'saas', 'software', 'adobe', 'microsoft'],
            'utilities': ['electric', 'water', 'gas', 'internet', 'phone', 'utility'],
            'travel': ['hotel', 'flight', 'airline', 'uber', 'taxi', 'rental car'],
            'meals': ['restaurant', 'lunch', 'dinner', 'catering', 'food'],
            'professional_services': ['consulting', 'legal', 'accounting', 'audit', 'advisory'],
            'marketing': ['advertising', 'marketing', 'social media', 'campaign', 'promotion'],
            'rent': ['rent', 'lease', 'facility'],
            'insurance': ['insurance', 'premium', 'coverage'],
            'maintenance': ['repair', 'maintenance', 'service', 'cleaning'],
            'shipping': ['shipping', 'freight', 'delivery', 'courier', 'fedex', 'ups']
        }
        
        # Fraud detection patterns
        self.fraud_indicators = {
            'suspicious_amounts': [9999.99, 10000.00, 5000.00],
            'suspicious_vendors': ['test', 'dummy', 'fake', 'temp'],
            'round_amounts': True,
            'weekend_dates': True,
            'duplicate_threshold': 0.95
        }
        
    def process_with_ocr(self, image_path: str) -> Dict[str, Any]:
        """
        Advanced OCR processing with field extraction and confidence scoring
        
        Args:
            image_path: Path to invoice image
            
        Returns:
            Comprehensive extraction results
        """
        try:
            if not os.path.exists(image_path):
                return {
                    'success': False,
                    'error': f'File not found: {image_path}'
                }
            
            # Open and preprocess image
            image = Image.open(image_path)
            
            # Perform OCR with detailed data
            ocr_data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
            text = pytesseract.image_to_string(image)
            
            # Calculate overall confidence
            confidences = [int(c) for c in ocr_data['conf'] if int(c) > 0]
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0
            
            # Extract structured data
            extracted_data = {
                'invoice_number': self._extract_field(text, self.patterns['invoice_number']),
                'po_number': self._extract_field(text, self.patterns['po_number']),
                'invoice_date': self._extract_field(text, self.patterns['date']),
                'vendor_name': self._extract_field(text, self.patterns['vendor']),
                'total_amount': self._extract_total_amount(text),
                'tax_amount': self._extract_field(text, self.patterns['tax']),
                'line_items': self._extract_line_items(text),
                'vendor_email': self._extract_field(text, [self.patterns['email']]),
                'vendor_phone': self._extract_field(text, [self.patterns['phone']]),
                'bank_account': self._extract_field(text, self.patterns['bank_account']),
                'routing_number': self._extract_field(text, self.patterns['routing_number'])
            }
            
            # Build bounding boxes for key fields
            bounding_boxes = self._extract_bounding_boxes(ocr_data, extracted_data)
            
            # Calculate field-level confidence
            field_confidence = {}
            for field, value in extracted_data.items():
                if value:
                    field_confidence[field] = self._calculate_field_confidence(field, value, text)
            
            return {
                'success': True,
                'raw_text': text,
                'confidence': avg_confidence / 100,
                'extracted_data': extracted_data,
                'bounding_boxes': bounding_boxes,
                'field_confidence': field_confidence,
                'needs_review': avg_confidence < 85 or len([v for v in extracted_data.values() if v]) < 5,
                'processed_at': datetime.now().isoformat(),
                'word_count': len([w for w in ocr_data['text'] if w.strip()])
            }
            
        except Exception as e:
            logger.error(f"OCR processing error: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def perform_three_way_match(
        self,
        invoice_data: Dict[str, Any],
        po_data: Dict[str, Any],
        grn_data: Dict[str, Any],
        tolerance: float = 0.05
    ) -> Dict[str, Any]:
        """
        Perform 3-way matching: Invoice ↔ PO ↔ GRN
        
        Args:
            invoice_data: Invoice details
            po_data: Purchase Order details
            grn_data: Goods Receipt Note details
            tolerance: Price/quantity variance tolerance (default 5%)
            
        Returns:
            Match results with scores and discrepancies
        """
        try:
            match_results = {
                'match_type': '3-way',
                'overall_match': True,
                'match_score': 100.0,
                'discrepancies': [],
                'po_match': {},
                'grn_match': {},
                'line_matches': []
            }
            
            # Match PO number
            po_match = self._match_po_number(invoice_data, po_data)
            match_results['po_match'] = po_match
            if not po_match['matched']:
                match_results['overall_match'] = False
                match_results['match_score'] -= 20
                match_results['discrepancies'].append({
                    'type': 'po_number_mismatch',
                    'severity': 'high',
                    'invoice_value': invoice_data.get('po_number'),
                    'po_value': po_data.get('po_number')
                })
            
            # Match vendor
            vendor_match = self._match_vendor(invoice_data, po_data)
            if not vendor_match['matched']:
                match_results['overall_match'] = False
                match_results['match_score'] -= 15
                match_results['discrepancies'].append({
                    'type': 'vendor_mismatch',
                    'severity': 'high',
                    'invoice_value': invoice_data.get('vendor_name'),
                    'po_value': po_data.get('vendor_name')
                })
            
            # Match line items (Invoice ↔ PO ↔ GRN)
            line_matches = self._match_line_items(
                invoice_data.get('line_items', []),
                po_data.get('line_items', []),
                grn_data.get('line_items', []),
                tolerance
            )
            match_results['line_matches'] = line_matches
            
            # Calculate line-level score
            line_score = sum(lm['match_score'] for lm in line_matches) / len(line_matches) if line_matches else 0
            match_results['match_score'] = (match_results['match_score'] * 0.3) + (line_score * 0.7)
            
            # Check for quantity/price variances
            for line_match in line_matches:
                if line_match['price_variance'] > tolerance:
                    match_results['discrepancies'].append({
                        'type': 'price_variance',
                        'severity': 'medium',
                        'line_item': line_match['description'],
                        'variance_pct': line_match['price_variance'],
                        'invoice_price': line_match['invoice_price'],
                        'po_price': line_match['po_price']
                    })
                
                if line_match['quantity_variance'] > tolerance:
                    match_results['discrepancies'].append({
                        'type': 'quantity_variance',
                        'severity': 'medium',
                        'line_item': line_match['description'],
                        'variance_pct': line_match['quantity_variance'],
                        'invoice_qty': line_match['invoice_qty'],
                        'grn_qty': line_match['grn_qty']
                    })
            
            # Final match determination
            if match_results['match_score'] < 90:
                match_results['overall_match'] = False
            
            match_results['status'] = 'matched' if match_results['overall_match'] else 'exception'
            match_results['processed_at'] = datetime.now().isoformat()
            
            return match_results
            
        except Exception as e:
            logger.error(f"3-way matching error: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def perform_semantic_matching(
        self,
        invoice_line: Dict[str, Any],
        catalog_items: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Semantic matching of invoice line items to catalog using NLP
        
        Args:
            invoice_line: Invoice line item
            catalog_items: List of catalog items to match against
            
        Returns:
            Best match with confidence score
        """
        try:
            if not catalog_items:
                return {
                    'matched': False,
                    'reason': 'No catalog items provided'
                }
            
            # Prepare text for comparison
            invoice_text = f"{invoice_line.get('description', '')} {invoice_line.get('sku', '')}"
            catalog_texts = [
                f"{item.get('name', '')} {item.get('description', '')} {item.get('sku', '')}"
                for item in catalog_items
            ]
            
            # Vectorize
            all_texts = [invoice_text] + catalog_texts
            tfidf_matrix = self.vectorizer.fit_transform(all_texts)
            
            # Calculate similarity
            similarities = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:]).flatten()
            
            # Find best match
            best_idx = np.argmax(similarities)
            best_score = similarities[best_idx]
            
            if best_score > 0.6:
                return {
                    'matched': True,
                    'catalog_item': catalog_items[best_idx],
                    'confidence': float(best_score),
                    'match_method': 'semantic',
                    'similarity_score': float(best_score)
                }
            else:
                # Get top 3 suggestions
                top_indices = np.argsort(similarities)[-3:][::-1]
                suggestions = [
                    {
                        'catalog_item': catalog_items[idx],
                        'score': float(similarities[idx])
                    }
                    for idx in top_indices
                ]
                
                return {
                    'matched': False,
                    'reason': 'Low confidence match',
                    'suggestions': suggestions
                }
            
        except Exception as e:
            logger.error(f"Semantic matching error: {str(e)}")
            return {
                'matched': False,
                'error': str(e)
            }
    
    def detect_duplicate(
        self,
        invoice_data: Dict[str, Any],
        historical_invoices: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Detect duplicate invoices using multiple techniques
        
        Args:
            invoice_data: Current invoice
            historical_invoices: List of historical invoices
            
        Returns:
            Duplicate detection results
        """
        try:
            duplicates = []
            
            for hist_inv in historical_invoices:
                # Hash-based duplicate detection
                inv_hash = self._calculate_invoice_hash(invoice_data)
                hist_hash = self._calculate_invoice_hash(hist_inv)
                
                if inv_hash == hist_hash:
                    duplicates.append({
                        'invoice_id': hist_inv.get('_id'),
                        'match_type': 'exact_hash',
                        'confidence': 1.0,
                        'matched_fields': ['all']
                    })
                    continue
                
                # Field-based duplicate detection
                match_score = 0
                matched_fields = []
                
                # Check invoice number
                if invoice_data.get('invoice_number') == hist_inv.get('invoice_number'):
                    match_score += 40
                    matched_fields.append('invoice_number')
                
                # Check vendor + amount + date
                if invoice_data.get('vendor_name') == hist_inv.get('vendor_name'):
                    match_score += 20
                    matched_fields.append('vendor')
                    
                    if invoice_data.get('total_amount') == hist_inv.get('total_amount'):
                        match_score += 30
                        matched_fields.append('amount')
                        
                        # Check date proximity (within 7 days)
                        if self._dates_close(
                            invoice_data.get('invoice_date'),
                            hist_inv.get('invoice_date'),
                            days=7
                        ):
                            match_score += 10
                            matched_fields.append('date')
                
                if match_score >= self.fraud_indicators['duplicate_threshold'] * 100:
                    duplicates.append({
                        'invoice_id': hist_inv.get('_id'),
                        'match_type': 'field_based',
                        'confidence': match_score / 100,
                        'matched_fields': matched_fields
                    })
            
            is_duplicate = len(duplicates) > 0
            
            return {
                'is_duplicate': is_duplicate,
                'duplicate_count': len(duplicates),
                'duplicates': duplicates,
                'recommendation': 'reject' if is_duplicate else 'approve',
                'checked_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Duplicate detection error: {str(e)}")
            return {
                'is_duplicate': False,
                'error': str(e)
            }
    
    def detect_fraud(self, invoice_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Detect potential fraud using multiple indicators
        
        Args:
            invoice_data: Invoice to analyze
            
        Returns:
            Fraud detection results with score and flags
        """
        try:
            fraud_score = 0
            flags = []
            
            # Check suspicious amounts
            total = invoice_data.get('total_amount', 0)
            if isinstance(total, str):
                total = float(re.sub(r'[^\d.]', '', total))
            
            if total in self.fraud_indicators['suspicious_amounts']:
                fraud_score += 25
                flags.append({
                    'type': 'suspicious_amount',
                    'severity': 'high',
                    'detail': f'Amount ${total} is a common fraud indicator'
                })
            
            # Check round amounts (possible manual entry)
            if total > 100 and total % 100 == 0:
                fraud_score += 10
                flags.append({
                    'type': 'round_amount',
                    'severity': 'low',
                    'detail': 'Round amount may indicate manual entry'
                })
            
            # Check suspicious vendor names
            vendor = invoice_data.get('vendor_name', '').lower()
            for suspicious in self.fraud_indicators['suspicious_vendors']:
                if suspicious in vendor:
                    fraud_score += 30
                    flags.append({
                        'type': 'suspicious_vendor',
                        'severity': 'high',
                        'detail': f'Vendor name contains suspicious keyword: {suspicious}'
                    })
            
            # Check for missing critical fields
            critical_fields = ['invoice_number', 'vendor_name', 'total_amount', 'invoice_date']
            missing_fields = [f for f in critical_fields if not invoice_data.get(f)]
            if missing_fields:
                fraud_score += 15 * len(missing_fields)
                flags.append({
                    'type': 'missing_fields',
                    'severity': 'medium',
                    'detail': f'Missing critical fields: {", ".join(missing_fields)}'
                })
            
            # Check bank account changes
            if invoice_data.get('bank_account_changed'):
                fraud_score += 20
                flags.append({
                    'type': 'bank_account_change',
                    'severity': 'high',
                    'detail': 'Bank account differs from vendor master'
                })
            
            # Check invoice number format anomalies
            inv_num = invoice_data.get('invoice_number', '')
            if inv_num and len(inv_num) < 3:
                fraud_score += 10
                flags.append({
                    'type': 'unusual_invoice_format',
                    'severity': 'low',
                    'detail': 'Invoice number format is unusual'
                })
            
            # Determine risk level
            if fraud_score >= 50:
                risk_level = 'high'
            elif fraud_score >= 25:
                risk_level = 'medium'
            else:
                risk_level = 'low'
            
            return {
                'fraud_score': min(fraud_score, 100),
                'risk_level': risk_level,
                'flags': flags,
                'recommendation': 'manual_review' if fraud_score >= 25 else 'auto_process',
                'requires_verification': fraud_score >= 25,
                'analyzed_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Fraud detection error: {str(e)}")
            return {
                'fraud_score': 0,
                'error': str(e)
            }
    
    def suggest_gl_coding(
        self,
        line_item: Dict[str, Any],
        gl_accounts: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Suggest GL account coding using ML
        
        Args:
            line_item: Invoice line item
            gl_accounts: Available GL accounts
            
        Returns:
            GL coding suggestion with confidence
        """
        try:
            description = line_item.get('description', '').lower()
            
            # Score each category
            category_scores = {}
            for category, keywords in self.gl_patterns.items():
                score = sum(1 for keyword in keywords if keyword in description)
                if score > 0:
                    category_scores[category] = score
            
            if not category_scores:
                return {
                    'success': False,
                    'reason': 'No matching category found'
                }
            
            # Find best matching GL account
            best_category = max(category_scores, key=category_scores.get)
            matching_accounts = [
                acc for acc in gl_accounts
                if best_category in acc.get('category', '').lower()
            ]
            
            if matching_accounts:
                suggested_account = matching_accounts[0]
                confidence = min(category_scores[best_category] / 3, 1.0)
                
                return {
                    'success': True,
                    'gl_account': suggested_account.get('account_code'),
                    'account_name': suggested_account.get('account_name'),
                    'category': best_category,
                    'confidence': confidence,
                    'method': 'keyword_matching',
                    'alternatives': matching_accounts[1:3] if len(matching_accounts) > 1 else []
                }
            else:
                return {
                    'success': False,
                    'reason': f'No GL accounts found for category: {best_category}',
                    'suggested_category': best_category
                }
            
        except Exception as e:
            logger.error(f"GL coding error: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def validate_tax(
        self,
        invoice_data: Dict[str, Any],
        tax_rules: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Validate tax calculations and compliance
        
        Args:
            invoice_data: Invoice with tax data
            tax_rules: Tax rules for jurisdiction
            
        Returns:
            Tax validation results
        """
        try:
            # Extract amounts
            subtotal = float(re.sub(r'[^\d.]', '', str(invoice_data.get('subtotal', 0))))
            reported_tax = float(re.sub(r'[^\d.]', '', str(invoice_data.get('tax_amount', 0))))
            total = float(re.sub(r'[^\d.]', '', str(invoice_data.get('total_amount', 0))))
            
            # Get tax rate for jurisdiction
            jurisdiction = invoice_data.get('jurisdiction', tax_rules.get('default_jurisdiction'))
            tax_rate = tax_rules.get('rates', {}).get(jurisdiction, 0.0)
            
            # Calculate expected tax
            calculated_tax = round(subtotal * tax_rate, 2)
            
            # Check for discrepancy
            discrepancy = abs(calculated_tax - reported_tax)
            tolerance = tax_rules.get('tolerance', 0.05)  # $0.05 tolerance
            
            is_valid = discrepancy <= tolerance
            
            # Validate total
            expected_total = subtotal + calculated_tax
            total_discrepancy = abs(expected_total - total)
            
            result = {
                'is_valid': is_valid and total_discrepancy <= tolerance,
                'subtotal': subtotal,
                'reported_tax': reported_tax,
                'calculated_tax': calculated_tax,
                'tax_rate': tax_rate,
                'jurisdiction': jurisdiction,
                'discrepancy': discrepancy,
                'total_discrepancy': total_discrepancy,
                'validated_at': datetime.now().isoformat()
            }
            
            if not is_valid:
                result['issues'] = [{
                    'type': 'tax_calculation_error',
                    'severity': 'high' if discrepancy > 1.0 else 'medium',
                    'message': f'Tax discrepancy of ${discrepancy:.2f} exceeds tolerance'
                }]
            
            return result
            
        except Exception as e:
            logger.error(f"Tax validation error: {str(e)}")
            return {
                'is_valid': False,
                'error': str(e)
            }
    
    # ===== Helper Methods =====
    
    def _extract_field(self, text: str, patterns: List[str]) -> Optional[str]:
        """Extract field using regex patterns"""
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
            if match:
                return match.group(1) if match.groups() else match.group(0)
        return None
    
    def _extract_total_amount(self, text: str) -> Optional[float]:
        """Extract total amount from invoice"""
        # Look for total with various keywords
        patterns = [
            r'(?:Total|Amount\s+Due|Balance\s+Due|Grand\s+Total)[\s:]*\$?\s*([\d,]+(?:\.\d{2})?)',
            r'(?:Total)[\s:]*\$?\s*([\d,]+(?:\.\d{2})?)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                amount_str = match.group(1).replace(',', '')
                try:
                    return float(amount_str)
                except ValueError:
                    continue
        return None
    
    def _extract_line_items(self, text: str) -> List[Dict[str, Any]]:
        """Extract line items from invoice text"""
        lines = text.split('\n')
        line_items = []
        
        for line in lines:
            # Match pattern: Qty Description Unit_Price Total
            match = re.search(
                r'(\d+)\s+([A-Za-z0-9\s-]+?)\s+([\d,]+(?:\.\d{2})?)\s+([\d,]+(?:\.\d{2})?)',
                line
            )
            if match:
                try:
                    line_items.append({
                        'quantity': int(match.group(1)),
                        'description': match.group(2).strip(),
                        'unit_price': float(match.group(3).replace(',', '')),
                        'total': float(match.group(4).replace(',', ''))
                    })
                except ValueError:
                    continue
        
        return line_items
    
    def _extract_bounding_boxes(
        self,
        ocr_data: Dict[str, Any],
        extracted_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Extract bounding boxes for key fields"""
        bounding_boxes = {}
        
        # Map field values to their positions in OCR data
        for field, value in extracted_data.items():
            if value:
                value_str = str(value)
                # Find in OCR data
                for i, text in enumerate(ocr_data.get('text', [])):
                    if value_str in text:
                        bounding_boxes[field] = {
                            'x': ocr_data['left'][i],
                            'y': ocr_data['top'][i],
                            'width': ocr_data['width'][i],
                            'height': ocr_data['height'][i],
                            'confidence': ocr_data['conf'][i]
                        }
                        break
        
        return bounding_boxes
    
    def _calculate_field_confidence(
        self,
        field: str,
        value: Any,
        text: str
    ) -> float:
        """Calculate confidence for extracted field"""
        # Base confidence
        confidence = 0.7
        
        # Adjust based on field type
        if field in ['invoice_number', 'po_number']:
            # Higher confidence for alphanumeric patterns
            if re.match(r'^[A-Z0-9-]+$', str(value)):
                confidence += 0.2
        
        elif field == 'total_amount':
            # Check if amount appears multiple times (validation)
            occurrences = len(re.findall(re.escape(str(value)), text))
            if occurrences >= 2:
                confidence += 0.2
        
        return min(confidence, 1.0)
    
    def _match_po_number(
        self,
        invoice_data: Dict[str, Any],
        po_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Match PO numbers"""
        inv_po = str(invoice_data.get('po_number', '')).strip()
        po_num = str(po_data.get('po_number', '')).strip()
        
        matched = inv_po == po_num
        
        return {
            'matched': matched,
            'confidence': 1.0 if matched else 0.0
        }
    
    def _match_vendor(
        self,
        invoice_data: Dict[str, Any],
        po_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Match vendor names (fuzzy)"""
        inv_vendor = invoice_data.get('vendor_name', '').lower().strip()
        po_vendor = po_data.get('vendor_name', '').lower().strip()
        
        # Exact match
        if inv_vendor == po_vendor:
            return {'matched': True, 'confidence': 1.0}
        
        # Fuzzy match using token similarity
        inv_tokens = set(inv_vendor.split())
        po_tokens = set(po_vendor.split())
        
        if inv_tokens and po_tokens:
            similarity = len(inv_tokens & po_tokens) / len(inv_tokens | po_tokens)
            matched = similarity > 0.6
            return {'matched': matched, 'confidence': similarity}
        
        return {'matched': False, 'confidence': 0.0}
    
    def _match_line_items(
        self,
        inv_lines: List[Dict[str, Any]],
        po_lines: List[Dict[str, Any]],
        grn_lines: List[Dict[str, Any]],
        tolerance: float
    ) -> List[Dict[str, Any]]:
        """Match invoice lines to PO and GRN lines"""
        matches = []
        
        for inv_line in inv_lines:
            best_match = {
                'description': inv_line.get('description'),
                'match_score': 0,
                'invoice_qty': inv_line.get('quantity', 0),
                'invoice_price': inv_line.get('unit_price', 0),
                'po_qty': 0,
                'po_price': 0,
                'grn_qty': 0,
                'price_variance': 0,
                'quantity_variance': 0
            }
            
            # Find matching PO line
            for po_line in po_lines:
                if self._descriptions_match(inv_line.get('description'), po_line.get('description')):
                    best_match['po_qty'] = po_line.get('quantity', 0)
                    best_match['po_price'] = po_line.get('unit_price', 0)
                    
                    # Calculate price variance
                    if best_match['po_price'] > 0:
                        best_match['price_variance'] = abs(
                            best_match['invoice_price'] - best_match['po_price']
                        ) / best_match['po_price']
                    
                    # Find matching GRN line
                    for grn_line in grn_lines:
                        if self._descriptions_match(inv_line.get('description'), grn_line.get('description')):
                            best_match['grn_qty'] = grn_line.get('quantity', 0)
                            
                            # Calculate quantity variance
                            if best_match['grn_qty'] > 0:
                                best_match['quantity_variance'] = abs(
                                    best_match['invoice_qty'] - best_match['grn_qty']
                                ) / best_match['grn_qty']
                            
                            break
                    break
            
            # Calculate match score
            score = 100
            if best_match['price_variance'] > 0:
                score -= min(best_match['price_variance'] * 100, 30)
            if best_match['quantity_variance'] > 0:
                score -= min(best_match['quantity_variance'] * 100, 30)
            
            best_match['match_score'] = max(score, 0)
            matches.append(best_match)
        
        return matches
    
    def _descriptions_match(self, desc1: str, desc2: str) -> bool:
        """Check if two descriptions match"""
        if not desc1 or not desc2:
            return False
        
        d1 = desc1.lower().strip()
        d2 = desc2.lower().strip()
        
        # Exact match
        if d1 == d2:
            return True
        
        # Token-based matching
        tokens1 = set(d1.split())
        tokens2 = set(d2.split())
        
        if tokens1 and tokens2:
            similarity = len(tokens1 & tokens2) / len(tokens1 | tokens2)
            return similarity > 0.6
        
        return False
    
    def _calculate_invoice_hash(self, invoice_data: Dict[str, Any]) -> str:
        """Calculate hash for duplicate detection"""
        # Create a canonical representation
        canonical = {
            'invoice_number': invoice_data.get('invoice_number', ''),
            'vendor_name': invoice_data.get('vendor_name', ''),
            'total_amount': invoice_data.get('total_amount', 0),
            'invoice_date': invoice_data.get('invoice_date', '')
        }
        
        # Sort and serialize
        canonical_str = json.dumps(canonical, sort_keys=True)
        
        # Hash
        return hashlib.sha256(canonical_str.encode()).hexdigest()
    
    def _dates_close(self, date1: str, date2: str, days: int = 7) -> bool:
        """Check if two dates are within N days"""
        try:
            # Simple date parsing (you may want to use dateutil for production)
            # This is a simplified version
            return True  # Placeholder - implement proper date comparison
        except:
            return False


# Global instance
invoice_ml_service = InvoiceMLService()
