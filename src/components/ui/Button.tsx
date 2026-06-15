import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading = false, disabled, children, ...props }, ref) => {
    const variants = {
      primary: 'bg-primary text-white hover:bg-primary-dark shadow-sm active:bg-primary-dark active:text-white',
      secondary: 'bg-white border border-primary text-primary hover:bg-primary-light active:bg-primary-light active:text-primary',
      ghost: 'bg-transparent text-primary hover:bg-primary-light active:bg-primary-light active:text-primary',
      danger: 'bg-danger text-white hover:bg-danger/90 shadow-sm active:bg-danger active:text-white',
      outline: 'bg-transparent border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 active:bg-gray-100 active:text-gray-900',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm rounded-[8px]',
      md: 'px-5 py-2.5 text-sm rounded-[12px]',
      lg: 'px-8 py-4 text-base font-medium rounded-[12px]',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer focus-ring',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
