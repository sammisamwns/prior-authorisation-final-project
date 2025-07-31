import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { generateToken } from './api';
import './Login.css';

function Login() {
  const [token, setToken] = useState('');
  const [userRole, setUserRole] = useState('member');
  const [userEmail, setUserEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTokenGenerator, setShowTokenGenerator] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();

  // Pre-fill with sample tokens for testing
  const sampleTokens = {
    member: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InVzZXIxMjMiLCJyb2xlIjoibWVtYmVyIiwiZW1haWwiOiJtZW1iZXJAZXhhbXBsZS5jb20iLCJleHAiOjE3NTM4OTk3OTksImlhdCI6MTc1MzgxMzM5OX0.aQBvko2Jy-cQgkxpGkFfblH7wpouLrUesm19BscMy20',
    provider: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InByb3ZpZGVyNDU2Iiwicm9sZSI6InByb3ZpZGVyIiwiZW1haWwiOiJwcm92aWRlckBleGFtcGxlLmNvbSIsImV4cCI6MTc1Mzg5OTc5OSwiaWF0IjoxNzUzODEzMzk5fQ.WGCRND9CDoSDBO4k8JvEC2LU4ueHU1xrFDihRKv9uaU'
  };

  const handleUseSampleToken = (role) => {
    setToken(sampleTokens[role]);
    setUserRole(role);
    setError('');
  };

  const handleGenerateToken = async () => {
    if (!userEmail) {
      setError('Please enter an email address');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const userData = {
        user_id: userRole === 'member' ? 'user123' : 'provider456',
        role: userRole,
        email: userEmail
      };

      const response = await generateToken(userData);
      setToken(response.token);
      setError('');
    } catch (err) {
      setError(err.toString());
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    if (!token.trim()) {
      setError('Please enter a JWT token');
      return;
    }

    try {
      // Store the token
      localStorage.setItem('jwt', token);
      
      // Redirect to the intended page or dashboard
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (err) {
      setError('Failed to store token');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('jwt');
    setToken('');
    setError('');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>🔐 JWT Authentication</h1>
          <p>Prior Authorization System</p>
        </div>

        <div className="login-form">
          <div className="form-group">
            <label htmlFor="userRole">User Role:</label>
            <select
              id="userRole"
              value={userRole}
              onChange={(e) => setUserRole(e.target.value)}
              className="form-control"
            >
              <option value="member">Member</option>
              <option value="provider">Provider</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="userEmail">Email (for token generation):</label>
            <input
              type="email"
              id="userEmail"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              placeholder="Enter email for token generation"
              className="form-control"
            />
          </div>

          <div className="token-section">
            <div className="form-group">
              <label htmlFor="jwtToken">JWT Token:</label>
              <textarea
                id="jwtToken"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste your JWT token here..."
                className="form-control token-input"
                rows="4"
              />
            </div>

            <div className="token-actions">
              <button
                onClick={() => handleUseSampleToken(userRole)}
                className="btn btn-secondary"
              >
                Use Sample {userRole} Token
              </button>
              
              <button
                onClick={() => setShowTokenGenerator(!showTokenGenerator)}
                className="btn btn-info"
              >
                {showTokenGenerator ? 'Hide' : 'Show'} Token Generator
              </button>
            </div>

            {showTokenGenerator && (
              <div className="token-generator">
                <button
                  onClick={handleGenerateToken}
                  disabled={isLoading}
                  className="btn btn-primary"
                >
                  {isLoading ? 'Generating...' : 'Generate New Token'}
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="error-message">
              ❌ {error}
            </div>
          )}

          <div className="login-actions">
            <button
              onClick={handleLogin}
              disabled={!token.trim()}
              className="btn btn-success"
            >
              🔑 Login
            </button>
            
            <button
              onClick={handleLogout}
              className="btn btn-danger"
            >
              🚪 Logout
            </button>
          </div>
        </div>

        <div className="login-footer">
          <p>
            <strong>💡 Tip:</strong> Use the sample tokens or generate new ones to test the system.
          </p>
          <p>
            <strong>🔒 Security:</strong> Tokens are stored in localStorage for this demo.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login; 