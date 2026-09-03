'use client';

import React, { useState, useRef } from 'react';
import './Button.css';
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

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (confirmMessage) {
      e.preventDefault();
      setShowConfirm(true);
      return;
    }
    if (onClick) {
      onClick(e);
    }
  };

  const handleConfirm = () => {
    setShowConfirm(false);
    
    if (props.type === 'submit' && buttonRef.current) {
      const form = buttonRef.current.closest('form');
      if (form) {
        if (props.name) {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = props.name;
          input.value = props.value ? String(props.value) : '';
          form.appendChild(input);
        }
        
        setTimeout(() => {
          form.requestSubmit();
        }, 10);
        return;
      }
    }
    
    if (onClick) {
      const mockEvent = { preventDefault: () => {}, stopPropagation: () => {} } as React.MouseEvent<HTMLButtonElement>;
      onClick(mockEvent);
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
        <Modal isOpen={showConfirm} onClose={() => setShowConfirm(false)} title="Smart Learning App says:">
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
