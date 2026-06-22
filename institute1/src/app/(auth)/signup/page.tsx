import SignupForm from '@/features/auth/components/SignupForm';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign Up | SkillArena',
  description: 'Join SkillArena and start your full-stack development journey.',
};

export default function SignupPage() {
  return <SignupForm />;
}
