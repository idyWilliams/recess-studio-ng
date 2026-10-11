import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant =
  'primary' | 'secondary' | 'navy' | 'gold' | 'destructive' | 'ghost';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-recess-purple text-white hover:bg-recess-purple-hover active:scale-[0.98] shadow-glow-purple focus-visible:outline-recess-purple disabled:shadow-none',
  secondary:
    'bg-recess-cream-card text-recess-text-primary border border-recess-cream-border hover:bg-recess-cream-muted active:scale-[0.98] focus-visible:outline-recess-purple',
  navy: 'bg-recess-navy text-white hover:bg-recess-navy-light active:scale-[0.98] focus-visible:outline-recess-purple',
  gold: 'bg-recess-gold text-white hover:bg-amber-600 active:scale-[0.98] shadow-glow-gold focus-visible:outline-recess-gold',
  destructive:
    'bg-recess-error text-white hover:bg-red-600 active:scale-[0.98] focus-visible:outline-recess-error',
  ghost:
    'bg-transparent text-recess-text-primary hover:bg-recess-purple-subtle active:scale-[0.98] focus-visible:outline-recess-purple',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs font-semibold rounded-lg gap-1.5',
  md: 'px-4 py-2.5 text-sm font-semibold rounded-xl gap-2',
  lg: 'px-5 py-3.5 text-base font-bold rounded-2xl gap-2.5',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  type = 'button',
  disabled,
  ...rest
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center font-medium transition-all select-none disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      className={`${base} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${className}`.trim()}
      {...rest}
    >
      {isLoading ? (
        <span
          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-label="Loading"
        />
      ) : (
        leftIcon
      )}
      <span>{children}</span>
      {!isLoading && rightIcon}
    </button>
  );
}
