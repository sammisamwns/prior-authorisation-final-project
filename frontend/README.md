# React Frontend - JWT Authentication

A modern React application that provides a user-friendly interface for JWT authentication and communicates with the Flask backend API.

## 🚀 Features

- **🔐 JWT Authentication**: Secure login with JWT tokens
- **🎨 Modern UI**: Clean, responsive design with healthcare theme
- **🔄 Real-time API Testing**: Test protected endpoints directly from the UI
- **👥 Role-based Access**: Support for Member and Provider roles
- **📱 Responsive Design**: Works on desktop, tablet, and mobile
- **🛡️ Protected Routes**: Automatic redirection for unauthenticated users

## 📁 Project Structure

```
frontend/
├── src/
│   ├── App.js              # Main application component with routing
│   ├── App.css             # Global styles
│   ├── Login.js            # Login component with JWT token input
│   ├── Login.css           # Login page styles
│   ├── Dashboard.js        # Dashboard with user info and API responses
│   ├── Dashboard.css       # Dashboard styles
│   ├── PrivateRoute.js     # Route protection component
│   └── api.js              # API service functions
├── package.json            # Dependencies and scripts
└── README.md              # This file
```

## 🛠️ Setup

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Flask backend running on `http://localhost:5000`

### Installation

1. **Install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm start
   ```

3. **Open your browser:**
   Navigate to `http://localhost:3000`

## 🔑 Usage

### 1. Login Process

1. **Open the application** at `http://localhost:3000`
2. **Choose your role** (Member or Provider)
3. **Enter an email** for token generation (optional)
4. **Use sample tokens** or **generate new ones**:
   - Click "Use Sample [Role] Token" for quick testing
   - Or click "Show Token Generator" to create new tokens
5. **Click "Login"** to authenticate

### 2. Dashboard Features

Once logged in, you'll see:

- **👤 User Information**: Displayed from JWT token
- **🔒 Protected API Response**: Real-time API call results
- **📋 Profile Data**: Role-specific profile information
- **⚡ Quick Actions**: Test API endpoints and check backend health
- **🔄 Refresh**: Update all data
- **🚪 Logout**: Clear token and return to login

### 3. API Testing

The dashboard automatically:
- ✅ Validates your JWT token
- ✅ Calls the protected `/prior-auth` endpoint
- ✅ Fetches role-specific profile data
- ✅ Monitors backend health status

## 🔧 Configuration

### Backend URL

The frontend is configured to connect to the Flask backend at `http://localhost:5000`. To change this:

1. Edit `src/api.js`
2. Update the `API_BASE_URL` constant:
   ```javascript
   const API_BASE_URL = 'http://your-backend-url:port';
   ```

### Environment Variables

Create a `.env` file in the frontend directory for environment-specific settings:

```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_ENVIRONMENT=development
```

## 🧪 Testing

### Sample Tokens

The application includes pre-generated sample tokens for testing:

- **Member Token**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Provider Token**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### Manual Testing

1. **Test with curl** (from backend directory):
   ```bash
   # Generate a token
   curl -X POST http://localhost:5000/auth/token \
     -H "Content-Type: application/json" \
     -d '{"user_id": "user123", "role": "member", "email": "test@example.com"}'
   
   # Use the token in the frontend
   ```

2. **Test API directly**:
   ```bash
   curl -X POST http://localhost:5000/prior-auth \
     -H "Authorization: Bearer YOUR_TOKEN_HERE"
   ```

## 🔒 Security Features

### JWT Token Management

- **Secure Storage**: Tokens stored in localStorage (for demo purposes)
- **Automatic Validation**: Tokens validated on every API call
- **Expiration Handling**: Automatic logout on token expiration
- **Route Protection**: Unauthenticated users redirected to login

### API Security

- **Request Interceptors**: Automatically add JWT tokens to requests
- **Response Interceptors**: Handle 401 errors and redirect to login
- **Error Handling**: Graceful error messages for users

## 🎨 UI/UX Features

### Design System

- **Healthcare Theme**: Medical/insurance color scheme
- **Responsive Layout**: Works on all screen sizes
- **Loading States**: Spinners and progress indicators
- **Error Handling**: Clear error messages and recovery options
- **Accessibility**: Keyboard navigation and screen reader support

### Components

- **Login Form**: Clean, intuitive authentication interface
- **Dashboard Cards**: Organized information display
- **Status Indicators**: Real-time backend health monitoring
- **Action Buttons**: Clear call-to-action elements

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

This creates a `build` folder with optimized production files.

### Serve Production Build

```bash
npm install -g serve
serve -s build -l 3000
```

## 🔄 Integration with Backend

The frontend integrates seamlessly with the Flask backend:

1. **Authentication Flow**:
   - Frontend requests JWT token from `/auth/token`
   - Token stored in localStorage
   - All subsequent requests include token in Authorization header

2. **Protected Endpoints**:
   - `/prior-auth` - Main protected endpoint
   - `/member/profile` - Member-specific data
   - `/provider/profile` - Provider-specific data
   - `/health` - Backend health check

3. **Error Handling**:
   - 401 errors trigger automatic logout
   - Network errors show user-friendly messages
   - Backend offline status displayed

## 📝 Development Notes

### Adding New Features

1. **New API Endpoints**: Add functions to `api.js`
2. **New Components**: Create in `src/` directory
3. **New Routes**: Update `App.js` with new routes
4. **Styling**: Create corresponding CSS files

### Code Structure

- **Functional Components**: All components use React hooks
- **Custom Hooks**: Consider creating custom hooks for reusable logic
- **Error Boundaries**: Add error boundaries for production
- **Testing**: Add unit tests for components and API functions

## 🐛 Troubleshooting

### Common Issues

1. **Backend Connection Failed**:
   - Ensure Flask backend is running on port 5000
   - Check CORS settings in backend
   - Verify network connectivity

2. **JWT Token Issues**:
   - Check token expiration
   - Verify token format
   - Ensure backend secret key matches

3. **Build Errors**:
   - Clear `node_modules` and reinstall
   - Check Node.js version compatibility
   - Verify all dependencies are installed

### Debug Mode

Enable React Developer Tools and check:
- Network tab for API calls
- Console for JavaScript errors
- Application tab for localStorage contents

## 🔄 Next Steps

This frontend is ready for **Step 3: MongoDB Integration** where we'll:
- Connect to MongoDB database
- Store and retrieve user data
- Implement real user authentication
- Add more healthcare-specific features

---

**🎉 Ready to test!** Start both backend and frontend, then navigate to `http://localhost:3000` to begin.
