'use client';

import React from 'react';
import './Button.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  icon,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`btn btn-${variant} btn-${size} ${fullWidth ? 'btn-full' : ''} ${isLoading ? 'btn-loading' : ''} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <span className="btn-spinner" />}
      {icon && !isLoading && <span className="btn-icon">{icon}</span>}
      {children && <span className="btn-label">{children}</span>}
    </button>
  );
}
