import React from 'react';
import { useThemeStore } from '../stores/themeStore';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const { theme } = useThemeStore();

    const baseStyles = 'font-semibold rounded transition-colors duration-200 flex items-center justify-center gap-2';

    const variantStyles = {
      primary: theme === 'light'
        ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400'
        : 'bg-blue-500 text-white hover:bg-blue-600 disabled:bg-blue-700',
      secondary: theme === 'light'
        ? 'bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:bg-gray-100'
        : 'bg-gray-700 text-gray-100 hover:bg-gray-600 disabled:bg-gray-800',
      danger: theme === 'light'
        ? 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-400'
        : 'bg-red-500 text-white hover:bg-red-600 disabled:bg-red-700',
      success: theme === 'light'
        ? 'bg-green-600 text-white hover:bg-green-700 disabled:bg-green-400'
        : 'bg-green-500 text-white hover:bg-green-600 disabled:bg-green-700',
      warning: theme === 'light'
        ? 'bg-yellow-600 text-white hover:bg-yellow-700 disabled:bg-yellow-400'
        : 'bg-yellow-500 text-white hover:bg-yellow-600 disabled:bg-yellow-700',
    };

    const sizeStyles = {
      sm: 'px-3 py-1 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    };

    const widthStyle = fullWidth ? 'w-full' : '';

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyle}`}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
