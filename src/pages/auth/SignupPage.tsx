import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { Check, ChevronLeft } from 'lucide-react';
import { BRAND } from '../../config/brand';
import { useAuth } from '../../context/authContext';
import { useUI } from '../../context/uiContext';
import { AuthError, emailExists, isStrongPassword, isValidEmail, passwordChecks, type Gender } from '../../lib/auth';
import { AuthLayout } from '../../components/auth/AuthLayout';
import {
  FieldError,
  FormAlert,
  OrDivider,
  PasswordField,
  PrimaryButton,
  TextField,
  errorBorder,
  inputClass,
} from '../../components/auth/fields';
import { SocialButtons, providerLabel, type Provider } from '../../components/auth/SocialButtons';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const GENDERS: { value: Gender; label: string }[] = [
  { value: 'man', label: 'Man' },
  { value: 'woman', label: 'Woman' },
  { value: 'non-binary', label: 'Non-binary' },
  { value: 'something-else', label: 'Something else' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' },
];

const MIN_AGE = 13;

interface FormState {
  email: string;
  password: string;
  displayName: string;
  day: string;
  month: string;
  year: string;
  gender: Gender | '';
  marketingOptOut: boolean;
  shareData: boolean;
}

type Errors = Partial<Record<'email' | 'password' | 'displayName' | 'birthDate' | 'gender', ReactNode>>;

function validateBirthDate(day: string, month: string, year: string): string | null {
  if (!day || !month || !year) return 'Please enter your full date of birth.';
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  const date = new Date(y, m - 1, d);
  const now = new Date();
  if (y < 1900 || date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d || date > now) {
    return 'Please enter a valid date of birth.';
  }
  const age = now.getFullYear() - y - (now < new Date(now.getFullYear(), m - 1, d) ? 1 : 0);
  if (age < MIN_AGE) return `You need to be at least ${MIN_AGE} years old to create an account.`;
  return null;
}

const STEP_TITLES = ['', 'Create a password', 'Tell us about yourself', 'Terms & Conditions'];

/** Sign-up wizard: email, then password, profile and terms (steps 1-3 of 3). */
export function SignupPage() {
  useDocumentTitle(`Sign up | ${BRAND.name}`);
  const { user, signUp } = useAuth();
  const { showToast } = useUI();
  const navigate = useNavigate();
  const location = useLocation();
  const prefillEmail = (location.state as { email?: string } | null)?.email ?? '';

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>({
    email: prefillEmail,
    password: '',
    displayName: '',
    day: '',
    month: '',
    year: '',
    gender: '',
    marketingOptOut: false,
    shareData: false,
  });
  const [errors, setErrors] = useState<Errors>({});
  const [alert, setAlert] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user && !submitting) return <Navigate to="/" replace />;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key === 'day' || key === 'month' || key === 'year' ? 'birthDate' : key]: undefined }));
  };

  const validateStep = (): Errors => {
    const next: Errors = {};
    if (step === 0) {
      if (!isValidEmail(form.email)) {
        next.email = 'This email is invalid. Make sure it’s written like example@email.com';
      } else if (emailExists(form.email)) {
        next.email = (
          <>
            This address is already linked to an account. To continue,{' '}
            <Link to="/login" className="font-bold underline">
              log in
            </Link>
            .
          </>
        );
      }
    }
    if (step === 1 && !isStrongPassword(form.password)) {
      next.password = 'Your password doesn’t meet the requirements below.';
    }
    if (step === 2) {
      if (!form.displayName.trim()) next.displayName = 'Enter a name for your profile.';
      const dobError = validateBirthDate(form.day, form.month, form.year);
      if (dobError) next.birthDate = dobError;
      if (!form.gender) next.gender = 'Select your gender.';
    }
    return next;
  };

  const goNext = async (e: FormEvent) => {
    e.preventDefault();
    setAlert(null);
    const found = validateStep();
    setErrors(found);
    if (Object.keys(found).length) return;
    if (step < 3) {
      setStep(step + 1);
      return;
    }
    setSubmitting(true);
    try {
      const created = await signUp({
        email: form.email,
        password: form.password,
        displayName: form.displayName,
        birthDate: `${form.year}-${form.month.padStart(2, '0')}-${form.day.padStart(2, '0')}`,
        gender: form.gender as Gender,
        marketingOptOut: form.marketingOptOut,
        shareData: form.shareData,
      });
      showToast(`Welcome to ${BRAND.name}, ${created.displayName}!`);
      navigate('/', { replace: true });
    } catch (err) {
      setSubmitting(false);
      setAlert(err instanceof AuthError ? err.message : 'Something went wrong. Please try again.');
    }
  };

  const onSocial = (p: Provider) =>
    setAlert(`Signing up with ${providerLabel(p)} isn’t available in this demo. Use your email instead.`);

  if (step === 0) {
    return (
      <AuthLayout>
        <h1 className="mb-8 text-center text-[32px] font-bold leading-tight tracking-tight sm:text-5xl">
          Sign up to start listening
        </h1>
        {alert && <FormAlert>{alert}</FormAlert>}
        <form onSubmit={goNext} noValidate>
          <TextField
            label="Email address"
            type="email"
            autoComplete="email"
            autoFocus
            placeholder="name@domain.com"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            error={errors.email}
          />
          <div className="mt-4">
            <PrimaryButton type="submit">Next</PrimaryButton>
          </div>
        </form>
        <OrDivider />
        <SocialButtons verb="Sign up with" providers={['phone', 'google', 'apple']} onSelect={onSocial} />
        <p className="mt-10 text-center text-subdued">
          Already have an account?
          <Link to="/login" className="mt-1 block font-bold text-white hover:text-accent hover:underline">
            Log in
          </Link>
        </p>
      </AuthLayout>
    );
  }

  const checks = passwordChecks(form.password);

  return (
    <AuthLayout wide>
      <div className="h-0.5 w-full overflow-hidden rounded bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={3} aria-valuenow={step}>
        <div className="h-full bg-accent transition-[width] duration-300" style={{ width: `${(step / 3) * 100}%` }} />
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            setErrors({});
            setAlert(null);
            setStep(step - 1);
          }}
          aria-label="Go back"
          className="grid size-10 shrink-0 place-items-center rounded-full text-subdued transition hover:text-white"
        >
          <ChevronLeft className="size-6" />
        </button>
        <div>
          <p className="font-medium text-subdued">Step {step} of 3</p>
          <h1 className="font-bold">{STEP_TITLES[step]}</h1>
        </div>
      </div>

      <form onSubmit={goNext} noValidate className="mx-auto mt-6 max-w-[324px]">
        {alert && <FormAlert>{alert}</FormAlert>}

        {step === 1 && (
          <>
            <input type="email" name="username" autoComplete="username" value={form.email} readOnly hidden />
            <PasswordField
              label="Password"
              autoComplete="new-password"
              autoFocus
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              error={errors.password}
            />
            <p className="mt-4 text-sm font-bold">Your password must contain at least</p>
            <ul className="mt-2 space-y-1.5 text-sm">
              <Requirement met={checks.letter}>1 letter</Requirement>
              <Requirement met={checks.numberOrSpecial}>1 number or special character (example: # ? ! &amp;)</Requirement>
              <Requirement met={checks.length}>10 characters</Requirement>
            </ul>
          </>
        )}

        {step === 2 && (
          <>
            <TextField
              label="Name"
              hint="This name will appear on your profile"
              autoComplete="name"
              autoFocus
              value={form.displayName}
              onChange={(e) => set('displayName', e.target.value)}
              error={errors.displayName}
            />

            <fieldset className="mt-6">
              <legend className="mb-1 text-sm font-bold">Date of birth</legend>
              <p className="mb-2 text-sm text-subdued">We use this to keep the experience age-appropriate.</p>
              <div className="flex gap-2">
                <input
                  aria-label="Day"
                  inputMode="numeric"
                  placeholder="dd"
                  maxLength={2}
                  value={form.day}
                  onChange={(e) => set('day', e.target.value.replace(/\D/g, ''))}
                  className={`${inputClass} w-16 ${errors.birthDate ? errorBorder : 'border-muted'}`}
                />
                <select
                  aria-label="Month"
                  value={form.month}
                  onChange={(e) => set('month', e.target.value)}
                  className={`${inputClass} min-w-0 flex-1 ${form.month ? '' : 'text-muted'} ${errors.birthDate ? errorBorder : 'border-muted'}`}
                >
                  <option value="" disabled>
                    Month
                  </option>
                  {MONTHS.map((name, i) => (
                    <option key={name} value={String(i + 1)} className="text-white">
                      {name}
                    </option>
                  ))}
                </select>
                <input
                  aria-label="Year"
                  inputMode="numeric"
                  placeholder="yyyy"
                  maxLength={4}
                  value={form.year}
                  onChange={(e) => set('year', e.target.value.replace(/\D/g, ''))}
                  className={`${inputClass} w-20 ${errors.birthDate ? errorBorder : 'border-muted'}`}
                />
              </div>
              {errors.birthDate && <FieldError>{errors.birthDate}</FieldError>}
            </fieldset>

            <fieldset className="mt-6">
              <legend className="mb-1 text-sm font-bold">Gender</legend>
              <p className="mb-3 text-sm text-subdued">This helps us recommend things you’ll like.</p>
              <div className="flex flex-wrap gap-x-5 gap-y-3">
                {GENDERS.map((g) => (
                  <label key={g.value} className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                    <input
                      type="radio"
                      name="gender"
                      value={g.value}
                      checked={form.gender === g.value}
                      onChange={() => set('gender', g.value)}
                      className="size-4 accent-[#1ed760]"
                    />
                    {g.label}
                  </label>
                ))}
              </div>
              {errors.gender && <FieldError>{errors.gender}</FieldError>}
            </fieldset>
          </>
        )}

        {step === 3 && (
          <>
            <div className="space-y-3">
              <CheckRow checked={form.marketingOptOut} onChange={(v) => set('marketingOptOut', v)}>
                I’d rather not get marketing messages from {BRAND.name}
              </CheckRow>
              <CheckRow checked={form.shareData} onChange={(v) => set('shareData', v)}>
                Share my registration data with {BRAND.name}’s content partners for marketing
              </CheckRow>
            </div>
            <p className="mt-6 text-xs leading-relaxed text-subdued">
              By clicking Sign up, you accept that this is a demo: your account is saved only in this browser and is
              removed if you clear this site’s data. Don’t reuse a real password.
            </p>
          </>
        )}

        <div className="mt-8">
          <PrimaryButton type="submit" loading={submitting}>
            {step === 3 ? 'Sign up' : 'Next'}
          </PrimaryButton>
        </div>
      </form>
    </AuthLayout>
  );
}

function Requirement({ met, children }: { met: boolean; children: ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <span
        aria-hidden="true"
        className={`grid size-4 shrink-0 place-items-center rounded-full border transition-colors ${
          met ? 'border-accent bg-accent text-black' : 'border-muted'
        }`}
      >
        {met && <Check className="size-3" strokeWidth={3.5} />}
      </span>
      <span className={met ? 'text-white' : 'text-subdued'}>{children}</span>
      <span className="sr-only">{met ? '(done)' : '(not yet)'}</span>
    </li>
  );
}

function CheckRow({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-[4px] bg-surface-3 p-4 text-sm font-medium">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-[#1ed760]"
      />
      <span>{children}</span>
    </label>
  );
}
