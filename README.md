# Intelligent Vendor Management System & Supply Chain Optimization

A comprehensive MERN stack application for managing vendors, products, orders, and optimizing supply chain operations using AI/ML-powered analytics. Built with a three-layer architecture as a **Unified Vendor Command Center**.

## 🏗️ Three-Layer Architecture

### Input Layer
Gathers vendor data, invoices, compliance, certifications, and payment information, eliminating manual silos.
- **VendorDataCollector** - Vendor profile aggregation
- **InvoiceProcessor** - Invoice data collection
- **ComplianceCollector** - Compliance management
- **CertificationManager** - Certification tracking
- **PaymentTracker** - Payment processing
- **ContractIngestion** - Contract management

### Intelligent Layer
Utilizes OCR for document validation, NLP for contract analysis, and ML models for fraud detection and vendor scoring.
- **OCRProcessor** - Document OCR processing (Tesseract.js)
- **NLPAnalyzer** - Contract analysis and clause extraction
- **FraudDetector** - ML-based fraud detection
- **VendorScorer** - Performance scoring and evaluation
- **RiskAssessment** - Multi-factor risk analysis
- **AnomalyDetector** - Statistical anomaly detection

### Output Layer
Produces dashboards, predictive alerts, and audit-ready reports, giving teams real-time visibility into performance and risk.
- **DashboardGenerator** - Real-time dashboard metrics
- **AlertEngine** - Predictive alert generation
- **ReportGenerator** - Audit-ready report generation
- **AnalyticsEngine** - Advanced analytics and KPIs

## 🚀 Features

### Core Features
- **Vendor Management**: Add, edit, delete, and track vendor performance
- **Product Inventory**: Complete product catalog with stock tracking
- **Order Management**: Create, track, and manage purchase orders
- **User Authentication**: Secure JWT-based authentication

### Supply Chain Optimization
- **Demand Forecasting**: AI-powered demand prediction using multiple algorithms
  - Moving Average
  - Exponential Smoothing (Single, Double, Triple)
  - ARIMA
  - Prophet
  - Ensemble Methods

- **Inventory Optimization**
  - Economic Order Quantity (EOQ) calculation
  - Safety Stock optimization
  - Reorder Point calculation
  - Multi-criteria inventory analysis

- **Vendor Selection**
  - Performance scoring
  - Multi-criteria vendor evaluation
  - Automated vendor recommendations

- **Cost Analysis**
  - Order consolidation opportunities
  - Volume discount optimization
  - Carrying cost reduction
  - Shipping optimization

- **Intelligent Alerts**
  - Low stock alerts
  - Demand spike detection
  - Vendor performance issues
  - Anomaly detection

## 🛠️ Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **node-cron** - Scheduled jobs
- **axios** - HTTP client

### Frontend
- **React 18** - UI library
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router DOM** - Routing
- **Recharts** - Data visualization
- **React Toastify** - Notifications
- **React Icons** - Icon library

### ML Service (Python)
- **Flask** - Web framework
- **pandas** - Data manipulation
- **NumPy** - Numerical computing
- **scikit-learn** - Machine learning
- **Prophet** - Time series forecasting
- **statsmodels** - Statistical models

## 📁 Project Structure

```
├── backend/
│   ├── config/
│   │   └── db.js                 # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js     # Authentication logic
│   │   ├── vendorController.js   # Vendor CRUD operations
│   │   ├── productController.js  # Product management
│   │   ├── orderController.js    # Order processing
│   │   ├── supplyChainController.js  # Analytics
│   │   └── optimizationController.js # Optimization endpoints
│   ├── layers/
│   │   ├── input/                # Input Layer
│   │   │   ├── index.js
│   │   │   ├── VendorDataCollector.js
│   │   │   ├── InvoiceProcessor.js
│   │   │   ├── ComplianceCollector.js
│   │   │   ├── CertificationManager.js
│   │   │   ├── PaymentTracker.js
│   │   │   └── ContractIngestion.js
│   │   ├── intelligent/          # Intelligent Layer
│   │   │   ├── index.js
│   │   │   ├── OCRProcessor.js
│   │   │   ├── NLPAnalyzer.js
│   │   │   ├── FraudDetector.js
│   │   │   ├── VendorScorer.js
│   │   │   ├── RiskAssessment.js
│   │   │   └── AnomalyDetector.js
│   │   └── output/               # Output Layer
│   │       ├── index.js
│   │       ├── DashboardGenerator.js
│   │       ├── AlertEngine.js
│   │       ├── ReportGenerator.js
│   │       └── AnalyticsEngine.js
│   ├── middleware/
│   │   ├── auth.js               # JWT authentication
│   │   └── errorHandler.js       # Error handling
│   ├── models/
│   │   ├── User.js
│   │   ├── Vendor.js
│   │   ├── Product.js
│   │   ├── Order.js
│   │   ├── Invoice.js            # Invoice management
│   │   ├── Payment.js            # Payment tracking
│   │   ├── Contract.js           # Contract management
│   │   ├── Compliance.js         # Compliance tracking
│   │   ├── Certification.js      # Certification management
│   │   ├── SupplyChainMetrics.js
│   │   ├── DemandForecast.js
│   │   ├── OptimizationResult.js
│   │   └── Alert.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── vendorRoutes.js
│   │   ├── productRoutes.js
│   │   ├── orderRoutes.js
│   │   ├── supplyChainRoutes.js
│   │   ├── optimizationRoutes.js
│   │   └── layerRoutes.js        # Three-layer API routes
│   ├── services/
│   │   ├── SupplyChainOptimizer.js   # Optimization algorithms
│   │   ├── DemandForecaster.js       # Forecasting service
│   │   └── AlertService.js           # Alert management
│   ├── jobs/
│   │   └── scheduledJobs.js          # Cron jobs
│   ├── utils/
│   │   └── calculations.js           # Math utilities
│   ├── server.js
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   └── Header.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Vendors.jsx
│   │   │   ├── Products.jsx
│   │   │   ├── Orders.jsx
│   │   │   └── Analytics.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
│
├── ml-service/
│   ├── app.py                    # Flask API
│   ├── forecasting.py            # Demand forecasting
│   ├── optimization.py           # Supply chain optimization
│   ├── anomaly_detection.py      # Anomaly detection
│   ├── config.py
│   ├── requirements.txt
│   └── .env.example
│
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB (local or Atlas)
- Python 3.9+ (for ML service)
- npm or yarn

### 1. Clone the Repository
```bash
git clone <repository-url>
cd "Intelligent Vendor management System"
```

### 2. Backend Setup
```bash
cd backend
npm install

# Create environment file
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret

# Start the server
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install

# Start the development server
npm run dev
```

### 4. ML Service Setup (Optional)
```bash
cd ml-service
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create environment file
cp .env.example .env

# Start the ML service
python app.py
```

## 🔧 Environment Variables

### Backend (.env)
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ivms_db
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=7d
ML_SERVICE_URL=http://localhost:5001
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000/api
```

### ML Service (.env)
```env
FLASK_ENV=development
MONGO_URI=mongodb://localhost:27017/ivms_db
SECRET_KEY=your_secret_key
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Vendors
- `GET /api/vendors` - Get all vendors
- `POST /api/vendors` - Create vendor
- `GET /api/vendors/:id` - Get vendor by ID
- `PUT /api/vendors/:id` - Update vendor
- `DELETE /api/vendors/:id` - Delete vendor

### Products
- `GET /api/products` - Get all products
- `POST /api/products` - Create product
- `GET /api/products/:id` - Get product by ID
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Orders
- `GET /api/orders` - Get all orders
- `POST /api/orders` - Create order
- `GET /api/orders/:id` - Get order by ID
- `PATCH /api/orders/:id/status` - Update order status

### Supply Chain Analytics
- `GET /api/supply-chain/analytics` - Get analytics dashboard
- `GET /api/supply-chain/forecast` - Get demand forecasts
- `GET /api/supply-chain/metrics` - Get supply chain metrics

### Optimization
- `POST /api/optimization/full` - Run full optimization
- `POST /api/optimization/inventory` - Inventory optimization
- `POST /api/optimization/vendor-selection` - Vendor selection
- `POST /api/optimization/costs` - Cost optimization
- `GET /api/optimization/alerts` - Get alerts
- `PATCH /api/optimization/alerts/:id/acknowledge` - Acknowledge alert

### Three-Layer Architecture APIs

#### Input Layer
- `POST /api/layers/input/vendors` - Create vendor profile
- `PUT /api/layers/input/vendors/:vendorId` - Update vendor data
- `GET /api/layers/input/vendors/:vendorId/comprehensive` - Get comprehensive vendor view
- `POST /api/layers/input/invoices` - Process invoice
- `GET /api/layers/input/invoices/vendor/:vendorId` - Get vendor invoices
- `POST /api/layers/input/compliance` - Add compliance requirement
- `POST /api/layers/input/certifications` - Add certification
- `POST /api/layers/input/payments` - Record payment
- `POST /api/layers/input/contracts` - Ingest contract

#### Intelligent Layer
- `POST /api/layers/intelligent/ocr/invoice` - OCR process invoice
- `POST /api/layers/intelligent/ocr/certificate` - OCR process certificate
- `POST /api/layers/intelligent/nlp/contract/:contractId` - NLP analyze contract
- `POST /api/layers/intelligent/fraud/invoice/:invoiceId` - Fraud detection
- `GET /api/layers/intelligent/fraud/statistics` - Fraud statistics
- `POST /api/layers/intelligent/scoring/vendor/:vendorId` - Calculate vendor score
- `POST /api/layers/intelligent/scoring/compare` - Compare vendors

#### Output Layer
- `GET /api/layers/output/dashboard/executive` - Executive dashboard
- `GET /api/layers/output/dashboard/vendor/:vendorId` - Vendor dashboard
- `GET /api/layers/output/dashboard/risk` - Risk dashboard
- `GET /api/layers/output/alerts` - Get all alerts
- `GET /api/layers/output/alerts/summary` - Alert summary
- `GET /api/layers/output/reports/executive-summary` - Executive summary report
- `GET /api/layers/output/reports/vendor/:vendorId` - Vendor report
- `GET /api/layers/output/reports/compliance` - Compliance audit report
- `GET /api/layers/output/reports/financial` - Financial report
- `GET /api/layers/output/reports/risk` - Risk assessment report
- `GET /api/layers/output/analytics/spend` - Spend analytics
- `GET /api/layers/output/analytics/vendors` - Vendor analytics
- `GET /api/layers/output/analytics/compliance` - Compliance analytics
- `GET /api/layers/output/analytics/risk` - Risk analytics
- `GET /api/layers/output/analytics/kpi` - KPI dashboard

## 🧠 Optimization Algorithms

### Economic Order Quantity (EOQ)
Calculates the optimal order quantity that minimizes total inventory costs:
```
EOQ = √(2DS/H)
```
Where:
- D = Annual demand
- S = Ordering cost per order
- H = Holding cost per unit per year

### Safety Stock
Calculates buffer stock to protect against demand variability:
```
Safety Stock = Z × σ × √L
```
Where:
- Z = Service level factor
- σ = Standard deviation of demand
- L = Lead time

### Reorder Point
Determines when to place a new order:
```
ROP = (Average Daily Demand × Lead Time) + Safety Stock
```

## 📊 Forecasting Methods

1. **Moving Average** - Simple trend analysis
2. **Exponential Smoothing** - Weighted recent observations
3. **Double Exponential Smoothing** - Trend-adjusted forecasting
4. **Triple Exponential Smoothing (Holt-Winters)** - Seasonal patterns
5. **Prophet** - Facebook's time series forecasting
6. **ARIMA** - Autoregressive integrated moving average
7. **Ensemble** - Combined model predictions

## 🔐 Security

- JWT-based authentication
- Password hashing with bcrypt
- Protected API routes
- Input validation
- CORS configuration

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 📧 Contact

For questions or support, please open an issue in the repository.

# ivms-and-sco
