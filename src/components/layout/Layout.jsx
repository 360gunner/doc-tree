import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { 
  LogOut, 
  Menu, 
  User, 
  LayoutDashboard, 
  FolderTree, 
  Archive 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";
import apiService from "@/services/apiService";

export default function Layout({ children }) {
  const { user, logout, hasPermission, loading } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [globalSettings, setGlobalSettings] = useState({ companyName: "Document Archive", companyLogo: "" });

  useEffect(() => {
    // Only redirect after auth check is done (prevents flicker)
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, navigate, loading]);

  useEffect(() => {
    // Fetch global settings for header
    apiService.getCachedGlobalSettings().then(setGlobalSettings);
  }, []);

  if (loading) {
    // Show nothing or a loading spinner while checking auth
    return null;
  }

  const handleLogout = () => {
    logout();
  };

  const navItems = [
    {
      name: "Tableau de bord",
      path: "/dashboard",
      icon: <LayoutDashboard className="h-5 w-5 mr-2" />,
      permission: "user",
    },
    {
      name: "Mon Organigramme",
      path: "/organigram",
      icon: <FolderTree className="h-5 w-5 mr-2" />,
      permission: "user",
    },
    {
      name: "Dossiers",
      path: "/archive",
      icon: <Archive className="h-5 w-5 mr-2" />,
      permission: "user",
    },
    // Show Users and Roles separately for admin
    {
      name: "Utilisateurs",
      path: "/users",
      icon: <User className="h-5 w-5 mr-2" />,
      permission: "admin",
    },
    {
      name: "Rôles",
      path: "/roles",
      icon: <User className="h-5 w-5 mr-2" />,
      permission: "admin",
    },
    // Global Settings tab for admin
    {
      name: "Paramètres généraux",
      path: "/global-settings",
      icon: <LayoutDashboard className="h-5 w-5 mr-2" />,
      permission: "admin",
    },
  ];

  const NavLinks = () => (
    <div className="flex flex-col space-y-1">
      {navItems.map(
        (item) =>
          hasPermission(item.permission) && (
            <Link
              key={item.path}
              to={item.path}
              className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
              onClick={() => setOpen(false)}
            >
              {item.icon}
              {item.name}
            </Link>
          )
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-primary text-primary-foreground px-4 py-3 flex justify-between items-center shadow-md">
        <div className="flex items-center">
          {globalSettings.companyLogo && (
            <img src={globalSettings.companyLogo} alt="Logo" className="h-8 w-8 mr-2 rounded bg-white object-contain border" />
          )}
          {isMobile ? (
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-primary-foreground">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                <div className="py-4">
                  <h2 className="text-lg font-semibold mb-4">{globalSettings.companyName}</h2>
                  <NavLinks />
                </div>
              </SheetContent>
            </Sheet>
          ) : (
            <Link to="/dashboard" className="font-bold text-xl">
              {globalSettings.companyName}
            </Link>
          )}
        </div>
        
        <div className="flex items-center">
          <div className="mr-4 flex items-center">
            <User className="h-5 w-5 mr-2" />
            <span>{user?.name || user?.username}</span>
            {hasPermission("admin") && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-500 text-black rounded-full">
                Administrateur
              </span>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleLogout}
            className="text-primary-foreground"
          >
            <LogOut className="h-4 w-4 mr-1" />
            Déconnexion
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1">
        {/* Sidebar (desktop) */}
        {!isMobile && (
          <aside className="w-64 bg-gray-50 border-r p-4">
            <h2 className="text-lg font-semibold mb-4">Navigation</h2>
            <NavLinks />
          </aside>
        )}

        {/* Page content */}
        <main className="flex-1 p-6 bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}
