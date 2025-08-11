import { useState, useEffect } from "react";
import { API_BASE_URL } from "../api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Building2, 
  FileText, 
  Shield, 
  TrendingUp, 
  Users, 
  Settings,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Activity,
  Bot,
  User
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const PayerPortal = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [authRequests, setAuthRequests] = useState([]);
  const [insuranceSubscriptions, setInsuranceSubscriptions] = useState([]);
  const token = localStorage.getItem("authToken");
  const navigate = useNavigate();

  useEffect(() => {
    fetchRequests();
    fetchInsuranceSubscriptions();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
  const response = await fetch(`${API_BASE_URL}/payer/requests`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch requests');
      }
      
      const data = await response.json();
      setAuthRequests(data.requests || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast({
        title: "Error",
        description: "Failed to load authorization requests.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchInsuranceSubscriptions = async () => {
    try {
  const response = await fetch(`${API_BASE_URL}/payer/subscriptions`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setInsuranceSubscriptions(data.subscriptions || []);
      }
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "denied":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      approved: "bg-green-100 text-green-800",
      denied: "bg-red-100 text-red-800", 
      pending: "bg-yellow-100 text-yellow-800"
    };
    return variants[status as keyof typeof variants] || "bg-gray-100 text-gray-800";
  };

  const getPriorityBadge = (priority: string) => {
    const variants = {
      high: "bg-red-100 text-red-800",
      medium: "bg-yellow-100 text-yellow-800",
      low: "bg-green-100 text-green-800"
    };
    return variants[priority as keyof typeof variants] || "bg-gray-100 text-gray-800";
  };

  const handleAutoReview = async (authId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/auto-review`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ auth_id: authId }),
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "AI Auto-Review Completed",
          description: `AI Decision: ${data.decision.status}. Notes: ${data.decision.ai_notes}`,
        });
        fetchRequests(); // Refresh the requests list
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.message || "Failed to perform AI auto-review.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error in AI auto-review:", error);
      toast({
        title: "Connection Error",
        description: "Unable to connect to the server.",
        variant: "destructive",
      });
    }
  };

  const formatStatus = (status: string) => status.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Payer Portal</h1>
                <p className="text-sm text-gray-600">Insurance Authorization Management</p>
              </div>
            </div>
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
                onClick={() => navigate('/profile/payer')}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
              >
                <User className="w-4 h-4" />
                <span>Profile</span>
              </Button>
              <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                Payer Dashboard
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 max-w-3xl mx-auto mb-8 bg-white shadow-lg rounded-xl p-1">
            <TabsTrigger value="dashboard" className="rounded-lg">Dashboard</TabsTrigger>
            <TabsTrigger value="requests" className="rounded-lg">Auth Requests</TabsTrigger>
            <TabsTrigger value="subscriptions" className="rounded-lg">Subscriptions</TabsTrigger>
            <TabsTrigger value="policies" className="rounded-lg">Policies</TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-lg">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Payer Dashboard</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Manage insurance authorization requests, review policies, and monitor system performance.
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-white shadow-lg border-0 rounded-xl">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Requests</p>
                      <p className="text-2xl font-bold text-gray-900">1,247</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white shadow-lg border-0 rounded-xl">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Approved</p>
                      <p className="text-2xl font-bold text-gray-900">892</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white shadow-lg border-0 rounded-xl">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                      <Clock className="w-6 h-6 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Pending</p>
                      <p className="text-2xl font-bold text-gray-900">234</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white shadow-lg border-0 rounded-xl">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Avg. Response</p>
                      <p className="text-2xl font-bold text-gray-900">2.3 days</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="bg-white shadow-lg border-0 rounded-xl">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="w-5 h-5" />
                  <span>Recent Authorization Requests</span>
                </CardTitle>
                <CardDescription>
                  Latest authorization requests requiring review
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {authRequests.slice(0, 5).map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        {getStatusIcon(request.status)}
                        <div>
                          <p className="font-medium text-gray-900">{request.memberName}</p>
                          <p className="text-sm text-gray-600">{request.service}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusBadge(request.status)}>
                          {formatStatus(request.status)}
                        </Badge>
                        <Badge className={getPriorityBadge(request.priority)}>
                          {request.priority}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="requests" className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Authorization Requests</h2>
              <p className="text-gray-600">
                Review and manage all authorization requests from providers and members.
              </p>
            </div>

            <Card className="bg-white shadow-lg border-0 rounded-xl">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {authRequests.map((request) => (
                    <div key={request.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          {getStatusIcon(request.status)}
                          <div>
                            <p className="font-medium text-gray-900">Request #{request.id}</p>
                            <p className="text-sm text-gray-600">Member: {request.memberName}</p>
                            <p className="text-sm text-gray-600">Provider: {request.providerName}</p>
                            <p className="text-sm text-gray-600">Service: {request.service}</p>
                            <div className="text-sm text-gray-600">
                              Submitted At: {request.submitted_at && request.submitted_at.$date ? new Date(request.submitted_at.$date).toLocaleString() : "Invalid Date"}
                            </div>
                            <p className="text-sm text-gray-600">
                              Submitted: {request.submittedDate}
                            </p>
                            {request.ai_notes && (
                              <p className="text-sm text-blue-600">AI Notes: {request.ai_notes}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusBadge(request.status)}>
                            {formatStatus(request.status)}
                          </Badge>
                          <Badge className={getPriorityBadge(request.priority)}>
                            {request.priority}
                          </Badge>
                          {request.status === "pending" && (
                            <Button size="sm" variant="outline" onClick={() => handleAutoReview(request.id)}>
                              Trigger AI Review
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        Status: {formatStatus(request.status)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscriptions" className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Insurance Subscriptions</h2>
              <p className="text-gray-600">
                View all members subscribed to your insurance plans and their coverage details.
              </p>
            </div>

            <Card className="bg-white shadow-lg border-0 rounded-xl">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {insuranceSubscriptions.map((subscription) => (
                    <div key={subscription.subscription_id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{subscription.member_name}</p>
                            <p className="text-sm text-gray-600">Member ID: {subscription.member_id}</p>
                            <p className="text-sm text-gray-600">Subscription ID: {subscription.subscription_id}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center space-x-2">
                            <Badge className={subscription.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                              {subscription.status}
                            </Badge>
                          </div>
                          <div className="mt-2 space-y-1">
                            <div className="text-sm text-gray-600">
                              Coverage: <span className="font-medium">${subscription.coverage_amount}</span>
                            </div>
                            <div className="text-sm text-gray-600">
                              Reimbursed: <span className="font-medium text-green-600">${subscription.amount_reimbursed}</span>
                            </div>
                            <div className="text-sm text-gray-600">
                              Remaining: <span className="font-medium text-blue-600">${subscription.remaining_balance}</span>
                            </div>
                            <div className="text-sm text-gray-600">
                              Valid Until: <span className="font-medium">{subscription.validity_date}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="policies" className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Insurance Policies</h2>
              <p className="text-gray-600">
                Manage coverage policies and authorization rules.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-white shadow-lg border-0 rounded-xl">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="w-5 h-5" />
                    <span>Coverage Policies</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="font-medium text-blue-900">MRI Scans</p>
                      <p className="text-sm text-blue-700">Requires prior authorization for non-emergency cases</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="font-medium text-green-900">Physical Therapy</p>
                      <p className="text-sm text-green-700">Covered up to 20 sessions per year</p>
                    </div>
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <p className="font-medium text-yellow-900">Surgery</p>
                      <p className="text-sm text-yellow-700">Requires medical necessity review</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white shadow-lg border-0 rounded-xl">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="w-5 h-5" />
                    <span>Authorization Rules</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <p className="font-medium text-purple-900">Auto-Approval</p>
                      <p className="text-sm text-purple-700">Routine checkups and preventive care</p>
                    </div>
                    <div className="p-3 bg-orange-50 rounded-lg">
                      <p className="font-medium text-orange-900">Manual Review</p>
                      <p className="text-sm text-orange-700">Specialized procedures and high-cost services</p>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg">
                      <p className="font-medium text-red-900">Expert Review</p>
                      <p className="text-sm text-red-700">Experimental treatments and off-label use</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Analytics & Reports</h2>
              <p className="text-gray-600">
                View performance metrics and generate reports.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-white shadow-lg border-0 rounded-xl">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5" />
                    <span>Performance Metrics</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Approval Rate</span>
                      <span className="font-bold text-green-600">71.6%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Average Processing Time</span>
                      <span className="font-bold text-blue-600">2.3 days</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Cost Savings</span>
                      <span className="font-bold text-purple-600">$2.4M</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white shadow-lg border-0 rounded-xl">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="w-5 h-5" />
                    <span>User Activity</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Active Providers</span>
                      <span className="font-bold text-blue-600">1,247</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Active Members</span>
                      <span className="font-bold text-green-600">45,892</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Monthly Requests</span>
                      <span className="font-bold text-purple-600">8,234</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PayerPortal;
