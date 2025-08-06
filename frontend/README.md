# Healthcare Prior Authorization System

A modern, AI-powered prior authorization system for healthcare providers and insurance members. Built with React, TypeScript, and Flask.

## Features

### 🔐 Secure Authentication
- User registration and login system
- JWT token-based authentication
- Password hashing with bcrypt
- Protected API endpoints

### 👥 Dual Portal System
- **Member Portal**: Insurance members can submit authorization requests and view their coverage details
- **Provider Portal**: Healthcare providers can submit requests on behalf of patients

### 🤖 AI-Powered Processing
- Intelligent analysis of medical necessity
- Automated policy checking
- Fast processing times (15-30 minutes)
- Reduced manual errors

### 📊 Comprehensive Dashboard
- Real-time claim history
- Insurance coverage details
- Deductible and co-pay information
- Health conditions tracking

## Backend API Endpoints

### Authentication
- `POST /register` - User registration
- `POST /login` - User authentication
- `GET /dashboard` - Protected dashboard access

### Member Endpoints
- `GET /member/profile` - Get member profile data
- `GET /member/claims` - Get member claims history

### Authorization
- `POST /prior-auth` - Submit prior authorization request

## Frontend Components

### AuthenticationCard
Modern login/register interface with:
- Email and password authentication
- Registration flow
- Professional UI with gradients and animations
- Form validation and error handling

### MemberPortal
Comprehensive member dashboard featuring:
- Profile overview with coverage details
- Claims history display
- Prior authorization request form
- Real-time status updates

### ProviderPortal
Provider-specific interface with:
- Provider profile display
- Patient member lookup
- Clinical authorization request submission
- Medical necessity documentation

## Getting Started

### Prerequisites
- Node.js 18+ 
- Python 3.8+
- MongoDB

### Backend Setup
1. Install Python dependencies:
```bash
pip install flask flask-cors flask-bcrypt flask-pymongo python-jwt python-dotenv faker
```

2. Set up environment variables:
```bash
FLASK_SECRET_KEY=your-secret-key
MONGO_URI=mongodb://localhost:27017/prior_authdb
```

3. Run the backend:
```bash
python app.py
```

### Frontend Setup
1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open http://localhost:5173 in your browser

## Sample Data

The backend automatically generates sample data including:
- 20 member accounts with realistic profiles
- 8 provider accounts with specialties
- 50 sample claims
- Credentials saved to `sample_credentials.txt`

## Technology Stack

### Frontend
- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- Shadcn/ui components
- React Router for navigation
- Lucide React for icons

### Backend
- Flask web framework
- PyMongo for MongoDB integration
- Flask-Bcrypt for password hashing
- JWT for authentication
- Flask-CORS for cross-origin requests
- Faker for sample data generation

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- Protected API endpoints
- CORS configuration
- Input validation and sanitization

## UI/UX Features

- Modern, professional design
- Responsive layout for all devices
- Smooth animations and transitions
- Intuitive navigation
- Real-time feedback and notifications
- Loading states and error handling

## Development

The system is designed for easy extension and customization:

- Modular component architecture
- Type-safe API integration
- Comprehensive error handling
- Scalable database design
- RESTful API design

## License

This project is for educational and demonstration purposes.
