"""
OCR Service
Document processing using Tesseract OCR
"""

import pytesseract
from PIL import Image
import re
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional
import os

logger = logging.getLogger(__name__)


class OCRService:
    """OCR processing for invoices, contracts, and certifications"""
    
    def __init__(self):
        # Common patterns for document parsing
        self.patterns = {
            'date': [
                r'\b(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b',
                r'\b(\w+\s+\d{1,2},?\s+\d{4})\b',
                r'\b(\d{4}[-/]\d{1,2}[-/]\d{1,2})\b'
            ],
            'amount': [
                r'\$[\d,]+(?:\.\d{2})?',
                r'[\d,]+(?:\.\d{2})?\s*(?:USD|EUR|GBP)',
                r'(?:Total|Amount|Due)[\s:]*\$?[\d,]+(?:\.\d{2})?'
            ],
            'invoice_number': [
                r'(?:Invoice|Inv)[\s#:]*([A-Z0-9-]+)',
                r'(?:Number|No|#)[\s:]*([A-Z0-9-]+)'
            ],
            'vendor': [
                r'(?:From|Vendor|Supplier)[\s:]*([A-Za-z\s&]+?)(?:\n|,)',
                r'(?:Company|Corporation|Inc|LLC|Ltd)[\s:]*([A-Za-z\s&]+)'
            ],
            'email': r'[\w\.-]+@[\w\.-]+\.\w+',
            'phone': r'(?:\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}'
        }
    
    def process_image(self, image_path: str) -> Dict[str, Any]:
        """
        Process an image and extract text using OCR
        
        Args:
            image_path: Path to the image file
            
        Returns:
            Dictionary with extracted text and confidence
        """
        try:
            if not os.path.exists(image_path):
                return {
                    'success': False,
                    'error': f'File not found: {image_path}'
                }
            
            # Open image
            image = Image.open(image_path)
            
            # Perform OCR
            ocr_data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
            text = pytesseract.image_to_string(image)
            
            # Calculate confidence
            confidences = [int(c) for c in ocr_data['conf'] if int(c) > 0]
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0
            
            return {
                'success': True,
                'text': text,
                'confidence': avg_confidence / 100,
                'word_count': len([w for w in ocr_data['text'] if w.strip()]),
                'processed_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"OCR processing error: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def process_invoice(self, image_path: str) -> Dict[str, Any]:
        """
        Process an invoice image and extract structured data
        
        Args:
            image_path: Path to the invoice image
            
        Returns:
            Dictionary with extracted invoice data
        """
        try:
            # Get raw text
            ocr_result = self.process_image(image_path)
            if not ocr_result['success']:
                return ocr_result
            
            text = ocr_result['text']
            
            # Extract invoice fields
            invoice_data = {
                'success': True,
                'raw_text': text,
                'ocr_confidence': ocr_result['confidence'],
                'extracted_data': {
                    'invoice_number': self._extract_invoice_number(text),
                    'date': self._extract_date(text),
                    'vendor': self._extract_vendor(text),
                    'amounts': self._extract_amounts(text),
                    'total_amount': self._extract_total_amount(text),
                    'line_items': self._extract_line_items(text),
                    'contact_info': {
                        'email': self._extract_pattern(text, self.patterns['email']),
                        'phone': self._extract_pattern(text, self.patterns['phone'])
                    }
                },
                'processed_at': datetime.now().isoformat()
            }
            
            # Calculate extraction confidence
            fields_extracted = sum(1 for v in invoice_data['extracted_data'].values() if v)
            invoice_data['extraction_confidence'] = fields_extracted / 7
            
            return invoice_data
            
        except Exception as e:
            logger.error(f"Invoice processing error: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def process_certificate(self, image_path: str) -> Dict[str, Any]:
        """
        Process a certificate image and extract structured data
        
        Args:
            image_path: Path to the certificate image
            
        Returns:
            Dictionary with extracted certificate data
        """
        try:
            ocr_result = self.process_image(image_path)
            if not ocr_result['success']:
                return ocr_result
            
            text = ocr_result['text']
            
            certificate_data = {
                'success': True,
                'raw_text': text,
                'ocr_confidence': ocr_result['confidence'],
                'extracted_data': {
                    'certificate_number': self._extract_certificate_number(text),
                    'certificate_type': self._extract_certificate_type(text),
                    'issued_to': self._extract_issued_to(text),
                    'issuing_body': self._extract_issuing_body(text),
                    'issue_date': self._extract_date(text),
                    'expiry_date': self._extract_expiry_date(text),
                    'scope': self._extract_scope(text)
                },
                'processed_at': datetime.now().isoformat()
            }
            
            return certificate_data
            
        except Exception as e:
            logger.error(f"Certificate processing error: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def process_contract(self, image_path: str) -> Dict[str, Any]:
        """
        Process a contract image and extract structured data
        
        Args:
            image_path: Path to the contract image
            
        Returns:
            Dictionary with extracted contract data
        """
        try:
            ocr_result = self.process_image(image_path)
            if not ocr_result['success']:
                return ocr_result
            
            text = ocr_result['text']
            
            contract_data = {
                'success': True,
                'raw_text': text,
                'ocr_confidence': ocr_result['confidence'],
                'extracted_data': {
                    'contract_number': self._extract_contract_number(text),
                    'parties': self._extract_parties(text),
                    'effective_date': self._extract_date(text),
                    'expiry_date': self._extract_expiry_date(text),
                    'value': self._extract_total_amount(text),
                    'key_terms': self._extract_key_terms(text),
                    'clauses': self._extract_clauses(text)
                },
                'processed_at': datetime.now().isoformat()
            }
            
            return contract_data
            
        except Exception as e:
            logger.error(f"Contract processing error: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    # Helper extraction methods
    def _extract_pattern(self, text: str, pattern: str) -> Optional[str]:
        """Extract first match for a regex pattern"""
        match = re.search(pattern, text, re.IGNORECASE)
        return match.group(0) if match else None
    
    def _extract_invoice_number(self, text: str) -> Optional[str]:
        """Extract invoice number from text"""
        for pattern in self.patterns['invoice_number']:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1) if match.lastindex else match.group(0)
        return None
    
    def _extract_date(self, text: str) -> Optional[str]:
        """Extract date from text"""
        for pattern in self.patterns['date']:
            match = re.search(pattern, text)
            if match:
                return match.group(1) if match.lastindex else match.group(0)
        return None
    
    def _extract_expiry_date(self, text: str) -> Optional[str]:
        """Extract expiry/end date from text"""
        expiry_patterns = [
            r'(?:Expir|Valid Until|End Date|Expires?)[\s:]*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})',
            r'(?:Expir|Valid Until|End Date|Expires?)[\s:]*(\w+\s+\d{1,2},?\s+\d{4})'
        ]
        for pattern in expiry_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1)
        return None
    
    def _extract_vendor(self, text: str) -> Optional[str]:
        """Extract vendor name from text"""
        for pattern in self.patterns['vendor']:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip() if match.lastindex else match.group(0).strip()
        return None
    
    def _extract_amounts(self, text: str) -> List[str]:
        """Extract all monetary amounts from text"""
        amounts = []
        for pattern in self.patterns['amount']:
            matches = re.findall(pattern, text, re.IGNORECASE)
            amounts.extend(matches)
        return list(set(amounts))
    
    def _extract_total_amount(self, text: str) -> Optional[float]:
        """Extract total amount from text"""
        total_patterns = [
            r'(?:Total|Grand Total|Amount Due|Balance Due)[\s:]*\$?([\d,]+(?:\.\d{2})?)',
            r'\$?([\d,]+(?:\.\d{2})?)\s*(?:Total|USD)'
        ]
        for pattern in total_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                amount_str = match.group(1).replace(',', '')
                try:
                    return float(amount_str)
                except ValueError:
                    continue
        return None
    
    def _extract_line_items(self, text: str) -> List[Dict]:
        """Extract line items from invoice text"""
        items = []
        # Pattern for line items: description, quantity, price
        line_pattern = r'(.+?)\s+(\d+)\s+\$?([\d,]+(?:\.\d{2})?)\s+\$?([\d,]+(?:\.\d{2})?)'
        matches = re.findall(line_pattern, text)
        
        for match in matches[:10]:  # Limit to 10 items
            try:
                items.append({
                    'description': match[0].strip(),
                    'quantity': int(match[1]),
                    'unit_price': float(match[2].replace(',', '')),
                    'total': float(match[3].replace(',', ''))
                })
            except (ValueError, IndexError):
                continue
        
        return items
    
    def _extract_certificate_number(self, text: str) -> Optional[str]:
        """Extract certificate number"""
        patterns = [
            r'(?:Certificate|Cert)[\s#:]*(?:No|Number)?[\s:]*([A-Z0-9-]+)',
            r'(?:Registration|Reg)[\s#:]*(?:No|Number)?[\s:]*([A-Z0-9-]+)'
        ]
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1)
        return None
    
    def _extract_certificate_type(self, text: str) -> Optional[str]:
        """Extract certificate type"""
        cert_types = [
            'ISO 9001', 'ISO 14001', 'ISO 27001', 'ISO 45001',
            'SOC 1', 'SOC 2', 'SOC 3',
            'PCI DSS', 'HIPAA', 'GDPR',
            'CE', 'UL', 'FCC'
        ]
        text_upper = text.upper()
        for cert_type in cert_types:
            if cert_type.upper() in text_upper:
                return cert_type
        return None
    
    def _extract_issued_to(self, text: str) -> Optional[str]:
        """Extract who the certificate was issued to"""
        patterns = [
            r'(?:Issued To|Awarded To|Certified To|Holder)[\s:]*([A-Za-z\s&,]+?)(?:\n|$)',
            r'(?:This is to certify that)[\s:]*([A-Za-z\s&,]+?)(?:\n|has|is)'
        ]
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        return None
    
    def _extract_issuing_body(self, text: str) -> Optional[str]:
        """Extract the issuing organization"""
        patterns = [
            r'(?:Issued By|Certified By|Accredited By)[\s:]*([A-Za-z\s&,]+?)(?:\n|$)',
            r'(?:Certifying Body|Registrar)[\s:]*([A-Za-z\s&,]+?)(?:\n|$)'
        ]
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        return None
    
    def _extract_scope(self, text: str) -> Optional[str]:
        """Extract certificate scope"""
        patterns = [
            r'(?:Scope|Coverage|For)[\s:]*([^\n]+)',
            r'(?:applicable to|covers)[\s:]*([^\n]+)'
        ]
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        return None
    
    def _extract_contract_number(self, text: str) -> Optional[str]:
        """Extract contract number"""
        patterns = [
            r'(?:Contract|Agreement)[\s#:]*(?:No|Number)?[\s:]*([A-Z0-9-]+)',
            r'(?:Reference|Ref)[\s#:]*([A-Z0-9-]+)'
        ]
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1)
        return None
    
    def _extract_parties(self, text: str) -> List[str]:
        """Extract contract parties"""
        parties = []
        patterns = [
            r'(?:between|party[:\s]*)([A-Za-z\s&,]+?)(?:\s*and\s*|\s*\()',
            r'(?:and|party[:\s]*)([A-Za-z\s&,]+?)(?:\n|\(|hereinafter)'
        ]
        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            parties.extend([m.strip() for m in matches if m.strip()])
        return list(set(parties))[:2]  # Return max 2 parties
    
    def _extract_key_terms(self, text: str) -> List[str]:
        """Extract key terms from contract"""
        terms = []
        term_keywords = [
            'payment', 'delivery', 'warranty', 'termination',
            'confidentiality', 'indemnification', 'liability',
            'force majeure', 'intellectual property', 'dispute'
        ]
        text_lower = text.lower()
        for keyword in term_keywords:
            if keyword in text_lower:
                terms.append(keyword)
        return terms
    
    def _extract_clauses(self, text: str) -> List[Dict]:
        """Extract major clauses from contract"""
        clauses = []
        # Look for numbered or named sections
        section_pattern = r'(?:^|\n)\s*(?:(\d+)\.?\s*|Article\s+(\d+|[IVX]+)[:\s]*)?([A-Z][A-Za-z\s]+)\n'
        matches = re.findall(section_pattern, text)
        
        for match in matches[:15]:  # Limit to 15 clauses
            section_num = match[0] or match[1] or ''
            title = match[2].strip() if match[2] else ''
            if title and len(title) > 3:
                clauses.append({
                    'section': section_num,
                    'title': title
                })
        
        return clauses


# Singleton instance
ocr_service = OCRService()
