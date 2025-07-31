# 🏥 Prior Authorization System - JWT Authentication

A complete healthcare prior authorization system with JWT authentication, featuring a Flask backend API and React frontend.

## 🎯 Project Overview

This system demonstrates a secure JWT-based authentication flow for healthcare prior authorization, supporting both **Member** and **Provider** user roles.

## 📁 Project Structure

```
prior-authorisation-final-project/
├── backend/                 # Flask JWT Authentication API
│   ├── app.py              # Main Flask application
│   ├── jwt_utils.py        # JWT validation utilities
│   ├── test_token_generator.py # Token generation script
│   ├── requirements.txt    # Python dependencies
│   ├── env.example         # Environment variables template
│   ├── README.md           # Backend documentation
│   └── venv/               # Virtual environment
├── frontend/               # React JWT Authentication UI
│   ├── src/
│   │   ├── App.js          # Main React application
│   │   ├── Login.js        # Login component
│   │   ├── Dashboard.js    # Dashboard component
│   │   ├── PrivateRoute.js # Route protection
│   │   ├── api.js          # API service functions
│   │   └── *.css           # Component styles
│   ├── package.json        # Node.js dependencies
│   └── README.md           # Frontend documentation
├── .gitignore              # Git ignore rules
└── README.md               # This file
```

## 🚀 Quick Start

### Prerequisites

- **Python 3.8+** with pip
- **Node.js 14+** with npm
- **Git**

### 1. Clone and Setup

```bash
git clone <repository-url>
cd prior-authorisation-final-project
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp env.example .env
# Edit .env with your secret keys

# Start Flask server
python app.py
```

**Backend will run on:** `http://localhost:5000`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start React development server
npm start
```

**Frontend will run on:** `http://localhost:3000`

## 🔐 Authentication Flow

### 1. **JWT Token Generation**
- Backend provides `/auth/token` endpoint
- Generates tokens for Member/Provider roles
- Tokens include user ID, role, email, and expiration

### 2. **Frontend Login**
- User selects role (Member/Provider)
- Can use sample tokens or generate new ones
- Token stored securely in localStorage

### 3. **Protected API Calls**
- Frontend automatically includes JWT in requests
- Backend validates token on each request
- Role-based access control enforced

### 4. **Dashboard Access**
- Authenticated users see personalized dashboard
- Real-time API testing capabilities
- User information displayed from JWT payload

## 🧪 Testing the System

### Option 1: Use Sample Tokens (Quick Test)

1. **Start both servers** (backend + frontend)
2. **Navigate to** `http://localhost:3000`
3. **Click "Use Sample Member Token"** or "Use Sample Provider Token"
4. **Click "Login"**
5. **View dashboard** with API responses

### Option 2: Generate New Tokens

1. **Start both servers**
2. **Navigate to** `http://localhost:3000`
3. **Select role** and **enter email**
4. **Click "Show Token Generator"**
5. **Click "Generate New Token"**
6. **Click "Login"**

### Option 3: Manual API Testing

```bash
# Generate token
curl -X POST http://localhost:5000/auth/token \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user123", "role": "member", "email": "test@example.com"}'

# Use token
curl -X POST http://localhost:5000/prior-auth \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 🔒 Security Features

### Backend Security
- ✅ **JWT Token Validation**: Secure signature verification
- ✅ **Token Expiration**: Automatic expiration handling
- ✅ **Role-Based Access**: Member/Provider role enforcement
- ✅ **Environment Variables**: Secure configuration management
- ✅ **Error Handling**: Graceful error responses

### Frontend Security
- ✅ **Protected Routes**: Automatic redirection for unauthenticated users
- ✅ **Token Management**: Secure localStorage handling
- ✅ **Request Interceptors**: Automatic JWT inclusion
- ✅ **Response Interceptors**: 401 error handling
- ✅ **Input Validation**: Form validation and sanitization

## 🎨 User Interface

### Login Page Features
- **Modern Design**: Clean, healthcare-themed interface
- **Role Selection**: Member/Provider dropdown
- **Token Input**: Large textarea for JWT tokens
- **Sample Tokens**: One-click testing with pre-generated tokens
- **Token Generator**: Generate new tokens from backend
- **Error Handling**: Clear error messages and validation

### Dashboard Features
- **User Information**: Display JWT payload data
- **API Response**: Real-time protected endpoint testing
- **Profile Data**: Role-specific profile information
- **Backend Status**: Real-time health monitoring
- **Quick Actions**: Test API endpoints and refresh data
- **Responsive Design**: Works on all screen sizes

## 📊 API Endpoints

### Public Endpoints
- `GET /health` - Backend health check
- `POST /auth/token` - Generate JWT tokens

### Protected Endpoints
- `POST /prior-auth` - Main protected endpoint
- `GET /member/profile` - Member profile data
- `GET /provider/profile` - Provider profile data

## 🔧 Configuration

### Backend Environment Variables
```env
JWT_SECRET_KEY=your_super_secret_jwt_key
FLASK_SECRET_KEY=your_flask_secret_key
FLASK_DEBUG=True
PORT=5000
```

### Frontend Configuration
```javascript
// src/api.js
const API_BASE_URL = 'http://localhost:5000';
```

## 🚀 Deployment

### Backend Deployment
```bash
cd backend
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

### Frontend Deployment
```bash
cd frontend
npm run build
# Serve build folder with nginx or similar
```

## 🔄 Development Workflow

### Adding New Features

1. **Backend Changes**:
   - Add new endpoints in `app.py`
   - Update JWT utilities if needed
   - Test with curl or Postman

2. **Frontend Changes**:
   - Add new components in `src/`
   - Update API functions in `api.js`
   - Test with React development server

3. **Integration Testing**:
   - Test full authentication flow
   - Verify role-based access
   - Check error handling

## 🐛 Troubleshooting

### Common Issues

1. **Backend Connection Failed**:
   - Check if Flask server is running on port 5000
   - Verify virtual environment is activated
   - Check for port conflicts

2. **Frontend Build Errors**:
   - Clear `node_modules` and reinstall
   - Check Node.js version compatibility
   - Verify all dependencies are installed

3. **JWT Token Issues**:
   - Check token expiration
   - Verify secret keys match
   - Ensure proper token format

4. **CORS Errors**:
   - Backend needs CORS configuration for production
   - Check browser console for CORS errors

## 📈 Next Steps

This system is ready for **Step 3: MongoDB Integration**:

- **Database Integration**: Connect to MongoDB for user storage
- **Real Authentication**: Implement actual user login/logout
- **Healthcare Data**: Add prior authorization forms and workflows
- **Advanced Features**: Add approval workflows, notifications, etc.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is for educational purposes. Please ensure compliance with healthcare data regulations in production use.

---

## 🎉 Success!

You now have a complete JWT authentication system with:

- ✅ **Secure Backend API** with JWT validation
- ✅ **Modern React Frontend** with role-based access
- ✅ **Real-time API Testing** capabilities
- ✅ **Professional UI/UX** design
- ✅ **Comprehensive Documentation**

**Ready to test?** Start both servers and navigate to `http://localhost:3000`! 🚀 