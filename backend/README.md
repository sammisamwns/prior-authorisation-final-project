# JWT Authentication API - Step 1

This is the **entry point** for your backend (Flask) to securely verify users (either Member or Provider) using JWT tokens passed from the frontend.

## 🔒 Features

- **JWT Token Validation**: Middleware decorator that validates JWT tokens from Authorization headers
- **Role-Based Access Control**: Supports 'member' and 'provider' roles
- **Secure Token Generation**: Generate tokens with expiration and user information
- **Protected Endpoints**: Multiple endpoints demonstrating different access levels
- **Environment Configuration**: Secure configuration management

## 📁 Project Structure

```
backend/
├── app.py                 # Main Flask application
├── jwt_utils.py          # JWT validation utilities and decorators
├── test_token_generator.py # Standalone token generator for testing
├── requirements.txt      # Python dependencies
├── env.example          # Environment variables template
└── README.md           # This file
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Set Up Environment Variables

```bash
# Copy the example environment file
cp env.example .env

# Edit .env with your own secret keys
nano .env
```

### 3. Run the Application

```bash
python app.py
```

The server will start on `http://localhost:5000`

## 🔑 API Endpoints

### Public Endpoints (No Authentication Required)

#### Health Check
```bash
GET /health
```

#### Generate Token (for testing)
```bash
POST /auth/token
Content-Type: application/json

{
  "user_id": "user123",
  "role": "member",
  "email": "member@example.com"
}
```

### Protected Endpoints (Require JWT Token)

#### Prior Authorization
```bash
POST /prior-auth
Authorization: Bearer <your_jwt_token>
```

#### Member Profile
```bash
GET /member/profile
Authorization: Bearer <member_jwt_token>
```

#### Provider Profile
```bash
GET /provider/profile
Authorization: Bearer <provider_jwt_token>
```

## 🧪 Testing

### 1. Generate Test Tokens

```bash
python test_token_generator.py
```

This will generate tokens for both member and provider roles with example curl commands.

### 2. Test with curl

#### Health Check
```bash
curl http://localhost:5000/health
```

#### Generate Token
```bash
curl -X POST http://localhost:5000/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "role": "member",
    "email": "member@example.com"
  }'
```

#### Test Protected Endpoint
```bash
# Replace <TOKEN> with the token from the previous response
curl -X POST http://localhost:5000/prior-auth \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json"
```

### 3. Test Role-Based Access

#### Member Profile (requires member token)
```bash
curl -X GET http://localhost:5000/member/profile \
  -H "Authorization: Bearer <MEMBER_TOKEN>"
```

#### Provider Profile (requires provider token)
```bash
curl -X GET http://localhost:5000/provider/profile \
  -H "Authorization: Bearer <PROVIDER_TOKEN>"
```

## 🔐 Security Features

### JWT Token Structure
```json
{
  "id": "user123",
  "role": "member",
  "email": "member@example.com",
  "exp": 1640995200,
  "iat": 1640908800
}
```

### Token Validation
- ✅ Validates token signature
- ✅ Checks token expiration
- ✅ Extracts user information
- ✅ Role-based access control
- ❌ Rejects invalid tokens
- ❌ Rejects expired tokens

## 🛠️ Development

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_SECRET_KEY` | Secret key for JWT signing | `your_secret_key_here_change_in_production` |
| `FLASK_SECRET_KEY` | Flask application secret | `flask-secret-key-change-in-production` |
| `FLASK_DEBUG` | Enable debug mode | `True` |
| `PORT` | Server port | `5000` |

### Adding New Protected Endpoints

```python
from jwt_utils import token_required

@app.route('/your-endpoint', methods=['GET'])
@token_required
def your_protected_endpoint():
    user = request.user  # Access user info from token
    return jsonify({"message": "Protected endpoint", "user": user})
```

## 🔄 Next Steps

This completes **Step 1: JWT Validation in Flask**. 

Ready for **Step 2: Fetch member data from MongoDB** using the authenticated user information!

## 📝 Notes

- 🔒 **Production Security**: Change all default secret keys in production
- 🗄️ **Database Integration**: This step uses mock data. MongoDB integration comes next
- 🔄 **Token Refresh**: Consider implementing token refresh mechanism for production
- 📊 **Logging**: Add proper logging for security events
- 🧪 **Testing**: Add unit tests for JWT validation logic 