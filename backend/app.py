from flask import Flask, jsonify, request
from jwt_utils import token_required, generate_token
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Configure Flask app
app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY', 'flask-secret-key-change-in-production')

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint - no authentication required"""
    return jsonify({
        "status": "healthy",
        "message": "JWT Authentication API is running"
    }), 200

@app.route('/auth/token', methods=['POST'])
def generate_auth_token():
    """
    Generate a JWT token for testing purposes
    In production, this would be replaced with proper login endpoint
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'message': 'No data provided'}), 400
            
        user_id = data.get('user_id')
        role = data.get('role')
        email = data.get('email')
        
        if not all([user_id, role, email]):
            return jsonify({
                'message': 'Missing required fields: user_id, role, email'
            }), 400
            
        # Validate role
        if role not in ['member', 'provider']:
            return jsonify({
                'message': 'Invalid role. Must be "member" or "provider"'
            }), 400
            
        # Generate token
        token = generate_token(user_id, role, email)
        
        return jsonify({
            'message': 'Token generated successfully',
            'token': token,
            'user': {
                'id': user_id,
                'role': role,
                'email': email
            }
        }), 200
        
    except Exception as e:
        return jsonify({'message': f'Error generating token: {str(e)}'}), 500

@app.route('/prior-auth', methods=['POST'])
@token_required
def prior_auth():
    """
    Protected endpoint that requires valid JWT token
    Demonstrates successful authentication
    """
    user = request.user  # Comes from jwt_utils.py decorator
    
    return jsonify({
        "message": "Authenticated successfully",
        "user": user,
        "endpoint": "prior-auth",
        "method": "POST"
    }), 200

@app.route('/member/profile', methods=['GET'])
@token_required
def get_member_profile():
    """
    Protected endpoint for member profile data
    Only accessible with valid member token
    """
    user = request.user
    
    # Check if user has member role
    if user.get('role') != 'member':
        return jsonify({
            'message': 'Access denied. Member role required.'
        }), 403
    
    # Mock member profile data
    member_profile = {
        'id': user.get('id'),
        'email': user.get('email'),
        'role': user.get('role'),
        'profile': {
            'name': 'John Doe',
            'member_id': 'MEM123456',
            'plan_type': 'Premium',
            'coverage_start': '2024-01-01',
            'deductible': 500,
            'co_pay': 25
        }
    }
    
    return jsonify({
        'message': 'Member profile retrieved successfully',
        'data': member_profile
    }), 200

@app.route('/provider/profile', methods=['GET'])
@token_required
def get_provider_profile():
    """
    Protected endpoint for provider profile data
    Only accessible with valid provider token
    """
    user = request.user
    
    # Check if user has provider role
    if user.get('role') != 'provider':
        return jsonify({
            'message': 'Access denied. Provider role required.'
        }), 403
    
    # Mock provider profile data
    provider_profile = {
        'id': user.get('id'),
        'email': user.get('email'),
        'role': user.get('role'),
        'profile': {
            'name': 'Dr. Jane Smith',
            'provider_id': 'PROV789012',
            'specialty': 'Cardiology',
            'npi': '1234567890',
            'license_number': 'MD12345',
            'facility': 'City General Hospital'
        }
    }
    
    return jsonify({
        'message': 'Provider profile retrieved successfully',
        'data': provider_profile
    }), 200

@app.errorhandler(404)
def not_found(error):
    return jsonify({'message': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'message': 'Internal server error'}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
    
    print(f"🚀 Starting JWT Authentication API on port {port}")
    print(f"📝 Debug mode: {debug}")
    print(f"🔗 Health check: http://localhost:{port}/health")
    print(f"🔑 Token generation: http://localhost:{port}/auth/token")
    print(f"🔒 Protected endpoint: http://localhost:{port}/prior-auth")
    
    app.run(host='0.0.0.0', port=port, debug=debug) 