# MongoDB Installation & Setup Guide

## Installing MongoDB on macOS

### Option 1: Using Homebrew (Recommended)

```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Add MongoDB tap
brew tap mongodb/brew

# Install MongoDB Community Edition
brew install mongodb-community@7.0

# Start MongoDB service
brew services start mongodb-community@7.0

# Verify MongoDB is running
brew services list

# Test MongoDB connection
mongosh
```

### Option 2: Using MongoDB Atlas (Cloud - No Installation Required)

1. **Sign up for MongoDB Atlas**
   - Go to https://www.mongodb.com/atlas
   - Create a free account

2. **Create a Cluster**
   - Click "Build a Database"
   - Choose "Free Shared Cluster"
   - Select a cloud provider and region
   - Click "Create Cluster"

3. **Create Database User**
   - Go to "Database Access"
   - Click "Add New Database User"
   - Create username and password
   - Give "Read and write to any database" permission

4. **Configure Network Access**
   - Go to "Network Access"
   - Click "Add IP Address"
   - For development, click "Allow Access from Anywhere" (0.0.0.0/0)
   - For production, add specific IPs

5. **Get Connection String**
   - Go to "Database" → "Connect"
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password
   - Update `backend/.env`:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/ivms_db?retryWrites=true&w=majority
   ```

## MongoDB Commands

### Start MongoDB Service
```bash
# macOS with Homebrew
brew services start mongodb-community@7.0

# Linux
sudo systemctl start mongod

# Windows
net start MongoDB
```

### Stop MongoDB Service
```bash
# macOS
brew services stop mongodb-community@7.0

# Linux
sudo systemctl stop mongod

# Windows
net stop MongoDB
```

### Check MongoDB Status
```bash
brew services list | grep mongodb
```

### Connect to MongoDB Shell
```bash
mongosh
```

### Create Database and Collections (Optional)
```javascript
// In mongosh
use ivms_db

// Create collections (optional - they'll be created automatically)
db.createCollection("users")
db.createCollection("vendors")
db.createCollection("products")
db.createCollection("orders")

// View all databases
show dbs

// View collections in current database
show collections
```

## Troubleshooting

### MongoDB won't start
```bash
# Check if MongoDB is already running
ps aux | grep mongod

# Check MongoDB logs
tail -f /opt/homebrew/var/log/mongodb/mongo.log

# Try starting manually
mongod --config /opt/homebrew/etc/mongod.conf
```

### Port 27017 already in use
```bash
# Find process using port 27017
lsof -i :27017

# Kill the process (use PID from above command)
kill -9 <PID>
```

### Permission errors
```bash
# Fix MongoDB data directory permissions
sudo chown -R `id -un` /opt/homebrew/var/mongodb
```

## Recommended: MongoDB Compass (GUI)

MongoDB Compass is a free GUI tool for MongoDB:

1. Download from: https://www.mongodb.com/products/compass
2. Install and open Compass
3. Connect to: `mongodb://localhost:27017`
4. Browse and manage your database visually

## Environment Configuration

Update your `backend/.env` file:

### Local MongoDB
```env
MONGODB_URI=mongodb://localhost:27017/ivms_db
```

### MongoDB Atlas
```env
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/ivms_db?retryWrites=true&w=majority
```

## Quick Test

After setting up MongoDB, test the connection:

```bash
cd backend
npm run dev
```

You should see:
```
Server running in development mode on port 5000
MongoDB Connected: localhost
```

## Next Steps

Once MongoDB is running:
1. Start the backend server: `cd backend && npm run dev`
2. Start the frontend: `cd frontend && npm run dev`
3. Open browser: http://localhost:3000
4. Register a new user and start using the application!
