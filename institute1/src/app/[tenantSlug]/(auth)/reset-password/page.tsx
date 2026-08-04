import ResetPasswordForm from '@/features/auth/components/ResetPasswordForm';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reset Password | Smart Learning',
  description: 'Set a new password for Smart Learning.',
};

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
