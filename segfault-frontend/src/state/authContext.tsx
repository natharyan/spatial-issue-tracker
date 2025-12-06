import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'GUEST' | 'ADMIN';
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => void;
  isGuest: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function decodeJWT(token: string): User | null {
  try {
    console.log('[Auth] Decoding JWT token...');
    const base64Url = token.split('.')[1];
    if (!base64Url) {
      console.log('[Auth] No base64Url found in token');
      return null;
    }
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    console.log('[Auth] JWT payload:', payload);
    const user: User = {
      id: payload.sub || payload.id || payload.userId || '',
      name: payload.name || payload.email?.split('@')[0] || 'User',
      email: payload.email || '',
      role: payload.role || 'USER',
    };
    console.log('[Auth] Decoded user:', user);
    return user;
  } catch (err) {
    console.error('[Auth] Failed to decode JWT:', err);
    return null;
  }
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('[Auth] AuthProvider initializing...');
    const token = localStorage.getItem('authToken');
    console.log('[Auth] Token from localStorage:', token ? `${token.substring(0, 20)}...` : 'null');
    
    if (token) {
      const decoded = decodeJWT(token);
      console.log('[Auth] Setting user from token:', decoded);
      setUser(decoded);
    }
    
    const guestTokenId = localStorage.getItem('guestTokenId');
    console.log('[Auth] guestTokenId from localStorage:', guestTokenId);
    if (guestTokenId && !token) {
      console.log('[Auth] Setting guest user');
      setUser({
        id: guestTokenId,
        name: 'Guest',
        email: '',
        role: 'GUEST',
      });
    }
    
    setIsLoading(false);
    console.log('[Auth] AuthProvider initialization complete');
  }, []);

  const login = (token: string) => {
    localStorage.setItem('authToken', token);
    const decoded = decodeJWT(token);
    setUser(decoded);
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('guestTokenId');
    setUser(null);
  };

  const isGuest = user?.role === 'GUEST';

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    logout,
    isGuest,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
