import { Card, CardContent } from "@/components/ui/card";

const PriorAuthFlowDiagram = () => {
  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <h2 className="text-2xl font-bold text-center mb-8 text-foreground">
        Prior Authorization Process Flow
      </h2>
      
      {/* Main Flow */}
      <div className="space-y-8">
        {/* Step 1: User Authentication */}
        <div className="relative">
          <div className="flex items-center justify-center">
            <Card className="w-80 bg-gradient-card border-2 border-primary/20 shadow-card">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold">1</span>
                </div>
                <h3 className="font-semibold text-lg mb-2">User Authentication</h3>
                <p className="text-sm text-muted-foreground">
                  Member/Provider login with credentials
                </p>
              </CardContent>
            </Card>
          </div>
          
          {/* Arrow Down */}
          <div className="flex justify-center mt-4">
            <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-primary"></div>
          </div>
        </div>

        {/* Step 2: Portal Selection */}
        <div className="flex justify-center items-center space-x-8">
          <Card className="w-64 bg-gradient-secondary border-2 border-secondary/30 shadow-card">
            <CardContent className="p-6 text-center">
              <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold">2A</span>
              </div>
              <h3 className="font-semibold mb-2">Member Portal</h3>
              <p className="text-sm text-muted-foreground">
                Member ID verification & profile access
              </p>
            </CardContent>
          </Card>
          
          <div className="text-2xl font-bold text-muted-foreground">OR</div>
          
          <Card className="w-64 bg-gradient-secondary border-2 border-secondary/30 shadow-card">
            <CardContent className="p-6 text-center">
              <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold">2B</span>
              </div>
              <h3 className="font-semibold mb-2">Provider Portal</h3>
              <p className="text-sm text-muted-foreground">
                Provider access with patient member ID
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Arrow Down */}
        <div className="flex justify-center">
          <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-primary"></div>
        </div>

        {/* Step 3: Data Fetching */}
        <div className="relative">
          <div className="flex items-center justify-center">
            <Card className="w-80 bg-gradient-card border-2 border-info/20 shadow-card">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-info rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold">3</span>
                </div>
                <h3 className="font-semibold text-lg mb-2">Database Query</h3>
                <p className="text-sm text-muted-foreground">
                  Fetch member data from MongoDB using Member ID
                </p>
                <div className="mt-3 text-xs bg-muted p-2 rounded">
                  Backend: localhost:5000/member/profile
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Arrow Down */}
        <div className="flex justify-center">
          <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-primary"></div>
        </div>

        {/* Step 4: AI Processing */}
        <div className="relative">
          <div className="flex items-center justify-center">
            <Card className="w-80 bg-gradient-card border-2 border-warning/20 shadow-card animate-pulse-glow">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-warning rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold">4</span>
                </div>
                <h3 className="font-semibold text-lg mb-2">Agentic AI Processing</h3>
                <p className="text-sm text-muted-foreground">
                  AI analyzes member data & prior auth requirements
                </p>
                <div className="mt-3 space-y-1">
                  <div className="text-xs bg-accent p-2 rounded">✓ Policy Validation</div>
                  <div className="text-xs bg-accent p-2 rounded">✓ Medical Necessity Check</div>
                  <div className="text-xs bg-accent p-2 rounded">✓ Coverage Analysis</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Arrow Down */}
        <div className="flex justify-center">
          <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-primary"></div>
        </div>

        {/* Step 5: Decision */}
        <div className="flex justify-center items-center space-x-8">
          <Card className="w-64 bg-gradient-card border-2 border-success/30 shadow-card">
            <CardContent className="p-6 text-center">
              <div className="w-10 h-10 bg-success rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold">✓</span>
              </div>
              <h3 className="font-semibold mb-2 text-success">Approved</h3>
              <p className="text-sm text-muted-foreground">
                Authorization granted with reference number
              </p>
            </CardContent>
          </Card>
          
          <div className="text-2xl font-bold text-muted-foreground">OR</div>
          
          <Card className="w-64 bg-gradient-card border-2 border-destructive/30 shadow-card">
            <CardContent className="p-6 text-center">
              <div className="w-10 h-10 bg-destructive rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold">✗</span>
              </div>
              <h3 className="font-semibold mb-2 text-destructive">Denied</h3>
              <p className="text-sm text-muted-foreground">
                Denial with reason & appeal process
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Data Flow Indicators */}
        <div className="mt-12 bg-muted/30 p-6 rounded-lg">
          <h3 className="font-semibold mb-4 text-center">Data Flow Architecture</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="font-medium text-primary">Frontend (React)</div>
              <div className="text-muted-foreground">Member/Provider Portals</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-info">Backend API (Flask)</div>
              <div className="text-muted-foreground">localhost:5000</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-success">Database (MongoDB)</div>
              <div className="text-muted-foreground">Member Records</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PriorAuthFlowDiagram;