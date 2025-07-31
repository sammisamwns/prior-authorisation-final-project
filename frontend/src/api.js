import axios from 'axios';

// Base URL for the Flask backend
const API_BASE_URL = 'http://localhost:5000';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token to all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jwt');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle authentication errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token is invalid or expired
      localStorage.removeItem('jwt');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API functions
export const callProtectedAPI = async () => {
  try {
    const response = await api.post('/prior-auth');
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || 'Server error';
  }
};

export const getMemberProfile = async () => {
  try {
    const response = await api.get('/member/profile');
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to fetch member profile';
  }
};

export const getProviderProfile = async () => {
  try {
    const response = await api.get('/provider/profile');
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to fetch provider profile';
  }
};

export const generateToken = async (userData) => {
  try {
    const response = await api.post('/auth/token', userData);
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to generate token';
  }
};

export const healthCheck = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || 'Backend is not available';
  }
};

export default api; 