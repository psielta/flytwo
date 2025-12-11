import { createContext } from 'react';

export interface AuthUser {
  email: string;
  fullName: string | null;
  roles: string[];
}

export interface RegisterData {
  email: string;
  password: string;
  confirmPassword: string;
  fullName?: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
