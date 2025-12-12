# Quick Start Guide

## Prerequisites

- Node.js (v18 or higher)
- MongoDB (local or Atlas)
- npm or yarn

## Installation

### Option 1: Automated Setup (Recommended)

```bash
chmod +x setup.sh
./setup.sh
```

### Option 2: Manual Setup

#### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

#### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## Starting the Application

### Start Backend Server
```bash
cd backend
npm run dev
```
Server runs at: http://localhost:5000

### Start Frontend
```bash
cd frontend
npm run dev
```
Frontend runs at: http://localhost:3000

## Default Ports

- Frontend: `3000`
- Backend: `5000`
- MongoDB: `27017` (default)

## Environment Variables

Create `backend/.env` file with:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/ivms_db
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRE=7d
CORS_ORIGIN=http://localhost:3000
```

## Features

✅ User Authentication (JWT)
✅ Vendor Management
✅ Product Inventory
✅ Order Tracking
✅ Supply Chain Analytics
✅ Dashboard with Statistics
✅ Role-based Access Control

## User Roles

- **Admin**: Full access
- **Manager**: Manage vendors, products, orders
- **Vendor**: Limited access to own data
- **User**: View only access

## Testing the API

### Health Check
```bash
curl http://localhost:5000/api/health
```

### Register User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "role": "admin"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

## MongoDB Setup

### Local MongoDB
```bash
# Install MongoDB (macOS)
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB
brew services start mongodb-community
```

### MongoDB Atlas (Cloud)
1. Create account at https://www.mongodb.com/atlas
2. Create a cluster
3. Get connection string
4. Update `MONGODB_URI` in `.env`

## Troubleshooting

### Port already in use
```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9

# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### MongoDB connection issues
- Ensure MongoDB is running
- Check MONGODB_URI in .env
- Verify network access in MongoDB Atlas

### Module not found errors
```bash
# Reinstall dependencies
cd backend && rm -rf node_modules package-lock.json && npm install
cd frontend && rm -rf node_modules package-lock.json && npm install
```

## Project Structure

```
.
├── backend/
│   ├── config/          # Database configuration
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Auth & error handling
│   ├── models/          # Mongoose schemas
│   ├── routes/          # API routes
│   ├── .env            # Environment variables
│   ├── .env.example    # Environment template
│   ├── package.json    # Backend dependencies
│   └── server.js       # Entry point
├── frontend/
│   ├── src/
│   │   ├── components/ # React components
│   │   ├── context/    # State management
│   │   ├── pages/      # Page components
│   │   ├── services/   # API client
│   │   ├── App.jsx     # Root component
│   │   └── main.jsx    # Entry point
│   ├── index.html
│   ├── package.json    # Frontend dependencies
│   └── vite.config.js  # Vite configuration
├── README.md
└── setup.sh            # Setup script
```

## Support

For issues or questions, please check the documentation or create an issue in the repository.
