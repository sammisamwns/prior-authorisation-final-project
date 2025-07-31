import jwt
import os
from flask import request, jsonify
from functools import wraps
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get secret key from environment variable or use default for development
SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your_secret_key_here_change_in_production')

def token_required(f):
    """
    Decorator to validate JWT token from Authorization header
    Extracts user identity and role, rejects invalid/expired tokens
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None

        # Get token from Authorization header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]

        if not token:
            return jsonify({'message': 'Token is missing!'}), 401

        try:
            # Decode and validate the JWT token
            data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            
            # Store user info in request object for use in route handlers
            request.user = {
                "id": data.get("id"),
                "role": data.get("role"),
                "email": data.get("email"),
                "exp": data.get("exp")
            }
            
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token expired!'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Invalid token!'}), 401
        except Exception as e:
            return jsonify({'message': f'Token validation error: {str(e)}'}), 401

        return f(*args, **kwargs)

    return decorated

def generate_token(user_id, role, email, expires_in_hours=24):
    """
    Generate a JWT token for a user
    """
    payload = {
        'id': user_id,
        'role': role,
        'email': email,
        'exp': datetime.utcnow() + timedelta(hours=expires_in_hours),
        'iat': datetime.utcnow()
    }
    
    token = jwt.encode(payload, SECRET_KEY, algorithm='HS256')
    return token

def decode_token(token):
    """
    Decode a JWT token and return the payload
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise Exception("Token has expired")
    except jwt.InvalidTokenError:
        raise Exception("Invalid token") 