/**
 * Demo authentication that lives entirely in this browser (localStorage).
 * Passwords are salted and hashed, but this is NOT real security: anyone with access to the
 * browser can read or edit the stored accounts. A real backend replaces this in a later step.
 */

export type Gender = 'man' | 'woman' | 'non-binary' | 'something-else' | 'prefer-not-to-say';

export interface User {
  id: string;
  email: string;
  displayName: string;
  birthDate: string; // YYYY-MM-DD
  gender: Gender;
  marketingOptOut: boolean;
  shareData: boolean;
  createdAt: string;
}

interface StoredUser extends User {
  salt: string;
  passwordHash: string;
}

export interface SignupInput {
  email: string;
  password: string;
  displayName: string;
  birthDate: string;
  gender: Gender;
  marketingOptOut: boolean;
  shareData: boolean;
}

export class AuthError extends Error {
  constructor(
    public code: 'email-taken' | 'invalid-credentials' | 'storage',
    message: string,
  ) {
    super(message);
  }
}

const USERS_KEY = 'sc-users';
const SESSION_KEY = 'sc-session';

/** Seeded account so the app can be tried without signing up. Also listed in the README. */
export const DEMO_ACCOUNT = {
  email: 'demo@spotifyclone.test',
  password: 'DemoPass123',
  displayName: 'Demo Listener',
} as const;

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());

/** Same rules as the sign-up checklist: a letter, a number or special character, 10+ characters. */
export function passwordChecks(password: string) {
  return {
    letter: /[A-Za-z]/.test(password),
    numberOrSpecial: /[\d\W_]/.test(password),
    length: password.length >= 10,
  };
}

export const isStrongPassword = (password: string) => Object.values(passwordChecks(password)).every(Boolean);

function randomId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

async function hashPassword(password: string, salt: string) {
  const input = `${salt}:${password}`;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  }
  // crypto.subtle is missing on plain-http LAN addresses; fall back to a simple (non-cryptographic) hash.
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) h = Math.imul(h ^ input.charCodeAt(i), 16777619);
  return `fnv-${(h >>> 0).toString(16)}`;
}

function readUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? (JSON.parse(raw) as StoredUser[]) : [];
  } catch {
    return [];
  }
}

function writeUsers(users: StoredUser[]) {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch {
    throw new AuthError('storage', "Your browser blocked saving the account. Check that site data isn't disabled.");
  }
}

function toPublic({ salt: _salt, passwordHash: _hash, ...user }: StoredUser): User {
  return user;
}

export function emailExists(email: string) {
  const target = normalizeEmail(email);
  return readUsers().some((u) => u.email === target);
}

export async function createUser(input: SignupInput): Promise<User> {
  const email = normalizeEmail(input.email);
  const users = readUsers();
  if (users.some((u) => u.email === email)) {
    throw new AuthError('email-taken', 'This email is already linked to an account.');
  }
  const salt = randomId();
  const user: StoredUser = {
    id: randomId(),
    email,
    displayName: input.displayName.trim(),
    birthDate: input.birthDate,
    gender: input.gender,
    marketingOptOut: input.marketingOptOut,
    shareData: input.shareData,
    createdAt: new Date().toISOString(),
    salt,
    passwordHash: await hashPassword(input.password, salt),
  };
  writeUsers([...users, user]);
  return toPublic(user);
}

export async function verifyCredentials(email: string, password: string): Promise<User> {
  const user = readUsers().find((u) => u.email === normalizeEmail(email));
  if (!user || (await hashPassword(password, user.salt)) !== user.passwordHash) {
    throw new AuthError('invalid-credentials', 'Incorrect email or password.');
  }
  return toPublic(user);
}

/** Adds the demo account the first time the app runs in a browser. */
export async function ensureDemoUser() {
  if (emailExists(DEMO_ACCOUNT.email)) return;
  try {
    await createUser({
      email: DEMO_ACCOUNT.email,
      password: DEMO_ACCOUNT.password,
      displayName: DEMO_ACCOUNT.displayName,
      birthDate: '2000-01-01',
      gender: 'prefer-not-to-say',
      marketingOptOut: true,
      shareData: false,
    });
  } catch {
    /* storage unavailable or a race with another tab: nothing to do */
  }
}

// Session: "Remember me" keeps it in localStorage, otherwise only for this tab (sessionStorage).

export function saveSession(userId: string, remember: boolean) {
  try {
    clearSession();
    (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, userId);
  } catch {
    /* session stays in memory only */
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function loadSessionUser(): User | null {
  try {
    const id = sessionStorage.getItem(SESSION_KEY) ?? localStorage.getItem(SESSION_KEY);
    if (!id) return null;
    const user = readUsers().find((u) => u.id === id);
    return user ? toPublic(user) : null;
  } catch {
    return null;
  }
}
