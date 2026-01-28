import React from 'react';
import { useThemeStore } from '../stores/themeStore';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}) => {
  const { theme } = useThemeStore();

  if (!isOpen) return null;

  const sizeStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  const bgColor = theme === 'light' ? 'bg-white' : 'bg-gray-800';
  const textColor = theme === 'light' ? 'text-gray-900' : 'text-white';
  const borderColor = theme === 'light' ? 'border-gray-200' : 'border-gray-700';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`relative ${sizeStyles[size]} w-full mx-4 ${bgColor} rounded-lg shadow-xl`}>
        {/* Header */}
        {title && (
          <div className={`flex items-center justify-between p-6 border-b ${borderColor}`}>
            <h2 className={`text-xl font-semibold ${textColor}`}>{title}</h2>
            <button
              onClick={onClose}
              className={`text-2xl leading-none ${theme === 'light' ? 'text-gray-400 hover:text-gray-600' : 'text-gray-500 hover:text-gray-300'}`}
            >
              ×
            </button>
          </div>
        )}

        {/* Body */}
        <div className={`p-6 ${textColor}`}>{children}</div>

        {/* Footer */}
        {footer && (
          <div className={`flex items-center justify-end gap-3 p-6 border-t ${borderColor}`}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
