import ForgotPasswordForm from '@/features/auth/components/ForgotPasswordForm';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Forgot Password | Smart Learning',
  description: 'Reset your password for Smart Learning.',
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
