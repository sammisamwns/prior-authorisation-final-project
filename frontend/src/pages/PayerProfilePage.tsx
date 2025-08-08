import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Building2, Eye, EyeOff, FileText, Calendar, DollarSign, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PayerProfile {
  name: string;
  email: string;
  user_type: string;
  payer_id: string;
}

interface AuthRequest {
  id: string;
  member_name: string;
  provider_name: string;
  service: string;
  status: string;
  submitted_date: string;
  priority: string;
}

interface PayerStats {
  total_requests: number;
  approved_requests: number;
  pending_requests: number;
  total_amount_paid: number;
  balance_left: number;
  approval_rate: number;
}

const PayerProfilePage = () => {
  const [profile, setProfile] = useState<PayerProfile | null>(null);
  const [authRequests, setAuthRequests] = useState<AuthRequest[]>([]);
  const [stats, setStats] = useState<PayerStats | null>(null);
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

      // Fetch payer dashboard data
      const dashboardResponse = await fetch('http://127.0.0.1:5000/payer/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (dashboardResponse.ok) {
        const dashboardData = await dashboardResponse.json();
        setStats({
          total_requests: dashboardData.approved_cases?.length + dashboardData.pending_cases?.length || 0,
          approved_requests: dashboardData.approved_cases?.length || 0,
          pending_requests: dashboardData.pending_cases?.length || 0,
          total_amount_paid: dashboardData.total_amount_paid || 0,
          balance_left: dashboardData.payer_balance_left || 0,
          approval_rate: dashboardData.approved_cases?.length / 
            (dashboardData.approved_cases?.length + dashboardData.pending_cases?.length) * 100 || 0
        });
      }

      // Fetch authorization requests
      const requestsResponse = await fetch('http://127.0.0.1:5000/payer/requests', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (requestsResponse.ok) {
        const requestsData = await requestsResponse.json();
        setAuthRequests(requestsData.requests || []);
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
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
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-600 rounded-full flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Payer Profile</h1>
                <p className="text-sm text-gray-600">Manage your account and view authorization analytics</p>
              </div>
            </div>
            <Badge className="bg-gradient-to-r from-purple-500 to-blue-500 text-white">
              Payer
            </Badge>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Profile Information */}
        <Card className="bg-white shadow-lg border-0 rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building2 className="w-5 h-5" />
              <span>Profile Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Organization Name</Label>
                <Input value={profile?.name || ""} disabled className="bg-gray-50" />
              </div>
              <div className="space-y-2">
                <Label>Payer ID</Label>
                <Input value={profile?.payer_id || ""} disabled className="bg-gray-50" />
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
                <Button onClick={handlePasswordChange} className="bg-purple-600 hover:bg-purple-700">
                  Update Password
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Financial Overview */}
        {stats && (
          <Card className="bg-white shadow-lg border-0 rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="w-5 h-5" />
                <span>Financial Overview</span>
              </CardTitle>
              <CardDescription>Your organization's financial metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center p-4 bg-blue-50 rounded-xl">
                  <TrendingUp className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-sm text-gray-600">Total Paid</div>
                  <div className="text-2xl font-bold text-blue-900">${stats.total_amount_paid.toLocaleString()}</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-xl">
                  <DollarSign className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <div className="text-sm text-gray-600">Balance Left</div>
                  <div className="text-2xl font-bold text-green-900">${stats.balance_left.toLocaleString()}</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-xl">
                  <FileText className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <div className="text-sm text-gray-600">Total Requests</div>
                  <div className="text-2xl font-bold text-purple-900">{stats.total_requests}</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-xl">
                  <TrendingUp className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                  <div className="text-sm text-gray-600">Approval Rate</div>
                  <div className="text-2xl font-bold text-yellow-900">{stats.approval_rate.toFixed(1)}%</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Authorization Requests */}
        <Card className="bg-white shadow-lg border-0 rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>Recent Authorization Requests</span>
            </CardTitle>
            <CardDescription>Authorization requests processed by your organization</CardDescription>
          </CardHeader>
          <CardContent>
            {authRequests.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p>No authorization requests found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Request ID</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Member</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Provider</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Service</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Priority</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {authRequests.map((request) => (
                      <tr key={request.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm font-mono text-blue-600">
                          {request.id}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {request.member_name}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {request.provider_name}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {request.service}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <Badge
                            variant="secondary"
                            className={
                              request.priority === "high"
                                ? "bg-red-100 text-red-800"
                                : request.priority === "medium"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-green-100 text-green-800"
                            }
                          >
                            {request.priority}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <Badge
                            variant="secondary"
                            className={
                              request.status === "approved"
                                ? "bg-green-100 text-green-800"
                                : request.status === "rejected"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                            }
                          >
                            {request.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>{request.submitted_date}</span>
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

export default PayerProfilePage;