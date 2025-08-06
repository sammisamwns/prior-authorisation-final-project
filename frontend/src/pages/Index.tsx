import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AuthenticationCard from "@/components/AuthenticationCard";
import MemberPortal from "@/components/MemberPortal";
import ProviderPortal from "@/components/ProviderPortal";
import PriorAuthFlowDiagram from "@/components/PriorAuthFlowDiagram";
import { useToast } from "@/hooks/use-toast";
import { Shield, Stethoscope, Brain, LogOut, Activity, User, Heart } from "lucide-react";

const Index = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already authenticated
    const token = localStorage.getItem("authToken");
    const userName = localStorage.getItem("userName");
    const userType = localStorage.getItem("userType");
    
    if (token && userName && userType) {
      setIsAuthenticated(true);
      setUserRole(userType);
      setActiveTab(userType);
    }
  }, []);

  const handleAuthenticated = (token: string, role: string) => {
    setIsAuthenticated(true);
    setUserRole(role);
    setActiveTab(role);
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userName");
    localStorage.removeItem("userType");
    setIsAuthenticated(false);
    setUserRole("");
    setActiveTab("overview");
    
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        {/* Header */}
        <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm shadow-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">HealthCare Prior Auth</h1>
                  <p className="text-sm text-gray-600">AI-Powered Authorization System</p>
                </div>
              </div>
              <Badge className="bg-gradient-to-r from-green-500 to-blue-500 text-white">
                Secure Portal
              </Badge>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-12">
          <div className="max-w-6xl mx-auto space-y-12">
            {/* Hero Section */}
            <div className="text-center space-y-6">
              <h1 className="text-5xl font-bold text-gray-900">
                Healthcare Prior Authorization System
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Streamline medical insurance claims with AI-powered prior authorization for US healthcare providers and members.
              </p>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="bg-white shadow-lg border-0 rounded-2xl overflow-hidden hover:shadow-xl transition-shadow">
                <CardHeader className="text-center pb-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto">
                    <Shield className="w-6 h-6" />
                  </div>
                  <CardTitle className="text-white">Member Portal</CardTitle>
                  <CardDescription className="text-blue-100">
                    Insurance members can submit authorization requests directly
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• View insurance coverage details</li>
                    <li>• Submit prior authorization requests</li>
                    <li>• Track claim history</li>
                    <li>• AI-powered processing</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-white shadow-lg border-0 rounded-2xl overflow-hidden hover:shadow-xl transition-shadow">
                <CardHeader className="text-center pb-4 bg-gradient-to-r from-green-500 to-green-600 text-white">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto">
                    <Stethoscope className="w-6 h-6" />
                  </div>
                  <CardTitle className="text-white">Provider Portal</CardTitle>
                  <CardDescription className="text-green-100">
                    Healthcare providers can submit requests on behalf of patients
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• Patient member lookup</li>
                    <li>• Submit clinical requests</li>
                    <li>• Medical necessity documentation</li>
                    <li>• Real-time status tracking</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-white shadow-lg border-0 rounded-2xl overflow-hidden hover:shadow-xl transition-shadow">
                <CardHeader className="text-center pb-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto">
                    <Brain className="w-6 h-6" />
                  </div>
                  <CardTitle className="text-white">AI Processing</CardTitle>
                  <CardDescription className="text-purple-100">
                    Intelligent analysis of medical necessity and policy coverage
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• Automated policy checking</li>
                    <li>• Medical necessity review</li>
                    <li>• Fast processing times</li>
                    <li>• Reduced manual errors</li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Authentication */}
            <div className="flex justify-center">
              <AuthenticationCard onAuthenticated={handleAuthenticated} />
            </div>
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
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">HealthCare Prior Auth</h1>
                <p className="text-sm text-gray-600">
                  Welcome back, {localStorage.getItem("userName") || "User"} 
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                  </span>
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="border-gray-300 hover:bg-gray-50"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto mb-8 bg-white shadow-lg rounded-xl p-1">
            <TabsTrigger value="overview" className="rounded-lg">Overview</TabsTrigger>
            <TabsTrigger value="member" className="rounded-lg">Member Portal</TabsTrigger>
            <TabsTrigger value="provider" className="rounded-lg">Provider Portal</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">System Overview</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Welcome to the Healthcare Prior Authorization System. You are logged in as a {userRole}. 
                You can access the {userRole} portal to manage authorization requests and view the AI-powered processing workflow.
              </p>
            </div>
            <PriorAuthFlowDiagram />
          </TabsContent>

          <TabsContent value="member">
            {userRole === "member" ? (
              <MemberPortal />
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Member Portal Access</h3>
                <p className="text-gray-600">
                  This portal is only available for members. You are currently logged in as a {userRole}.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="provider">
            {userRole === "provider" ? (
              <ProviderPortal />
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Stethoscope className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Provider Portal Access</h3>
                <p className="text-gray-600">
                  This portal is only available for providers. You are currently logged in as a {userRole}.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
