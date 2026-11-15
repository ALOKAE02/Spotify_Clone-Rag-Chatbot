import { useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { ChevronLeft } from 'lucide-react';
import { BRAND } from '../../config/brand';
import { useAuth } from '../../context/authContext';
import { useUI } from '../../context/uiContext';
import { AuthError, DEMO_ACCOUNT, emailExists, isValidEmail } from '../../lib/auth';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { FormAlert, OrDivider, PasswordField, PrimaryButton, TextField } from '../../components/auth/fields';
import { SocialButtons, providerLabel, type Provider } from '../../components/auth/SocialButtons';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

type Step = 'email' | 'password';

/** Two-step log in: email first, then password. */
export function LoginPage() {
  useDocumentTitle(`Log in | ${BRAND.name}`);
  const { user, logIn } = useAuth();
  const { showToast } = useUI();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [alert, setAlert] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  if (user && !submitting) return <Navigate to={from} replace />;

  const finishLogin = async (loginEmail: string, loginPassword: string) => {
    setSubmitting(true);
    setAlert(null);
    try {
      const loggedIn = await logIn(loginEmail, loginPassword, remember);
      showToast(`Welcome back, ${loggedIn.displayName}!`);
      navigate(from, { replace: true });
    } catch (err) {
      setSubmitting(false);
      setAlert(err instanceof AuthError ? err.message : 'Something went wrong. Please try again.');
    }
  };

  const submitEmail = (e: FormEvent) => {
    e.preventDefault();
    setAlert(null);
    if (!email.trim()) return setEmailError('Please enter your email address.');
    if (!isValidEmail(email)) return setEmailError('This email is invalid. Make sure it’s written like example@email.com');
    if (!emailExists(email)) {
      return setEmailError('We couldn’t find an account with that email.');
    }
    setEmailError(null);
    setStep('password');
    requestAnimationFrame(() => passwordRef.current?.focus());
  };

  const submitPassword = (e: FormEvent) => {
    e.preventDefault();
    if (!password) return setPasswordError('Please enter your password.');
    setPasswordError(null);
    void finishLogin(email, password);
  };

  const useDemoAccount = () => {
    setEmail(DEMO_ACCOUNT.email);
    setPassword(DEMO_ACCOUNT.password);
    setEmailError(null);
    setStep('password');
    void finishLogin(DEMO_ACCOUNT.email, DEMO_ACCOUNT.password);
  };

  const onSocial = (p: Provider) =>
    setAlert(`Logging in with ${providerLabel(p)} isn’t available in this demo. Use your email instead.`);

  return (
    <AuthLayout>
      {step === 'email' ? (
        <>
          <h1 className="mb-8 text-center text-[32px] font-bold leading-tight tracking-tight sm:text-5xl">Welcome back</h1>
          {alert && <FormAlert>{alert}</FormAlert>}
          <form onSubmit={submitEmail} noValidate>
            <TextField
              label="Email"
              type="email"
              autoComplete="username"
              autoFocus
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError(null);
              }}
              error={
                emailError && (
                  <>
                    {emailError}
                    {emailError.startsWith('We couldn’t') && (
                      <>
                        {' '}
                        <Link to="/signup" state={{ email }} className="font-bold underline">
                          Sign up instead
                        </Link>
                      </>
                    )}
                  </>
                )
              }
            />
            <div className="mt-4">
              <PrimaryButton type="submit">Continue</PrimaryButton>
            </div>
          </form>
          <button
            type="button"
            onClick={useDemoAccount}
            className="mt-3 h-10 w-full rounded-full border border-dashed border-accent/70 text-sm font-bold text-accent transition hover:border-accent hover:bg-accent/10"
          >
            Use the demo account
          </button>
          <OrDivider />
          <SocialButtons verb="Continue with" providers={['phone', 'google', 'facebook', 'apple']} onSelect={onSocial} />
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => {
              setStep('email');
              setPassword('');
              setAlert(null);
              setPasswordError(null);
            }}
            aria-label="Back to email"
            className="-ml-2 mb-2 grid size-10 place-items-center rounded-full text-subdued transition hover:text-white"
          >
            <ChevronLeft className="size-6" />
          </button>
          <h1 className="mb-2 text-center text-[32px] font-bold leading-tight tracking-tight">Log in with a password</h1>
          <p className="mb-8 text-center text-sm text-subdued">
            {email}{' '}
            <button
              type="button"
              onClick={() => setStep('email')}
              className="font-bold text-white underline hover:text-accent"
            >
              Change
            </button>
          </p>
          {alert && <FormAlert>{alert}</FormAlert>}
          <form onSubmit={submitPassword} noValidate>
            {/* Hidden username field so password managers pair the saved password with the email. */}
            <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
            <PasswordField
              ref={passwordRef}
              label="Password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) setPasswordError(null);
              }}
              error={passwordError}
            />
            <label className="mt-5 flex cursor-pointer items-center gap-3 text-sm font-medium">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className="relative h-5 w-9 rounded-full bg-muted transition-colors after:absolute after:left-0.5 after:top-0.5 after:size-4 after:rounded-full after:bg-black after:transition-transform peer-checked:bg-accent peer-checked:after:translate-x-4 peer-focus-visible:ring-2 peer-focus-visible:ring-white"
              />
              Remember me
            </label>
            <div className="mt-6">
              <PrimaryButton type="submit" loading={submitting}>
                Log in
              </PrimaryButton>
            </div>
          </form>
          <button
            type="button"
            onClick={() => showToast('Password reset isn’t available in the demo.')}
            className="mx-auto mt-6 block text-sm font-bold underline hover:text-accent"
          >
            Forgot your password?
          </button>
        </>
      )}

      <p className="mt-10 text-center text-subdued">
        Don’t have an account?
        <Link to="/signup" className="mt-1 block font-bold text-white hover:text-accent hover:underline">
          Sign up
        </Link>
      </p>
    </AuthLayout>
  );
}
