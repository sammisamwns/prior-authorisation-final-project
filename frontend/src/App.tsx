import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import MemberPortal from "./components/MemberPortal";
import ProviderPortal from "./components/ProviderPortal";
import PayerPortal from "./components/PayerPortal";
import ProfilePage from "./components/ProfilePage";
import PriorAuthAIStatus from "./components/PriorAuthAIStatus";
import MemberProfilePage from "./pages/MemberProfilePage";
import ProviderProfilePage from "./pages/ProviderProfilePage";
import PayerProfilePage from "./pages/PayerProfilePage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
                    <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/member" element={<MemberPortal />} />
              <Route path="/provider" element={<ProviderPortal />} />
              <Route path="/payer" element={<PayerPortal />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/status" element={<PriorAuthAIStatus />} />
              <Route path="/profile/member" element={<MemberProfilePage />} />
              <Route path="/profile/provider" element={<ProviderProfilePage />} />
              <Route path="/profile/payer" element={<PayerProfilePage />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
