import { getUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AISettingsClient from '@/features/ai-settings/components/AISettingsClient';

export const metadata = {
  title: 'AI Agent Settings — Smart Learn',
  description: 'Manage your personal Google Gemini and xAI Grok API keys securely.'
};

export default async function AIAgentSettingsPage() {
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }

  return <AISettingsClient />;
}
