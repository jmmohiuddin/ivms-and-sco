#!/bin/bash

echo "🚀 Setting up MERN Stack - Intelligent Vendor Management System"
echo "================================================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v18 or higher."
    exit 1
fi

echo "✅ Node.js $(node --version) detected"

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo "⚠️  MongoDB is not running. Please start MongoDB service."
    echo "   You can start it with: brew services start mongodb-community"
    echo "   Or use MongoDB Atlas cloud database"
fi

# Backend setup
echo ""
echo "📦 Setting up Backend..."
cd backend

if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install
else
    echo "✅ Backend dependencies already installed"
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please update .env file with your configuration"
fi

cd ..

# Frontend setup
echo ""
echo "📦 Setting up Frontend..."
cd frontend

if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
else
    echo "✅ Frontend dependencies already installed"
fi

cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Make sure MongoDB is running"
echo "   2. Update backend/.env with your configuration"
echo "   3. Start the backend: cd backend && npm run dev"
echo "   4. Start the frontend: cd frontend && npm run dev"
echo ""
echo "🌐 Application will be available at:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:5000"
