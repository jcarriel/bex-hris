import React from 'react';
import { useThemeStore } from '../stores/themeStore';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hoverable?: boolean;
  shadow?: 'sm' | 'md' | 'lg' | 'none';
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, hoverable = false, shadow = 'md', ...props }, ref) => {
    const { theme } = useThemeStore();

    const bgColor = theme === 'light' ? 'bg-white' : 'bg-gray-800';
    const borderColor = theme === 'light' ? 'border-gray-200' : 'border-gray-700';
    const hoverStyle = hoverable
      ? theme === 'light'
        ? 'hover:shadow-lg hover:border-gray-300 cursor-pointer'
        : 'hover:shadow-lg hover:border-gray-600 cursor-pointer'
      : '';

    const shadowStyles = {
      none: 'shadow-none',
      sm: 'shadow-sm',
      md: 'shadow-md',
      lg: 'shadow-lg',
    };

    return (
      <div
        ref={ref}
        className={`${bgColor} border ${borderColor} rounded-lg p-6 transition-all duration-200 ${shadowStyles[shadow]} ${hoverStyle}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export default Card;
