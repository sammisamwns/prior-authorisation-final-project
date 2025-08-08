"""
Healthcare Prior Authorization System - Backend API
=================================================

This Flask application provides a comprehensive API for managing healthcare
prior authorization requests, user authentication, and insurance processing.

Features:
- User authentication (Members, Providers, Payers)
- Prior authorization request management
- AI-powered decision processing
- Insurance plan management
- Claims tracking and analytics

Author: Healthcare Prior Auth Team
Version: 1.0.0
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from flask_pymongo import PyMongo
import jwt
import datetime
from functools import wraps
import os
from dotenv import load_dotenv
import random
from faker import Faker
import bcrypt
from bson import ObjectId

# Load environment variables
load_dotenv()

# Initialize Flask app and extensions
app = Flask(__name__)
CORS(app)
bcrypt_flask = Bcrypt(app)
fake = Faker()

# Application Configuration
app.config['SECRET_KEY'] = os.getenv("FLASK_SECRET_KEY", "default-secret")
app.config['MONGO_URI'] = os.getenv("MONGO_URI", "mongodb://localhost:27017/prior_authdb")
mongo = PyMongo(app)

# MongoDB Database Collections
db = mongo.db
members = db.members
providers = db.providers
claims = db.claims
prior_auths = db.prior_auths
payers = db.payers
insurance_subscriptions = db.insurance_subscriptions  # New collection for insurance subscriptions


# =====================================================
# JWT Authentication Middleware
# =====================================================
def token_required(f):
    """
    Decorator to verify JWT token in protected routes.
    
    Args:
        f: The function to be decorated
        
    Returns:
        Decorated function with user authentication
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Extract token from Authorization header
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(" ")[1]

        if not token:
            return jsonify({'message': 'Token is missing!'}), 401

        try:
            # Decode and verify JWT token
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user = {
                'email': data['email'],
                'user_type': data.get('user_type'),
                'name': data.get('name', 'Unknown User')
            }
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired!'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Token is invalid!'}), 401

        return f(current_user, *args, **kwargs)

    return decorated

# =====================================================
# Insurance Management Endpoints
# =====================================================

@app.route('/payers/insurance-plans', methods=['GET'])
@token_required
def get_all_insurance_plans(current_user):
    """Get all available insurance plans from all payers"""
    try:
        # Get all payers with their insurance plans
        payers = list(db.payers.find({}, {
            'payer_id': 1, 
            'name': 1, 
            'payer_name': 1,
            'unit_price': 1,
            'coverage_types': 1,
            'deductible_amounts': 1,
            'copay_amounts': 1,
            'max_out_of_pocket': 1,
            'approval_rate': 1,
            'avg_processing_time': 1
        }))
        
        # Add validity date (1 year from now) to each plan
        for payer in payers:
            payer['validity_date'] = (datetime.datetime.now() + datetime.timedelta(days=365)).strftime('%Y-%m-%d')
            payer['_id'] = str(payer['_id'])
        
        return jsonify({
            'success': True,
            'data': payers
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error fetching insurance plans: {str(e)}'
        }), 500

@app.route('/member/subscribe-insurance', methods=['POST'])
@token_required
def subscribe_to_insurance(current_user):
    """Subscribe a member to an insurance plan"""
    try:
        if current_user['user_type'] != 'member':
            return jsonify({'message': 'Unauthorized'}), 403
            
        data = request.get_json()
        payer_id = data.get('payer_id')
        
        if not payer_id:
            return jsonify({'message': 'Payer ID is required'}), 400
            
        # Get member details
        member = db.members.find_one({'email': current_user['email']})
        if not member:
            return jsonify({'message': 'Member not found'}), 404
            
        # Get payer details
        payer = db.payers.find_one({'payer_id': payer_id})
        if not payer:
            return jsonify({'message': 'Payer not found'}), 404
            
        # Check if member is already subscribed to this payer
        existing_subscription = db.insurance_subscriptions.find_one({
            'member_id': member['member_id'],
            'payer_id': payer_id,
            'status': 'active'
        })
        
        if existing_subscription:
            return jsonify({'message': 'Already subscribed to this insurance plan'}), 400
            
        # Create subscription
        subscription = {
            'subscription_id': f"SUB{random.randint(100000, 999999)}",
            'member_id': member['member_id'],
            'member_name': member['name'],
            'payer_id': payer_id,
            'payer_name': payer['name'],
            'unit_price': payer['unit_price'],
            'coverage_amount': payer['unit_price'],
            'amount_paid': payer['unit_price'],
            'amount_reimbursed': 0,
            'remaining_balance': payer['unit_price'],
            'validity_date': (datetime.datetime.now() + datetime.timedelta(days=365)).strftime('%Y-%m-%d'),
            'coverage_scheme': payer.get('coverage_types', []),
            'deductible': random.choice(payer.get('deductible_amounts', [500, 1000, 1500])),
            'copay': random.choice(payer.get('copay_amounts', [15, 25, 35])),
            'status': 'active',
            'subscription_date': datetime.datetime.now(),
            'claims_history': []
        }
        
        # Insert subscription
        db.insurance_subscriptions.insert_one(subscription)
        
        # Update payer's member list
        db.payers.update_one(
            {'payer_id': payer_id},
            {'$addToSet': {'member_ids': member['_id']}}
        )
        
        # Update member's insurance info
        db.members.update_one(
            {'member_id': member['member_id']},
            {
                '$set': {
                    'current_insurance_plan': payer['name'],
                    'insurance_validity': subscription['validity_date']
                },
                '$inc': {'amount_reimbursed': 0}
            }
        )
        
        return jsonify({
            'success': True,
            'message': f'Successfully subscribed to {payer["name"]}',
            'subscription_id': subscription['subscription_id']
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error subscribing to insurance: {str(e)}'
        }), 500

@app.route('/member/insurance-subscriptions', methods=['GET'])
@token_required
def get_member_insurance_subscriptions(current_user):
    """Get all insurance subscriptions for a member"""
    try:
        if current_user['user_type'] != 'member':
            return jsonify({'message': 'Unauthorized'}), 403
            
        # Get member details
        member = db.members.find_one({'email': current_user['email']})
        if not member:
            return jsonify({'message': 'Member not found'}), 404
            
        # Get all subscriptions for this member
        subscriptions = list(db.insurance_subscriptions.find({
            'member_id': member['member_id']
        }))
        
        # Convert ObjectId to string
        for sub in subscriptions:
            sub['_id'] = str(sub['_id'])
            if 'subscription_date' in sub:
                sub['subscription_date'] = sub['subscription_date'].strftime('%Y-%m-%d')
        
        return jsonify({
            'success': True,
            'data': subscriptions
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error fetching subscriptions: {str(e)}'
        }), 500

@app.route('/member/search', methods=['GET'])
@token_required
def search_member(current_user):
    """Search for member by email or name"""
    try:
        query = request.args.get('q', '')
        if not query:
            return jsonify({'message': 'Search query is required'}), 400
            
        # Search by email or name
        members = list(db.members.find({
            '$or': [
                {'email': {'$regex': query, '$options': 'i'}},
                {'name': {'$regex': query, '$options': 'i'}}
            ]
        }, {
            'member_id': 1,
            'name': 1,
            'email': 1,
            'current_insurance_plan': 1
        }))
        
        # Convert ObjectId to string
        for member in members:
            member['_id'] = str(member['_id'])
        
        return jsonify({
            'success': True,
            'data': members
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error searching members: {str(e)}'
        }), 500

@app.route('/member/<member_id>/insurance-plans', methods=['GET'])
@token_required
def get_member_insurance_plans_by_id(current_user, member_id):
    """Get insurance plans for a specific member ID"""
    try:
        # Get member's insurance subscriptions
        subscriptions = list(db.insurance_subscriptions.find({
            'member_id': member_id,
            'status': 'active'
        }))
        
        # Convert ObjectId to string
        for sub in subscriptions:
            sub['_id'] = str(sub['_id'])
            if 'subscription_date' in sub:
                sub['subscription_date'] = sub['subscription_date'].strftime('%Y-%m-%d')
        
        return jsonify({
            'success': True,
            'data': subscriptions
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error fetching insurance plans: {str(e)}'
        }), 500

# =====================================================
# User Registration Endpoints
# =====================================================

@app.route('/register', methods=['POST'])
def register():
    """
    Register new members and providers.
    
    Expected JSON payload:
    {
        "email": "user@example.com",
        "password": "securepassword",
        "name": "John Doe",
        "user_type": "member" | "provider"
    }
    """
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    name = data.get('name')
    user_type = data.get('user_type')

    # Validate required fields
    if not all([email, password, name, user_type]):
        return jsonify({'message': 'Missing required fields'}), 400

    # Determine collection based on user type
    if user_type == 'member':
        collection = db.members
        user_id = f"M{random.randint(100, 999):03}"
    elif user_type == 'provider':
        collection = db.providers
        user_id = f"P{random.randint(100, 999):03}"
    else:
        return jsonify({'message': 'Invalid user type'}), 400

    # Check if user already exists
    if collection.find_one({'email': email}):
        return jsonify({'message': 'User already exists'}), 409

    # Hash password and create user
    hashed_pw = bcrypt_flask.generate_password_hash(password).decode('utf-8')
    
    user_data = {
        'name': name,
        'email': email,
        'password_hash': hashed_pw,
        'createdAt': datetime.datetime.utcnow()
    }
    
    # Add user-specific fields
    if user_type == 'member':
        user_data.update({
            'member_id': user_id,
            'insurance_plan': 'Standard',
            'claim_history': [],
            'diseases': [],
            'address': '',
            'phone': ''
        })
    elif user_type == 'provider':
        user_data.update({
            'provider_id': user_id,
            'role': 'Doctor',
            'network_type': 'In Network',
            'expertise': 'General Practice',
            'claim_history': []
        })

    user_id = collection.insert_one(user_data).inserted_id

    return jsonify({
        'message': 'User registered successfully', 
        'user_id': str(user_id)
    }), 201

@app.route('/register-payer', methods=['POST'])
def register_payer():
    """
    Register new insurance payers.
    
    Expected JSON payload:
    {
        "name": "Insurance Company",
        "email": "admin@insurance.com",
        "password": "securepassword",
        "limit": 1000000
    }
    """
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    limit = data.get('limit')

    if not all([name, email, password, limit]):
        return jsonify({'message': 'Missing required fields'}), 400

    if db.payers.find_one({'email': email}):
        return jsonify({'message': 'Payer already exists'}), 409

    hashed_pw = bcrypt_flask.generate_password_hash(password).decode('utf-8')
    payer_id = f"PAYER{random.randint(1000, 9999)}"

    db.payers.insert_one({
        'payer_id': payer_id,
        'payer_name': name,
        'name': name,
        'email': email,
        'password': hashed_pw,
        'limit': int(limit),
        'balance_left': int(limit),
        'collection_amount': 0,
        'member_ids': [],
        'provider_ids': [],
        'pending_cases': [],
        'approved_cases': [],
        'total_amount_paid': 0
    })

    return jsonify({
        'message': 'Payer registered successfully', 
        'payer_id': payer_id
    }), 201

# =====================================================
# User Authentication Endpoints
# =====================================================

@app.route('/login', methods=['POST'])
def login():
    """
    Authenticate users and return JWT token.
    
    Expected JSON payload:
    {
        "email": "user@example.com",
        "password": "password",
        "user_type": "member" | "provider" | "payer"
    }
    """
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    user_type = data.get('user_type')

    # Validate user type
    if user_type not in ['member', 'provider', 'payer']:
        return jsonify({'message': 'Invalid user type'}), 400

    # Determine collection based on user type
    if user_type == 'member':
        collection = db.members
    elif user_type == 'provider':
        collection = db.providers
    elif user_type == 'payer':
        collection = db.payers

    # Find user by email
    user = collection.find_one({'email': email})
    if not user:
        return jsonify({'message': 'Invalid email or password'}), 401

    # Verify password (handle different field names)
    password_field = 'password_hash' if user_type in ['member', 'provider'] else 'password'
    if not bcrypt_flask.check_password_hash(user[password_field], password):
        return jsonify({'message': 'Invalid email or password'}), 401

    # Generate JWT token
    token = jwt.encode({
        'email': user['email'],
        'user_type': user_type,
        'name': user.get('name', 'Unknown User'),
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=3)
    }, app.config['SECRET_KEY'], algorithm='HS256')

    return jsonify({
        'message': 'Login successful',
        'token': token,
        'user': {
            'name': user['name'], 
            'email': user['email'], 
            'user_type': user_type
        }
    }), 200

# =====================================================
# Profile Management Endpoints
# =====================================================

@app.route('/profile', methods=['GET'])
@token_required
def get_profile(current_user):
    """
    Get user profile based on user type.
    Used by ProfilePage component.
    """
    try:
        email = current_user['email']
        user_type = current_user['user_type']
        
        if user_type == 'member':
            user = db.members.find_one({'email': email})
            if not user:
                return jsonify({'message': 'Member not found'}), 404
                
            profile_data = {
                'name': user['name'],
                'email': user['email'],
                'user_type': 'member',
                'member_id': user.get('member_id', 'N/A'),
                'provider_id': None,
                'payer_id': None
            }
            
        elif user_type == 'provider':
            user = db.providers.find_one({'email': email})
            if not user:
                return jsonify({'message': 'Provider not found'}), 404
                
            profile_data = {
                'name': user['name'],
                'email': user['email'],
                'user_type': 'provider',
                'member_id': None,
                'provider_id': user.get('provider_id', 'N/A'),
                'payer_id': None
            }
            
        elif user_type == 'payer':
            user = db.payers.find_one({'email': email})
            if not user:
                return jsonify({'message': 'Payer not found'}), 404

            profile_data = {
                'name': user['name'],
                'email': user['email'],
                'user_type': 'payer',
                'member_id': None,
                'provider_id': None,
                'payer_id': user.get('payer_id', 'N/A')
            }
        else:
            return jsonify({'message': 'Invalid user type'}), 400

        return jsonify(profile_data), 200
        
    except Exception as e:
        return jsonify({'message': f'Error fetching profile: {str(e)}'}), 500

@app.route('/profile/update-password', methods=['POST'])
@token_required
def update_password(current_user):
    """
    Update user password.
    Used by ProfilePage component.
    """
    try:
        data = request.get_json()
        current_password = data.get("current_password")
        new_password = data.get("new_password")
        notes = data.get("notes", "")

        if not all([current_password, new_password]):
            return jsonify({'message': 'Missing password fields'}), 400

        email = current_user['email']
        user_type = current_user['user_type']
        
        # Determine collection and password field
        if user_type == 'member':
            collection = db.members
            password_field = 'password_hash'
        elif user_type == 'provider':
            collection = db.providers
            password_field = 'password_hash'
        elif user_type == 'payer':
            collection = db.payers
            password_field = 'password'
        else:
            return jsonify({'message': 'Invalid user type'}), 400

        # Find user
        user = collection.find_one({'email': email})
        if not user:
            return jsonify({'message': 'User not found'}), 404

        # Verify current password
        if not bcrypt_flask.check_password_hash(user[password_field], current_password):
            return jsonify({'message': 'Incorrect current password'}), 401

        # Update password
        new_hashed_password = bcrypt_flask.generate_password_hash(new_password).decode()
        collection.update_one(
            {'email': email}, 
            {'$set': {password_field: new_hashed_password}}
        )

        return jsonify({'message': 'Password updated successfully'}), 200

    except Exception as e:
        return jsonify({'message': f'Error updating password: {str(e)}'}), 500

# =====================================================
# Provider-Specific Endpoints
# =====================================================

@app.route('/provider/profile', methods=['GET'])
@token_required
def get_provider_profile(current_user):
    """
    Get provider profile data.
    Used by ProviderPortal component.
    """
    try:
        if current_user['user_type'] != 'provider':
            return jsonify({'message': 'Unauthorized'}), 403

        provider = db.providers.find_one({'email': current_user['email']})
        if not provider:
            return jsonify({'message': 'Provider not found'}), 404
            
        profile_data = {
            'id': str(provider['_id']),
            'email': provider['email'],
            'role': 'provider',
            'profile': {
                'name': provider['name'],
                'provider_id': provider['provider_id'],
                'role': provider.get('role', 'Doctor'),
                'network_type': provider.get('network_type', 'In Network'),
                'expertise': provider.get('expertise', 'General Practice')
            }
        }
        
        return jsonify(profile_data), 200
        
    except Exception as e:
        return jsonify({'message': f'Error fetching provider profile: {str(e)}'}), 500

@app.route('/member/profile/<member_id>', methods=['GET'])
@token_required
def get_member_by_id(current_user, member_id):
    """
    Get member profile by member ID.
    Used by ProviderPortal for member lookup.
    """
    try:
        # Verify user is provider or payer
        if current_user['user_type'] not in ['provider', 'payer']:
            return jsonify({'message': 'Unauthorized'}), 403
            
        member = db.members.find_one({'member_id': member_id})
        if not member:
            return jsonify({'message': 'Member not found'}), 404
            
        profile_data = {
            'profile': {
                'name': member['name'],
                'member_id': member['member_id'],
                'plan_type': member.get('insurance_plan', 'Standard'),
                'coverage_start': member.get('coverage_start', '2024-01-01'),
                'deductible': member.get('deductible', 1000),
                'co_pay': member.get('co_pay', 25)
            }
        }
        
        return jsonify(profile_data), 200
        
    except Exception as e:
        return jsonify({'message': f'Error fetching member profile: {str(e)}'}), 500

# =====================================================
# Member-Specific Endpoints
# =====================================================

@app.route('/member/profile', methods=['GET'])
@token_required
def get_member_profile(current_user):
    """
    Get member profile data.
    Used by MemberPortal component.
    """
    try:
        if current_user['user_type'] != 'member':
            return jsonify({'message': 'Unauthorized'}), 403
        
        member = db.members.find_one({'email': current_user['email']})
        if not member:
            return jsonify({'message': 'Member profile not found'}), 404
            
        profile_data = {
            'id': str(member['_id']),
            'email': current_user['email'],
            'role': 'member',
            'profile': {
                'name': member['name'],
                'member_id': member['member_id'],
                'plan_type': member['insurance_plan'],
                'coverage_start': member.get('coverage_start', '2024-01-01'),
                'deductible': member.get('deductible', 1000),
                'co_pay': member.get('co_pay', 25),
                'address': member.get('address', ''),
                'phone': member.get('phone', ''),
                'diseases': member.get('diseases', []),
                'claim_history': member.get('claim_history', [])
            }
        }

        return jsonify({'data': profile_data}), 200
        
    except Exception as e:
        return jsonify({'message': f'Error fetching profile: {str(e)}'}), 500



@app.route('/member/claims', methods=['GET'])
@token_required
def get_member_claims(current_user):
    """
    Get member claims history.
    Used by MemberPortal component.
    """
    try:
        if current_user['user_type'] != 'member':
            return jsonify({'message': 'Unauthorized'}), 403
            
        member = db.members.find_one({'email': current_user['email']})
        if not member:
            return jsonify({'message': 'Member not found'}), 404
            
        # Get all claims for this member
        member_claims = list(db.claims.find({'member_id': member['member_id']}))
        
        # Convert ObjectId to string for JSON serialization
        for claim in member_claims:
            claim['_id'] = str(claim['_id'])
            
        return jsonify({'data': member_claims}), 200
        
    except Exception as e:
        return jsonify({'message': f'Error fetching claims: {str(e)}'}), 500

@app.route('/member/insurance-plans', methods=['GET'])
@token_required
def get_member_insurance_plans(current_user):
    """
    Get member insurance plan details.
    Used by MemberPortal and ProfilePage components.
    """
    try:
        if current_user['user_type'] != 'member':
            return jsonify({'message': 'Unauthorized'}), 403
            
        member = db.members.find_one({'email': current_user['email']})
        if not member:
            return jsonify({'message': 'Member not found'}), 404

        member_id = member.get('member_id')

        # Find payers associated with this member
        payers = list(db.payers.find({'member_ids': member_id}))
        
        insurance_plans = []
        for payer in payers:
            # Get member's claims under this payer
            member_claims = list(db.claims.find({
                'member_id': member_id,
                'payer_id': payer['_id']
            }))
            
            total_claims_amount = sum(claim.get('amount_reimbursed', 0) for claim in member_claims)
            
            plan_data = {
                "payer_name": payer.get("payer_name"),
                "payer_id": str(payer.get("_id")),
                "unit_subscription_price": payer.get("unit_price", 3000),
                "maximum_covered_amount": payer.get("payer_limit"),
                "total_claims_made": len(member_claims),
                "amount_paid": total_claims_amount,
                "balance_left": payer.get("payer_balance_left"),
                "insurance_category": member.get("insurance_plan", "Standard"),
                "coverage_start": member.get("coverage_start", "2024-01-01"),
                "deductible": member.get("deductible", 1000),
                "co_pay": member.get("co_pay", 25)
            }
            insurance_plans.append(plan_data)

        return jsonify({"data": insurance_plans}), 200

    except Exception as e:
        return jsonify({'message': f'Error fetching insurance plans: {str(e)}'}), 500

# =====================================================
# Prior Authorization Endpoints
# =====================================================

@app.route('/prior-auth', methods=['POST'])
@token_required
def submit_prior_auth(current_user):
    """
    Submit a new prior authorization request.
    Used by ProviderPortal and MemberPortal components.
    """
    try:
        data = request.get_json()

        # Validate required fields
        if not data.get('procedure') or not data.get('diagnosis'):
            return jsonify({'message': 'Procedure and diagnosis are required'}), 400

        # Determine member_id and provider_id based on user type
        if current_user['user_type'] == 'member':
            member = db.members.find_one({'email': current_user['email']})
            if not member:
                return jsonify({'message': 'Member not found'}), 404
            member_id = member['member_id']
            provider_id = data.get('provider_id')
        elif current_user['user_type'] == 'provider':
            provider = db.providers.find_one({'email': current_user['email']})
            if not provider:
                return jsonify({'message': 'Provider not found'}), 404
            member_id = data.get('member_id')
            provider_id = provider['provider_id']
        else:
            return jsonify({'message': 'Unauthorized user type'}), 403

        # Validate member and provider existence
        if not db.members.find_one({'member_id': member_id}):
            return jsonify({'message': 'Invalid member ID'}), 400
        if not db.providers.find_one({'provider_id': provider_id}):
            return jsonify({'message': 'Invalid provider ID'}), 400

        # Build the prior authorization request
        auth_request = {
            'auth_id': f"AUTH{random.randint(1000, 9999)}",
            'member_id': member_id,
            'provider_id': provider_id,
            'procedure': data.get('procedure'),
            'diagnosis': data.get('diagnosis'),
            'urgency': data.get('urgency', 'routine'),
            'additional_notes': data.get('additionalNotes', ''),
            'status': 'pending',
            'submitted_at': datetime.datetime.utcnow(),
            'ai_processed': False,
            'submitted_by': {
                'name': current_user['name'],
                'email': current_user['email'],
                'user_type': current_user['user_type']
            }
        }

        # Insert into database
        result = db.prior_auths.insert_one(auth_request)

        # Trigger AI processing
        auto_review_auth(auth_request)

        return jsonify({
            'message': 'Prior authorization request submitted successfully',
            'auth_id': auth_request['auth_id']
        }), 201

    except Exception as e:
        return jsonify({'message': f'Error submitting request: {str(e)}'}), 500

@app.route('/prior-auths', methods=['GET'])
@token_required
def get_all_prior_auths(current_user):
    """
    Get all prior authorization requests (for admin/payer use).
    Used by PayerPortal and PriorAuthAIStatus components.
    """
    try:
        # Allow payers and admins to view all requests
        if current_user['user_type'] not in ['payer', 'admin']:
            return jsonify({'message': 'Unauthorized'}), 403

        # Get all auth requests
        auths = list(db.prior_auths.find({}, {'_id': 0}))
        
        # Format dates for JSON serialization
        for auth in auths:
            if 'submitted_at' in auth:
                auth['submitted_at'] = auth['submitted_at'].isoformat()
            if 'ai_reviewed_at' in auth:
                auth['ai_reviewed_at'] = auth['ai_reviewed_at'].isoformat()
                
        return jsonify({'prior_auths': auths}), 200

    except Exception as e:
        return jsonify({'message': f'Error fetching requests: {str(e)}'}), 500

@app.route('/prior-auth/decision', methods=['POST'])
@token_required
def approve_reject_auth(current_user):
    """
    Approve or reject a prior authorization request.
    Used by PayerPortal and PriorAuthAIStatus components.
    """
    try:
        # Allow payers and admins to make decisions
        if current_user['user_type'] not in ['payer', 'admin']:
            return jsonify({'message': 'Unauthorized'}), 403

        data = request.get_json()
        auth_id = data.get('auth_id')
        decision = data.get('decision')  # 'approved' or 'denied'
        notes = data.get('notes', '')

        if decision not in ['approved', 'denied']:
            return jsonify({'message': 'Invalid decision'}), 400

        # Update the authorization request
        result = db.prior_auths.update_one(
            {'auth_id': auth_id},
            {
                '$set': {
                    'status': decision, 
                    'review_notes': notes,
                    'reviewed_at': datetime.datetime.utcnow(),
                    'reviewed_by': current_user['email']
                }
            }
        )

        if result.modified_count == 0:
            return jsonify({'message': 'Authorization ID not found'}), 404

        return jsonify({'message': f'Authorization {decision}'}), 200

    except Exception as e:
        return jsonify({'message': f'Error processing decision: {str(e)}'}), 500

@app.route('/prior-auth', methods=['GET'])
@token_required
def get_user_prior_auths(current_user):
    """
    Get prior authorization requests for the current user.
    Used by MemberPortal and ProviderPortal components.
    """
    try:
        email = current_user['email']
        user_type = current_user['user_type']
        
        if user_type == 'member':
            member = db.members.find_one({'email': email})
            if not member:
                return jsonify({'message': 'Member not found'}), 404
            # Get auths for this member
            results = list(db.prior_auths.find({'member_id': member['member_id']}))
            
        elif user_type == 'provider':
            provider = db.providers.find_one({'email': email})
            if not provider:
                return jsonify({'message': 'Provider not found'}), 404
            # Get auths for this provider
            results = list(db.prior_auths.find({'provider_id': provider['provider_id']}))
            
        else:
            return jsonify({'message': 'User type not recognized'}), 403

        # Convert ObjectId to string and format dates
        for r in results:
            r['_id'] = str(r['_id'])
            if 'submitted_at' in r:
                r['submitted_at'] = r['submitted_at'].isoformat()
            if 'ai_reviewed_at' in r:
                r['ai_reviewed_at'] = r['ai_reviewed_at'].isoformat()

        return jsonify({'prior_auths': results}), 200

    except Exception as e:
        return jsonify({'message': f'Error fetching prior auths: {str(e)}'}), 500

# =====================================================
# Payer-Specific Endpoints
# =====================================================

@app.route('/payer/dashboard', methods=['GET'])
@token_required
def payer_dashboard(current_user):
    """
    Get payer dashboard data.
    Used by PayerPortal component.
    """
    try:
        if current_user['user_type'] != 'payer':
            return jsonify({'message': 'Unauthorized'}), 403

        payer = db.payers.find_one({'email': current_user['email']})
        if not payer:
            return jsonify({'message': 'Payer not found'}), 404

        # Remove sensitive data
        payer.pop('password', None)
        
        return jsonify(payer), 200

    except Exception as e:
        return jsonify({'message': f'Error fetching payer dashboard: {str(e)}'}), 500

@app.route('/payer/requests', methods=['GET'])
@token_required
def get_payer_requests(current_user):
    """
    Get all authorization requests for payer review.
    Used by PayerPortal component.
    """
    try:
        if current_user['user_type'] != 'payer':
            return jsonify({'message': 'Unauthorized'}), 403

        # Get all pending and recent authorization requests
        auth_requests = list(db.prior_auths.find({
            'status': {'$in': ['pending', 'approved', 'denied']}
        }).sort('submitted_at', -1))

        # Format the data for frontend
        formatted_requests = []
        for req in auth_requests:
            # Get member and provider details
            member = db.members.find_one({'member_id': req['member_id']})
            provider = db.providers.find_one({'provider_id': req['provider_id']})
            
            formatted_requests.append({
                'id': req['auth_id'],
                'member_name': member['name'] if member else 'Unknown',
                'provider_name': provider['name'] if provider else 'Unknown',
                'service': req['procedure'],
                'status': req['status'],
                'submitted_date': req['submitted_at'].strftime('%Y-%m-%d'),
                'priority': 'high' if req.get('urgency') == 'emergency' else 'medium'
            })

        return jsonify({'requests': formatted_requests}), 200

    except Exception as e:
        return jsonify({'message': f'Error fetching requests: {str(e)}'}), 500

@app.route('/payer/subscriptions', methods=['GET'])
@token_required
def get_payer_subscriptions(current_user):
    """Get all insurance subscriptions for a payer"""
    try:
        if current_user['user_type'] != 'payer':
            return jsonify({'message': 'Unauthorized'}), 403
            
        # Get payer details
        payer = db.payers.find_one({'email': current_user['email']})
        if not payer:
            return jsonify({'message': 'Payer not found'}), 404
            
        # Get all subscriptions for this payer
        subscriptions = list(db.insurance_subscriptions.find({'payer_id': payer['payer_id']}))
        
        # Convert ObjectId to string and format dates
        for sub in subscriptions:
            sub['_id'] = str(sub['_id'])
            if 'subscription_date' in sub:
                sub['subscription_date'] = sub['subscription_date'].strftime('%Y-%m-%d')
        
        return jsonify({
            'success': True,
            'subscriptions': subscriptions
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error fetching subscriptions: {str(e)}'
        }), 500








@app.route('/payer/update-auth', methods=['POST'])
@token_required
def update_prior_auth(current_user):
    """
    Update prior authorization status (approve/reject).
    Used by PayerPortal component.
    """
    try:
        if current_user['user_type'] != 'payer':
            return jsonify({'message': 'Unauthorized'}), 403

        data = request.get_json()
        auth_id = data.get('auth_id')
        action = data.get('action')  # 'approve' or 'reject'
        payout_amount = data.get('amount', 0)

        # Find the authorization request
        auth = db.prior_auths.find_one({'auth_id': auth_id})
        if not auth:
            return jsonify({'message': 'Auth request not found'}), 404

        # Find the payer
        payer = db.payers.find_one({'email': current_user['email']})
        if not payer:
            return jsonify({'message': 'Payer not found'}), 404

        if action == 'approve':
            # Check if payer has sufficient balance
            if payout_amount > payer['balance_left']:
                return jsonify({'message': 'Insufficient balance'}), 400

            # Update authorization status
            db.prior_auths.update_one(
            {'auth_id': auth_id},
                {'$set': {'status': 'approved'}}
            )
            
            # Update payer balance and records
            db.payers.update_one(
                {'email': current_user['email']}, 
                {
                    '$inc': {
                        'balance_left': -payout_amount,
                        'total_amount_paid': payout_amount
                    },
                    '$push': {'approved_cases': auth_id},
                    '$pull': {'pending_cases': auth_id}
                }
            )

        elif action == 'reject':
            # Update authorization status
            db.prior_auths.update_one(
                {'auth_id': auth_id}, 
                {'$set': {'status': 'rejected'}}
            )
            
            # Remove from pending cases
            db.payers.update_one(
                {'email': current_user['email']}, 
                {'$pull': {'pending_cases': auth_id}}
            )
        else:
            return jsonify({'message': 'Invalid action'}), 400

        return jsonify({'message': f'Claim {action}ed successfully'}), 200

    except Exception as e:
        return jsonify({'message': f'Error updating authorization: {str(e)}'}), 500

# =====================================================
# AI Status and Analytics Endpoints
# =====================================================

@app.route('/ai-status', methods=['GET'])
@token_required
def get_ai_status(current_user):
    """
    Get AI processing status and analytics.
    Used by PriorAuthAIStatus component.
    """
    try:
        # Get all authorization requests with AI processing info
        auth_requests = list(db.prior_auths.find({}).sort('submitted_at', -1))

        formatted_requests = []
        for req in auth_requests:
            # Get member and provider details
            member = db.members.find_one({'member_id': req['member_id']})
            provider = db.providers.find_one({'provider_id': req['provider_id']})
            
            formatted_requests.append({
                'auth_id': req['auth_id'],
                'member_name': member['name'] if member else 'Unknown',
                'provider_name': provider['name'] if provider else 'Unknown',
                'procedure': req['procedure'],
                'status': req['status'],
                'submitted_date': req['submitted_at'].strftime('%Y-%m-%d'),
                'priority': 'high' if req.get('urgency') == 'emergency' else 'medium',
                'ai_decision': req.get('ai_decision'),
                'notes': req.get('review_notes', req.get('ai_notes', ''))
            })

        return jsonify({'prior_auths': formatted_requests}), 200
        
    except Exception as e:
        return jsonify({'message': f'Error fetching AI status: {str(e)}'}), 500

@app.route('/analytics', methods=['GET'])
@token_required
def get_analytics(current_user):
    """
    Get system analytics and performance metrics.
    Used by various dashboard components.
    """
    try:
        # Calculate various metrics
        total_requests = db.prior_auths.count_documents({})
        approved_requests = db.prior_auths.count_documents({'status': 'approved'})
        pending_requests = db.prior_auths.count_documents({'status': 'pending'})
        denied_requests = db.prior_auths.count_documents({'status': 'denied'})
        
        # Calculate approval rate
        approval_rate = (approved_requests / total_requests * 100) if total_requests > 0 else 0
        
        # Get recent activity
        recent_requests = list(db.prior_auths.find({}).sort('submitted_at', -1).limit(10))
        
        analytics_data = {
            'total_requests': total_requests,
            'approved_requests': approved_requests,
            'pending_requests': pending_requests,
            'denied_requests': denied_requests,
            'approval_rate': round(approval_rate, 2),
            'average_processing_time': '2.3 days',  # Mock data
            'cost_savings': '$2.4M',  # Mock data
            'recent_activity': recent_requests
        }
        
        return jsonify(analytics_data), 200

    except Exception as e:
        return jsonify({'message': f'Error fetching analytics: {str(e)}'}), 500

# =====================================================
# AI Processing Functions
# =====================================================

def auto_review_auth(auth_request):
    """
    Automatically review authorization requests using AI logic.
    
    Args:
        auth_request: The authorization request to review
    """
    # Simple AI Logic (can be replaced with ML model inference)
    high_risk_procedures = ['heart surgery', 'organ transplant', 'brain surgery']
    urgent_cases = ['emergency', 'urgent']

    decision = 'approved'
    notes = 'Auto-approved by AI'

    # Check for high-risk procedures or urgent cases
    if (auth_request['urgency'].lower() in urgent_cases or
        any(proc in auth_request['procedure'].lower() for proc in high_risk_procedures)):
        decision = 'pending'
        notes = 'Auto-flagged for manual review due to high risk or urgency'

    # Update the authorization request with AI decision
    db.prior_auths.update_one(
        {'auth_id': auth_request['auth_id']},
        {
            '$set': {
                'status': decision,
                'ai_processed': True,
                'ai_decision': decision,
                'ai_notes': notes,
                'ai_reviewed_at': datetime.datetime.utcnow()
            }
        }
    )

# =====================================================
# Claims Management Endpoints
# =====================================================

@app.route('/claims', methods=['POST'])
@token_required
def submit_claim(current_user):
    """
    Submit a new claim from provider with insurance plan selection.
    Used by ProviderPortal component.
    
    Expected JSON payload:
    {
        "member_id": "M001",
        "provider_id": "P001", 
        "procedure": "MRI Scan",
        "diagnosis": "Lower back pain",
        "urgency": "routine",
        "additionalNotes": "Optional clinical notes",
        "subscription_id": "SUB123456"
    }
    """
    try:
        data = request.get_json()
        required_fields = ["member_id", "provider_id", "procedure", "diagnosis", "urgency", "subscription_id"]

        # Validate required fields
        if not all(field in data for field in required_fields):
            return jsonify({"message": "Missing required fields"}), 400

        # Validate member and provider existence
        member = db.members.find_one({"member_id": data["member_id"]})
        if not member:
            return jsonify({"message": "Invalid member ID"}), 400

        provider = db.providers.find_one({"provider_id": data["provider_id"]})
        if not provider:
            return jsonify({"message": "Invalid provider ID"}), 400

        # Get insurance subscription details
        subscription = db.insurance_subscriptions.find_one({
            'subscription_id': data['subscription_id'],
            'member_id': data['member_id'],
            'status': 'active'
        })
        
        if not subscription:
            return jsonify({"message": "Invalid or inactive insurance subscription"}), 400
            
        # Check if remaining balance is sufficient
        if subscription['remaining_balance'] <= 0:
            return jsonify({"message": "Insurance coverage exhausted"}), 400
        
        # Calculate claim amount (simplified - in real scenario this would be based on procedure)
        claim_amount = random.randint(500, 3000)
        
        # Check if claim amount exceeds remaining balance
        if claim_amount > subscription['remaining_balance']:
            claim_amount = subscription['remaining_balance']

        # Create claim document
        claim = {
            "claim_id": f"C{random.randint(100000, 999999)}",
            "member_id": data["member_id"],
            "member_name": member["name"],
            "provider_id": data["provider_id"],
            "provider_name": provider["name"],
            "subscription_id": data["subscription_id"],
            "payer_id": subscription["payer_id"],
            "payer_name": subscription["payer_name"],
            "procedure": data["procedure"],
            "diagnosis": data["diagnosis"],
            "urgency": data["urgency"],
            "additional_notes": data.get("additionalNotes", ""),
            "status": "pending",
            "submitted_at": datetime.datetime.utcnow(),
            "claim_amount": claim_amount,
            "amount_reimbursed": 0,
            "remaining_balance_before": subscription["remaining_balance"],
            "remaining_balance_after": subscription["remaining_balance"] - claim_amount,
            "submitted_by": {
                "name": current_user.get('name', 'Unknown'),
                "email": current_user['email'],
                "user_type": current_user['user_type']
            }
        }

        # Insert claim into database
        inserted = db.claims.insert_one(claim)
        
        # Update subscription with claim
        db.insurance_subscriptions.update_one(
            {'subscription_id': data['subscription_id']},
            {
                '$push': {'claims_history': claim["claim_id"]},
                '$inc': {'amount_reimbursed': claim_amount},
                '$set': {'remaining_balance': subscription['remaining_balance'] - claim_amount}
            }
        )
        
        # Update member and provider claim histories
        db.members.update_one(
            {"member_id": data["member_id"]}, 
            {
                "$push": {"claim_history": claim["claim_id"]},
                "$inc": {"amount_reimbursed": claim_amount}
            }
        )
        db.providers.update_one(
            {"provider_id": data["provider_id"]}, 
            {"$push": {"claim_history": claim["claim_id"]}}
        )
        
        # Update payer's total reimbursed amount
        db.payers.update_one(
            {'payer_id': subscription['payer_id']},
            {
                '$inc': {
                    'total_amount_paid': claim_amount,
                    'payer_balance_left': -claim_amount
                }
            }
        )

        return jsonify({
            "message": "Claim submitted successfully", 
            "claim_id": claim["claim_id"],
            "claim_amount": claim_amount,
            "remaining_balance": subscription['remaining_balance'] - claim_amount
        }), 201

    except Exception as e:
        return jsonify({"message": f"Error submitting claim: {str(e)}"}), 500

@app.route('/claims/provider/<provider_id>', methods=['GET'])
@token_required
def get_provider_claims(current_user, provider_id):
    """
    Get all claims submitted by a specific provider.
    Used by ProviderPortal component.
    """
    try:
        # Verify user is the provider or has admin access
        if current_user['user_type'] not in ['provider', 'admin']:
            return jsonify({"message": "Unauthorized"}), 403

        # If user is provider, verify they're requesting their own claims
        if current_user['user_type'] == 'provider':
            provider = db.providers.find_one({"email": current_user['email']})
            if not provider or provider['provider_id'] != provider_id:
                return jsonify({"message": "Unauthorized"}), 403

        # Get claims for the provider
        claims = list(db.claims.find({"provider_id": provider_id}))

        results = []
        for claim in claims:
            # Get member details
            member = db.members.find_one({"member_id": claim["member_id"]})
            
            results.append({
                "claim_id": str(claim["_id"]),
                "member_id": claim["member_id"],
                "member_name": member["name"] if member else "Unknown",
                "procedure": claim["procedure"],
                "diagnosis": claim["diagnosis"],
                "urgency": claim["urgency"],
                "status": claim.get("status", "pending"),
                "submitted_at": claim.get("submitted_at").isoformat() if claim.get("submitted_at") else None,
                "additional_notes": claim.get("additional_notes", "")
            })

        return jsonify({"claims": results}), 200

    except Exception as e:
        return jsonify({"message": f"Error fetching provider claims: {str(e)}"}), 500

@app.route('/claims/member/<member_id>', methods=['GET'])
@token_required
def get_member_claims_by_id(current_user, member_id):
    """
    Get all claims for a specific member.
    Used by MemberPortal component.
    """
    try:
        # Verify user is the member or has admin access
        if current_user['user_type'] not in ['member', 'admin']:
            return jsonify({"message": "Unauthorized"}), 403

        # If user is member, verify they're requesting their own claims
        if current_user['user_type'] == 'member':
            member = db.members.find_one({"email": current_user['email']})
            if not member or member['member_id'] != member_id:
                return jsonify({"message": "Unauthorized"}), 403

        # Get claims for the member
        claims = list(db.claims.find({"member_id": member_id}))

        results = []
        for claim in claims:
            # Get provider details
            provider = db.providers.find_one({"provider_id": claim["provider_id"]})
            
            results.append({
                "claim_id": str(claim["_id"]),
                "provider_id": claim["provider_id"],
                "provider_name": provider["name"] if provider else "Unknown",
                "procedure": claim["procedure"],
                "diagnosis": claim["diagnosis"],
                "urgency": claim["urgency"],
                "status": claim.get("status", "pending"),
                "submitted_at": claim.get("submitted_at").isoformat() if claim.get("submitted_at") else None,
                "amount_reimbursed": claim.get("amount_reimbursed", 0)
            })

        return jsonify({"claims": results}), 200

    except Exception as e:
        return jsonify({"message": f"Error fetching member claims: {str(e)}"}), 500

@app.route('/claims/<claim_id>/status', methods=['PUT'])
@token_required
def update_claim_status(current_user, claim_id):
    """
    Update claim status (approve/reject).
    Used by PayerPortal component.
    """
    try:
        # Only payers and admins can update claim status
        if current_user['user_type'] not in ['payer', 'admin']:
            return jsonify({"message": "Unauthorized"}), 403

        data = request.get_json()
        new_status = data.get('status')
        notes = data.get('notes', '')

        if new_status not in ['approved', 'rejected', 'pending']:
            return jsonify({"message": "Invalid status"}), 400

        # Update claim status
        result = db.claims.update_one(
            {"_id": ObjectId(claim_id)},
            {
                "$set": {
                    "status": new_status,
                    "review_notes": notes,
                    "reviewed_at": datetime.datetime.utcnow(),
                    "reviewed_by": current_user['email']
                }
            }
        )

        if result.modified_count == 0:
            return jsonify({"message": "Claim not found"}), 404

        return jsonify({"message": f"Claim status updated to {new_status}"}), 200

    except Exception as e:
        return jsonify({"message": f"Error updating claim status: {str(e)}"}), 500

# =====================================================
# Sample Data Generation
# =====================================================

def populate_sample_data():
    print("⏳ Initializing sample data...")
    
    # Drop old collections
    db.members.drop()
    db.providers.drop()
    db.claims.drop()
    db.payers.drop()
    db.prior_auths.drop()
    db.insurance_subscriptions.drop()

    insurance_types = ["Medicare", "Medicaid", "Private"]
    roles = ["Doctor", "Nurse", "Technician", "Lab"]
    networks = ["In Network", "Out Network"]
    specialties = ["Cardiology", "Medicine", "Surgery", "Pediatrics"]

    member_ids = []
    provider_ids = []
    claim_ids = []
    payer_ids = []
    credentials_log = []

    # ---- Create Members ----
    for i in range(50):
        email = fake.email()
        password = fake.password()
        hashed_pw = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

        member_doc = {
            "member_id": f"M{i+1:03}",
            "name": fake.name(),
            "email": email,
            "address": fake.address(),
            "phone": fake.phone_number(),
            "insurance_plan": random.choice(insurance_types),
            "claim_history": [],
            "diseases": [fake.word(), fake.word()],
            "password_hash": hashed_pw,
            "coverage_start": fake.date_between(start_date='-2y', end_date='today').strftime('%Y-%m-%d'),
            "deductible": random.choice([500, 1000, 1500, 2000, 2500]),
            "co_pay": random.choice([15, 20, 25, 30, 35, 40]),
            "date_of_birth": fake.date_of_birth(minimum_age=18, maximum_age=80).strftime('%Y-%m-%d'),
            "gender": random.choice(["Male", "Female", "Other"]),
            "emergency_contact": fake.name(),
            "emergency_phone": fake.phone_number(),
            "amount_reimbursed": 0,
            "current_insurance_plan": None,
            "insurance_validity": None
        }

        member_id = db.members.insert_one(member_doc).inserted_id
        member_ids.append(member_id)
        credentials_log.append(f"[MEMBER] Email: {email} | Password: {password}")

    # ---- Create Providers ----
    for i in range(20):
        email = fake.email()
        password = fake.password()
        hashed_pw = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

        provider_doc = {
            "provider_id": f"P{i+1:03}",
            "name": fake.name(),
            "email": email,
            "role": random.choice(roles),
            "network_type": random.choice(networks),
            "expertise": random.choice(specialties),
            "claim_history": [],
            "password_hash": hashed_pw,
            "license_number": f"LIC{random.randint(100000, 999999)}",
            "practice_name": fake.company(),
            "practice_address": fake.address(),
            "practice_phone": fake.phone_number(),
            "years_experience": random.randint(1, 30),
            "board_certified": random.choice([True, False]),
            "languages": random.sample(["English", "Spanish", "French", "German", "Mandarin"], k=random.randint(1, 3))
        }

        provider_id = db.providers.insert_one(provider_doc).inserted_id
        provider_ids.append(provider_id)
        credentials_log.append(f"[PROVIDER] Email: {email} | Password: {password}")

    # ---- Create Payers ----
    for i in range(10):
        email = fake.email()
        password = fake.password()
        hashed_pw = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

        assigned_members = random.sample(member_ids, k=5)
        assigned_providers = random.sample(provider_ids, k=3)

        # Generate realistic financial data
        payer_limit = random.randint(500000, 2000000)
        total_paid = random.randint(50000, 300000)
        balance_left = payer_limit - total_paid
        
        payer_doc = {
            "payer_id": f"PAY{i+1:03}",
            "name": fake.company(),
            "payer_name": fake.company(),
            "email": email,
            "password": hashed_pw,
            "unit_price": random.randint(2000, 5000),
            "payer_limit": payer_limit,
            "payer_balance_left": balance_left,
            "payer_collection_amount": random.randint(100000, 500000),
            "member_ids": assigned_members,
            "provider_ids": assigned_providers,
            "pending_cases": [],
            "approved_cases": [],
            "total_amount_paid": total_paid,
            "net_balance": balance_left,
            "coverage_types": ["Medical", "Dental", "Vision", "Prescription"],
            "deductible_amounts": [500, 1000, 1500, 2000],
            "copay_amounts": [15, 25, 35, 50],
            "max_out_of_pocket": random.randint(5000, 15000),
            "network_providers": len(assigned_providers),
            "active_members": len(assigned_members),
            "approval_rate": round(random.uniform(65.0, 85.0), 1),
            "avg_processing_time": f"{random.uniform(1.5, 4.5):.1f} days"
        }

        payer_id = db.payers.insert_one(payer_doc).inserted_id
        payer_ids.append(payer_id)
        credentials_log.append(f"[PAYER] Email: {email} | Password: {password}")

    # ---- Create Insurance Subscriptions ----
    print("📋 Creating insurance subscriptions...")
    
    # Create some sample insurance subscriptions
    for i in range(30):  # Create 30 subscriptions
        member_obj_id = random.choice(member_ids)
        payer_obj_id = random.choice(payer_ids)
        
        # Get the actual member_id and payer_id strings
        member_doc = db.members.find_one({'_id': member_obj_id})
        payer_doc = db.payers.find_one({'_id': payer_obj_id})
        
        if member_doc and payer_doc:
            subscription = {
                'subscription_id': f"SUB{i+1:06}",
                'member_id': member_doc['member_id'],
                'member_name': member_doc['name'],
                'payer_id': payer_doc['payer_id'],
                'payer_name': payer_doc['name'],
                'unit_price': payer_doc['unit_price'],
                'coverage_amount': payer_doc['unit_price'],
                'amount_paid': payer_doc['unit_price'],
                'amount_reimbursed': random.randint(0, payer_doc['unit_price'] // 2),
                'remaining_balance': payer_doc['unit_price'] - random.randint(0, payer_doc['unit_price'] // 2),
                'validity_date': (datetime.datetime.now() + datetime.timedelta(days=random.randint(30, 365))).strftime('%Y-%m-%d'),
                'coverage_scheme': payer_doc.get('coverage_types', []),
                'deductible': random.choice(payer_doc.get('deductible_amounts', [500, 1000, 1500])),
                'copay': random.choice(payer_doc.get('copay_amounts', [15, 25, 35])),
                'status': 'active',
                'subscription_date': datetime.datetime.now() - datetime.timedelta(days=random.randint(1, 180)),
                'claims_history': []
            }
            
            db.insurance_subscriptions.insert_one(subscription)
            
            # Update member's current insurance info
            db.members.update_one(
                {'member_id': member_doc['member_id']},
                {
                    '$set': {
                        'current_insurance_plan': payer_doc['name'],
                        'insurance_validity': subscription['validity_date']
                    }
                }
            )

    # ---- Create Claims ----
    procedures = ["MRI Scan", "X-Ray", "Blood Test", "Physical Therapy", "Surgery", "Consultation", "Medication", "Emergency Visit"]
    
    for i in range(300):
        cid = f"C{i+1:03}"
        member_obj_id = random.choice(member_ids)
        provider_obj_id = random.choice(provider_ids)
        payer_obj_id = random.choice(payer_ids)
        
        # Get the actual member_id and provider_id strings
        member_doc = db.members.find_one({'_id': member_obj_id})
        provider_doc = db.providers.find_one({'_id': provider_obj_id})
        
        member_id_str = member_doc['member_id'] if member_doc else f"M{random.randint(1,50):03}"
        provider_id_str = provider_doc['provider_id'] if provider_doc else f"P{random.randint(1,20):03}"

        # Get subscription for this member and payer
        subscription = db.insurance_subscriptions.find_one({
            'member_id': member_id_str,
            'payer_id': payer_doc['payer_id'],
            'status': 'active'
        })
        
        claim_amount = random.randint(500, 3000)
        
        claim_doc = {
            "claim_id": cid,
            "member_id": member_id_str,
            "member_name": member_doc['name'],
            "provider_id": provider_id_str,
            "provider_name": provider_doc['name'],
            "payer_id": payer_doc['payer_id'],
            "payer_name": payer_doc['name'],
            "subscription_id": subscription['subscription_id'] if subscription else None,
            "procedure": random.choice(procedures),
            "diagnosis": fake.sentence(nb_words=4),
            "urgency": random.choice(["routine", "urgent", "emergency"]),
            "medication_type": random.choice(["Diagnosis", "Treatment", "Preventive"]),
            "claim_amount": claim_amount,
            "amount_reimbursed": claim_amount if random.choice([True, False]) else 0,
            "status": random.choice(["pending", "approved", "rejected"]),
            "submitted_at": fake.date_time_between(start_date='-1y', end_date='now'),
            "additional_notes": fake.sentence(),
            "remarks": fake.sentence()
        }

        db.claims.insert_one(claim_doc)
        claim_ids.append(cid)

        # Update histories using ObjectIds
        db.members.update_one({'_id': member_obj_id}, {
            '$push': {'claim_history': cid},
            '$inc': {'amount_reimbursed': claim_doc['amount_reimbursed']}
        })
        db.providers.update_one({'_id': provider_obj_id}, {'$push': {'claim_history': cid}})
        
        # Update subscription if exists
        if subscription:
            db.insurance_subscriptions.update_one(
                {'subscription_id': subscription['subscription_id']},
                {
                    '$push': {'claims_history': cid},
                    '$inc': {'amount_reimbursed': claim_doc['amount_reimbursed']},
                    '$set': {'remaining_balance': max(0, subscription['remaining_balance'] - claim_doc['amount_reimbursed'])}
                }
            )
        
        # Update payer cases and amounts
        if claim_doc['status'] == 'pending':
            db.payers.update_one({'_id': payer_obj_id}, {'$push': {'pending_cases': cid}})
        elif claim_doc['status'] == 'approved':
            db.payers.update_one({'_id': payer_obj_id}, {
                '$push': {'approved_cases': cid},
                '$inc': {
                    'total_amount_paid': claim_doc['amount_reimbursed'],
                    'payer_balance_left': -claim_doc['amount_reimbursed']
                }
            })

    # Save generated credentials
    with open("sample_credentials.txt", "w") as f:
        f.write("Generated User Credentials:\n\n")
        f.write("\n".join(credentials_log))

    print("✅ Sample data created with ObjectId relationships.")





# =====================================================
# Application Entry Point
# =====================================================

if __name__ == '__main__':
    # Initialize sample data on startup
    populate_sample_data()
    
    # Start the Flask development server
    app.run(debug=True, port=5000)
