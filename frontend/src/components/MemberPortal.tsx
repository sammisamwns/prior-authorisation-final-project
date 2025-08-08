import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { User, Shield, FileText, Clock, CheckCircle, Calendar, DollarSign, Activity, Bot } from "lucide-react";
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
}

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
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchMemberData();
    fetchInsurancePlans();
    fetchInsuranceSubscriptions();
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
      const profileResponse = await fetch("http://127.0.0.1:5000/member/profile", {
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

      // Fetch member claims
      const claimsResponse = await fetch("http://127.0.0.1:5000/member/claims", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (claimsResponse.ok) {
        const claimsData = await claimsResponse.json();
        setClaims(claimsData.data);
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
      const response = await fetch("http://127.0.0.1:5000/payers/insurance-plans", {
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

      const response = await fetch("http://127.0.0.1:5000/member/insurance-subscriptions", {
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

      const response = await fetch("http://127.0.0.1:5000/member/subscribe-insurance", {
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
      const response = await fetch("http://127.0.0.1:5000/prior-auth", {
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
            onClick={() => navigate('/ai-status')}
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
          >
            <Bot className="w-4 h-4" />
            <span>AI Status</span>
          </Button>
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
          <span>My Subscriptions</span>
        </button>
        <button
          onClick={() => setActiveTab("submit-request")}
          className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
            activeTab === "submit-request"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          <span>Submit Request</span>
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

          {/* Claims History */}
          <Card className="bg-white shadow-lg border-0 rounded-2xl">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle>Claims History</CardTitle>
                  <CardDescription>
                    Recent healthcare claims and reimbursements
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {claims.length > 0 ? (
                  claims.slice(0, 5).map((claim, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{claim.medication_type}</div>
                          <div className="text-sm text-gray-500">Claim ID: {claim.claim_id}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">${claim.amount_reimbursed}</div>
                        <div className="text-sm text-gray-500">Reimbursed</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No claims history available
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
                <Input
                  id="procedure"
                  placeholder="e.g., MRI Scan, Physical Therapy"
                  value={authRequest.procedure}
                  onChange={(e) => setAuthRequest({...authRequest, procedure: e.target.value})}
                  className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="diagnosis" className="text-sm font-medium text-gray-700">
                  Primary Diagnosis *
                </Label>
                <Input
                  id="diagnosis"
                  placeholder="e.g., Lower Back Pain, Shoulder Injury"
                  value={authRequest.diagnosis}
                  onChange={(e) => setAuthRequest({...authRequest, diagnosis: e.target.value})}
                  className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
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
              <Textarea
                id="notes"
                placeholder="Any additional information about your request..."
                value={authRequest.additionalNotes}
                onChange={(e) => setAuthRequest({...authRequest, additionalNotes: e.target.value})}
                rows={3}
                className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              />
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
    </div>
  );
};

export default MemberPortal;