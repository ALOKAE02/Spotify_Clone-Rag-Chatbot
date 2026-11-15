import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  clearSession,
  createUser,
  ensureDemoUser,
  loadSessionUser,
  saveSession,
  verifyCredentials,
  type SignupInput,
  type User,
} from '../lib/auth';
import { AuthContext, type AuthContextValue } from './authContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(loadSessionUser);

  useEffect(() => {
    void ensureDemoUser();
  }, []);

  const logIn = useCallback(async (email: string, password: string, remember: boolean) => {
    const found = await verifyCredentials(email, password);
    saveSession(found.id, remember);
    setUser(found);
    return found;
  }, []);

  const signUp = useCallback(async (input: SignupInput) => {
    const created = await createUser(input);
    saveSession(created.id, true);
    setUser(created);
    return created;
  }, []);

  const logOut = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({ user, logIn, signUp, logOut }), [user, logIn, signUp, logOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
