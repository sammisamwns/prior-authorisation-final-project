import { useState, useEffect } from "react";
import { API_BASE_URL } from "../api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Stethoscope, Search, FileText, Clock, CheckCircle, AlertCircle, User, Building, Award, History, Calendar, Bot } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ProviderProfile {
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



interface ClaimRecord {
  claim_id: string;
  member_id: string;
  member_name: string;
  procedure: string;
  diagnosis: string;
  urgency: string;
  status: string;
  submitted_at: string;
  additional_notes: string;
}

interface Member {
  member_id: string;
  name: string;
  email: string;
  current_insurance_plan: string;
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

const ProviderPortal = () => {
  const [providerProfile, setProviderProfile] = useState<ProviderProfile | null>(null);
  const [claimsHistory, setClaimsHistory] = useState<ClaimRecord[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [insuranceSubscriptions, setInsuranceSubscriptions] = useState<InsuranceSubscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingClaims, setIsLoadingClaims] = useState(false);
  const [isSearchingMembers, setIsSearchingMembers] = useState(false);
  const [activeTab, setActiveTab] = useState("submit-claim");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [claimRequest, setClaimRequest] = useState({
    member_id: "",
    procedure: "",
    diagnosis: "",
    urgency: "routine",
    additionalNotes: "",
    subscription_id: ""
  });
  
  // New state for pending requests
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [isLoadingPendingRequests, setIsLoadingPendingRequests] = useState(false);
  const [selectedPendingRequest, setSelectedPendingRequest] = useState<any>(null);
  const [providerNotes, setProviderNotes] = useState("");
  const [isApprovingRequest, setIsApprovingRequest] = useState(false);
  
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProviderProfile();
  }, []);

  useEffect(() => {
    if (providerProfile?.profile.provider_id) {
      fetchClaimsHistory();
      fetchPendingRequests();
    }
  }, [providerProfile]);

  const fetchProviderProfile = async () => {
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


      // Fetch provider profile from backend
  const response = await fetch(`${API_BASE_URL}/provider/profile`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProviderProfile(data);
      } else {
        // Fallback to basic profile info from localStorage
        const fallbackProfile = {
          id: "1",
          email: localStorage.getItem("userEmail") || "",
          role: "provider",
          profile: {
            name: localStorage.getItem("userName") || "Dr. Provider",
            provider_id: "P001",
            role: "Doctor",
            network_type: "In Network",
            expertise: "General Practice"
          }
        };
        setProviderProfile(fallbackProfile);
      }
    } catch (error) {
      console.error('Error fetching provider profile:', error);
      // Fallback to basic profile info from localStorage
      const fallbackProfile = {
        id: "1",
        email: localStorage.getItem("userEmail") || "",
        role: "provider",
        profile: {
          name: localStorage.getItem("userName") || "Dr. Provider",
          provider_id: "P001",
          role: "Doctor",
          network_type: "In Network",
          expertise: "General Practice"
        }
      };
      setProviderProfile(fallbackProfile);
    } finally {
      setIsLoading(false);
    }
  };





  const fetchClaimsHistory = async () => {
    if (!providerProfile?.profile.provider_id) return;
    
    setIsLoadingClaims(true);
    try {
      const token = localStorage.getItem("authToken");
  const response = await fetch(`${API_BASE_URL}/claims/provider/${providerProfile.profile.provider_id}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setClaimsHistory(data.claims || []);
      } else {
        console.error('Failed to fetch claims history');
        toast({
          title: "Error",
          description: "Failed to load claims history.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching claims history:', error);
      toast({
        title: "Connection Error",
        description: "Unable to fetch claims history.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingClaims(false);
    }
  };

  const searchMembers = async (query: string) => {
    if (!query.trim()) {
      setMembers([]);
      return;
    }

    try {
      setIsSearchingMembers(true);
      const token = localStorage.getItem("authToken");
  const response = await fetch(`${API_BASE_URL}/member/search?q=${encodeURIComponent(query)}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMembers(data.data);
      }
    } catch (error) {
      console.error('Error searching members:', error);
    } finally {
      setIsSearchingMembers(false);
    }
  };

  const fetchMemberInsurancePlans = async (memberId: string) => {
    try {
      const token = localStorage.getItem("authToken");
  const response = await fetch(`${API_BASE_URL}/member/${memberId}/insurance-plans`, {
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
      console.error('Error fetching member insurance plans:', error);
    }
  };

  const handleMemberSelect = (memberId: string) => {
    setClaimRequest({ ...claimRequest, member_id: memberId });
    setMembers([]);
    setSearchQuery("");
    fetchMemberInsurancePlans(memberId);
  };

  const handleSubmitClaim = async () => {
    if (!claimRequest.member_id || !claimRequest.procedure || !claimRequest.diagnosis || !claimRequest.subscription_id) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields including Member ID and Insurance Plan.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("authToken");
  const response = await fetch(`${API_BASE_URL}/claims`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          member_id: claimRequest.member_id,
          provider_id: providerProfile?.profile.provider_id,
          procedure: claimRequest.procedure,
          diagnosis: claimRequest.diagnosis,
          urgency: claimRequest.urgency,
          additionalNotes: claimRequest.additionalNotes,
          subscription_id: claimRequest.subscription_id
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Claim Submitted",
          description: `Claim submitted successfully. Claim ID: ${data.claim_id}`,
        });
        
        // Reset form
        setClaimRequest({
          member_id: "",
          procedure: "",
          diagnosis: "",
          urgency: "routine",
          additionalNotes: "",
          subscription_id: ""
        });
        
        // Refresh claims history
        fetchClaimsHistory();
      } else {
        toast({
          title: "Submission Error",
          description: data.message || "Unable to submit claim.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error submitting claim:', error);
      toast({
        title: "Connection Error",
        description: "Unable to connect to the server.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // New functions for pending requests
  const fetchPendingRequests = async () => {
    try {
      setIsLoadingPendingRequests(true);
      const token = localStorage.getItem("authToken");
  const response = await fetch(`${API_BASE_URL}/provider/pending-requests`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPendingRequests(data.data || []);
      } else {
        console.error('Failed to fetch pending requests');
        toast({
          title: "Error",
          description: "Failed to load pending requests.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching pending requests:', error);
      toast({
        title: "Connection Error",
        description: "Unable to fetch pending requests.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPendingRequests(false);
    }
  };

  const handleApprovePendingRequest = async (requestId: string) => {
    if (!providerNotes.trim()) {
      toast({
        title: "Missing Information",
        description: "Please add provider notes before approving.",
        variant: "destructive",
      });
      return;
    }

    setIsApprovingRequest(true);
    try {
      const token = localStorage.getItem("authToken");
  const response = await fetch(`${API_BASE_URL}/provider/approve-pending-request`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          request_id: requestId,
          provider_notes: providerNotes
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Request Approved",
          description: `Request approved and submitted to insurance. Auth ID: ${data.auth_id}`,
        });
        
        // Reset form
        setProviderNotes("");
        setSelectedPendingRequest(null);
        
        // Refresh pending requests
        fetchPendingRequests();
      } else {
        toast({
          title: "Approval Error",
          description: data.message || "Unable to approve request.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error approving request:', error);
      toast({
        title: "Connection Error",
        description: "Unable to connect to the server.",
        variant: "destructive",
      });
    } finally {
      setIsApprovingRequest(false);
    }
  };

  const formatStatus = (status: string) => status.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

  if (isLoading) {
    return (
      <div className="w-full max-w-6xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-32 bg-gray-200 rounded-xl"></div>
          <div className="h-48 bg-gray-200 rounded-xl"></div>
          <div className="h-96 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      {/* Top Navigation */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Provider Dashboard</h1>
        <div className="flex space-x-2">
          <Button
            onClick={() => navigate('/ai-status')}
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
          >
            <Bot className="w-4 h-4" />
            <span>AI Status</span>
          </Button>
          <Button
            onClick={() => navigate('/profile/provider')}
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
          >
            <User className="w-4 h-4" />
            <span>Profile</span>
          </Button>
        </div>
      </div>
      {/* Provider Profile Card */}
      <Card className="bg-white shadow-lg border-0 rounded-2xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-green-500 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Stethoscope className="w-6 h-6" />
              </div>
              <div>
                <CardTitle className="text-xl">
                  {providerProfile?.profile.name || "Provider Profile"}
                </CardTitle>
                <CardDescription className="text-green-100">
                  {providerProfile?.profile.expertise} • {providerProfile?.profile.role}
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-col items-end space-y-2">
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                Provider ID: {providerProfile?.profile.provider_id}
              </Badge>
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                {providerProfile?.profile.network_type}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-green-50 rounded-xl">
              <User className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <div className="text-sm text-gray-600">Provider Name</div>
              <div className="text-lg font-semibold text-gray-900">{providerProfile?.profile.name}</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-xl">
              <Building className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <div className="text-sm text-gray-600">Specialty</div>
              <div className="text-lg font-semibold text-gray-900">{providerProfile?.profile.expertise}</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-xl">
              <Award className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <div className="text-sm text-gray-600">Network Status</div>
              <div className="text-lg font-semibold text-gray-900">{providerProfile?.profile.network_type}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab("submit-claim")}
          className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
            activeTab === "submit-claim"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Submit Claim</span>
        </button>
        <button
          onClick={() => setActiveTab("claims-history")}
          className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
            activeTab === "claims-history"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <History className="w-4 h-4" />
          <span>Claims History</span>
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
          <span>Pending Requests</span>
          {pendingRequests.length > 0 && (
            <Badge variant="secondary" className="ml-1 bg-red-100 text-red-800 text-xs">
              {pendingRequests.length}
            </Badge>
          )}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "submit-claim" && (
        <Card className="bg-white shadow-lg border-0 rounded-2xl">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle>Submit Claim Request</CardTitle>
                <CardDescription>
                  Submit a claim request on behalf of a member
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="member_search" className="text-sm font-medium text-gray-700">
                  Search Member *
                </Label>
                <div className="relative">
                  <Input
                    id="member_search"
                    placeholder="Search by member name or email"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      searchMembers(e.target.value);
                    }}
                    className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                  {isSearchingMembers && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    </div>
                  )}
                  {members.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {members.map((member) => (
                        <button
                          key={member.member_id}
                          type="button"
                          onClick={() => handleMemberSelect(member.member_id)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">{member.name}</div>
                          <div className="text-sm text-gray-600">{member.email}</div>
                          <div className="text-xs text-gray-500">ID: {member.member_id}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {claimRequest.member_id && (
                  <div className="text-sm text-green-600 mt-1">
                    Selected: {members.find(m => m.member_id === claimRequest.member_id)?.name || claimRequest.member_id}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="urgency" className="text-sm font-medium text-gray-700">
                  Urgency Level
                </Label>
                <select
                  id="urgency"
                  value={claimRequest.urgency}
                  onChange={(e) => setClaimRequest({ ...claimRequest, urgency: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="routine">Routine</option>
                  <option value="urgent">Urgent</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>
            </div>

            {claimRequest.member_id && insuranceSubscriptions.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="subscription_id" className="text-sm font-medium text-gray-700">
                  Insurance Plan *
                </Label>
                <select
                  id="subscription_id"
                  value={claimRequest.subscription_id}
                  onChange={(e) => setClaimRequest({ ...claimRequest, subscription_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select an insurance plan</option>
                  {insuranceSubscriptions.map((subscription) => (
                    <option key={subscription.subscription_id} value={subscription.subscription_id}>
                      {subscription.payer_name} - ${subscription.remaining_balance} remaining
                    </option>
                  ))}
                </select>
                {claimRequest.subscription_id && (
                  <div className="text-sm text-blue-600 mt-1">
                    Selected plan: {insuranceSubscriptions.find(s => s.subscription_id === claimRequest.subscription_id)?.payer_name}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="procedure" className="text-sm font-medium text-gray-700">
                Procedure *
              </Label>
              <Input
                id="procedure"
                placeholder="Enter procedure name"
                value={claimRequest.procedure}
                onChange={(e) => setClaimRequest({ ...claimRequest, procedure: e.target.value })}
                className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="diagnosis" className="text-sm font-medium text-gray-700">
                Diagnosis *
              </Label>
              <Textarea
                id="diagnosis"
                placeholder="Enter diagnosis and medical necessity"
                value={claimRequest.diagnosis}
                onChange={(e) => setClaimRequest({ ...claimRequest, diagnosis: e.target.value })}
                className="min-h-[100px] border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="additionalNotes" className="text-sm font-medium text-gray-700">
                Additional Notes
              </Label>
              <Textarea
                id="additionalNotes"
                placeholder="Any additional clinical information"
                value={claimRequest.additionalNotes}
                onChange={(e) => setClaimRequest({ ...claimRequest, additionalNotes: e.target.value })}
                className="min-h-[80px] border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <Button
              onClick={handleSubmitClaim}
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-medium py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Submitting Claim...
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5 mr-2" />
                  Submit Claim Request
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Claims History Tab */}
      {activeTab === "claims-history" && (
        <Card className="bg-white shadow-lg border-0 rounded-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <History className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle>Claims History</CardTitle>
                  <CardDescription>
                    View all claims submitted by your practice
                  </CardDescription>
                </div>
              </div>
              <Button
                onClick={fetchClaimsHistory}
                disabled={isLoadingClaims}
                variant="outline"
                size="sm"
              >
                {isLoadingClaims ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                ) : (
                  "Refresh"
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingClaims ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Loading claims history...</span>
              </div>
            ) : claimsHistory.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Claims Found</h3>
                <p className="text-gray-600">You haven't submitted any claims yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Claim ID</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Member ID</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Member Name</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Procedure</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Urgency</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {claimsHistory.map((claim) => (
                      <tr key={claim.claim_id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm font-mono text-blue-600">
                          {claim.claim_id.slice(-8)}
                        </td>
                        <td className="py-3 px-4 text-sm font-medium">
                          {claim.member_id}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {claim.member_name}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {claim.procedure}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <Badge
                            variant="secondary"
                            className={
                              claim.urgency === "emergency"
                                ? "bg-red-100 text-red-800"
                                : claim.urgency === "urgent"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-green-100 text-green-800"
                            }
                          >
                            {claim.urgency}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <Badge
                            variant="secondary"
                            className={
                              claim.status === "approved"
                                ? "bg-green-100 text-green-800"
                                : claim.status === "rejected"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                            }
                          >
                            {formatStatus(claim.status)}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>
                              {claim.submitted_at
                                ? new Date(claim.submitted_at).toLocaleDateString()
                                : "N/A"}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pending Requests Tab */}
      {activeTab === "pending-requests" && (
        <Card className="bg-white shadow-lg border-0 rounded-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle>Pending Requests</CardTitle>
                  <CardDescription>
                    Review and approve member requests before they are submitted to insurance
                  </CardDescription>
                </div>
              </div>
              <Button
                onClick={fetchPendingRequests}
                disabled={isLoadingPendingRequests}
                variant="outline"
                size="sm"
              >
                {isLoadingPendingRequests ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                ) : (
                  "Refresh"
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingPendingRequests ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Loading pending requests...</span>
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Requests</h3>
                <p className="text-gray-600">All member requests have been processed.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {pendingRequests.map((request) => (
                  <Card key={request.request_id} className="border-l-4 border-yellow-500">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">{request.procedure}</h4>
                          <p className="text-sm text-gray-600">{request.diagnosis}</p>
                          <div className="mt-2 space-y-1">
                            <p className="text-sm text-gray-500">
                              <strong>Member:</strong> {request.member_name} ({request.member_id})
                            </p>
                            <p className="text-sm text-gray-500">
                              <strong>Urgency:</strong> {request.urgency}
                            </p>
                            <p className="text-sm text-gray-500">
                              <strong>Submitted:</strong> {new Date(request.submitted_at).toLocaleDateString()}
                            </p>
                          </div>
                          {request.additional_notes && (
                            <div className="mt-3">
                              <p className="text-sm text-gray-600">
                                <strong>Additional Notes:</strong> {request.additional_notes}
                              </p>
                            </div>
                          )}
                          {request.member_notes && (
                            <div className="mt-2">
                              <p className="text-sm text-blue-600">
                                <strong>Member Notes:</strong> {request.member_notes}
                              </p>
                            </div>
                          )}
                        </div>
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                          Pending Review
                        </Badge>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor={`provider_notes_${request.request_id}`} className="text-sm font-medium text-gray-700">
                            Provider Notes *
                          </Label>
                          <Textarea
                            id={`provider_notes_${request.request_id}`}
                            placeholder="Add your clinical notes and recommendations..."
                            value={selectedPendingRequest?.request_id === request.request_id ? providerNotes : ""}
                            onChange={(e) => {
                              setSelectedPendingRequest(request);
                              setProviderNotes(e.target.value);
                            }}
                            rows={3}
                            className="mt-1 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                        
                        <div className="flex space-x-3">
                          <Button
                            onClick={() => handleApprovePendingRequest(request.request_id)}
                            disabled={isApprovingRequest || !providerNotes.trim() || selectedPendingRequest?.request_id !== request.request_id}
                            className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white"
                          >
                            {isApprovingRequest && selectedPendingRequest?.request_id === request.request_id ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Approving...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Approve & Submit to Insurance
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProviderPortal;