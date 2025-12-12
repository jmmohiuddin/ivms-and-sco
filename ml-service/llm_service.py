"""
LLM Service for Intelligent Vendor Management System
Hybrid approach: Local Ollama (primary) + Free Cloud APIs (fallback)

Cost: $0 - Uses only free tiers
- Ollama: 100% free, unlimited (local)
- Groq: Free 30 req/min (cloud, very fast)
- HuggingFace: Free tier (cloud, backup)
"""

import requests
import json
import os
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)


class LLMService:
    """
    Intelligent LLM routing with automatic fallback
    Priority: Ollama (local) -> Groq (fast cloud) -> HuggingFace (backup)
    """
    
    def __init__(self):
        # Ollama configuration (local, free, unlimited)
        self.ollama_url = os.getenv('OLLAMA_URL', 'http://localhost:11434')
        self.ollama_available = self._check_ollama()
        
        # Groq configuration (free tier: 30 req/min, very fast)
        self.groq_api_key = os.getenv('GROQ_API_KEY', '')
        self.groq_url = 'https://api.groq.com/openai/v1/chat/completions'
        self.groq_model = 'llama-3.1-70b-versatile'  # Free, fast, high quality
        
        # HuggingFace configuration (free tier, backup)
        self.hf_api_key = os.getenv('HUGGINGFACE_API_KEY', '')
        self.hf_model = 'mistralai/Mixtral-8x7B-Instruct-v0.1'
        
        # Model preferences
        self.ollama_models = {
            'default': 'llama3.2:3b',
            'analysis': 'mistral:7b',
            'code': 'codellama:7b',
            'fast': 'llama3.2:1b'
        }
        
        logger.info(f"LLM Service initialized - Ollama: {self.ollama_available}")
    
    def _check_ollama(self) -> bool:
        """Check if Ollama is running locally"""
        try:
            response = requests.get(f"{self.ollama_url}/api/tags", timeout=2)
            return response.status_code == 200
        except:
            logger.warning("Ollama not available, will use cloud APIs")
            return False
    
    def generate(
        self,
        prompt: str,
        system_prompt: str = "You are a helpful AI assistant for vendor management.",
        model_preference: str = 'default',
        temperature: float = 0.7,
        max_tokens: int = 1000
    ) -> Dict:
        """
        Generate text with automatic fallback
        1. Try Ollama (local, free, unlimited)
        2. Fallback to Groq (free tier, fast)
        3. Fallback to HuggingFace (free tier)
        """
        
        # Try Ollama first (local, free, unlimited)
        if self.ollama_available:
            try:
                result = self._generate_ollama(
                    prompt, system_prompt, model_preference, temperature, max_tokens
                )
                if result.get('success'):
                    return result
            except Exception as e:
                logger.warning(f"Ollama failed: {e}, trying cloud APIs")
        
        # Try Groq (free, very fast)
        if self.groq_api_key:
            try:
                result = self._generate_groq(
                    prompt, system_prompt, temperature, max_tokens
                )
                if result.get('success'):
                    return result
            except Exception as e:
                logger.warning(f"Groq failed: {e}, trying HuggingFace")
        
        # Try HuggingFace (free tier)
        if self.hf_api_key:
            try:
                result = self._generate_huggingface(
                    prompt, system_prompt, temperature, max_tokens
                )
                if result.get('success'):
                    return result
            except Exception as e:
                logger.error(f"All LLM providers failed: {e}")
        
        # All providers failed
        return {
            'success': False,
            'error': 'All LLM providers unavailable. Please check Ollama or add API keys.',
            'response': ''
        }
    
    def _generate_ollama(
        self,
        prompt: str,
        system_prompt: str,
        model_preference: str,
        temperature: float,
        max_tokens: int
    ) -> Dict:
        """Generate using local Ollama"""
        
        model = self.ollama_models.get(model_preference, self.ollama_models['default'])
        
        # Format as chat messages
        full_prompt = f"{system_prompt}\n\nUser: {prompt}\n\nAssistant:"
        
        payload = {
            "model": model,
            "prompt": full_prompt,
            "temperature": temperature,
            "options": {
                "num_predict": max_tokens,
                "top_p": 0.9
            },
            "stream": False
        }
        
        response = requests.post(
            f"{self.ollama_url}/api/generate",
            json=payload,
            timeout=60
        )
        
        if response.status_code == 200:
            data = response.json()
            return {
                'success': True,
                'response': data.get('response', '').strip(),
                'model': model,
                'provider': 'ollama'
            }
        
        return {'success': False}
    
    def _generate_groq(
        self,
        prompt: str,
        system_prompt: str,
        temperature: float,
        max_tokens: int
    ) -> Dict:
        """Generate using Groq (free tier, very fast)"""
        
        headers = {
            'Authorization': f'Bearer {self.groq_api_key}',
            'Content-Type': 'application/json'
        }
        
        payload = {
            "model": self.groq_model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            "temperature": temperature,
            "max_tokens": max_tokens,
            "top_p": 0.9
        }
        
        response = requests.post(
            self.groq_url,
            headers=headers,
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            return {
                'success': True,
                'response': data['choices'][0]['message']['content'].strip(),
                'model': self.groq_model,
                'provider': 'groq'
            }
        
        return {'success': False}
    
    def _generate_huggingface(
        self,
        prompt: str,
        system_prompt: str,
        temperature: float,
        max_tokens: int
    ) -> Dict:
        """Generate using HuggingFace Inference API (free tier)"""
        
        headers = {
            'Authorization': f'Bearer {self.hf_api_key}',
            'Content-Type': 'application/json'
        }
        
        # Format for Mixtral
        full_prompt = f"<s>[INST] {system_prompt}\n\n{prompt} [/INST]"
        
        payload = {
            "inputs": full_prompt,
            "parameters": {
                "temperature": temperature,
                "max_new_tokens": max_tokens,
                "top_p": 0.9,
                "return_full_text": False
            }
        }
        
        response = requests.post(
            f"https://api-inference.huggingface.co/models/{self.hf_model}",
            headers=headers,
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            text = data[0]['generated_text'] if isinstance(data, list) else data.get('generated_text', '')
            return {
                'success': True,
                'response': text.strip(),
                'model': self.hf_model,
                'provider': 'huggingface'
            }
        
        return {'success': False}
    
    # =========================================================================
    # VENDOR MANAGEMENT SPECIFIC FUNCTIONS
    # =========================================================================
    
    def analyze_contract(self, contract_text: str) -> Dict:
        """
        Analyze vendor contract and extract key information
        Returns: obligations, payment terms, risks, compliance requirements
        """
        
        prompt = f"""Analyze this vendor contract and extract the following in JSON format:

Contract Text:
{contract_text[:3000]}  # Limit to avoid token limits

Extract:
{{
  "key_obligations": ["list of vendor obligations"],
  "payment_terms": {{
    "amount": "payment amount if specified",
    "schedule": "payment schedule",
    "terms": "net days or payment terms"
  }},
  "termination_clauses": ["termination conditions"],
  "risk_factors": ["potential risks or red flags"],
  "compliance_requirements": ["regulatory or compliance needs"],
  "contract_duration": "start and end dates if specified",
  "renewal_terms": "auto-renewal or renewal conditions"
}}

Provide ONLY the JSON object, no additional text."""
        
        system_prompt = "You are a legal contract analyst specializing in vendor agreements. Extract information accurately and flag any concerning clauses."
        
        result = self.generate(
            prompt=prompt,
            system_prompt=system_prompt,
            model_preference='analysis',
            temperature=0.3,
            max_tokens=1500
        )
        
        if result.get('success'):
            return self._parse_json_response(result['response'])
        
        return {'error': 'Failed to analyze contract', 'details': result.get('error')}
    
    def explain_fraud_alert(
        self,
        invoice_data: Dict,
        fraud_indicators: List[str],
        anomaly_details: List[Dict] = None
    ) -> Dict:
        """
        Generate human-readable explanation for fraud alerts
        Returns: plain English explanation for AP team
        """
        
        anomaly_text = ""
        if anomaly_details:
            anomaly_text = "\n\nAnomaly Details:\n" + "\n".join([
                f"- {d.get('field')}: Expected {d.get('expectedValue')}, Found {d.get('actualValue')} (Deviation: {d.get('deviation')}%)"
                for d in anomaly_details[:5]
            ])
        
        prompt = f"""You are a fraud analyst explaining an alert to the Accounts Payable team.

Invoice Details:
- Invoice Number: {invoice_data.get('invoiceNumber', 'N/A')}
- Vendor: {invoice_data.get('vendorName', 'Unknown')}
- Amount: ${invoice_data.get('totalAmount', 0):,.2f}
- Date: {invoice_data.get('invoiceDate', 'N/A')}

Fraud Risk Indicators:
{chr(10).join(f'- {ind}' for ind in fraud_indicators)}
{anomaly_text}

Explain in 2-3 clear paragraphs:
1. What triggered this alert (in plain English)
2. Why this is concerning
3. Recommended next steps

Keep it professional but easy to understand for non-technical staff."""
        
        system_prompt = "You are a fraud prevention expert who explains complex fraud patterns in simple terms for business users."
        
        result = self.generate(
            prompt=prompt,
            system_prompt=system_prompt,
            temperature=0.6,
            max_tokens=800
        )
        
        return {
            'success': result.get('success', False),
            'explanation': result.get('response', ''),
            'provider': result.get('provider', 'unknown')
        }
    
    def generate_vendor_risk_narrative(self, risk_data: Dict) -> Dict:
        """
        Generate comprehensive vendor risk assessment narrative
        Returns: Executive summary of vendor risk profile
        """
        
        prompt = f"""Generate a professional vendor risk assessment report.

Vendor Information:
- Name: {risk_data.get('vendorName', 'N/A')}
- Risk Score: {risk_data.get('overall', 0) * 100:.1f}/100
- Risk Level: {self._risk_level(risk_data.get('overall', 0))}

Risk Breakdown:
- Delivery Risk: {risk_data.get('delivery', 0) * 100:.0f}%
- Quality Risk: {risk_data.get('quality', 0) * 100:.0f}%
- Compliance Risk: {risk_data.get('compliance', 0) * 100:.0f}%
- Financial Risk: {risk_data.get('financial', 0) * 100:.0f}%

Risk Trajectory: {risk_data.get('trajectory', 'stable')}

Risk Factors:
{json.dumps(risk_data.get('riskFactors', []), indent=2)}

Write a 3-paragraph executive summary:
1. Overall risk assessment and key concerns
2. Specific risk factors and their business impact
3. Recommended actions and mitigation strategies

Keep it concise and actionable for management."""
        
        system_prompt = "You are a vendor risk management expert writing for executive leadership. Focus on business impact and actionable recommendations."
        
        result = self.generate(
            prompt=prompt,
            system_prompt=system_prompt,
            model_preference='analysis',
            temperature=0.5,
            max_tokens=1000
        )
        
        return {
            'success': result.get('success', False),
            'narrative': result.get('response', ''),
            'provider': result.get('provider', 'unknown')
        }
    
    def suggest_compliance_actions(self, compliance_gap: Dict) -> Dict:
        """
        Generate actionable compliance remediation steps
        Returns: Step-by-step remediation plan
        """
        
        prompt = f"""You are a compliance expert. Provide a remediation plan for this compliance gap.

Compliance Issue:
- Requirement: {compliance_gap.get('requirement', 'N/A')}
- Vendor: {compliance_gap.get('vendorName', 'N/A')}
- Severity: {compliance_gap.get('severity', 'medium')}
- Current Status: {compliance_gap.get('status', 'non-compliant')}
- Gap Description: {compliance_gap.get('description', '')}
- Due Date: {compliance_gap.get('dueDate', 'ASAP')}

Provide 4-6 specific, actionable remediation steps in this format:

Step 1: [Action]
- Owner: [Who should do this]
- Timeline: [When to complete]
- Details: [How to do it]

Step 2: [Action]
...

Focus on practical, achievable steps."""
        
        system_prompt = "You are a compliance remediation specialist. Provide clear, actionable steps that can be immediately implemented."
        
        result = self.generate(
            prompt=prompt,
            system_prompt=system_prompt,
            model_preference='analysis',
            temperature=0.4,
            max_tokens=1200
        )
        
        if result.get('success'):
            # Parse steps from response
            response_text = result.get('response', '')
            steps = []
            for line in response_text.split('\n'):
                if line.strip().startswith('Step '):
                    steps.append(line.strip())
            
            return {
                'success': True,
                'full_plan': response_text,
                'steps': steps,
                'provider': result.get('provider', 'unknown')
            }
        
        return {'success': False, 'error': result.get('error')}
    
    def summarize_invoice_exceptions(self, exceptions: List[Dict]) -> Dict:
        """
        Summarize multiple invoice exceptions into actionable insights
        Returns: Executive summary and prioritized action items
        """
        
        exception_summary = "\n".join([
            f"- {ex.get('type', 'unknown')}: Invoice {ex.get('invoiceNumber', 'N/A')} - {ex.get('description', '')}"
            for ex in exceptions[:20]  # Limit to avoid token overflow
        ])
        
        prompt = f"""Analyze these invoice exceptions and provide an executive summary.

Total Exceptions: {len(exceptions)}

Exception Details:
{exception_summary}

Provide:
1. Summary of exception patterns (what's most common?)
2. Top 3 priority items that need immediate attention
3. Root cause analysis (why are these happening?)
4. Process improvement recommendations

Keep it concise - 4 paragraphs maximum."""
        
        system_prompt = "You are an Accounts Payable operations analyst. Focus on patterns, priorities, and process improvements."
        
        result = self.generate(
            prompt=prompt,
            system_prompt=system_prompt,
            temperature=0.5,
            max_tokens=1000
        )
        
        return {
            'success': result.get('success', False),
            'summary': result.get('response', ''),
            'provider': result.get('provider', 'unknown')
        }
    
    def chatbot_response(self, user_message: str, context: Dict) -> Dict:
        """
        Handle conversational queries from vendors or internal users
        Returns: Contextual response based on user role and data
        """
        
        role = context.get('role', 'user')
        vendor_name = context.get('vendorName', 'N/A')
        recent_activity = context.get('recentActivity', 'None')
        
        # Build context-aware system prompt
        if role == 'vendor':
            system_prompt = f"""You are a helpful vendor portal assistant for {vendor_name}. 
You help vendors with:
- Invoice submission status
- Payment schedules
- Compliance requirements
- Onboarding process
- Document requirements

Be professional, helpful, and concise."""
        else:
            system_prompt = """You are an intelligent vendor management assistant for internal users.
You help with:
- Vendor information lookup
- Invoice processing queries
- Risk assessment explanations
- Compliance status checks
- Analytics and reporting

Provide accurate, actionable information."""
        
        # Add context to prompt
        prompt = f"""User Context:
- Role: {role}
- Vendor: {vendor_name}
- Recent Activity: {recent_activity}

User Question: {user_message}

Provide a helpful, direct answer. If you don't have enough information, explain what data you'd need."""
        
        result = self.generate(
            prompt=prompt,
            system_prompt=system_prompt,
            temperature=0.7,
            max_tokens=600
        )
        
        return {
            'success': result.get('success', False),
            'response': result.get('response', ''),
            'provider': result.get('provider', 'unknown')
        }
    
    def extract_invoice_insights(self, invoice_data: Dict, historical_data: List[Dict]) -> Dict:
        """
        Extract insights by comparing invoice to historical patterns
        Returns: Insights, trends, and recommendations
        """
        
        avg_amount = sum([inv.get('totalAmount', 0) for inv in historical_data]) / len(historical_data) if historical_data else 0
        
        prompt = f"""Analyze this invoice in context of historical data.

Current Invoice:
- Amount: ${invoice_data.get('totalAmount', 0):,.2f}
- Vendor: {invoice_data.get('vendorName', 'N/A')}
- Items: {invoice_data.get('itemCount', 0)}
- Payment Terms: {invoice_data.get('paymentTerms', 'N/A')}

Historical Context:
- Average Invoice Amount: ${avg_amount:,.2f}
- Previous Invoice Count: {len(historical_data)}
- Typical Payment Terms: {historical_data[0].get('paymentTerms', 'N/A') if historical_data else 'N/A'}

Provide brief insights:
1. Is this invoice amount typical or unusual?
2. Any notable patterns or trends?
3. Quick recommendation (approve/review/flag)

Keep it to 3-4 sentences."""
        
        system_prompt = "You are an invoice analyst identifying patterns and anomalies."
        
        result = self.generate(
            prompt=prompt,
            system_prompt=system_prompt,
            temperature=0.5,
            max_tokens=400
        )
        
        return {
            'success': result.get('success', False),
            'insights': result.get('response', ''),
            'provider': result.get('provider', 'unknown')
        }
    
    # =========================================================================
    # UTILITY FUNCTIONS
    # =========================================================================
    
    def _parse_json_response(self, response: str) -> Dict:
        """Extract and parse JSON from LLM response"""
        try:
            # Try to find JSON in response
            start = response.find('{')
            end = response.rfind('}') + 1
            if start != -1 and end > start:
                json_str = response[start:end]
                return json.loads(json_str)
            return {"raw_response": response, "parsed": False}
        except Exception as e:
            logger.warning(f"JSON parse failed: {e}")
            return {"raw_response": response, "parsed": False, "error": str(e)}
    
    def _risk_level(self, score: float) -> str:
        """Convert risk score to level"""
        if score >= 0.7:
            return "High Risk"
        elif score >= 0.4:
            return "Medium Risk"
        else:
            return "Low Risk"
    
    def health_check(self) -> Dict:
        """Check health of all LLM providers"""
        return {
            'ollama': {
                'available': self.ollama_available,
                'url': self.ollama_url
            },
            'groq': {
                'configured': bool(self.groq_api_key),
                'api_key_set': bool(self.groq_api_key)
            },
            'huggingface': {
                'configured': bool(self.hf_api_key),
                'api_key_set': bool(self.hf_api_key)
            }
        }


# Singleton instance
llm_service = LLMService()
