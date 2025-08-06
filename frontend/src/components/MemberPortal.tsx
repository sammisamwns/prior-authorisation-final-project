import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { User, Shield, FileText, Clock, CheckCircle, Calendar, DollarSign, Activity } from "lucide-react";

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
  };
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
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authRequest, setAuthRequest] = useState({
    procedure: "",
    diagnosis: "",
    provider: "",
    urgency: "routine",
    additionalNotes: ""
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchMemberData();
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
              {memberProfile?.profile.plan_type}
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
              <div className="text-sm text-gray-600">Claims History</div>
              <div className="text-xl font-bold text-gray-900">{memberProfile?.profile.claim_history.length}</div>
            </div>
          </div>
          
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Contact Information</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <div><strong>Address:</strong> {memberProfile?.profile.address}</div>
                <div><strong>Phone:</strong> {memberProfile?.profile.phone}</div>
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

      {/* Prior Authorization Request */}
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
    </div>
  );
};

export default MemberPortal;