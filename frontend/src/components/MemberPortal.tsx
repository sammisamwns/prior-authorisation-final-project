import { useState, useEffect, useRef } from "react";
import { API_BASE_URL } from "../api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  User, 
  Shield, 
  FileText, 
  Clock, 
  CheckCircle, 
  Calendar, 
  DollarSign, 
  Activity, 
  Bot,
  MessageCircle,
  Search,
  Sparkles,
  History,
  Building,
  CreditCard,
  TrendingUp,
  PieChart,
  BarChart3,
  AlertCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface MemberProfile {
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

interface InsurancePlan {
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

interface InsuranceSubscription {
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

interface Claim {
  claim_id: string;
  member_id: string;
  provider_id: string;
  medication_type: string;
  amount_reimbursed: number;
  remarks: string;
  status: string; 
  submitted_at?: string; 
  submitted_by?: string; // Added submitted_by field
}


const CLAIM_STATUSES = {
  approved: ["approved"],
  rejected: ["rejected"],
  under_review: ["pending", "under_review", "Pending Provider Approval"],
  all: [],
};

const MemberPortal = () => {
  const [memberProfile, setMemberProfile] = useState<MemberProfile | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [insurancePlans, setInsurancePlans] = useState<InsurancePlan[]>([]);
  const [insuranceSubscriptions, setInsuranceSubscriptions] = useState<InsuranceSubscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [authRequest, setAuthRequest] = useState({
    procedure: "",
    diagnosis: "",
    provider: "",
    urgency: "routine",
    additionalNotes: ""
  });
  // Claims history tabs
  const [claimsTab, setClaimsTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredClaims, setFilteredClaims] = useState<Claim[]>([]);
  const autocompleteTimeout = useRef<NodeJS.Timeout | null>(null);
  // Filter claims by tab and search
  useEffect(() => {
    let filtered = claims;
    if (claimsTab !== "all") {
      filtered = filtered.filter((c: any) => CLAIM_STATUSES[claimsTab].includes((c.status || "").replace(/_/g, " ")));
    }
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      filtered = filtered.filter((c: any) =>
        (c.claim_id && c.claim_id.toLowerCase().includes(term)) ||
        (c.provider_id && c.provider_id.toLowerCase().includes(term)) ||
        (c.provider_name && c.provider_name.toLowerCase().includes(term)) ||
        (c.medication_type && c.medication_type.toLowerCase().includes(term)) ||
        (c.status && c.status.replace(/_/g, " ").toLowerCase().includes(term))
      );
    }
    setFilteredClaims(filtered);
  }, [claims, claimsTab, searchTerm]);
  
  // New state for pending requests and AI features
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [isSearchingProviders, setIsSearchingProviders] = useState(false);
  const [pendingRequest, setPendingRequest] = useState({
    procedure: "",
    diagnosis: "",
    provider_info: "",
    urgency: "routine",
    additional_notes: "",
    member_notes: ""
  });
  const [isSubmittingPending, setIsSubmittingPending] = useState(false);
  
  // AI features state
  const [aiMessage, setAiMessage] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [autocompleteSuggestion, setAutocompleteSuggestion] = useState("");
  const [previousRequests, setPreviousRequests] = useState<any[]>([]);
  // Add a new state for the "Previous Claims" tab
  const [previousClaims, setPreviousClaims] = useState<Claim[]>([]);
  
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchMemberData();
    fetchInsurancePlans();
    fetchInsuranceSubscriptions();
    fetchPendingRequests();
    fetchPreviousRequests();
    // Call fetchPreviousClaims when the component loads
    fetchPreviousClaims();
  }, []);

  const fetchMemberData = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        toast({
          title: "Authentication Required",
          description: "Please log in to access your profile.",
          variant: "destructive",
        });
        return;
      }

      // Fetch member profile
      const profileResponse = await fetch(`${API_BASE_URL}/member/profile`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        setMemberProfile(profileData.data);
      } else {
        toast({
          title: "Profile Error",
          description: "Unable to fetch profile data.",
          variant: "destructive",
        });
      }

      // Fetch member prior auths
      const priorAuthResponse = await fetch(`${API_BASE_URL}/prior-auth`, { // Updated to fetch from prior_auth
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (priorAuthResponse.ok) {
        const priorAuthData = await priorAuthResponse.json();
        setClaims(priorAuthData.prior_auths || []);
      }

    } catch (error) {
      toast({
        title: "Connection Error",
        description: "Unable to connect to the server.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInsurancePlans = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      setIsLoadingPlans(true);
      const response = await fetch(`${API_BASE_URL}/payers/insurance-plans`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setInsurancePlans(data.data);
      }
    } catch (error) {
      console.error('Error fetching insurance plans:', error);
    } finally {
      setIsLoadingPlans(false);
    }
  };

  const fetchInsuranceSubscriptions = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/member/insurance-subscriptions`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setInsuranceSubscriptions(data.data);
      }
    } catch (error) {
      console.error('Error fetching insurance subscriptions:', error);
    }
  };

  const handleSubscribeToInsurance = async (payerId: string) => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/member/subscribe-insurance`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ payer_id: payerId }),
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Success",
          description: data.message,
        });
        fetchInsuranceSubscriptions();
        fetchMemberData();
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Connection Error",
        description: "Unable to subscribe to insurance plan.",
        variant: "destructive",
      });
    }
  };

  const handleSubmitAuthorization = async () => {
    if (!authRequest.procedure || !authRequest.diagnosis || !authRequest.provider) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${API_BASE_URL}/prior-auth`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          member_id: memberProfile?.profile.member_id,
          procedure: authRequest.procedure,
          diagnosis: authRequest.diagnosis,
          provider: authRequest.provider,
          urgency: authRequest.urgency,
          additionalNotes: authRequest.additionalNotes
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Authorization Submitted",
          description: `Request submitted successfully. Auth ID: ${data.auth_id}`,
        });
        
        // Reset form
        setAuthRequest({
          procedure: "",
          diagnosis: "",
          provider: "",
          urgency: "routine",
          additionalNotes: ""
        });
      } else {
        toast({
          title: "Submission Error",
          description: data.message || "Unable to submit authorization request.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Connection Error",
        description: "Unable to connect to the server.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // New functions for pending requests and AI features
  const fetchPendingRequests = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${API_BASE_URL}/pending-requests`, { // Updated to fetch from pending_requests
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPendingRequests(data.pending_requests || []);
      }
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    }
  };

  const searchProviders = async (query: string) => {
    if (!query.trim()) {
      setProviders([]);
      return;
    }

    try {
      setIsSearchingProviders(true);
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${API_BASE_URL}/provider/search?q=${encodeURIComponent(query)}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProviders(data.data || []);
      }
    } catch (error) {
      console.error('Error searching providers:', error);
    } finally {
      setIsSearchingProviders(false);
    }
  };

  const handleSubmitPendingRequest = async () => {
    if (!pendingRequest.procedure || !pendingRequest.diagnosis || !pendingRequest.provider_info) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingPending(true);

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${API_BASE_URL}/member/submit_pending_request`, { // Updated endpoint
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(pendingRequest),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Pending Request Submitted",
          description: `Request submitted successfully. Request ID: ${data.request_id}`,
        });
        
        // Reset form
        setPendingRequest({
          procedure: "",
          diagnosis: "",
          provider_info: "",
          urgency: "routine",
          additional_notes: "",
          member_notes: ""
        });
        
        // Refresh pending requests
        fetchPendingRequests();
      } else {
        toast({
          title: "Submission Error",
          description: data.message || "Unable to submit pending request.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Connection Error",
        description: "Unable to connect to the server.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingPending(false);
    }
  };

  const handleFormatDescription = async (rawInput: string) => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${API_BASE_URL}/ai/format-description`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw_input: rawInput }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.formatted;
      }
    } catch (error) {
      console.error('Error formatting description:', error);
    }
    return rawInput;
  };

  const handleGetAutocomplete = async (input: string) => {
    if (!input.trim()) {
      setAutocompleteSuggestion("");
      return;
    }
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${API_BASE_URL}/ai/autocomplete?input=${encodeURIComponent(input)}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (response.ok) {
        const data = await response.json();
        setAutocompleteSuggestion(data.suggestion || "");
      }
    } catch (error) {
      setAutocompleteSuggestion("");
    }
  };

  const handleHealthBuddyChat = async () => {
    if (!aiMessage.trim()) return;

    setIsAiLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${API_BASE_URL}/ai/health-buddy`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: aiMessage }),
      });

      if (response.ok) {
        const data = await response.json();
        setAiResponse(data.response);
        setAiMessage("");
      } else {
        toast({
          title: "AI Error",
          description: "Unable to get AI response.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Connection Error",
        description: "Unable to connect to AI service.",
        variant: "destructive",
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  // Fetch previous requests
  const fetchPreviousRequests = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${API_BASE_URL}/member/pending-requests`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPreviousRequests(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching previous requests:', error);
    }
  };

  // Fetch previous claims
  const fetchPreviousClaims = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${API_BASE_URL}/prior-auth`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPreviousClaims(data.prior_auths || []);
      }
    } catch (error) {
      console.error("Error fetching previous prior auths:", error);
    }
  };

  const formatStatus = (status: string) => status.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

  if (isLoading) {
    return (
      <div className="w-full max-w-6xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-32 bg-gray-200 rounded-xl"></div>
          <div className="h-96 bg-gray-200 rounded-xl"></div>
          <div className="h-64 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      {/* Top Navigation */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Member Dashboard</h1>
        <div className="flex space-x-2">
          
          <Button
            onClick={() => navigate('/profile/member')}
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
          >
            <User className="w-4 h-4" />
            <span>Profile</span>
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
            activeTab === "dashboard"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <User className="w-4 h-4" />
          <span>Dashboard</span>
        </button>
        <button
          onClick={() => setActiveTab("insurance-plans")}
          className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
            activeTab === "insurance-plans"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Insurance Plans</span>
        </button>
        <button
          onClick={() => setActiveTab("my-subscriptions")}
          className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
            activeTab === "my-subscriptions"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Subscriptions</span>
        </button>
        <button
          onClick={() => setActiveTab("pending-requests")}
          className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
            activeTab === "pending-requests"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Submit Request</span>
        </button>
        <button
          onClick={() => setActiveTab("health-buddy")}
          className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
            activeTab === "health-buddy"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          <span>AI Health Buddy</span>
        </button>
        {/* Add a new tab for "Previous Claims" */}
        <button
          onClick={() => setActiveTab("previous-claims")}
          className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
            activeTab === "previous-claims"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <History className="w-4 h-4" />
          <span>Previous Claims</span>
        </button>
      </div>
      {/* Tab Content */}
      {activeTab === "dashboard" && (
        <>
          {/* Member Profile Card */}
          <Card className="bg-white shadow-lg border-0 rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">
                      {memberProfile?.profile.name || "Member Profile"}
                    </CardTitle>
                    <CardDescription className="text-blue-100">
                      Member ID: {memberProfile?.profile.member_id}
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                  <Shield className="w-3 h-3 mr-1" />
                  {memberProfile?.profile.current_insurance_plan || memberProfile?.profile.plan_type}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center p-4 bg-blue-50 rounded-xl">
                  <DollarSign className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-sm text-gray-600">Deductible</div>
                  <div className="text-xl font-bold text-gray-900">${memberProfile?.profile.deductible}</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-xl">
                  <DollarSign className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <div className="text-sm text-gray-600">Co-pay</div>
                  <div className="text-xl font-bold text-gray-900">${memberProfile?.profile.co_pay}</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-xl">
                  <Calendar className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <div className="text-sm text-gray-600">Coverage Start</div>
                  <div className="text-lg font-semibold text-gray-900">{memberProfile?.profile.coverage_start}</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-xl">
                  <Activity className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                  <div className="text-sm text-gray-600">Total Reimbursed</div>
                  <div className="text-xl font-bold text-gray-900">${memberProfile?.profile.amount_reimbursed || 0}</div>
                </div>
              </div>
              
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Contact Information</h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div><strong>Address:</strong> {memberProfile?.profile.address}</div>
                    <div><strong>Phone:</strong> {memberProfile?.profile.phone}</div>
                    <div><strong>Insurance Validity:</strong> {memberProfile?.profile.insurance_validity || "Not set"}</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Health Conditions</h4>
                  <div className="flex flex-wrap gap-2">
                    {memberProfile?.profile.diseases.map((disease, index) => (
                      <Badge key={index} variant="outline" className="bg-gray-50">
                        {disease}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Previous Requests Section with Tabs and Search */}
          <Card className="bg-white shadow-lg border-0 rounded-2xl">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle>Previous Requests</CardTitle>
                  <CardDescription>
                    View your prior and current claim requests
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                <Button size="sm" variant={claimsTab === "all" ? "default" : "outline"} onClick={() => setClaimsTab("all")}>All</Button>
                <Button size="sm" variant={claimsTab === "approved" ? "default" : "outline"} onClick={() => setClaimsTab("approved")}>Approved</Button>
                <Button size="sm" variant={claimsTab === "rejected" ? "default" : "outline"} onClick={() => setClaimsTab("rejected")}>Rejected</Button>
                <Button size="sm" variant={claimsTab === "under_review" ? "default" : "outline"} onClick={() => setClaimsTab("under_review")}>Under Review</Button>
              </div>
              <div className="flex items-center mb-4 gap-2">
                <Input
                  placeholder="Search by claim id, provider id, name, type, status..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="max-w-xs"
                />
                <Button size="icon" variant="outline" onClick={() => setSearchTerm("")}> <Search className="w-4 h-4" /> </Button>
              </div>
              <div className="space-y-4">
                {filteredClaims.length > 0 ? (
                  filteredClaims.map((claim, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{claim.medication_type}</div>
                          <div className="text-sm text-gray-500">Claim ID: {claim.claim_id}</div>
                          <div className="text-xs text-gray-400">Provider: {claim.provider_id}</div>
                          <div className="text-xs text-gray-400">Status: {formatStatus(claim.status)}</div>
                          <div className="text-sm text-gray-500">
                            Submitted At: {claim.submitted_at && claim.submitted_at.$date ? new Date(claim.submitted_at.$date).toLocaleString() : "Invalid Date"}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">${claim.amount_reimbursed || 0}</div>
                        <div className="text-sm text-gray-500">Reimbursed</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No requests yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {activeTab === "insurance-plans" && (
        <Card className="bg-white shadow-lg border-0 rounded-2xl">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle>Available Insurance Plans</CardTitle>
                <CardDescription>
                  Browse and subscribe to insurance plans from various payers
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingPlans ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Loading insurance plans...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {insurancePlans.map((plan) => (
                  <Card key={plan.payer_id} className="border-2 hover:border-blue-300 transition-all duration-200">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{plan.name}</CardTitle>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          ${plan.unit_price}
                        </Badge>
                      </div>
                      <CardDescription>{plan.payer_name}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Coverage Types:</span>
                          <span className="font-medium">{plan.coverage_types.join(", ")}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Deductible:</span>
                          <span className="font-medium">${plan.deductible_amounts[0]}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Co-pay:</span>
                          <span className="font-medium">${plan.copay_amounts[0]}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Max Out-of-Pocket:</span>
                          <span className="font-medium">${plan.max_out_of_pocket}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Approval Rate:</span>
                          <span className="font-medium">{plan.approval_rate}%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Processing Time:</span>
                          <span className="font-medium">{plan.avg_processing_time}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Valid Until:</span>
                          <span className="font-medium">{plan.validity_date}</span>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleSubscribeToInsurance(plan.payer_id)}
                        className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                      >
                        Subscribe to Plan
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "my-subscriptions" && (
        <Card className="bg-white shadow-lg border-0 rounded-2xl">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle>My Insurance Subscriptions</CardTitle>
                <CardDescription>
                  View your current insurance subscriptions and coverage details
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {insuranceSubscriptions.length > 0 ? (
              <div className="space-y-4">
                {insuranceSubscriptions.map((subscription) => (
                  <Card key={subscription.subscription_id} className="border-2">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">{subscription.payer_name}</CardTitle>
                          <CardDescription>Subscription ID: {subscription.subscription_id}</CardDescription>
                        </div>
                        <Badge 
                          variant={subscription.status === 'active' ? 'default' : 'secondary'}
                          className={subscription.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                        >
                          {subscription.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className="text-sm text-gray-600">Coverage Amount</div>
                          <div className="text-lg font-bold text-blue-600">${subscription.coverage_amount}</div>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="text-sm text-gray-600">Amount Reimbursed</div>
                          <div className="text-lg font-bold text-green-600">${subscription.amount_reimbursed}</div>
                        </div>
                        <div className="text-center p-3 bg-purple-50 rounded-lg">
                          <div className="text-sm text-gray-600">Remaining Balance</div>
                          <div className="text-lg font-bold text-purple-600">${subscription.remaining_balance}</div>
                        </div>
                        <div className="text-center p-3 bg-orange-50 rounded-lg">
                          <div className="text-sm text-gray-600">Valid Until</div>
                          <div className="text-sm font-bold text-orange-600">{subscription.validity_date}</div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Deductible:</span>
                          <span className="font-medium">${subscription.deductible}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Co-pay:</span>
                          <span className="font-medium">${subscription.copay}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Coverage Scheme:</span>
                          <span className="font-medium">{subscription.coverage_scheme.join(", ")}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Subscriptions Found</h3>
                <p className="text-gray-600">You haven't subscribed to any insurance plans yet.</p>
                <Button
                  onClick={() => setActiveTab("insurance-plans")}
                  className="mt-4 bg-blue-600 hover:bg-blue-700"
                >
                  Browse Insurance Plans
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "submit-request" && (
        <Card className="bg-white shadow-lg border-0 rounded-2xl">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle>Submit Prior Authorization Request</CardTitle>
                <CardDescription>
                  AI-powered authorization processing for faster approvals
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="procedure" className="text-sm font-medium text-gray-700">
                  Procedure/Treatment *
                </Label>
                <div className="relative">
                  <Input
                    id="procedure"
                    placeholder="e.g., MRI Scan, Physical Therapy"
                    value={authRequest.procedure}
                    onChange={e => {
                      setAuthRequest({ ...authRequest, procedure: e.target.value });
                      if (autocompleteTimeout.current) clearTimeout(autocompleteTimeout.current);
                      autocompleteTimeout.current = setTimeout(() => handleGetAutocomplete(e.target.value), 400);
                    }}
                    className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                  {autocompleteSuggestion && authRequest.procedure && (
                    <div className="absolute left-0 right-0 bg-white border border-gray-200 rounded shadow mt-1 z-10 cursor-pointer p-2 text-sm text-gray-700" onClick={() => setAuthRequest({ ...authRequest, procedure: autocompleteSuggestion })}>
                      <Sparkles className="inline w-4 h-4 mr-1 text-blue-400" />
                      {autocompleteSuggestion}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="diagnosis" className="text-sm font-medium text-gray-700">
                  Primary Diagnosis *
                </Label>
                <div className="relative">
                  <Input
                    id="diagnosis"
                    placeholder="e.g., Lower Back Pain, Shoulder Injury"
                    value={authRequest.diagnosis}
                    onChange={e => {
                      setAuthRequest({ ...authRequest, diagnosis: e.target.value });
                      if (autocompleteTimeout.current) clearTimeout(autocompleteTimeout.current);
                      autocompleteTimeout.current = setTimeout(() => handleGetAutocomplete(e.target.value), 400);
                    }}
                    className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                  {autocompleteSuggestion && authRequest.diagnosis && (
                    <div className="absolute left-0 right-0 bg-white border border-gray-200 rounded shadow mt-1 z-10 cursor-pointer p-2 text-sm text-gray-700" onClick={() => setAuthRequest({ ...authRequest, diagnosis: autocompleteSuggestion })}>
                      <Sparkles className="inline w-4 h-4 mr-1 text-blue-400" />
                      {autocompleteSuggestion}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="provider" className="text-sm font-medium text-gray-700">
                  Healthcare Provider *
                </Label>
                <Input
                  id="provider"
                  placeholder="Provider name and facility"
                  value={authRequest.provider}
                  onChange={(e) => setAuthRequest({...authRequest, provider: e.target.value})}
                  className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="urgency" className="text-sm font-medium text-gray-700">
                  Request Urgency
                </Label>
                <select
                  className="w-full p-3 border border-gray-200 rounded-lg bg-white focus:border-blue-500 focus:ring-blue-500"
                  value={authRequest.urgency}
                  onChange={(e) => setAuthRequest({...authRequest, urgency: e.target.value})}
                >
                  <option value="routine">Routine (5-7 days)</option>
                  <option value="urgent">Urgent (1-2 days)</option>
                  <option value="emergency">Emergency (Same day)</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-medium text-gray-700">
                Additional Notes
              </Label>
              <div className="relative">
                <Textarea
                  id="notes"
                  placeholder="Any additional information about your request..."
                  value={authRequest.additionalNotes}
                  onChange={e => {
                    setAuthRequest({ ...authRequest, additionalNotes: e.target.value });
                    if (autocompleteTimeout.current) clearTimeout(autocompleteTimeout.current);
                    autocompleteTimeout.current = setTimeout(() => handleGetAutocomplete(e.target.value), 400);
                  }}
                  rows={3}
                  className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
                {autocompleteSuggestion && authRequest.additionalNotes && (
                  <div className="absolute left-0 right-0 bg-white border border-gray-200 rounded shadow mt-1 z-10 cursor-pointer p-2 text-sm text-gray-700" onClick={() => setAuthRequest({ ...authRequest, additionalNotes: autocompleteSuggestion })}>
                    <Sparkles className="inline w-4 h-4 mr-1 text-blue-400" />
                    {autocompleteSuggestion}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Clock className="w-4 h-4" />
                <span>AI processing typically takes 15-30 minutes</span>
              </div>
              <Button
                onClick={handleSubmitAuthorization}
                disabled={isSubmitting}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium px-6 py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Submit for AI Review
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Requests Tab */}
      {activeTab === "pending-requests" && (
        <Card className="bg-white shadow-lg border-0 rounded-2xl">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle>Submit Claim Request for Provider Approval</CardTitle>
                <CardDescription>
                  Track requests that need provider approval before being processed by insurance.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pending_procedure" className="text-sm font-medium text-gray-700">
                  Procedure/Treatment *
                </Label>
                <Input
                  id="pending_procedure"
                  placeholder="e.g., MRI Scan, Physical Therapy"
                  value={pendingRequest.procedure}
                  onChange={(e) => setPendingRequest({...pendingRequest, procedure: e.target.value})}
                  className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pending_diagnosis" className="text-sm font-medium text-gray-700">
                  Primary Diagnosis *
                </Label>
                <Input
                  id="pending_diagnosis"
                  placeholder="e.g., Lower Back Pain, Shoulder Injury"
                  value={pendingRequest.diagnosis}
                  onChange={(e) => setPendingRequest({...pendingRequest, diagnosis: e.target.value})}
                  className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="provider_search" className="text-sm font-medium text-gray-700">
                  Provider (ID, Name, or Email) *
                </Label>
                <div className="relative">
                  <Input
                    id="provider_search"
                    placeholder="Search provider by ID, name, or email"
                    value={pendingRequest.provider_info}
                    onChange={(e) => {
                      setPendingRequest({...pendingRequest, provider_info: e.target.value});
                      searchProviders(e.target.value);
                    }}
                    
                    className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                  {isSearchingProviders && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    </div>
                  )}
                  {providers.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {providers.map((provider) => (
                        <button
                          key={provider.provider_id}
                          type="button"
                          onClick={() => {
                            setPendingRequest({...pendingRequest, provider_info: provider.provider_id});
                            setProviders([]);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">{provider.name}</div>
                          <div className="text-sm text-gray-600">{provider.email}</div>
                          <div className="text-xs text-gray-500">ID: {provider.provider_id}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pending_urgency" className="text-sm font-medium text-gray-700">
                  Request Urgency
                </Label>
                <select
                  className="w-full p-3 border border-gray-200 rounded-lg bg-white focus:border-blue-500 focus:ring-blue-500"
                  value={pendingRequest.urgency}
                  onChange={(e) => setPendingRequest({...pendingRequest, urgency: e.target.value})}
                >
                  <option value="routine">Routine (5-7 days)</option>
                  <option value="urgent">Urgent (1-2 days)</option>
                  <option value="emergency">Emergency (Same day)</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="member_notes" className="text-sm font-medium text-gray-700">
                Notes for Provider
              </Label>
              <Textarea
                id="member_notes"
                placeholder="Any specific notes or requests for the provider..."
                value={pendingRequest.member_notes}
                onChange={(e) => setPendingRequest({...pendingRequest, member_notes: e.target.value})}
                rows={2}
                className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pending_notes" className="text-sm font-medium text-gray-700">
                Additional Notes
              </Label>
              <Textarea
                id="pending_notes"
                placeholder="Any additional information about your request..."
                value={pendingRequest.additional_notes}
                onChange={(e) => setPendingRequest({...pendingRequest, additional_notes: e.target.value})}
                rows={3}
                className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <Button
              onClick={handleSubmitPendingRequest}
              disabled={isSubmittingPending}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white font-medium py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              {isSubmittingPending ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Submitting Request...
                </>
              ) : (
                <>
                  <Clock className="w-5 h-5 mr-2" />
                  Submit for Provider Review
                </>
              )}
            </Button>

            {/* Pending Requests List */}
            {pendingRequests.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Pending Requests</h3>
                <div className="space-y-4">
                  {pendingRequests.map((request) => (
                    <Card key={request.request_id} className="border-l-4 border-yellow-500">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold text-gray-900">{request.procedure}</h4>
                            <p className="text-sm text-gray-600">{request.diagnosis}</p>
                            <p className="text-sm text-gray-500">Provider: {request.provider_name}</p>
                            <p className="text-sm text-gray-500">Status: {formatStatus(request.status)}</p>
                          </div>
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                            Pending
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* AI Health Buddy Tab */}
      {activeTab === "health-buddy" && (
        <Card className="bg-white shadow-lg border-0 rounded-2xl">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle>AI Health Buddy</CardTitle>
                <CardDescription>
                  Get personalized health advice and recommendations based on your medical history
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="ai_message" className="text-sm font-medium text-gray-700">
                Ask your health buddy
              </Label>
              <div className="flex space-x-2">
                <Textarea
                  id="ai_message"
                  placeholder="Ask about symptoms, treatments, or get health recommendations..."
                  value={aiMessage}
                  onChange={(e) => setAiMessage(e.target.value)}
                  rows={3}
                  className="flex-1 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
                <Button
                  onClick={handleHealthBuddyChat}
                  disabled={isAiLoading || !aiMessage.trim()}
                  className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white"
                >
                  {isAiLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <MessageCircle className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {aiResponse && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">AI Response:</h4>
                <p className="text-blue-800 whitespace-pre-wrap">{aiResponse}</p>
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">Suggested Questions:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAiMessage("What are the best exercises for lower back pain?")}
                  className="text-left justify-start"
                >
                  Best exercises for lower back pain?
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAiMessage("What should I do for persistent headaches?")}
                  className="text-left justify-start"
                >
                  Help with persistent headaches
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAiMessage("What are the symptoms of diabetes?")}
                  className="text-left justify-start"
                >
                  Diabetes symptoms to watch for
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAiMessage("How can I improve my sleep quality?")}
                  className="text-left justify-start"
                >
                  Tips for better sleep
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Previous Requests Tab */}
      {activeTab === "previous-requests" && (
        <Card className="bg-white shadow-lg border-0 rounded-2xl">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-gray-500 to-gray-700 rounded-full flex items-center justify-center">
                <History className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle>Previous Requests</CardTitle>
                <CardDescription>
                  View the history of all your previously submitted requests.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {previousRequests.length > 0 ? (
              <div className="space-y-4">
                {previousRequests.map((request) => (
                  <Card key={request.request_id} className="border-l-4 border-gray-500">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-gray-900">{request.procedure}</h4>
                          <p className="text-sm text-gray-600">{request.diagnosis}</p>
                          <p className="text-sm text-gray-500">Provider: {request.provider_name}</p>
                          <p className="text-sm text-gray-500">Status: {formatStatus(request.status)}</p>
                          <p className="text-sm text-gray-500">
                            Submitted At: {request.submitted_at && request.submitted_at.$date ? new Date(request.submitted_at.$date).toLocaleString() : "Invalid Date"}
                          </p>
                        </div>
                        <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                          {request.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Previous Requests</h3>
                <p className="text-gray-600">You haven't submitted any requests yet.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Previous Claims Tab */}
      {activeTab === "previous-claims" && (
        <Card className="bg-white shadow-lg border-0 rounded-2xl">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-gray-500 to-gray-700 rounded-full flex items-center justify-center">
                <History className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle>Previous Claims</CardTitle>
                <CardDescription>
                  View the history of all your submitted prior auth requests along with their status and creation date.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {previousClaims.length > 0 ? (
              <div className="space-y-4">
                {previousClaims.map((auth) => (
                  <Card key={auth.claim_id} className="border-l-4 border-gray-500">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-gray-900">{auth.medication_type}</h4>
                          <p className="text-sm text-gray-600">Auth ID: {auth.claim_id}</p>
                          <p className="text-sm text-gray-500">Status: {formatStatus(auth.status)}</p>
                          <p className="text-sm text-gray-500">
                            Created At: {auth.submitted_at && auth.submitted_at.$date ? new Date(auth.submitted_at.$date).toLocaleString() : "Invalid Date"}
                          </p>
                        </div>
                        <Badge
                          variant="secondary"
                          className={`${
                            auth.status === "approved"
                              ? "bg-green-100 text-green-800"
                              : auth.status === "rejected"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {formatStatus(auth.status)}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Previous Prior Auths</h3>
                <p className="text-gray-600">You haven't submitted any prior auth requests yet.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MemberPortal;