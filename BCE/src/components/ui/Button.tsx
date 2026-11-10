'use client';

import React, { useState, useRef } from 'react';
import Modal from './Modal';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  confirmMessage?: string;
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
  confirmMessage,
  onClick,
  ...props
}: ButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isConfirmedRef = useRef(false);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (confirmMessage && !isConfirmedRef.current) {
      e.preventDefault();
      setShowConfirm(true);
      return;
    }
    isConfirmedRef.current = false;
    if (onClick) {
      onClick(e);
    }
  };

  const handleConfirm = () => {
    setShowConfirm(false);
    isConfirmedRef.current = true;
    
    if (buttonRef.current) {
      buttonRef.current.click();
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        suppressHydrationWarning
        className={`btn btn-${variant} btn-${size} ${fullWidth ? 'btn-full' : ''} ${isLoading ? 'btn-loading' : ''} ${className}`}
        disabled={disabled || isLoading}
        onClick={handleClick}
        {...props}
      >
        {isLoading && <span className="btn-spinner" />}
        {icon && !isLoading && <span className="btn-icon">{icon}</span>}
        {children && <span className="btn-label">{children}</span>}
      </button>

      {confirmMessage && (
        <Modal isOpen={showConfirm} onClose={() => setShowConfirm(false)} title="Confirmation">
          <div style={{ marginBottom: 'var(--space-lg)', color: 'var(--text-primary)' }}>
            <p>{confirmMessage}</p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={(e) => { e.preventDefault(); setShowConfirm(false); }}>Cancel</Button>
            <Button variant="primary" onClick={(e) => { e.preventDefault(); handleConfirm(); }}>Confirm</Button>
          </div>
        </Modal>
      )}
    </>
  );
}
