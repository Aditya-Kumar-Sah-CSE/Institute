import ResetPasswordForm from '@/features/auth/components/ResetPasswordForm';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reset Password | Debuggerzz',
  description: 'Set a new password for Debuggerzz.',
};

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
