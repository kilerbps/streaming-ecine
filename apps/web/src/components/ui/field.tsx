import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';

/**
 * Champs accessibles : étiquette visible, aide et erreur liées par aria-describedby (docs/05 §5).
 * Utilisables dans les composants clients (formulaires) comme serveur.
 */
interface FieldShellProps {
  id: string;
  label: ReactNode;
  help?: ReactNode;
  error?: string;
  optional?: boolean;
  children: ReactNode;
}

function FieldShell({ id, label, help, error, optional, children }: FieldShellProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-text">
        {label}
        {optional ? <span className="ml-2 text-muted font-normal">(facultatif)</span> : null}
      </label>
      {children}
      {help ? (
        <p id={`${id}-help`} className="text-sm text-muted">
          {help}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-danger flex gap-1.5 items-start" role="alert">
          <span aria-hidden="true">!</span>
          {error}
        </p>
      ) : null}
    </div>
  );
}

const CONTROL =
  'w-full min-h-11 bg-surface-1 text-text border border-border-strong rounded-md px-3 py-2 ' +
  'placeholder:text-muted aria-[invalid=true]:border-danger';

function describedBy(id: string, help?: ReactNode, error?: string): string | undefined {
  return (
    [help ? `${id}-help` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') ||
    undefined
  );
}

export function TextField({
  label,
  help,
  error,
  optional,
  id: idProp,
  ...rest
}: {
  label: ReactNode;
  help?: ReactNode;
  error?: string;
  optional?: boolean;
} & InputHTMLAttributes<HTMLInputElement>) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <FieldShell id={id} label={label} help={help} error={error} optional={optional}>
      <input
        id={id}
        className={CONTROL}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, help, error)}
        {...rest}
      />
    </FieldShell>
  );
}

export function TextAreaField({
  label,
  help,
  error,
  optional,
  id: idProp,
  ...rest
}: {
  label: ReactNode;
  help?: ReactNode;
  error?: string;
  optional?: boolean;
} & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <FieldShell id={id} label={label} help={help} error={error} optional={optional}>
      <textarea
        id={id}
        className={`${CONTROL} min-h-32 resize-y`}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, help, error)}
        {...rest}
      />
    </FieldShell>
  );
}

export function CheckboxField({
  label,
  error,
  id: idProp,
  ...rest
}: { label: ReactNode; error?: string } & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          className="mt-1 size-5 shrink-0 accent-[var(--accent)]"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          {...rest}
        />
        <label htmlFor={id} className="text-sm leading-6">
          {label}
        </label>
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Message d'erreur global d'un formulaire (annoncé aux lecteurs d'écran). */
export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="rounded-md border-l-4 border-danger bg-surface-1 px-4 py-3 text-sm text-text"
    >
      {message}
    </div>
  );
}
