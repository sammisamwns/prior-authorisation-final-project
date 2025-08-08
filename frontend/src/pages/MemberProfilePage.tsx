import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, User, Shield, Eye, EyeOff, FileText, DollarSign, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface MemberProfile {
  name: string;
  email: string;
  user_type: string;
  member_id: string;
}

interface InsurancePlan {
  payer_name: string;
  payer_id: string;
  unit_subscription_price: number;
  maximum_covered_amount: number;
  total_claims_made: number;
  amount_paid: number;
  balance_left: number;
  insurance_category: string;
  coverage_start: string;
  deductible: number;
  co_pay: number;
}

interface Claim {
  claim_id: string;
  provider_id: string;
  provider_name: string;
  procedure: string;
  diagnosis: string;
  urgency: string;
  status: string;
  submitted_at: string;
  amount_reimbursed: number;
}

const MemberProfilePage = () => {
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [insurancePlans, setInsurancePlans] = useState<InsurancePlan[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [newEmail, setNewEmail] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();
  const token = localStorage.getItem("authToken");

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      
      // Fetch profile
      const profileResponse = await fetch('http://127.0.0.1:5000/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        setProfile(profileData);
        setNewEmail(profileData.email);
      }

      // Fetch insurance plans
      const insuranceResponse = await fetch('http://127.0.0.1:5000/member/insurance-plans', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (insuranceResponse.ok) {
        const insuranceData = await insuranceResponse.json();
        setInsurancePlans(insuranceData.data || []);
      }

      // Fetch claims
      const claimsResponse = await fetch('http://127.0.0.1:5000/member/claims', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (claimsResponse.ok) {
        const claimsData = await claimsResponse.json();
        setClaims(claimsData.data || []);
      }

    } catch (error) {
      console.error('Error fetching profile data:', error);
      toast({
        title: "Error",
        description: "Failed to load profile data.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast({
        title: "Missing Information",
        description: "Please fill in all password fields.",
        variant: "destructive"
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New password and confirmation do not match.",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch('http://127.0.0.1:5000/profile/update-password', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          current_password: passwordData.currentPassword,
          new_password: passwordData.newPassword
        })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Password updated successfully."
        });
        setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
        setShowPasswordChange(false);
      } else {
        const data = await response.json();
        toast({
          title: "Error",
          description: data.message || "Failed to update password.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Connection Error",
        description: "Unable to update password.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="mr-2"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Member Profile</h1>
                <p className="text-sm text-gray-600">Manage your account and view insurance details</p>
              </div>
            </div>
            <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
              Member
            </Badge>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Profile Information */}
        <Card className="bg-white shadow-lg border-0 rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>Profile Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={profile?.name || ""} disabled className="bg-gray-50" />
              </div>
              <div className="space-y-2">
                <Label>Member ID</Label>
                <Input value={profile?.member_id || ""} disabled className="bg-gray-50" />
              </div>
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input 
                  value={newEmail} 
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Account Type</Label>
                <Input value={profile?.user_type || ""} disabled className="bg-gray-50" />
              </div>
            </div>
            
            <div className="flex space-x-4 pt-4">
              <Button
                onClick={() => setShowPasswordChange(!showPasswordChange)}
                variant="outline"
              >
                Change Password
              </Button>
            </div>

            {/* Password Change Section */}
            {showPasswordChange && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg space-y-4">
                <h4 className="font-medium text-gray-900">Change Password</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Current Password</Label>
                    <div className="relative">
                      <Input
                        type={showCurrentPassword ? "text" : "password"}
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2"
                      >
                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>New Password</Label>
                    <div className="relative">
                      <Input
                        type={showNewPassword ? "text" : "password"}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
                <Button onClick={handlePasswordChange} className="bg-blue-600 hover:bg-blue-700">
                  Update Password
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Insurance Plans */}
        <Card className="bg-white shadow-lg border-0 rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="w-5 h-5" />
              <span>Insurance Plans</span>
            </CardTitle>
            <CardDescription>Your active insurance coverage plans</CardDescription>
          </CardHeader>
          <CardContent>
            {insurancePlans.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p>No insurance plans found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {insurancePlans.map((plan, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-semibold text-gray-900">{plan.payer_name}</h4>
                        <p className="text-sm text-gray-600">{plan.insurance_category}</p>
                      </div>
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        Active
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Monthly Premium</p>
                        <p className="font-semibold">${plan.unit_subscription_price}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Coverage Limit</p>
                        <p className="font-semibold">${plan.maximum_covered_amount}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Claims Made</p>
                        <p className="font-semibold">{plan.total_claims_made}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Amount Paid</p>
                        <p className="font-semibold text-green-600">${plan.amount_paid}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Claims History */}
        <Card className="bg-white shadow-lg border-0 rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>Claims History</span>
            </CardTitle>
            <CardDescription>Recent healthcare claims and their status</CardDescription>
          </CardHeader>
          <CardContent>
            {claims.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p>No claims history available</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Claim ID</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Provider</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Procedure</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Amount</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {claims.map((claim) => (
                      <tr key={claim.claim_id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm font-mono text-blue-600">
                          {claim.claim_id}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {claim.provider_name || claim.provider_id}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {claim.procedure}
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
                            {claim.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-sm font-semibold text-green-600">
                          ${claim.amount_reimbursed || 0}
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
      </div>
    </div>
  );
};

export default MemberProfilePage;