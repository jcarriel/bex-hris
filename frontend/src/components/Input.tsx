import React from 'react';
import { useThemeStore } from '../stores/themeStore';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, fullWidth = true, ...props }, ref) => {
    const { theme } = useThemeStore();

    const bgColor = theme === 'light' ? 'bg-white' : 'bg-gray-700';
    const borderColor = theme === 'light'
      ? error
        ? 'border-red-500'
        : 'border-gray-300'
      : error
      ? 'border-red-500'
      : 'border-gray-600';
    const textColor = theme === 'light' ? 'text-gray-900' : 'text-white';
    const placeholderColor = theme === 'light' ? 'placeholder-gray-400' : 'placeholder-gray-500';

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label className={`block text-sm font-medium mb-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full px-4 py-2 border rounded-lg transition-colors duration-200 ${bgColor} ${borderColor} ${textColor} ${placeholderColor} focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed`}
          {...props}
        />
        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        {helperText && !error && <p className={`text-sm mt-1 ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
