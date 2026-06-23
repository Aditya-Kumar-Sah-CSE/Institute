import SignupForm from '@/features/auth/components/SignupForm';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign Up | Smart Learning',
  description: 'Join Smart Learning and start your journey.',
};

export default function SignupPage() {
  return <SignupForm />;
}
