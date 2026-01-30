import React from 'react';
import { useThemeStore } from '../stores/themeStore';

interface InputFieldProps {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  min?: string;
  max?: string;
  step?: string;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder = '',
  required = false,
  disabled = false,
  min,
  max,
  step,
}) => {
  const { theme } = useThemeStore();

  const isDark = theme === 'dark';
  const borderColor = isDark ? '#667eea' : '#667eea';
  const bgColor = isDark ? '#1e293b' : '#ffffff';
  const textColor = isDark ? '#e2e8f0' : '#1e293b';
  const labelColor = isDark ? '#cbd5e1' : '#475569';
  const focusBgColor = isDark ? '#0f172a' : '#f8fafc';

  return (
    <div style={{ marginBottom: '16px' }}>
      <label
        htmlFor={name}
        style={{
          display: 'block',
          marginBottom: '8px',
          fontSize: '13px',
          fontWeight: '600',
          color: labelColor,
          letterSpacing: '0.5px',
        }}
      >
        {label}
        {required && <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        style={{
          width: '100%',
          padding: '10px 12px',
          fontSize: '14px',
          border: `2px solid ${borderColor}`,
          borderRadius: '6px',
          backgroundColor: bgColor,
          color: textColor,
          transition: 'all 0.2s ease',
          boxSizing: 'border-box',
          outline: 'none',
        }}
        onFocus={(e) => {
          e.currentTarget.style.backgroundColor = focusBgColor;
          e.currentTarget.style.borderColor = '#3b82f6';
          e.currentTarget.style.boxShadow = `0 0 0 3px ${isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.1)'}`;
        }}
        onBlur={(e) => {
          e.currentTarget.style.backgroundColor = bgColor;
          e.currentTarget.style.borderColor = borderColor;
          e.currentTarget.style.boxShadow = 'none';
        }}
      />
    </div>
  );
};

export default InputField;
