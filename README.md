# Healthcare Portal - Prior Authorization System

A modern, full-stack healthcare portal for managing prior authorizations with a professional UI and comprehensive features.

## 🏥 Features

### Authentication & Security
- **JWT-based authentication** with secure token management
- **Password hashing** using Werkzeug security utilities
- **Protected routes** with role-based access control
- **HIPAA-compliant** security measures

### User Management
- **Multi-role support**: Patients, Providers, and Administrators
- **User registration and login** with validation
- **Profile management** with editable information
- **Role-specific dashboards** and permissions

### Prior Authorization Management
- **Comprehensive authorization tracking** with status updates
- **Drug formulary integration** with detailed information
- **Search and filtering** capabilities
- **Real-time status updates** (Approved, Pending, Denied)

### Professional UI/UX
- **Modern glass-morphism design** with gradient backgrounds
- **Responsive layout** that works on all devices
- **Interactive components** with smooth animations
- **Professional healthcare theme** with intuitive navigation

### Analytics & Reporting
- **Real-time analytics** with key metrics
- **Status distribution charts** and trends
- **Drug class analysis** and usage patterns
- **Export capabilities** (PDF, Excel)
- **Monthly trend analysis**

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v16 or higher)
- **Python** (v3.8 or higher)
- **MongoDB** (v4.4 or higher)
- **npm** or **yarn**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/sammisamwns/prior-authorisation-final-project.git
   cd prior-authorisation-final-project
   ```

2. **Start MongoDB**
   ```bash
   sudo systemctl start mongod
   sudo systemctl enable mongod
   ```

3. **Backend Setup**
   ```bash
   cd backend
   
   # Create virtual environment
   python3 -m venv venv
   source venv/bin/activate || ./venv/Scripts/activate 
   
   # Install dependencies
   pip3 install -r requirements.txt
      
   # Start the backend server
   python3 app.py
   ```

4. **Frontend Setup**
   ```bash
   cd frontend
   
   # Install dependencies
   npm install
   
   # Start the development server
   npm run dev
   ```

5. **Access the Application**
   - Frontend: http://localhost:8080/
   - Backend API: http://localhost:5000

## 📊 Sample Data

The database initialization script creates sample users with the following credentials:

## 🏗️ Project Structure

```
prior-authorisation-final-project/
├── backend/
│   ├── app.py
│   ├── jwt_utils.py
│   ├── requirements.txt
│   ├── env.example
│   ├── sample_credentials.txt
│   ├── README.md
│   └── venv/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AuthenticationCard.tsx
│   │   │   ├── MemberPortal.tsx
│   │   │   ├── ProviderPortal.tsx
│   │   │   ├── PayerPortal.tsx       # ✅ New: Payer dashboard UI
│   │   │   ├── PriorAuthFlowDiagram.tsx
│   │   │   └── ui/
│   │   ├── pages/
│   │   │   ├── Index.tsx
│   │   │   └── NotFound.tsx
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── index.css
│   │   └── vite-env.d.ts
│   ├── public/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── tsconfig.json
└── README.md

```

## 🔧 API Endpoints

### Authentication
- `POST /signup` - User registration
- `POST /login` - User authentication
- `GET /dashboard-data` - Protected user data

### Prior Authorizations
- `GET /prior-authorizations` - Get user's authorizations
- `GET /drugs` - Get drug formulary
- `GET /users` - Get all users (admin only)

### Health & Monitoring
- `GET /health` - Health check endpoint

## 🎨 UI Components

### Design System
- **Glass-morphism effects** with backdrop blur
- **Gradient backgrounds** for visual appeal
- **Professional color scheme** with healthcare theme
- **Responsive grid layouts** for all screen sizes

### Interactive Elements
- **Animated loading spinners** and transitions
- **Hover effects** and micro-interactions
- **Status badges** with color coding
- **Professional form inputs** with validation

### Navigation
- **Sidebar navigation** with role-based menu items
- **Header with user menu** and notifications
- **Breadcrumb navigation** for complex workflows
- **Mobile-responsive** navigation patterns

## 🔒 Security Features

### Authentication
- **JWT tokens** with expiration handling
- **Secure password hashing** using Werkzeug
- **Token-based route protection**
- **Automatic logout** on token expiration

### Data Protection
- **CORS configuration** for secure API access
- **Input validation** and sanitization
- **Environment variable** management
- **Database connection** security

## 📱 Responsive Design

The application is fully responsive and optimized for:
- **Desktop computers** (1920px and above)
- **Laptops** (1366px - 1919px)
- **Tablets** (768px - 1365px)
- **Mobile phones** (320px - 767px)

## 🚀 Deployment

### Backend Deployment
1. Set up a production MongoDB instance
2. Configure environment variables
3. Use a production WSGI server (Gunicorn)
4. Set up reverse proxy (Nginx)

### Frontend Deployment
1. Build the production version: `npm run build`
2. Deploy to a static hosting service
3. Configure environment variables for API endpoints

## 🛠️ Development

### Backend Development
```bash
cd backend
python3 -m venv venv
source venv/bin/activate || ./venv/bin/activate
pip3 install -r requirements.txt
python app.py
```

### Frontend Development
```bash
cd frontend
npm i
npm run dev
```

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the backend directory:
```env
MONGO_URI=mongodb://localhost:27017/healthcareDB
JWT_SECRET_KEY="jwt-key"
FLASK_SECRET_KEY="flask-key"
```

### API Configuration
The frontend is configured to connect to `http://localhost:8080/` by default. Update the API base URL in production.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 🆘 Support

For support and questions:
- Check the documentation
- Review the sample data and credentials
- Ensure all prerequisites are installed
- Verify MongoDB is running

## 🎯 Roadmap

- [ ] Real-time notifications
- [ ] Advanced reporting features
- [ ] Mobile app development
- [ ] Integration with external systems
- [ ] Advanced analytics dashboard
- [ ] Multi-language support

---

