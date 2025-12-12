#!/bin/bash

# Setup script for LLM Service
# Installs Ollama and downloads free models

echo "=========================================="
echo "🤖 Setting up LLM Service (100% FREE)"
echo "=========================================="
echo ""

# Check OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "✓ Detected macOS"
    
    # Install Ollama
    echo ""
    echo "📦 Installing Ollama (local LLM runtime)..."
    if ! command -v ollama &> /dev/null; then
        curl -fsSL https://ollama.com/install.sh | sh
        echo "✓ Ollama installed successfully"
    else
        echo "✓ Ollama already installed"
    fi
    
    # Start Ollama service
    echo ""
    echo "🚀 Starting Ollama service..."
    ollama serve > /dev/null 2>&1 &
    OLLAMA_PID=$!
    sleep 3
    
    # Download models
    echo ""
    echo "📥 Downloading AI models (this may take a few minutes)..."
    echo ""
    
    echo "1️⃣  Downloading Llama 3.2 (3B) - Fast, efficient model..."
    ollama pull llama3.2:3b
    echo "✓ Llama 3.2 (3B) ready"
    
    echo ""
    echo "2️⃣  Downloading Llama 3.2 (1B) - Ultra-fast model..."
    ollama pull llama3.2:1b
    echo "✓ Llama 3.2 (1B) ready"
    
    echo ""
    echo "3️⃣  Downloading Mistral 7B - High-quality analysis model..."
    ollama pull mistral:7b
    echo "✓ Mistral 7B ready"
    
    echo ""
    echo "=========================================="
    echo "✅ Setup Complete!"
    echo "=========================================="
    echo ""
    echo "📊 Installed Models:"
    ollama list
    
    echo ""
    echo "🎯 Next Steps:"
    echo "1. Ollama is running on http://localhost:11434"
    echo "2. Models are ready to use (100% free, unlimited)"
    echo "3. Optional: Get free API keys for cloud fallback:"
    echo "   - Groq (fast, free): https://console.groq.com"
    echo "   - HuggingFace (backup): https://huggingface.co/settings/tokens"
    echo ""
    echo "4. Add API keys to .env file:"
    echo "   GROQ_API_KEY=your_key_here"
    echo "   HUGGINGFACE_API_KEY=your_key_here"
    echo ""
    echo "🚀 Start the ML service with: python app.py"
    
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "✓ Detected Linux"
    
    # Install Ollama
    echo ""
    echo "📦 Installing Ollama..."
    if ! command -v ollama &> /dev/null; then
        curl -fsSL https://ollama.com/install.sh | sh
        echo "✓ Ollama installed"
    else
        echo "✓ Ollama already installed"
    fi
    
    # Start Ollama
    echo ""
    echo "🚀 Starting Ollama service..."
    ollama serve > /dev/null 2>&1 &
    sleep 3
    
    # Download models
    echo ""
    echo "📥 Downloading models..."
    ollama pull llama3.2:3b
    ollama pull llama3.2:1b
    ollama pull mistral:7b
    
    echo ""
    echo "✅ Setup complete! Ollama running on http://localhost:11434"
    
else
    echo "❌ Unsupported OS: $OSTYPE"
    echo "Please install Ollama manually from https://ollama.com"
    exit 1
fi

echo ""
echo "=========================================="
echo "💡 Testing Installation..."
echo "=========================================="
echo ""

# Test Ollama
echo "Testing Llama 3.2..."
ollama run llama3.2:1b "Say 'Hello from IVMS!' in one sentence" --verbose=false

echo ""
echo "=========================================="
echo "🎉 All systems operational!"
echo "=========================================="
