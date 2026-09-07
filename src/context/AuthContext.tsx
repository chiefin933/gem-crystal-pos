import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginAdmin, fetchAdminMe } from '../api/adminApi';

interface AdminUser {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: AdminUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('gc_admin_token'));
  const [user, setUser] = useState<AdminUser | null>(() => {
    const cached = localStorage.getItem('gc_admin_user');
    return cached ? JSON.parse(cached) : null;
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchAdminMe()
        .then(admin => {
          setUser(admin);
          localStorage.setItem('gc_admin_user', JSON.stringify(admin));
        })
        .catch(() => {
          logout();
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const login = async (email: string, pass: string) => {
    const res = await loginAdmin(email, pass);
    localStorage.setItem('gc_admin_token', res.token);
    localStorage.setItem('gc_admin_user', JSON.stringify(res.admin));
    setToken(res.token);
    setUser(res.admin);
  };

  const logout = () => {
    localStorage.removeItem('gc_admin_token');
    localStorage.removeItem('gc_admin_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
