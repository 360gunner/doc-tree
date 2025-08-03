import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import apiService from '@/services/apiService';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  // New: reload user from backend and update localStorage
  const reloadUser = async () => {
    const token = localStorage.getItem('archiveToken');
    if (!token) {
      setUser(null);
      localStorage.removeItem('archiveUser');
      return;
    }
    try {
      const backendUser = await apiService.auth.getCurrentUser();
      if (backendUser) {
        setUser(backendUser);
        localStorage.setItem('archiveUser', JSON.stringify(backendUser));
      } else {
        setUser(null);
        localStorage.removeItem('archiveUser');
        localStorage.removeItem('archiveToken');
      }
    } catch (err) {
      setUser(null);
      localStorage.removeItem('archiveUser');
      localStorage.removeItem('archiveToken');
    }
  };

  useEffect(() => {
    // Always try to restore user from token on reload
    const token = localStorage.getItem('archiveToken');
    if (token) {
      apiService.auth.getCurrentUser().then(user => {
        if (user) {
          setUser(user);
          // Persist token with user for session continuity
          localStorage.setItem('archiveUser', JSON.stringify(user));
        } else {
          setUser(null);
          localStorage.removeItem('archiveUser');
          localStorage.removeItem('archiveToken');
        }
        setLoading(false);
      }).catch((err) => {
        // Handle error from apiService.auth.getCurrentUser
        setUser(null);
        localStorage.removeItem('archiveUser');
        localStorage.removeItem('archiveToken');
        setLoading(false);
      });
      return;
    }
    // Fallback: legacy support for localStorage user (should be phased out)
    const storedUser = localStorage.getItem('archiveUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      setLoading(true);
      const response = await apiService.auth.login(username, password);
      if (response.success) {
        setUser(response.user);
        // Persist user with token for reload
        localStorage.setItem('archiveUser', JSON.stringify(response.user));
        toast({
          title: "Login successful",
          description: `Welcome back, ${response.user.username}!`,
        });
        navigate('/dashboard');
        window.location.reload();
        return true;
      }
    } catch (error) {
      toast({
        title: "Login failed",
        description: error.message || "Please check your credentials and try again.",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await apiService.auth.logout();
      setUser(null);
      localStorage.removeItem('archiveUser');
      localStorage.removeItem('archiveToken');
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
      navigate('/login');
    } catch (error) {
      toast({
        title: "Logout failed",
        description: error.message || "An error occurred during logout.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Fix: robustly check archiveCategories (array of objects)
  const hasPermission = (permission, contextId = null) => {
    if (!user || !user.roles) return false;
    // Admins always have all permissions
    if (user.roles.some(r => r.name === 'admin')) return true;
    if (!permission) return false;
    // Archive category access
    if (permission.startsWith('category:')) {
      const [_, permType, catId] = permission.split(':');
      // If no permType, fallback to old logic
      if (!catId) {
        const catIdSimple = permission.split(':')[1];
        return user.roles.some(r => Array.isArray(r.archiveCategories) && r.archiveCategories.some(c => {
          if (typeof c === 'string') return c === catIdSimple;
          if (typeof c === 'object' && c.category) return c.category === catIdSimple || c.category._id === catIdSimple;
          return false;
        }));
      }
      // New: check for permission type (view or crud)
      return user.roles.some(r => Array.isArray(r.archiveCategories) && r.archiveCategories.some(c => {
        if (typeof c === 'object' && c.category) {
          const id = c.category._id ? c.category._id : c.category;
          return (id === catId) && (c.permissions === permType);
        }
        return false;
      }));
    }
    // Organigram node access
    if (permission.startsWith('node:')) {
      const nodeId = permission.split(':')[1];
      return user.roles.some(r => Array.isArray(r.organigramNodes) && r.organigramNodes.some(n => {
        if (typeof n === 'string') return n === nodeId;
        if (typeof n === 'object' && n.node) return n.node === nodeId || n.node._id === nodeId;
        return false;
      }));
    }
    if (permission === 'user') return true;
    return false;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasPermission, reloadUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
