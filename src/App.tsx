import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { AuthProvider } from "@/contexts/AuthContext";
import { OrganigramProvider } from "@/contexts/OrganigramContext";
import { ArchiveProvider } from "@/contexts/ArchiveContext";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Organigram from "./pages/Organigram";
import Archive from "./pages/Archive";
import NotFound from "./pages/NotFound";
import Users from "./pages/Users";
import Roles from "./pages/Roles";
import GlobalSettingsPage from "./pages/GlobalSettings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <OrganigramProvider>
            <ArchiveProvider>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<Dashboard />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/organigram" element={<Organigram />} />
                <Route path="/archive" element={<Archive />} />
                <Route path="/users" element={<Users />} />
                <Route path="/roles" element={<Roles />} />
                <Route path="/global-settings" element={<GlobalSettingsPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ArchiveProvider>
          </OrganigramProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
