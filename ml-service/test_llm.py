"""
Quick test script for LLM Service
Tests all three providers: Ollama, Groq, HuggingFace
"""

from llm_service import llm_service
import json

def test_health():
    """Test LLM service health"""
    print("\n" + "="*60)
    print("🏥 Testing LLM Service Health")
    print("="*60)
    
    health = llm_service.health_check()
    print(json.dumps(health, indent=2))
    
    if health['ollama']['available']:
        print("\n✅ Ollama is ready (local, unlimited, free)")
    else:
        print("\n⚠️  Ollama not available - will use cloud APIs")
    
    if health['groq']['configured']:
        print("✅ Groq API configured (free tier, fast)")
    else:
        print("ℹ️  Groq API not configured (optional)")
    
    if health['huggingface']['configured']:
        print("✅ HuggingFace API configured (backup)")
    else:
        print("ℹ️  HuggingFace API not configured (optional)")


def test_simple_generation():
    """Test basic text generation"""
    print("\n" + "="*60)
    print("💬 Testing Simple Text Generation")
    print("="*60)
    
    result = llm_service.generate(
        prompt="Explain vendor risk management in 2 sentences.",
        temperature=0.7,
        max_tokens=200
    )
    
    if result.get('success'):
        print(f"\n✅ Provider: {result.get('provider', 'unknown')}")
        print(f"📝 Response: {result.get('response', '')}")
    else:
        print(f"\n❌ Error: {result.get('error', 'Unknown error')}")


def test_contract_analysis():
    """Test contract analysis"""
    print("\n" + "="*60)
    print("📄 Testing Contract Analysis")
    print("="*60)
    
    sample_contract = """
    VENDOR SERVICES AGREEMENT
    
    This agreement is between ACME Corp (Vendor) and XYZ Inc (Client).
    
    Payment Terms: Net 30 days from invoice date. 
    Service Fee: $50,000 annually, paid quarterly.
    
    Termination: Either party may terminate with 60 days written notice.
    
    Liability: Vendor's liability is limited to the amount paid in the 12 months 
    preceding the claim.
    
    Compliance: Vendor must maintain SOC 2 Type II certification.
    """
    
    result = llm_service.analyze_contract(sample_contract)
    
    if result.get('parsed'):
        print("\n✅ Contract analysis successful")
        print(json.dumps(result, indent=2))
    else:
        print("\n📝 Raw analysis:")
        print(result.get('raw_response', ''))


def test_fraud_explanation():
    """Test fraud alert explanation"""
    print("\n" + "="*60)
    print("🚨 Testing Fraud Alert Explanation")
    print("="*60)
    
    invoice_data = {
        'invoiceNumber': 'INV-2024-001',
        'vendorName': 'TechSupply Inc',
        'totalAmount': 25000,
        'invoiceDate': '2024-12-06'
    }
    
    fraud_indicators = [
        'duplicate_invoice',
        'unusual_amount_spike',
        'bank_details_changed'
    ]
    
    result = llm_service.explain_fraud_alert(invoice_data, fraud_indicators)
    
    if result.get('success'):
        print(f"\n✅ Provider: {result.get('provider', 'unknown')}")
        print(f"\n📝 Explanation:\n{result.get('explanation', '')}")
    else:
        print(f"\n❌ Error: {result.get('error', 'Unknown error')}")


def test_chatbot():
    """Test chatbot functionality"""
    print("\n" + "="*60)
    print("🤖 Testing Chatbot")
    print("="*60)
    
    context = {
        'role': 'vendor',
        'vendorName': 'TechCorp',
        'recentActivity': 'Submitted invoice INV-001 for $10,000'
    }
    
    result = llm_service.chatbot_response(
        user_message="When will I receive payment for my recent invoice?",
        context=context
    )
    
    if result.get('success'):
        print(f"\n✅ Provider: {result.get('provider', 'unknown')}")
        print(f"\n🤖 Bot Response:\n{result.get('response', '')}")
    else:
        print(f"\n❌ Error: {result.get('error', 'Unknown error')}")


def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("🧪 LLM Service Test Suite")
    print("="*60)
    print("\nThis will test all LLM capabilities...")
    print("Note: First run may be slower as models initialize\n")
    
    try:
        # Test in order
        test_health()
        test_simple_generation()
        test_contract_analysis()
        test_fraud_explanation()
        test_chatbot()
        
        print("\n" + "="*60)
        print("✅ All Tests Complete!")
        print("="*60)
        print("\n💡 Tips:")
        print("- If Ollama failed, run: ./setup_llm.sh")
        print("- For cloud fallback, add API keys to .env.llm")
        print("- Check logs for detailed error messages")
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        print("\n🔧 Troubleshooting:")
        print("1. Check if Ollama is running: curl http://localhost:11434/api/tags")
        print("2. Restart Ollama: ollama serve")
        print("3. Check Python dependencies: pip install -r requirements.txt")


if __name__ == '__main__':
    main()
