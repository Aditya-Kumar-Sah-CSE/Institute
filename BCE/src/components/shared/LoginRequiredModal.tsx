'use client';

import Modal from '@/components/ui/Modal';
import LoginForm from '@/features/auth/components/LoginForm';

interface LoginRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginRequiredModal({ isOpen, onClose }: LoginRequiredModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="md">
      <div style={{
        marginTop: '-24px', // Shift up slightly to fit nicely in the modal layout
        borderRadius: '8px',
        overflow: 'hidden'
      }} className="login-modal-inner">
        <LoginForm />
      </div>
      <style>{`
        /* Overrides to make the LoginForm look perfect inside a modal container */
        .login-modal-inner .auth-container {
          min-height: auto;
          background: none;
          padding: 12px 0 0 0;
        }
        .login-modal-inner .auth-bg-effects {
          display: none;
        }
        .login-modal-inner .auth-card {
          border: none;
          box-shadow: none;
          background: transparent;
          padding: 8px;
          margin: 0;
          max-width: 100%;
        }
        .login-modal-inner .auth-card a[href="/"] {
          display: none !important; /* Hide back to home button inside modal */
        }
      `}</style>
    </Modal>
  );
}
