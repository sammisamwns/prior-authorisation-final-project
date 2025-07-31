import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { callProtectedAPI, getMemberProfile, getProviderProfile, healthCheck } from './api';
import './Dashboard.css';

function Dashboard() {
  const [userInfo, setUserInfo] = useState(null);
  const [apiResponse, setApiResponse] = useState('');
  const [profileData, setProfileData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [backendStatus, setBackendStatus] = useState('checking');

  const navigate = useNavigate();

  useEffect(() => {
    initializeDashboard();
  }, []);

  const initializeDashboard = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Check backend health
      await checkBackendHealth();
      
      // Get user info from token
      const token = localStorage.getItem('jwt');
      if (!token) {
        navigate('/login');
        return;
      }

      // Decode token to get user info (basic decoding)
      const tokenPayload = JSON.parse(atob(token.split('.')[1]));
      setUserInfo({
        id: tokenPayload.id,
        role: tokenPayload.role,
        email: tokenPayload.email,
        exp: new Date(tokenPayload.exp * 1000).toLocaleString()
      });

      // Call protected API
      await testProtectedAPI();
      
      // Get profile data based on role
      await getProfileData(tokenPayload.role);

    } catch (err) {
      setError(err.toString());
    } finally {
      setIsLoading(false);
    }
  };

  const checkBackendHealth = async () => {
    try {
      await healthCheck();
      setBackendStatus('online');
    } catch (err) {
      setBackendStatus('offline');
      throw new Error('Backend is not available');
    }
  };

  const testProtectedAPI = async () => {
    try {
      const response = await callProtectedAPI();
      setApiResponse(JSON.stringify(response, null, 2));
    } catch (err) {
      setApiResponse(`Error: ${err}`);
    }
  };

  const getProfileData = async (role) => {
    try {
      let response;
      if (role === 'member') {
        response = await getMemberProfile();
      } else if (role === 'provider') {
        response = await getProviderProfile();
      }
      setProfileData(response);
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('jwt');
    navigate('/login');
  };

  const handleRefresh = () => {
    initializeDashboard();
  };

  if (isLoading) {
    return (
      <div className="dashboard-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="header-content">
          <h1>🏥 Prior Authorization Dashboard</h1>
          <div className="header-actions">
            <button onClick={handleRefresh} className="btn btn-primary">
              🔄 Refresh
            </button>
            <button onClick={handleLogout} className="btn btn-danger">
              🚪 Logout
            </button>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="status-bar">
          <div className={`status-indicator ${backendStatus}`}>
            Backend: {backendStatus === 'online' ? '🟢 Online' : '🔴 Offline'}
          </div>
        </div>

        {error && (
          <div className="error-banner">
            ❌ {error}
          </div>
        )}

        <div className="dashboard-grid">
          {/* User Information Card */}
          <div className="dashboard-card">
            <h2>👤 User Information</h2>
            {userInfo && (
              <div className="user-info">
                <div className="info-row">
                  <strong>ID:</strong> {userInfo.id}
                </div>
                <div className="info-row">
                  <strong>Role:</strong> 
                  <span className={`role-badge ${userInfo.role}`}>
                    {userInfo.role}
                  </span>
                </div>
                <div className="info-row">
                  <strong>Email:</strong> {userInfo.email}
                </div>
                <div className="info-row">
                  <strong>Token Expires:</strong> {userInfo.exp}
                </div>
              </div>
            )}
          </div>

          {/* API Response Card */}
          <div className="dashboard-card">
            <h2>🔒 Protected API Response</h2>
            <div className="api-response">
              <pre>{apiResponse}</pre>
            </div>
          </div>

          {/* Profile Data Card */}
          {profileData && (
            <div className="dashboard-card">
              <h2>📋 Profile Data</h2>
              <div className="profile-data">
                <pre>{JSON.stringify(profileData, null, 2)}</pre>
              </div>
            </div>
          )}

          {/* Quick Actions Card */}
          <div className="dashboard-card">
            <h2>⚡ Quick Actions</h2>
            <div className="quick-actions">
              <button 
                onClick={testProtectedAPI} 
                className="btn btn-secondary"
              >
                🔄 Test Protected API
              </button>
              <button 
                onClick={checkBackendHealth} 
                className="btn btn-info"
              >
                🏥 Check Backend Health
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard; 