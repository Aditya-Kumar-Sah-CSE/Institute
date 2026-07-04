'use client';

import React from 'react';
import Modal from './Modal';
import Button from './Button';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isPending?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  isPending = false
}: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div style={{ padding: 'var(--space-md) 0' }}>
        <p style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
          {message}
        </p>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-md)', marginTop: 'var(--space-lg)' }}>
        <Button variant="ghost" onClick={onClose} disabled={isPending}>
          {cancelText}
        </Button>
        <Button 
          variant={isDestructive ? 'danger' : 'primary'} 
          onClick={onConfirm}
          disabled={isPending}
        >
          {isPending ? 'Processing...' : confirmText}
        </Button>
      </div>
    </Modal>
  );
}
