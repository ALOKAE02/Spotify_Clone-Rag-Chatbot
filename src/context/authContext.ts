import { createContext, useContext } from 'react';
import type { SignupInput, User } from '../lib/auth';

export interface AuthContextValue {
  user: User | null;
  logIn: (email: string, password: string, remember: boolean) => Promise<User>;
  signUp: (input: SignupInput) => Promise<User>;
  logOut: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
