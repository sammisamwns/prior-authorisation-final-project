import axios, { AxiosResponse } from 'axios';

// Types for API requests and responses
export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
}

export interface MemberProfile {
  id: string;
  email: string;
  role: string;
  profile: {
    name: string;
    member_id: string;
    plan_type: string;
    coverage_start: string;
    deductible: number;
    co_pay: number;
    address: string;
    phone: string;
    diseases: string[];
    claim_history: string[];
    amount_reimbursed: number;
    current_insurance_plan: string;
    insurance_validity: string;
  };
}

export interface ProviderProfile {
  id: string;
  email: string;
  role: string;
  profile: {
    name: string;
    provider_id: string;
    role: string;
    network_type: string;
    expertise: string;
  };
}

export interface PriorAuthRequest {
  member_id: string;
  procedure: string;
  diagnosis: string;
  provider: string;
  urgency: string;
  additionalNotes: string;
}

export interface PendingRequest {
  request_id: string;
  member_id: string;
  member_name: string;
  member_email: string;
  provider_id: string;
  provider_name: string;
  provider_email: string;
  procedure: string;
  diagnosis: string;
  urgency: string;
  additional_notes: string;
  status: string;
  submitted_at: string;
  member_notes: string;
}

export interface InsurancePlan {
  payer_id: string;
  name: string;
  payer_name: string;
  unit_price: number;
  coverage_types: string[];
  deductible_amounts: number[];
  copay_amounts: number[];
  max_out_of_pocket: number;
  approval_rate: number;
  avg_processing_time: string;
  validity_date: string;
}

export interface InsuranceSubscription {
  subscription_id: string;
  member_id: string;
  member_name: string;
  payer_id: string;
  payer_name: string;
  unit_price: number;
  coverage_amount: number;
  amount_paid: number;
  amount_reimbursed: number;
  remaining_balance: number;
  validity_date: string;
  coverage_scheme: string[];
  deductible: number;
  copay: number;
  status: string;
  subscription_date: string;
  claims_history: string[];
}

export interface Claim {
  claim_id: string;
  member_id: string;
  provider_id: string;
  medication_type: string;
  amount_reimbursed: number;
  remarks: string;
}

export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  status?: string;
}

// API Configuration
export const API_BASE_URL = 'http://localhost:5000';
// const API_BASE_URL = 'https://c5q5p26b-5000.inc1.devtunnels.ms/';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 errors
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userId');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Authentication APIs
export const loginUser = async (credentials: LoginCredentials): Promise<ApiResponse> => {
  const response = await api.post('/login', credentials);
  return response.data;
};

export const registerUser = async (credentials: RegisterCredentials): Promise<ApiResponse> => {
  const response = await api.post('/register', credentials);
  return response.data;
};

// Profile APIs
export const getMemberProfile = async (): Promise<ApiResponse<MemberProfile>> => {
  const response = await api.get('/member/profile');
  return response.data;
};

export const getProviderProfile = async (): Promise<ApiResponse<ProviderProfile>> => {
  const response = await api.get('/provider/profile');
  return response.data;
};

// Prior Authorization APIs
export const submitPriorAuth = async (request: PriorAuthRequest): Promise<ApiResponse> => {
  const response = await api.post('/prior-auth', request);
  return response.data;
};

export const getMemberClaims = async (): Promise<ApiResponse<Claim[]>> => {
  const response = await api.get('/member/claims');
  return response.data;
};

export const getDashboardData = async (): Promise<ApiResponse> => {
  const response = await api.get('/dashboard');
  return response.data;
};

export const healthCheck = async (): Promise<ApiResponse> => {
  const response = await api.get('/health');
  return response.data;
};

// AI-Powered APIs
export const autoReviewPriorAuth = async (authId: string): Promise<ApiResponse> => {
  const response = await api.post('/ai/auto-review', { auth_id: authId });
  return response.data;
};

export const formatDescription = async (rawInput: string): Promise<ApiResponse> => {
  const response = await api.post('/ai/format-description', { raw_input: rawInput });
  return response.data;
};

export const getAutocomplete = async (input: string): Promise<ApiResponse> => {
  const response = await api.get(`/ai/autocomplete?input=${encodeURIComponent(input)}`);
  return response.data;
};

export const healthBuddyChat = async (message: string): Promise<ApiResponse> => {
  const response = await api.post('/ai/health-buddy', { message });
  return response.data;
};

// Member-Provider Interaction APIs
export const submitPendingRequest = async (request: {
  procedure: string;
  diagnosis: string;
  provider_info: string;
  urgency: string;
  additional_notes?: string;
  member_notes?: string;
}): Promise<ApiResponse> => {
  const response = await api.post('/member/submit-pending-request', request);
  return response.data;
};

export const getMemberPendingRequests = async (): Promise<ApiResponse<PendingRequest[]>> => {
  const response = await api.get('/member/pending-requests');
  return response.data;
};

export const getProviderPendingRequests = async (): Promise<ApiResponse<PendingRequest[]>> => {
  const response = await api.get('/provider/pending-requests');
  return response.data;
};

export const approvePendingRequest = async (requestId: string, providerNotes?: string): Promise<ApiResponse> => {
  const response = await api.post('/provider/approve-pending-request', {
    request_id: requestId,
    provider_notes: providerNotes || ''
  });
  return response.data;
};

export const searchProviders = async (query: string): Promise<ApiResponse> => {
  const response = await api.get(`/provider/search?q=${encodeURIComponent(query)}`);
  return response.data;
};

// Insurance APIs
export const getInsurancePlans = async (): Promise<ApiResponse<InsurancePlan[]>> => {
  const response = await api.get('/member/insurance-plans');
  return response.data;
};

export const getInsuranceSubscriptions = async (): Promise<ApiResponse<InsuranceSubscription[]>> => {
  const response = await api.get('/member/insurance-subscriptions');
  return response.data;
};

export const subscribeToInsurance = async (payerId: string): Promise<ApiResponse> => {
  const response = await api.post('/member/subscribe-insurance', { payer_id: payerId });
  return response.data;
};

// Claims APIs
export const submitClaim = async (claim: {
  member_id: string;
  provider_id: string;
  procedure: string;
  diagnosis: string;
  urgency: string;
  additionalNotes?: string;
  subscription_id: string;
}): Promise<ApiResponse> => {
  const response = await api.post('/claims', claim);
  return response.data;
};

export const getProviderClaims = async (providerId: string): Promise<ApiResponse> => {
  const response = await api.get(`/claims/provider/${providerId}`);
  return response.data;
};

// Legacy API for backward compatibility
export const callProtectedAPI = async (): Promise<ApiResponse> => {
  const response = await api.get('/dashboard');
  return response.data;
};

export default api;
