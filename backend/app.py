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

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)
bcrypt_flask = Bcrypt(app)
fake = Faker()

# Configuration
app.config['SECRET_KEY'] = os.getenv("FLASK_SECRET_KEY", "default-secret")
app.config['MONGO_URI'] = os.getenv("MONGO_URI", "mongodb://localhost:27017/prior_authdb")
mongo = PyMongo(app)


# MongoDB collections
db = mongo.db
members = db.members
providers = db.providers
claims = db.claims

# ---------------------------------------
# JWT token decorator
# ---------------------------------------
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization', None)
        if not token:
            return jsonify({'message': 'Token is missing'}), 401
        try:
            token = token.split(" ")[1]
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            email = data['email']
            user_type = data['user_type']

            if user_type == 'member':
                current_user = db.members.find_one({'email': email})
            elif user_type == 'provider':
                current_user = db.providers.find_one({'email': email})
            else:
                return jsonify({'message': 'Invalid user type in token'}), 401

            if not current_user:
                return jsonify({'message': 'User not found'}), 404

            current_user['user_type'] = user_type  # Include user_type in current_user object

        except Exception as e:
            return jsonify({'message': f'Invalid token: {str(e)}'}), 401

        return f(current_user, *args, **kwargs)
    return decorated

# ---------------------------------------
# Register
# ---------------------------------------
@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    name = data.get('name')
    user_type = data.get('user_type')  # 'member' or 'provider'

    if not all([email, password, name, user_type]):
        return jsonify({'message': 'Missing required fields'}), 400

    if user_type == 'member':
        collection = db.members
    elif user_type == 'provider':
        collection = db.providers
    else:
        return jsonify({'message': 'Invalid user type'}), 400

    if collection.find_one({'email': email}):
        return jsonify({'message': 'User already exists'}), 409

    hashed_pw = bcrypt_flask.generate_password_hash(password).decode('utf-8')
    user_id = collection.insert_one({
        'name': name,
        'email': email,
        'password_hash': hashed_pw,
        'createdAt': datetime.datetime.utcnow()
    }).inserted_id

    return jsonify({'message': 'User registered successfully', 'user_id': str(user_id)}), 201

# ---------------------------------------
# Login
# ---------------------------------------
@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    user_type = data.get('user_type')  # 'member' or 'provider'

    if user_type == 'member':
        user = db.members.find_one({'email': email})
    elif user_type == 'provider':
        user = db.providers.find_one({'email': email})
    else:
        return jsonify({'message': 'Invalid user type'}), 400

    if not user:
        return jsonify({'message': 'Invalid email or password'}), 401

    if not bcrypt_flask.check_password_hash(user['password_hash'], password):
        return jsonify({'message': 'Invalid email or password'}), 401

    token = jwt.encode({
        'email': user['email'],
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=3)
    }, app.config['SECRET_KEY'], algorithm='HS256')

    return jsonify({
        'message': 'Login successful',
        'token': token,
        'user': {
            'name': user.get('name', ''),
            'email': user['email'],
            'user_type': user_type
        }
    }), 200

# ---------------------------------------
# Protected route example
# ---------------------------------------
@app.route('/dashboard', methods=['GET'])
@token_required
def dashboard(current_user):
    return jsonify({
        'message': 'Welcome to your dashboard!',
        'user': {'name': current_user['name'], 'email': current_user['email']}
    }), 200

# ---------------------------------------
# Get member profile data
# ---------------------------------------
@app.route('/member/profile', methods=['GET'])
@token_required
def get_member_profile(current_user):
    try:
        # Find member by email in members collection
        member = members.find_one({'email': current_user['email']})
        
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
                'coverage_start': '2024-01-01',  # Add this field to your member schema
                'deductible': 1000,  # Add this field to your member schema
                'co_pay': 25,  # Add this field to your member schema
                'address': member['address'],
                'phone': member['phone'],
                'diseases': member['diseases'],
                'claim_history': member['claim_history']
            }
        }
        
        return jsonify({'data': profile_data}), 200
        
    except Exception as e:
        return jsonify({'message': f'Error fetching profile: {str(e)}'}), 500

# ---------------------------------------
# Submit prior authorization request
# ---------------------------------------
@app.route('/prior-auth', methods=['POST'])
@token_required
def submit_prior_auth(current_user):
    try:
        data = request.get_json()
        
        # Create a new prior auth request
        auth_request = {
            'auth_id': f"AUTH{random.randint(1000, 9999)}",
            'member_id': data.get('member_id'),
            'procedure': data.get('procedure'),
            'diagnosis': data.get('diagnosis'),
            'provider': data.get('provider'),
            'urgency': data.get('urgency', 'routine'),
            'additional_notes': data.get('additionalNotes', ''),
            'status': 'pending',
            'submitted_at': datetime.datetime.utcnow(),
            'ai_processed': False
        }
        
        # You can store this in a new collection called 'prior_auths'
        db.prior_auths.insert_one(auth_request)
        
        return jsonify({
            'message': 'Prior authorization request submitted successfully',
            'auth_id': auth_request['auth_id']
        }), 201
        
    except Exception as e:
        return jsonify({'message': f'Error submitting request: {str(e)}'}), 500

# ---------------------------------------
# Get member claims
# ---------------------------------------
@app.route('/member/claims', methods=['GET'])
@token_required
def get_member_claims(current_user):
    try:
        # Find member by email
        member = members.find_one({'email': current_user['email']})
        if not member:
            return jsonify({'message': 'Member not found'}), 404
            
        # Get all claims for this member
        member_claims = list(claims.find({'member_id': member['member_id']}))
        
        # Convert ObjectId to string
        for claim in member_claims:
            claim['_id'] = str(claim['_id'])
            
        return jsonify({'data': member_claims}), 200
        
    except Exception as e:
        return jsonify({'message': f'Error fetching claims: {str(e)}'}), 500


# ---------------------------------------
# Initialize MongoDB with sample data
# ---------------------------------------
def populate_sample_data():
    print("⏳ Initializing sample data...")
    db.members.drop()
    db.providers.drop()
    db.claims.drop()

    insurance_types = ["Medicare", "Medicaid", "Private"]
    roles = ["Doctor", "Nurse", "Technician", "Lab"]
    networks = ["In Network", "Out Network"]
    specialties = ["Cardiology", "Medicine", "Surgery", "Pediatrics"]

    member_ids = []
    provider_ids = []

    credentials_log = []  # Will collect all email+passwords here

    # Create 20 members
    for i in range(20):
        mid = f"M{i+1:03}"
        email = fake.email()
        password = fake.password()
        hashed_pw = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
        members.insert_one({
            "member_id": mid,
            "name": fake.name(),
            "email": email,
            "address": fake.address(),
            "phone": fake.phone_number(),
            "insurance_plan": random.choice(insurance_types),
            "claim_history": [],
            "diseases": [fake.word(), fake.word()],
            "password_hash": hashed_pw
        })
        credentials_log.append(f"[MEMBER] Email: {email} | Password: {password}")
        member_ids.append(mid)

    # Create 8 providers
    for i in range(8):
        pid = f"P{i+1:03}"
        email = fake.email()
        password = fake.password()
        hashed_pw = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
        providers.insert_one({
            "provider_id": pid,
            "name": fake.name(),
            "email": email,
            "role": random.choice(roles),
            "network_type": random.choice(networks),
            "expertise": random.choice(specialties),
            "claim_history": [],
            "password_hash": hashed_pw
        })
        credentials_log.append(f"[PROVIDER] Email: {email} | Password: {password}")
        provider_ids.append(pid)

    # Create 50 claims
    for i in range(50):
        cid = f"C{i+1:03}"
        mid = random.choice(member_ids)
        pid = random.choice(provider_ids)
        claims.insert_one({
            "claim_id": cid,
            "member_id": mid,
            "provider_id": pid,
            "medication_type": random.choice(["Diagnosis", "Treatment"]),
            "amount_reimbursed": random.randint(500, 5000),
            "remarks": fake.sentence()
        })
        members.update_one({'member_id': mid}, {'$push': {'claim_history': cid}})
        providers.update_one({'provider_id': pid}, {'$push': {'claim_history': cid}})

    # Write credentials to file
    with open("sample_credentials.txt", "w") as f:
        f.write("Generated User Credentials:\n\n")
        f.write("\n".join(credentials_log))

    print("✅ Sample data created. Credentials saved to 'sample_credentials.txt'.")

# ---------------------------------------
# Entry point
# ---------------------------------------
if __name__ == '__main__':
    populate_sample_data()
    app.run(debug=True, port=5000)
