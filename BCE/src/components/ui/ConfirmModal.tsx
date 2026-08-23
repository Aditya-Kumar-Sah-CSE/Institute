'use client';

import React from 'react';
import Modal from './Modal';
import Button from './Button';
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isPending?: boolean;
  hideCancel?: boolean;
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
  isPending = false,
  hideCancel = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '8px 4px 4px 4px',
        }}
      >
        {/* Glowing Icon Header */}
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            background: isDestructive
              ? 'rgba(255, 42, 133, 0.12)'
              : 'rgba(255, 184, 0, 0.12)',
            border: isDestructive
              ? '1px solid rgba(255, 42, 133, 0.3)'
              : '1px solid rgba(255, 184, 0, 0.3)',
            boxShadow: isDestructive
              ? '0 0 20px rgba(255, 42, 133, 0.25)'
              : '0 0 20px rgba(255, 184, 0, 0.25)',
            color: isDestructive ? '#ff2a85' : '#ffb800',
          }}
        >
          {isDestructive ? <Trash2 size={26} /> : <AlertTriangle size={26} />}
        </div>

        {/* Modal Title */}
        <h3
          style={{
            fontSize: '1.25rem',
            fontWeight: '700',
            color: '#ffffff',
            margin: '0 0 8px 0',
            letterSpacing: '-0.2px',
          }}
        >
          {title}
        </h3>

        {/* Modal Description */}
        <p
          style={{
            fontSize: '0.925rem',
            color: 'var(--text-secondary, #94a3b8)',
            margin: '0 0 24px 0',
            lineHeight: 1.55,
            whiteSpace: 'pre-wrap',
            maxWidth: '360px',
          }}
        >
          {message}
        </p>

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            width: '100%',
            justifyContent: 'center',
          }}
        >
          {!hideCancel && (
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={isPending}
              style={{
                flex: 1,
                height: '44px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: 'var(--text-secondary, #94a3b8)',
                fontWeight: '600',
              }}
            >
              {cancelText}
            </Button>
          )}

          <Button
            variant={isDestructive ? 'danger' : 'primary'}
            onClick={handleConfirm}
            disabled={isPending}
            style={{
              flex: 1,
              height: '44px',
              borderRadius: '10px',
              fontWeight: '700',
              boxShadow: isDestructive
                ? '0 4px 14px rgba(239, 68, 68, 0.4)'
                : '0 4px 14px rgba(0, 242, 254, 0.3)',
            }}
          >
            {isPending ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                <Loader2 size={16} className="animate-spin" />
                <span>Processing...</span>
              </div>
            ) : (
              confirmText
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
