import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, AlertCircle, FileText, User, Stethoscope } from "lucide-react";

interface PriorAuth {
  auth_id: string;
  member_name: string;
  provider_name: string;
  procedure: string;
  status: 'pending' | 'approved' | 'denied';
  ai_decision?: string;
  submitted_date: string;
  priority: 'low' | 'medium' | 'high';
  notes?: string;
}

const PriorAuthAIStatus = () => {
  const [auths, setAuths] = useState<PriorAuth[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAuth, setSelectedAuth] = useState<PriorAuth | null>(null);
  const [decisionNotes, setDecisionNotes] = useState("");
  const { toast } = useToast();
  const token = localStorage.getItem("authToken");

  useEffect(() => {
    fetchPriorAuths();
  }, []);

  const fetchPriorAuths = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://127.0.0.1:5000/ai-status', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch AI status');
      }
      
      const data = await response.json();
      setAuths(data.prior_auths || []);
    } catch (error) {
      console.error('Error fetching AI status:', error);
      toast({
        title: "Error",
        description: "Failed to load AI processing status.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (authId: string, decision: 'approved' | 'denied') => {
    try {
      const response = await fetch('http://127.0.0.1:5000/prior-auth/decision', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          auth_id: authId,
          decision: decision,
          notes: decisionNotes
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit decision');
      }

      toast({
        title: "Success",
        description: `Request ${decision} successfully.`,
      });

      // Refresh the list
      fetchPriorAuths();
      setSelectedAuth(null);
      setDecisionNotes("");
    } catch (error) {
      console.error('Error submitting decision:', error);
      toast({
        title: "Error",
        description: "Failed to submit decision. Please try again.",
        variant: "destructive"
      });
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading prior authorization requests...</p>
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
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Prior Auth AI Status</h1>
                <p className="text-sm text-gray-600">Review and manage authorization requests</p>
              </div>
            </div>
            <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
              AI-Powered Review
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Prior Authorization Requests</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Review and manage all prior authorization requests with AI-powered decision support.
          </p>
        </div>

        {auths.length === 0 ? (
          <Card className="bg-white shadow-lg border-0 rounded-xl max-w-2xl mx-auto">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Requests Found</h3>
              <p className="text-gray-600">
                There are currently no prior authorization requests to review.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {auths.map((auth) => (
              <Card key={auth.auth_id} className="bg-white shadow-lg border-0 rounded-xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {getStatusIcon(auth.status)}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-semibold text-gray-900">Request #{auth.auth_id}</h3>
                          <Badge className={getStatusBadge(auth.status)}>
                            {auth.status}
                          </Badge>
                          <Badge className={getPriorityBadge(auth.priority)}>
                            {auth.priority}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4" />
                            <span><strong>Member:</strong> {auth.member_name}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Stethoscope className="w-4 h-4" />
                            <span><strong>Provider:</strong> {auth.provider_name}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <FileText className="w-4 h-4" />
                            <span><strong>Procedure:</strong> {auth.procedure}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4" />
                            <span><strong>Submitted:</strong> {auth.submitted_date}</span>
                          </div>
                        </div>
                        {auth.ai_decision && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm">
                              <strong>AI Decision:</strong> {auth.ai_decision}
                            </p>
                          </div>
                        )}
                        {auth.notes && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm">
                              <strong>Notes:</strong> {auth.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col space-y-2">
                      {auth.status === 'pending' && (
                        <>
                          <Button 
                            size="sm" 
                            onClick={() => setSelectedAuth(auth)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approve
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => setSelectedAuth(auth)}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Deny
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Decision Modal */}
        {selectedAuth && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="bg-white shadow-xl border-0 rounded-xl max-w-md w-full mx-4">
              <CardHeader>
                <CardTitle>Review Request #{selectedAuth.auth_id}</CardTitle>
                <CardDescription>
                  Please provide notes for your decision on this authorization request.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Enter your decision notes..."
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  className="min-h-[100px]"
                />
                <div className="flex space-x-2">
                  <Button 
                    onClick={() => handleDecision(selectedAuth.auth_id, 'approved')}
                    className="bg-green-600 hover:bg-green-700 flex-1"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                  <Button 
                    onClick={() => handleDecision(selectedAuth.auth_id, 'denied')}
                    variant="destructive"
                    className="flex-1"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Deny
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setSelectedAuth(null);
                      setDecisionNotes("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default PriorAuthAIStatus;
