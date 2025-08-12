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

#using gemini api

from pyexpat import model
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from flask_pymongo import PyMongo
import jwt
from datetime import timezone, timedelta
from datetime import datetime as dtt
from functools import wraps
import os
from dotenv import load_dotenv
import random
from faker import Faker
import bcrypt
from bson.objectid import ObjectId
import json
import re
import google.generativeai as genai


# Load environment variables
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_API_ENDPOINT = os.getenv("GEMINI_API_ENDPOINT")
GEMINI_MODEL_NAME = os.getenv("GEMINI_MODEL_NAME")  # For reference only


class GeminiClient:
    def __init__(self, api_key):
        genai.configure(api_key=api_key)
        self.chat = self.Chat()

    class Chat:
        def completions(self):
            return self

        def create(self, *, model, messages, temperature=0.7, max_output_tokens=256):
            response = genai.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_output_tokens=max_output_tokens,
            )
            return response


# genai.configure(api_key=GEMINI_API_KEY)  # Set your API key

client = GeminiClient(api_key=GEMINI_API_KEY)


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
prior_auth = db.prior_auth  # Replacing claims with prior_auth
payers = db.payers
insurance_subscriptions = db.insurance_subscriptions  # New collection for insurance subscriptions
pending_requests = db.pending_requests  # New collection for pending member requests


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
# AI Processing Functions
# =====================================================


def auto_review_auth(auth_request, member_data, past_requests):
    """
    Review authorization request using Gemini Agentic AI.
    """

    try:
        context_prompt = f"""
        You are an autonomous medical insurance review agent.
        Follow these steps:
        1. Assess procedure risk.
        2. Check urgency.
        3. Consider patient's profile and history.
        4. Apply policy rules.
        5. Decide: approved, pending, or rejected.
        6. Provide reason and extra notes.
        Respond ONLY in JSON with keys: status, reason, ai_notes.

Request Details:
Procedure: {auth_request['procedure']}
Diagnosis: {auth_request['diagnosis']}
Urgency: {auth_request['urgency']}
Additional Notes: {auth_request['additional_notes']}

Member Profile:
ID: {member_data.get('member_id')}
Age: {member_data.get('age')}
Gender: {member_data.get('gender')}
Chronic Conditions: {member_data.get('diseases', [])}

Historical Requests:
{past_requests if past_requests else "No past requests found"}
        """

        plan_instructions = """
You are an autonomous medical insurance review agent.
Follow these steps:
1. Assess procedure risk.
2. Check urgency.
3. Consider patient's profile and history.
4. Apply policy rules.
5. Decide: approved, pending, or rejected.
6. Provide reason and extra notes.
Respond ONLY in JSON with keys: status, reason, ai_notes.
        """


        response_text = client.chat.create(
            messages=[
                {"role": "system", "content": plan_instructions},
                {"role": "user", "content": context_prompt}
            ],
            model="gemini-1",
            temperature=0.2
            )

        result_text = response_text  # Gemini client returns text directly
        # Extract JSON
        try:
            json_match = re.search(r'\{.*\}', result_text, re.DOTALL)
            if json_match:
                decision_data = json.loads(json_match.group())
            else:
                decision_data = {
                    "status": "pending",
                    "reason": "Agent completed reasoning but output unclear",
                    "ai_notes": result_text
                }
        except Exception:
            decision_data = {
                "status": "pending",
                "reason": "Agent completed reasoning but output unclear",
                "ai_notes": result_text
            }

        # Save results to DB
        db.prior_auths.update_one(
            {"auth_id": auth_request["auth_id"]},
            {
                "$set": {
                    "ai_processed": True,
                    "ai_agent_plan": plan_instructions,
                    "ai_decision_text": result_text,
                    "ai_decision": decision_data.get("status", "pending"),
                    "ai_notes": decision_data.get("ai_notes", ""),
                    "ai_reason": decision_data.get("reason", ""),
                    "ai_reviewed_at": dtt.now(timezone.utc)
                }
            }
        )

        return decision_data

    except Exception as e:
        print(f"Agentic AI review failed: {str(e)}")
        return {"status": "pending", "reason": "Fallback logic used", "ai_notes": str(e)}
def generate_prompt_for_agent(auth_request, member_data, past_requests):
    return f"""
You are an autonomous medical insurance review agent.
Follow these steps:
1. Assess the risk level of the procedure.
2. Check urgency.
3. Consider patient's profile and history.
4. Apply insurance policy rules.
5. Decide: approved, pending, or rejected.
6. Provide a short reason and any extra notes.
Respond ONLY in JSON format with keys: status, reason, ai_notes.

Request Details:
- Procedure: {auth_request['procedure']}
- Diagnosis: {auth_request['diagnosis']}
- Urgency: {auth_request['urgency']}
- Additional Notes: {auth_request['additional_notes']}

Member Profile:
- ID: {member_data.get('member_id')}
- Age: {member_data.get('age')}
- Gender: {member_data.get('gender')}
- Chronic Conditions: {member_data.get('diseases', [])}

Historical Requests:
{past_requests if past_requests else "No past requests found"}
"""

def auto_review_auth_with_agent(auth_request, member_data, past_requests):
    try:
        context_prompt = generate_prompt_for_agent(auth_request, member_data, past_requests)
        
        response_text = client.chat.create(
            messages=[
                {"role": "system", "content": "You are an autonomous medical insurance review agent."},
                {"role": "user", "content": context_prompt}
            ],
            temperature=0.2,
            model="gemini-1"
        )

        result_text = response_text  # Gemini client returns text directly

        try:
            json_match = re.search(r'\{.*\}', result_text, re.DOTALL)
            if json_match:
                decision_data = json.loads(json_match.group())
            else:
                decision_data = {
                    "status": "pending",
                    "reason": "Agent reasoning completed but decision unclear",
                    "ai_notes": result_text
                }
        except json.JSONDecodeError:
            decision_data = {
                "status": "pending",
                "reason": "Agent reasoning completed but decision unclear",
                "ai_notes": result_text
            }

        # Store results in DB
        db.prior_auths.update_one(
            {"auth_id": auth_request["auth_id"]},
            {
                "$set": {
                    "ai_processed": True,
                    "ai_agent_prompt": context_prompt,
                    "ai_decision_text": result_text,
                    "ai_decision": decision_data.get("status", "pending"),
                    "ai_notes": decision_data.get("ai_notes", ""),
                    "ai_reason": decision_data.get("reason", ""),
                    "ai_reviewed_at": dtt.now(timezone.utc)
                }
            }
        )

        return decision_data

    except Exception as e:
        print(f"Agentic AI review failed: {str(e)}")
        return {"status": "pending", "reason": "Fallback logic used", "ai_notes": str(e)}

def format_request_description(raw_input):
    """
    Format medical request description using Gemini (Agentic AI approach).
    """
    try:
        response_text = client.chat.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert medical writing assistant. Format and clarify medical request descriptions professionally."
                },
                {
                    "role": "user",
                    "content": f"Format this request clearly and professionally: {raw_input}"
                }
            ],
            model="gemini-1",
            max_output_tokens=300,
            temperature=0.5
        )

        return response_text.strip()

    except Exception as e:
        print(f"Error formatting description: {str(e)}")
        return raw_input

def get_autocomplete_suggestion(input_text):
    """
    Get autocomplete suggestions using Gemini with an agentic reasoning approach.
    """

    try:

        messages = [
            {
                "role": "system",
                "content": (
                    "You are an intelligent autocomplete assistant. Predict and suggest the most likely text completion. "
                    "Remember there is context from previous messages. "
                    "Also, the member will be a patient seeking to make a claim for the insurance payer "
                    "to get reimbursed for the amount they are going to spend on the treatment of the disease "
                    "or the diagnosis that they need to do preliminary check-ups. "
                    "Help that member to get the correct sentence using autocomplete."
                )
            },
            {
                "role": "user",
                "content": input_text
            }
        ]
        response_text = client.chat.create(
            messages=messages,
            temperature=0.5,             # add if needed
            max_output_tokens=50,
            model="gemini-1"
        )

        return response_text.strip()

    except Exception as e:
        print(f"Error getting autocomplete: {str(e)}")
        return ""

def get_ai_health_buddy_response(user_message, member_doc, provider_data, payer_data, past_requests, member_provider, member_payer):
    """
    Get AI health buddy response for member queries using Gemini (agentic style).
    """
    try:
        # Build context for the AI
        prompt = f"""
    You are a helpful AI health buddy for a member. Your role is to:

    1. Understand the member's current health concern and background.
    2. Match them with the most suitable healthcare provider from the given provider list.
    3. Recommend the most relevant insurance plan from the given insurance payer details.
    4. Provide advice in a clear, empathetic, and professional tone.

    Member Profile:
    - Name: {member_doc.get('name', 'Unknown')}
    - Age: {member_doc.get('age', 'Unknown')}
    - Gender: {member_doc.get('gender', 'Unknown')}
    - Existing Conditions: {', '.join(member_doc.get('diseases', []))}
    - Insurance Plan: {member_doc.get('insurance_plan', 'Unknown')}
    - Deductible: {member_doc.get('deductible', 'Unknown')}
    - Co-pay: {member_doc.get('co_pay', 'Unknown')}
    - Coverage Start: {member_doc.get('coverage_start', 'Unknown')}
    - Emergency Contact: {member_doc.get('emergency_contact', 'Unknown')} ({member_doc.get('emergency_phone', 'Unknown')})
    - Past Claims History: {past_requests if past_requests else 'None'}

    Healthcare Providers:
    {json.dumps(provider_data, indent=2)}

    Insurance Payers:
    {json.dumps(payer_data, indent=2)}

    Member's go-to Provider:
    {json.dumps(member_provider, indent=2)}

    Member's already subscribed Insurance Payer:
    {json.dumps(member_payer, indent=2)}

    User's Current Question/Issue:
    {user_message}

    Rules & Guidelines:
    - Do NOT provide a direct medical diagnosis.
    - Analyze the patient's current issue and their profile.
    - Recommend the BEST provider considering:
        * Specialization (match expertise to condition)
        * Years of Experience
        * Board Certification
        * Network Type (in-network providers preferred)
        * Languages spoken (if relevant)
    - Recommend the BEST insurance plan based on:
        * Coverage Details
        * Deductible Amount
        * Co-pay Amount
        * Maximum Out-of-Pocket Limit
        * Approval Rate
        * Coverage Types matching patient's needs
    - Explain clearly WHY the chosen provider and insurance plan are suitable.
    - If no perfect match, suggest closest alternatives and limitations.
    - Always encourage consulting a licensed medical professional for final advice.
    - Provide output in the following format:

    Output Format:
    1. Summary of the patient's situation.
    2. Recommended Provider:
    - Name
    - Specialization / Expertise
    - Years of Experience
    - Board Certified (Yes/No)
    - Reason for Choice
    3. Recommended Insurance Plan:
    - Name
    - Coverage Highlights
    - Deductible
    - Co-pay
    - Max Out-of-Pocket Limit
    - Reason for Choice
    4. Next Steps for the patient.
    """

        response_text = client.chat.create(
            messages=[
                {"role": "system", "content": "You are a helpful AI health assistant."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7
        )

        return response_text.strip()

    except Exception as e:
        print(f"Error getting health buddy response: {e}")
        return "I'm sorry, I'm having trouble processing your request right now. Please try again later."



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
            'coverage_category': 1,  # Added coverage_category
            'deductible_amounts': 1,
            'copay_amounts': 1,
            'max_out_of_pocket': 1,
            'approval_rate': 1,
            'avg_processing_time': 1
        }))
        
        # Add validity date (1 year from now) to each plan
        for payer in payers:
            payer['validity_date'] = (dtt.now() + timedelta(days=365)).strftime('%Y-%m-%d')
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
            'validity_date': (dtt.now() + timedelta(days=365)).strftime('%Y-%m-%d'),
            'coverage_scheme': payer.get('coverage_types', []),
            'deductible': random.choice(payer.get('deductible_amounts', [500, 1000, 1500])),
            'copay': random.choice(payer.get('copay_amounts', [15, 25, 35])),
            'status': 'active',
            'subscription_date': dtt.now(),
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
        'createdAt': dtt.now(timezone.utc)
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
    }, 201)

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
        'total_amount_paid': 0,
        'coverage_category': []  # New field for coverage categories
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

    # Validate user type and determine collection
    if user_type == 'member':
        collection = db.members
    elif user_type == 'provider':
        collection = db.providers
    elif user_type == 'payer':
        collection = db.payers
    else:
        return jsonify({'message': 'Invalid user type'}), 400

    # Find user by email
    user = collection.find_one({'email': email})
    if not user:
        print(f"Login failed: User with email {email} not found.")  # Debug log
        return jsonify({'message': 'Invalid email or password'}), 401

    # Verify password (handle different field names)
    password_field = 'password_hash' if user_type in ['member', 'provider'] else 'password'
    if not bcrypt_flask.check_password_hash(user[password_field], password):
        print(f"Login failed: Incorrect password for email {email}.")  # Debug log
        return jsonify({'message': 'Invalid email or password'}), 401

    # Generate JWT token
    token = jwt.encode({
        'email': user['email'],
        'user_type': user_type,
        'name': user.get('name', 'Unknown User'),
        'exp': dtt.now(timezone.utc) + timedelta(hours=3)  # Updated to use timezone-aware datetime
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
        member_claims = list(db.prior_auth.find({'member_id': member['member_id']}))
        
        # Convert ObjectId to string for JSON serialization
        for claim in member_claims:
            prior_auth['_id'] = str(prior_auth['_id'])
            
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
            member_claims = list(db.prior_auth.find({
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
            'submitted_at': dtt.now(timezone.utc),
            'ai_processed': False,
            'submitted_by': {
                'name': current_user['name'],
                'email': current_user['email'],
                'user_type': current_user['user_type']
            }
        }

        member_data = list(db.members.find({'member_id': member_id}, {'_id': 0}))

        past_requests = list(db.prior_auths.find({'member_id': member_id}, {'_id': 0}))

        # Insert into database
        result = db.prior_auths.insert_one(auth_request)

        # Trigger AI processing
        auto_review_auth(auth_request, member_data, past_requests)

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
def handle_prior_auth_decision():
    """
    Approve or reject a pending request and move it to the prior_auth database.
    """
    data = request.json
    request_id = data.get('request_id')
    decision = data.get('decision')  # 'approved' or 'rejected'
    notes = data.get('notes', '')

    if not request_id or decision not in ['approved', 'rejected']:
        return jsonify({"message": "Invalid request data"}), 400

    try:
        # Fetch the pending request from the pending_requests database
        pending_request = mongo.db.pending_requests.find_one({"_id": ObjectId(request_id)})

        if not pending_request:
            return jsonify({"message": "Pending request not found"}), 404

        # Add decision details to the request
        pending_request['status'] = decision
        pending_request['decision_notes'] = notes
        pending_request['decision_date'] = dtt.now(timezone.utc)

        # Move the request to the prior_auth database
        mongo.db.prior_auth.insert_one(pending_request)

        # Remove the request from the pending_requests database
        mongo.db.pending_requests.delete_one({"_id": ObjectId(request_id)})

        return jsonify({"message": f"Request {decision} successfully"}), 200

    except Exception as e:
        print(f"Error handling prior auth decision: {e}")
        return jsonify({"message": "Internal server error"}), 500


@app.route('/prior-auth', methods=['GET'])
def fetch_prior_auths():
    """
    Fetch all prior authorization records from the prior_auth database.
    """
    try:
        prior_auths = list(mongo.db.prior_auth.find())
        for auth in prior_auths:
            auth['_id'] = str(auth['_id'])  # Convert ObjectId to string for JSON serialization
        return jsonify({"prior_auths": prior_auths}), 200
    except Exception as e:
        print(f"Error fetching prior auths: {e}")
        return jsonify({"message": "Internal server error"}), 500


@app.route('/pending-requests', methods=['GET'])
def fetch_pending_requests():
    """
    Fetch all pending requests from the pending_requests database.
    """
    try:
        pending_requests = list(mongo.db.pending_requests.find())
        for request in pending_requests:
            request['_id'] = str(request['_id'])  # Convert ObjectId to string for JSON serialization
        return jsonify({"pending_requests": pending_requests}), 200
    except Exception as e:
        print(f"Error fetching pending requests: {e}")
        return jsonify({"message": "Internal server error"}), 500
# =====================================================
# AI-Powered Endpoints
# =====================================================

@app.route('/ai/auto-review', methods=['POST'])
@token_required
def auto_review_prior_auth(current_user):
    """
    Auto-review a prior authorization request using AI.
    """
    try:
        data = request.get_json()
        auth_id = data.get('auth_id')
        
        if not auth_id:
            return jsonify({'message': 'Auth ID is required'}), 400
            
        # Find the authorization request
        auth_request = db.prior_auths.find_one({'auth_id': auth_id})
        if not auth_request:
            return jsonify({'message': 'Authorization request not found'}), 404
            
        # Get member data
        member = db.members.find_one({'member_id': auth_request['member_id']})
        if not member:
            return jsonify({'message': 'Member not found'}), 404
            
        # Get past requests for this member
        past_requests = list(db.prior_auths.find({'member_id': auth_request['member_id']}))
        
        # Perform AI review
        decision = auto_review_auth_with_agent(auth_request, member, past_requests)
        
        return jsonify({
            'message': 'Auto-review completed successfully',
            'decision': decision,
            'auth_id': auth_id
        }), 200
        
    except Exception as e:
        return jsonify({'message': f'Error in auto-review: {str(e)}'}), 500

@app.route('/ai/format-description', methods=['POST'])
@token_required
def format_description(current_user):
    """
    Format medical request description using AI.
    """
    try:
        data = request.get_json()
        raw_input = data.get('raw_input')
        
        if not raw_input:
            return jsonify({'message': 'Raw input is required'}), 400
            
        formatted = format_request_description(raw_input)
        
        return jsonify({
            'formatted': formatted
        }), 200
        
    except Exception as e:
        return jsonify({'message': f'Error formatting description: {str(e)}'}), 500

@app.route('/ai/autocomplete', methods=['GET'])
@token_required
def get_autocomplete(current_user):
    """
    Get autocomplete suggestions using AI.
    """
    try:
        input_text = request.args.get('input', '')
        
        if not input_text:
            return jsonify({'suggestion': ''}), 200
            
        suggestion = get_autocomplete_suggestion(input_text)
        
        return jsonify({
            'suggestion': suggestion
        }, 200)
        
    except Exception as e:
        return jsonify({'message': f'Error getting autocomplete: {str(e)}'}), 500

@app.route('/ai/health-buddy', methods=['POST'])
@token_required
def health_buddy_chat(current_user):
    """
    AI health buddy chat for members.
    """
    try:
        data = request.get_json()
        user_message = data.get('message')
        
        if not user_message:
            return jsonify({'message': 'User message is required'}), 400
            
        # Get member data
        member = db.members.find_one({'email': current_user['email']})
        if not member:
            return jsonify({'message': 'Member not found'}), 404
            
        # Get past requests
        past_requests = list(db.prior_auths.find({'member_id': member['member_id']}))

        # Get provider data
        provider_data = db.providers.find()
        # Get payer data
        payer_data = db.payers.find_one()

        member_payer = db.payers.find_one({'payer_id': member['payer_id']})

        member_provider = db.providers.find_one({'provider_id': member['provider_id']})

        # Get AI response
        ai_response = get_ai_health_buddy_response(user_message, member, provider_data, payer_data, past_requests, member_provider, member_payer)

        return jsonify({
            'response': ai_response
        }), 200
        
    except Exception as e:
        return jsonify({'message': f'Error in health buddy: {str(e)}'}), 500

# =====================================================
# Member-Provider Interaction Endpoints
# =====================================================

@app.route('/member/submit_pending_request', methods=['POST'])
@token_required
def submit_pending_request(current_user):
    """
    Submit a pending request from a member that needs provider approval.
    """
    try:
        data = request.get_json()
        required_fields = ['procedure', 'diagnosis', 'provider_info', 'urgency']
        if not all(field in data for field in required_fields):
            return jsonify({'message': 'Missing required fields'}), 400

        # Get member data
        member = db.members.find_one({'email': current_user['email']})
        if not member:
            return jsonify({'message': 'Member not found'}), 404

        # Handle provider info (ID, name, or email)
        provider_info = data['provider_info']
        provider = db.providers.find_one({
            '$or': [
                {'provider_id': provider_info},
                {'name': {'$regex': provider_info, '$options': 'i'}},
                {'email': {'$regex': provider_info, '$options': 'i'}}
            ]
        })
        payer = db.payers.find_one({'payer_id': member['payer_id']})
        if not provider:
            return jsonify({'message': 'Provider not found'}), 404

        # Create pending request
        pending_request = {
            'request_id': f"PEND{random.randint(1000, 9999)}",
            'member_id': member['member_id'],
            'member_name': member['name'],
            'member_email': member['email'],
            'provider_id': provider['provider_id'],
            'provider_name': provider['name'],
            'provider_email': provider['email'],
            'procedure': data['procedure'],
            'diagnosis': data['diagnosis'],
            'urgency': data['urgency'],
            'additional_notes': data.get('additionalNotes', ''),
            'status': 'pending_provider_approval',
            'submitted_at': dtt.now(timezone.utc),
            'member_notes': data.get('member_notes', ''),
            'payer_id': payer['payer_id'],
            'payer_name': payer['name'],
            'payer_email': payer['email']
        }

        # Insert into pending requests collection
        db.pending_requests.insert_one(pending_request)

        return jsonify({
            'message': 'Request submitted successfully',
            'request_id': pending_request['request_id']
        }), 201

    except Exception as e:
        return jsonify({'message': f'Error submitting request: {str(e)}'}), 500

@app.route('/provider/pending_requests', methods=['GET'])
@token_required
def get_provider_pending_requests(current_user):
    """
    Get pending requests for a specific provider.
    """
    try:
        # Get provider data
        provider = db.providers.find_one({'email': current_user['email']})
        if not provider:
            return jsonify({'message': 'Provider not found'}), 404
            
        # Get pending requests for this provider
        pending_requests = list(db.pending_requests.find({
            'provider_id': provider['provider_id'],
            'status': 'pending_provider_approval'
        }))
        
        # Convert ObjectId to string
        for request in pending_requests:
            request['_id'] = str(request['_id'])
            
        return jsonify({
            'data': pending_requests
        }), 200
        
    except Exception as e:
        return jsonify({'message': f'Error fetching pending requests: {str(e)}'}), 500

@app.route('/provider/approve-pending-request', methods=['POST'])
@token_required
def approve_pending_request(current_user):
    """
    Provider approves a pending request and submits it to insurance.
    """
    try:
        data = request.get_json()
        request_id = data.get('request_id')
        provider_notes = data.get('provider_notes', '')
        auth_amount = data.get('auth_amount', 0)
        if not request_id:
            return jsonify({'message': 'Request ID is required'}), 400
            
        # Get provider data
        provider = db.providers.find_one({'email': current_user['email']})
        if not provider:
            return jsonify({'message': 'Provider not found'}), 404
            
        # Find the pending request
        pending_request = db.pending_requests.find_one({
            'request_id': request_id,
            'provider_id': provider['provider_id']
        })
        
        if not pending_request:
            return jsonify({'message': 'Pending request not found'}), 404
            
        # Create the final authorization request
        auth_request = {
            'auth_id': f"AUTH{random.randint(1000, 9999)}",
            'member_id': pending_request['member_id'],
            'procedure': pending_request['procedure'],
            'diagnosis': pending_request['diagnosis'],
            'provider': pending_request['provider_name'],
            'provider_id': pending_request['provider_id'],
            'urgency': pending_request['urgency'],
            'additional_notes': pending_request['additional_notes'],
            'provider_notes': provider_notes,
            'member_notes': pending_request['member_notes'],
            'status': 'pending',
            'submitted_at': dtt.now(timezone.utc),
            'ai_processed': False,
            'source': 'provider_approved',
            'auth_amount': auth_amount
        }
        
        # Insert into prior_auths collection
        db.prior_auths.insert_one(auth_request)
        
        # Update pending request status
        db.pending_requests.update_one(
            {'request_id': request_id},
            {
                '$set': {
                    'status': 'approved_by_provider',
                    'approved_at': dtt.now(timezone.utc),
                    'provider_notes': provider_notes,
                    'final_auth_id': auth_request['auth_id']
                }
            }
        )
        
        return jsonify({
            'message': 'Request approved and submitted to insurance',
            'auth_id': auth_request['auth_id']
        }), 200
        
    except Exception as e:
        return jsonify({'message': f'Error approving request: {str(e)}'}), 500

@app.route('/member/pending-requests/', methods=['GET'])
@token_required
def get_member_pending_requests(current_user, member_id):
    """
    Get pending requests for a member.
    """
    try:
        # Get member data
        member = db.members.find_one({'email': current_user['email']})
        if not member:
            return jsonify({'message': 'Member not found'}), 404
            
        # Get pending requests for this member
        pending_requests = list(db.pending_requests.find({
            'member_id': member['member_id']
        }))
        
        # Convert ObjectId to string
        for request in pending_requests:
            request['_id'] = str(request['_id'])
            
        return jsonify({
            'data': pending_requests
        }), 200
        
    except Exception as e:
        return jsonify({'message': f'Error fetching pending requests: {str(e)}'}), 500

@app.route('/provider/search', methods=['GET'])
@token_required
def search_providers(current_user):
    """
    Search providers by name or email.
    """
    try:
        query = request.args.get('q', '')
        
        if not query:
            return jsonify({'data': []}), 200
            
        # Search providers by name or email
        providers_list = list(db.providers.find({
            '$or': [
                {'name': {'$regex': query, '$options': 'i'}},
                {'email': {'$regex': query, '$options': 'i'}},
                {'provider_id': {'$regex': query, '$options': 'i'}}
            ]
        }).limit(10))
        
        # Convert ObjectId to string and format response
        for provider in providers_list:
            provider['_id'] = str(provider['_id'])
            
        return jsonify({
            'data': providers_list
        }), 200
        
    except Exception as e:
        return jsonify({'message': f'Error searching providers: {str(e)}'}), 500

# =====================================================
# Health Check Endpoint
# =====================================================

@app.route('/health', methods=['GET'])
def health_check():
    """
    Health check endpoint for the application.
    """
    return jsonify({
        'status': 'healthy',
        'message': 'Prior Authorization System is running',
        'timestamp': dtt.now(timezone.utc).isoformat()
    }), 200

# =====================================================
# Claims Management Endpoints
# =====================================================

@app.route('/claims', methods=['POST'])
@token_required
def submit_claim(current_user):
    """
    Submit a new claim from provider with insurance plan selection.
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
        auth_amount = random.randint(500, 3000)
        
        # Check if claim amount exceeds remaining balance
        if auth_amount > subscription['remaining_balance']:
            auth_amount = subscription['remaining_balance']

        # Create claim document
        new_prior_auth = {
            "auth_id": f"C{random.randint(100000, 999999)}",
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
                "email": current_user['email'],
                "user_type": current_user['user_type']
            }
        

        # Insert claim into database
        inserted = db.prior_auth.insert_one(new_prior_auth)
        db.commit()

        # Update subscription with claim
        db.insurance_subscriptions.update_one(
            {'subscription_id': data['subscription_id']},
            {
                '$push': {'claims_history': new_prior_auth["auth_id"]},
                '$inc': {'amount_reimbursed': auth_amount},
                '$set': {'remaining_balance': subscription['remaining_balance'] - auth_amount}
            }
        )
        
        # Update member and provider claim histories
        db.members.update_one(
            {"member_id": data["member_id"]}, 
            {
                "$push": {"claim_history": new_prior_auth["auth_id"]},
                "$inc": {"amount_reimbursed": auth_amount}
            }
        )
        db.providers.update_one(
            {"provider_id": data["provider_id"]}, 
            {"$push": {"claim_history": new_prior_auth["auth_id"]}}
        )
        
        # Update payer's total reimbursed amount
        db.payers.update_one(
            {'payer_id': subscription['payer_id']},
            {
                '$inc': {
                    'total_amount_paid': auth_amount,
                    'payer_balance_left': -auth_amount
                }
            }
        )

        return jsonify({
            "message": "Claim submitted successfully", 
            "auth_id": new_prior_auth["auth_id"],
            "auth_amount": auth_amount,
            "remaining_balance": subscription['remaining_balance'] - auth_amount
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
        priorauths = list(db.prior_auth.find({"provider_id": provider_id}))

        results = []
        for prior_auth in priorauths:
            # Get member details
            member = db.members.find_one({"member_id": prior_auth["member_id"]})
            
            results.append({
                "auth_id": str(prior_auth["_id"]),
                "member_id": prior_auth["member_id"],
                "member_name": member["name"] if member else "Unknown",
                "procedure": prior_auth["procedure"],
                "diagnosis": prior_auth["diagnosis"],
                "urgency": prior_auth["urgency"],
                "status": prior_auth.get("status", "pending"),
                "submitted_at": prior_auth.get("submitted_at").isoformat() if prior_auth.get("submitted_at") else None,
                "additional_notes": prior_auth.get("additional_notes", "")
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
        claims = list(db.prior_auth.find({"member_id": member_id}))

        results = []
        for claim in claims:
            # Get provider details
            provider = db.providers.find_one({"provider_id": prior_auth["provider_id"]})
            
            # Ensure submitted_at is properly formatted
            prior_auth['submitted_at'] = claim.get('submitted_at').isoformat() if claim.get('submitted_at') else None
            
            results.append({
                "auth_id": str(prior_auth["_id"]),
                "provider_id": prior_auth["provider_id"],
                "provider_name": provider["name"] if provider else "Unknown",
                "procedure": prior_auth["procedure"],
                "diagnosis": prior_auth["diagnosis"],
                "urgency": prior_auth["urgency"],
                "status": claim.get("status", "pending"),
                "submitted_at": claim.get("submitted_at").isoformat() if claim.get("submitted_at") else None,
                "amount_reimbursed": claim.get("amount_reimbursed", 0)
            })

        return jsonify({"claims": results}), 200

    except Exception as e:
        return jsonify({"message": f"Error fetching member claims: {str(e)}"}), 500

@app.route('/claims/<auth_id>/status', methods=['PUT'])
@token_required
def update_claim_status(current_user, auth_id):
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

        if new_status not in ['approved', 'rejected', 'pending_provider_approval', 'under_review']:
            return jsonify({"message": "Invalid status"}), 400

        # Update claim status
        result = db.prior_auth.update_one(
            {"_id": ObjectId(auth_id)},
            {
                "$set": {
                    "status": new_status,
                    "review_notes": notes,
                    "reviewed_at": dtt.now(timezone.utc),
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
    db.payers.drop()
    db.prior_auth.drop()
    db.insurance_subscriptions.drop()
    db.pending_requests.drop()

    insurance_types = ["Medicare", "Medicaid", "Private"]
    roles = ["Doctor", "Nurse", "Technician", "Lab"]
    networks = ["In Network", "Out Network"]
    specialties = ["Cardiology", "Medicine", "Surgery", "Pediatrics"]

    member_ids = []
    provider_ids = []
    payer_ids = []
    credentials_log = []
    auth_ids = []

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
            "age": random.randint(18, 80),
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
                'validity_date': (dtt.now() + timedelta(days=random.randint(30, 365))).strftime('%Y-%m-%d'),
                'coverage_scheme': payer_doc.get('coverage_types', []),
                'deductible': random.choice(payer_doc.get('deductible_amounts', [500, 1000, 1500])),
                'copay': random.choice(payer_doc.get('copay_amounts', [15, 25, 35])),
                'status': 'active',
                'subscription_date': dtt.now() - timedelta(days=random.randint(1, 180)),
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

    # ---- Create Prior Auth ----
    procedures = ["MRI Scan", "X-Ray", "Blood Test", "Physical Therapy", "Surgery", "Consultation", "Medication", "Emergency Visit"]
    
    prior_auth_statuses = ["pending_provider_approval", "under_review", "approved", "rejected"]  # Updated statuses
    for i in range(300):
        auth_id = f"A{i+1:03}"
        member_obj_id = random.choice(member_ids)
        provider_obj_id = random.choice(provider_ids)
        payer_obj_id = random.choice(payer_ids)

        # Get the actual member_id and provider_id strings
        member_doc = db.members.find_one({'_id': member_obj_id})
        provider_doc = db.providers.find_one({'_id': provider_obj_id})
        payer_doc = db.payers.find_one({'_id': payer_obj_id})

        member_id_str = member_doc['member_id'] if member_doc else f"M{random.randint(1,50):03}"
        provider_id_str = provider_doc['provider_id'] if provider_doc else f"P{random.randint(1,20):03}"

        # Get subscription for this member and payer
        subscription = db.insurance_subscriptions.find_one({
            'member_id': member_id_str,
            'payer_id': payer_doc['payer_id'],
            'status': 'active'
        })
        
        auth_amount = random.randint(500, 3000)

        prior_auth_doc = {
            "auth_id": auth_id,
            "member_id": member_id_str,
            "member_name": member_doc['name'] if member_doc else "Unknown",
            "provider_id": provider_id_str,
            "provider_name": provider_doc['name'] if provider_doc else "Unknown",
            "payer_id": payer_doc['payer_id'],
            "payer_name": payer_doc['name'],
            "subscription_id": subscription['subscription_id'] if subscription else None,
            "procedure": random.choice(procedures),
            "diagnosis": fake.sentence(nb_words=4),
            "urgency": random.choice(["routine", "urgent", "emergency"]),
            "medication_type": random.choice(["Diagnosis", "Treatment", "Preventive"]),
            "auth_amount": auth_amount,
            "amount_reimbursed": auth_amount if random.choice([True, False]) else 0,
            "status": random.choice(prior_auth_statuses),
            "submitted_at": dtt.now(timezone.utc),  # Ensure UTC-aware timestamp
            "additional_notes": fake.sentence(),
            "remarks": fake.sentence()
        }

        db.prior_auth.insert_one(prior_auth_doc)
        auth_ids.append(auth_id)

        # Update histories using ObjectIds
        db.members.update_one({'_id': member_obj_id}, {
            '$push': {'auth_history': auth_id},
            '$inc': {'amount_reimbursed': prior_auth_doc['amount_reimbursed']}
        })
        db.providers.update_one({'_id': provider_obj_id}, {'$push': {'auth_history': auth_id}})
        
        # Update subscription if exists
        if subscription:
            db.insurance_subscriptions.update_one(
                {'subscription_id': subscription['subscription_id']},
                {
                    '$push': {'auth_history': auth_id},
                    '$inc': {'amount_reimbursed': prior_auth_doc['amount_reimbursed']},
                    '$set': {'remaining_balance': max(0, subscription['remaining_balance'] - prior_auth_doc['amount_reimbursed'])}
                }
            )
        
        # Update payer cases and amounts
        if prior_auth_doc['status'] == 'pending_provider_approval':
            db.payers.update_one({'_id': payer_obj_id}, {'$push': {'pending_cases': auth_id}})
        elif prior_auth_doc['status'] == 'approved':
            db.payers.update_one({'_id': payer_obj_id}, {
                '$push': {'approved_cases': auth_id},
                '$inc': {
                    'total_amount_paid': prior_auth_doc['amount_reimbursed'],
                    'payer_balance_left': -prior_auth_doc['amount_reimbursed']
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
