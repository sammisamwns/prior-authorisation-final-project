import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Stethoscope, Search, FileText, Clock, CheckCircle, AlertCircle, User, Building, Award } from "lucide-react";

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

interface MemberData {
  profile: {
    name: string;
    member_id: string;
    plan_type: string;
    coverage_start: string;
    deductible: number;
    co_pay: number;
  };
}

const ProviderPortal = () => {
  const [providerProfile, setProviderProfile] = useState<ProviderProfile | null>(null);
  const [memberData, setMemberData] = useState<MemberData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMemberId, setSearchMemberId] = useState("");
  
  const [authRequest, setAuthRequest] = useState({
    procedure: "",
    diagnosis: "",
    urgency: "routine",
    additionalNotes: ""
  });
  
  const { toast } = useToast();

  useEffect(() => {
    fetchProviderProfile();
  }, []);

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

      // For demo purposes, we'll create a mock provider profile
      // In a real implementation, this would come from the backend
      const mockProviderProfile = {
        id: "1",
        email: localStorage.getItem("userEmail") || "",
        role: "provider",
        profile: {
          name: localStorage.getItem("userName") || "Dr. Provider",
          provider_id: "P001",
          role: "Doctor",
          network_type: "In Network",
          expertise: "Cardiology"
        }
      };

      setProviderProfile(mockProviderProfile);
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

  const searchMemberData = async () => {
    if (!searchMemberId.trim()) {
      toast({
        title: "Missing Member ID",
        description: "Please enter a member ID to search.",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);

    try {
      // Simulate member data fetch - in real implementation, this would be a separate endpoint
      // For demo purposes, we'll use mock data based on the backend structure
      const mockMemberData = {
        profile: {
          name: "John Doe",
          member_id: searchMemberId,
          plan_type: "Premium",
          coverage_start: "2024-01-01",
          deductible: 500,
          co_pay: 25
        }
      };

      setMemberData(mockMemberData);
      
      toast({
        title: "Member Found",
        description: `Successfully retrieved data for member ${searchMemberId}`,
      });
      
    } catch (error) {
      toast({
        title: "Search Error",
        description: "Unable to find member data.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmitAuthorization = async () => {
    if (!authRequest.procedure || !authRequest.diagnosis || !memberData) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields and search for a member.",
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
          member_id: memberData.profile.member_id,
          provider: providerProfile?.profile.name,
          procedure: authRequest.procedure,
          diagnosis: authRequest.diagnosis,
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
          urgency: "routine",
          additionalNotes: ""
        });
        setMemberData(null);
        setSearchMemberId("");
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
          <div className="h-48 bg-gray-200 rounded-xl"></div>
          <div className="h-96 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
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

      {/* Member Search Card */}
      <Card className="bg-white shadow-lg border-0 rounded-2xl">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <Search className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle>Patient Member Lookup</CardTitle>
              <CardDescription>
                Search for patient using their insurance member ID
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <div className="flex-1">
              <Label htmlFor="memberId" className="text-sm font-medium text-gray-700">Member ID</Label>
              <Input
                id="memberId"
                placeholder="Enter patient's member ID"
                value={searchMemberId}
                onChange={(e) => setSearchMemberId(e.target.value)}
                className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={searchMemberData}
                disabled={isSearching}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium px-6 py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                {isSearching ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Search
                  </>
                )}
              </Button>
            </div>
          </div>

          {memberData && (
            <div className="mt-6 p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200">
              <div className="flex items-center space-x-2 mb-4">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-800">Member Found</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-white rounded-lg">
                  <div className="text-sm text-gray-600">Name</div>
                  <div className="font-semibold text-gray-900">{memberData.profile.name}</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg">
                  <div className="text-sm text-gray-600">Plan Type</div>
                  <div className="font-semibold text-gray-900">{memberData.profile.plan_type}</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg">
                  <div className="text-sm text-gray-600">Deductible</div>
                  <div className="font-semibold text-gray-900">${memberData.profile.deductible}</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg">
                  <div className="text-sm text-gray-600">Co-pay</div>
                  <div className="font-semibold text-gray-900">${memberData.profile.co_pay}</div>
                </div>
              </div>
            </div>
          )}
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
                AI-powered clinical review and authorization processing
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {!memberData && (
            <div className="flex items-center space-x-2 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <span className="text-sm text-yellow-800">Please search for a patient member first</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="procedure" className="text-sm font-medium text-gray-700">
                Procedure/Treatment *
              </Label>
              <Input
                id="procedure"
                placeholder="e.g., MRI Lumbar Spine, Physical Therapy"
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
                placeholder="e.g., Lumbar Disc Herniation"
                value={authRequest.diagnosis}
                onChange={(e) => setAuthRequest({...authRequest, diagnosis: e.target.value})}
                className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="urgency" className="text-sm font-medium text-gray-700">
              Request Priority
            </Label>
            <select
              className="w-full p-3 border border-gray-200 rounded-lg bg-white focus:border-blue-500 focus:ring-blue-500"
              value={authRequest.urgency}
              onChange={(e) => setAuthRequest({...authRequest, urgency: e.target.value})}
            >
              <option value="routine">Routine (5-7 business days)</option>
              <option value="urgent">Urgent (1-2 business days)</option>
              <option value="emergency">Emergency (Same day)</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium text-gray-700">
              Clinical Notes
            </Label>
            <Textarea
              id="notes"
              placeholder="Describe the medical necessity and clinical reasoning for this procedure..."
              value={authRequest.additionalNotes}
              onChange={(e) => setAuthRequest({...authRequest, additionalNotes: e.target.value})}
              rows={4}
              className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-between pt-4">
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              <span>AI clinical review typically takes 15-30 minutes</span>
            </div>
            <Button
              onClick={handleSubmitAuthorization}
              disabled={isSubmitting || !memberData}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium px-6 py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50"
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

export default ProviderPortal;