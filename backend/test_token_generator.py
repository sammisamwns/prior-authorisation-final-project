#!/usr/bin/env python3
"""
Standalone JWT Token Generator for Testing
Use this script to generate test tokens for different user roles
"""

import jwt
import datetime
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get secret key from environment variable or use default
SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your_secret_key_here_change_in_production')

def generate_test_token(user_id, role, email, expires_in_hours=24):
    """
    Generate a JWT token for testing purposes
    """
    payload = {
        'id': user_id,
        'role': role,
        'email': email,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=expires_in_hours),
        'iat': datetime.datetime.utcnow()
    }
    
    token = jwt.encode(payload, SECRET_KEY, algorithm='HS256')
    return token

def main():
    print("🔑 JWT Token Generator for Testing")
    print("=" * 50)
    
    # Generate tokens for different user types
    tokens = {
        'member': generate_test_token('user123', 'member', 'member@example.com'),
        'provider': generate_test_token('provider456', 'provider', 'provider@example.com')
    }
    
    print("\n📋 Generated Test Tokens:")
    print("-" * 30)
    
    for role, token in tokens.items():
        print(f"\n👤 {role.upper()} Token:")
        print(f"Token: {token}")
        print(f"Role: {role}")
        print(f"Expires: 24 hours from now")
    
    print("\n🧪 Testing Commands:")
    print("-" * 20)
    
    # Member token test
    member_token = tokens['member']
    print(f"\n# Test Member Profile:")
    print(f"curl -X GET http://localhost:5000/member/profile \\")
    print(f"  -H \"Authorization: Bearer {member_token}\" \\")
    print(f"  -H \"Content-Type: application/json\"")
    
    # Provider token test
    provider_token = tokens['provider']
    print(f"\n# Test Provider Profile:")
    print(f"curl -X GET http://localhost:5000/provider/profile \\")
    print(f"  -H \"Authorization: Bearer {provider_token}\" \\")
    print(f"  -H \"Content-Type: application/json\"")
    
    # Prior auth test
    print(f"\n# Test Prior Auth Endpoint:")
    print(f"curl -X POST http://localhost:5000/prior-auth \\")
    print(f"  -H \"Authorization: Bearer {member_token}\" \\")
    print(f"  -H \"Content-Type: application/json\"")
    
    print("\n✅ Token generation complete!")
    print("💡 Copy the tokens above to test your API endpoints")

if __name__ == '__main__':
    main() 