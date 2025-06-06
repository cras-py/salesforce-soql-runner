import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

// Configure axios defaults
axios.defaults.baseURL = 'http://localhost:5000';
axios.defaults.withCredentials = true;

interface User {
  id: string;
  organizationId: string;
  url: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (username: string, password: string, environment: string, customDomain?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
    
    // Set up periodic auth checks every 5 minutes
    const interval = setInterval(checkAuthStatus, 5 * 60 * 1000);
    
    // Set up axios interceptor for handling 401 errors
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          console.log('Session expired, logging out...');
          setIsAuthenticated(false);
          setUser(null);
        }
        return Promise.reject(error);
      }
    );
    
    return () => {
      clearInterval(interval);
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await axios.get('/api/auth-status');
      console.log('Auth status response:', response.data);
      
      if (response.data.authenticated) {
        setIsAuthenticated(true);
        setUser(response.data.userInfo);
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshSession = async () => {
    try {
      await axios.post('/api/refresh-session');
      console.log('Session refreshed');
    } catch (error) {
      console.error('Session refresh failed:', error);
    }
  };

  // Auto-refresh session on user activity
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleUserActivity = () => {
      refreshSession();
    };

    // Refresh session on user interactions
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    let lastRefresh = Date.now();

    const throttledRefresh = () => {
      const now = Date.now();
      // Only refresh once every 2 minutes to avoid spam
      if (now - lastRefresh > 2 * 60 * 1000) {
        handleUserActivity();
        lastRefresh = now;
      }
    };

    events.forEach(event => {
      document.addEventListener(event, throttledRefresh, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, throttledRefresh, true);
      });
    };
  }, [isAuthenticated]);

  const login = async (username: string, password: string, environment: string, customDomain?: string): Promise<boolean> => {
    try {
      const response = await axios.post('/api/login', {
        username,
        password,
        environment,
        customDomain
      });

      if (response.data.success) {
        setIsAuthenticated(true);
        setUser(response.data.userInfo);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await axios.post('/api/logout');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  const value = {
    isAuthenticated,
    user,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
} 