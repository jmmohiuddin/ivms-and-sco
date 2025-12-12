# 🤖 LLM Service Setup Guide

## Cost: $0 (100% FREE) ✅

This guide helps you set up AI/LLM capabilities in your IVMS project **without spending any money**.

---

## 🎯 What You Get (All FREE)

### Local AI Models (Unlimited, No API Keys)
- ✅ **Llama 3.2** (3B & 1B) - Fast, efficient, high quality
- ✅ **Mistral 7B** - Excellent for business analysis
- ✅ **Code Llama** - For technical tasks

### Optional Cloud Backup (FREE Tiers)
- 🌐 **Groq API** - 30 requests/min (very fast)
- 🌐 **HuggingFace** - Rate-limited but works

---

## 📦 Quick Setup (5 Minutes)

### Step 1: Install Ollama & Models

```bash
cd ml-service

# Make setup script executable
chmod +x setup_llm.sh

# Run setup (installs Ollama + downloads models)
./setup_llm.sh
```

**What this does:**
- Installs Ollama (local LLM runtime)
- Downloads 3 AI models (~5GB total)
- Starts Ollama service on port 11434
- Tests the installation

### Step 2: Configure Environment (Optional)

```bash
# Copy example env file
cp .env.llm.example .env.llm

# Edit .env.llm to add free API keys (optional)
nano .env.llm
```

**You can skip this step** if you want to use only local models (100% works without API keys).

### Step 3: Verify Installation

```bash
# Check Ollama is running
curl http://localhost:11434/api/tags

# Test a model
ollama run llama3.2:1b "Hello, how are you?"
```

---

## 🆓 Get Free API Keys (Optional, for Cloud Fallback)

### Option 1: Groq (Recommended - VERY FAST)

1. Visit: https://console.groq.com
2. Sign up (email only, no credit card)
3. Go to "API Keys" section
4. Click "Create API Key"
5. Copy the key and add to `.env.llm`:
   ```
   GROQ_API_KEY=gsk_xxxxxxxxxxxxx
   ```

**Free Tier:**
- ✅ 30 requests/minute
- ✅ Very fast inference (<1 second)
- ✅ Llama 3.1 70B model (high quality)
- ✅ No credit card required

### Option 2: HuggingFace (Backup)

1. Visit: https://huggingface.co/settings/tokens
2. Sign up (email only)
3. Create new token (read access)
4. Copy and add to `.env.llm`:
   ```
   HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxx
   ```

**Free Tier:**
- ✅ Rate limited (slower)
- ✅ Many models available
- ✅ No credit card required

---

## 🚀 Usage Examples

### 1. Analyze Contract (via curl)

```bash
curl -X POST http://localhost:5001/llm/contract/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "contract_text": "This agreement between parties..."
  }'
```

### 2. Explain Fraud Alert

```bash
curl -X POST http://localhost:5001/llm/fraud/explain \
  -H "Content-Type: application/json" \
  -d '{
    "invoice_data": {
      "invoiceNumber": "INV-001",
      "vendorName": "TechCorp",
      "totalAmount": 15000
    },
    "fraud_indicators": ["duplicate_invoice", "unusual_amount"]
  }'
```

### 3. Vendor Risk Narrative

```bash
curl -X POST http://localhost:5001/llm/vendor/risk-narrative \
  -H "Content-Type: application/json" \
  -d '{
    "vendorName": "ACME Corp",
    "overall": 0.65,
    "delivery": 0.45,
    "quality": 0.52,
    "trajectory": "declining"
  }'
```

### 4. Chatbot

```bash
curl -X POST http://localhost:5001/llm/chatbot \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is the status of my invoice?",
    "context": {
      "role": "vendor",
      "vendorName": "TechCorp"
    }
  }'
```

### 5. From Frontend (React)

```javascript
// Add to your frontend service
import api from './api';

export const llmService = {
  analyzeContract: async (contractText) => {
    const response = await api.post('/llm/contract/analyze', {
      contract_text: contractText
    });
    return response.data;
  },

  explainFraud: async (invoiceData, indicators) => {
    const response = await api.post('/llm/fraud/explain', {
      invoice_data: invoiceData,
      fraud_indicators: indicators
    });
    return response.data;
  },

  chatbot: async (message, context) => {
    const response = await api.post('/llm/chatbot', {
      message,
      context
    });
    return response.data;
  }
};
```

---

## 🏗️ Architecture

```
User Request
    ↓
Backend (Node.js)
    ↓
ML Service (Python/Flask) - Port 5001
    ↓
LLM Service (llm_service.py)
    ↓
┌─────────────────────────────────────┐
│  Priority Order (Auto Fallback):    │
│                                      │
│  1. Ollama (Local) ← Try First      │
│     - Free, unlimited               │
│     - Fast on M1/M2 Macs            │
│     - No API keys needed            │
│                                      │
│  2. Groq (Cloud) ← Fallback         │
│     - 30 req/min free               │
│     - Very fast (<1s)               │
│     - Requires API key              │
│                                      │
│  3. HuggingFace ← Last Resort       │
│     - Free but slower               │
│     - Requires API key              │
└─────────────────────────────────────┘
```

---

## 📊 Available LLM Endpoints

### Health Check
- `GET /llm/health` - Check provider status

### Core Functions
- `POST /llm/contract/analyze` - Analyze contracts
- `POST /llm/fraud/explain` - Explain fraud alerts
- `POST /llm/vendor/risk-narrative` - Generate risk reports
- `POST /llm/compliance/actions` - Suggest compliance fixes
- `POST /llm/exceptions/summarize` - Summarize exceptions
- `POST /llm/invoice/insights` - Extract invoice insights
- `POST /llm/chatbot` - Conversational queries
- `POST /llm/generate` - Custom LLM generation

---

## 🎯 Features Powered by LLM

### ✅ Already Implemented

1. **Contract Analysis**
   - Extract obligations, payment terms, risks
   - Identify concerning clauses
   - Structured JSON output

2. **Fraud Explanation**
   - Plain English fraud alert explanations
   - Non-technical language for AP teams
   - Actionable recommendations

3. **Vendor Risk Narratives**
   - Executive summaries of vendor risks
   - Business impact analysis
   - Mitigation strategies

4. **Compliance Remediation**
   - Step-by-step action plans
   - Timeline and ownership suggestions
   - Practical implementation steps

5. **Exception Summarization**
   - Pattern analysis across exceptions
   - Priority recommendations
   - Root cause analysis

6. **Invoice Insights**
   - Historical comparison
   - Trend identification
   - Quick recommendations

7. **Chatbot**
   - Context-aware responses
   - Vendor and internal user queries
   - Professional, helpful tone

---

## 💻 System Requirements

### Minimum (for Llama 3.2 1B)
- 8GB RAM
- 2GB disk space
- macOS, Linux, or Windows (WSL2)

### Recommended (for Mistral 7B)
- 16GB RAM
- 5GB disk space
- Apple Silicon (M1/M2) or modern CPU

---

## 🔧 Troubleshooting

### Ollama not starting?

```bash
# Check if Ollama is running
ps aux | grep ollama

# Restart Ollama
pkill ollama
ollama serve &

# Check logs
tail -f ~/.ollama/logs/server.log
```

### Models not downloading?

```bash
# Check internet connection
curl -I https://ollama.com

# Manually pull models
ollama pull llama3.2:3b

# List installed models
ollama list
```

### Port 11434 already in use?

```bash
# Find what's using the port
lsof -i :11434

# Kill the process
kill -9 <PID>

# Or change Ollama port
OLLAMA_HOST=0.0.0.0:11435 ollama serve
```

### Python module errors?

```bash
cd ml-service

# Install dependencies
pip install -r requirements.txt

# Verify
python -c "from llm_service import llm_service; print('OK')"
```

---

## 📈 Performance

### Local (Ollama on M1 Mac)
- Llama 3.2 1B: ~0.5s per request
- Llama 3.2 3B: ~1-2s per request
- Mistral 7B: ~2-4s per request

### Cloud (Groq)
- Llama 3.1 70B: ~0.5-1s per request
- Very fast inference

### Cloud (HuggingFace)
- Mixtral 8x7B: ~3-10s per request
- Slower but works

---

## 🎉 Benefits of This Setup

✅ **Zero Cost** - No API bills, ever
✅ **Privacy** - Data never leaves your machine (local)
✅ **Unlimited** - No rate limits with Ollama
✅ **Fast** - Sub-second responses on modern hardware
✅ **Offline** - Works without internet (local mode)
✅ **Scalable** - Can add cloud APIs when needed
✅ **Compliant** - GDPR/SOC2 friendly (local processing)

---

## 🚀 Next Steps

1. ✅ **Run setup script** - `./setup_llm.sh`
2. 📝 **Test endpoints** - Use curl examples above
3. 🌐 **Optional: Add API keys** - For cloud fallback
4. 💻 **Integrate in frontend** - Add LLM service calls
5. 🎨 **Create UI components** - Chatbot, contract analyzer, etc.

---

## 📞 Support

If you need help:
1. Check `/llm/health` endpoint
2. Review Ollama logs: `~/.ollama/logs/server.log`
3. Test models directly: `ollama run llama3.2:1b "test"`

---

**You're all set! 🎉 Enjoy AI-powered vendor management at $0 cost!**
