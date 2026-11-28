import ForgotPasswordForm from '@/features/auth/components/ForgotPasswordForm';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Forgot Password | Debuggerzz',
  description: 'Reset your password for Debuggerzz.',
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
