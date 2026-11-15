import {
  useId,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
} from 'react';
import { CircleAlert, Eye, EyeOff } from 'lucide-react';

export const inputClass =
  'h-12 w-full rounded-[4px] border bg-surface px-3 text-base text-white outline-none transition-colors placeholder:text-muted hover:border-white focus:border-white focus:shadow-[inset_0_0_0_1px_#fff]';

export const errorBorder = 'border-[#f3727f] hover:border-[#f3727f] focus:border-[#f3727f]';

export function FieldError({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} role="alert" className="mt-2 flex items-start gap-1.5 text-sm font-medium text-[#f3727f]">
      <CircleAlert className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: ReactNode;
  hint?: ReactNode;
  ref?: Ref<HTMLInputElement>;
}

export function TextField({ label, error, hint, id, className = '', ref, ...props }: TextFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;
  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-2 block text-sm font-bold">
        {label}
      </label>
      {hint && <p className="-mt-1 mb-2 text-sm text-subdued">{hint}</p>}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        className={`${inputClass} ${error ? errorBorder : 'border-muted'}`}
        {...props}
      />
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}

export function PasswordField({ label, error, id, className = '', ref, ...props }: TextFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;
  const [visible, setVisible] = useState(false);
  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-2 block text-sm font-bold">
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={visible ? 'text' : 'password'}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={`${inputClass} pr-12 ${error ? errorBorder : 'border-muted'}`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          className="absolute right-1 top-1/2 grid size-10 -translate-y-1/2 place-items-center text-subdued transition hover:scale-105 hover:text-white"
        >
          {visible ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
        </button>
      </div>
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}

/** Red banner shown above a form for errors that are not tied to one field. */
export function FormAlert({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="mb-6 flex items-start gap-3 rounded-[4px] bg-[#e91429] px-4 py-3 text-sm font-medium">
      <CircleAlert className="mt-0.5 size-5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export function PrimaryButton({
  children,
  loading = false,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className="flex h-12 w-full items-center justify-center rounded-full bg-accent font-bold text-black transition hover:scale-[1.02] hover:bg-accent-hover active:scale-100 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
    >
      {loading ? <span className="size-5 animate-spin rounded-full border-2 border-black/30 border-t-black" /> : children}
    </button>
  );
}

export function OrDivider() {
  return <p className="my-6 text-center text-sm text-subdued">or</p>;
}
