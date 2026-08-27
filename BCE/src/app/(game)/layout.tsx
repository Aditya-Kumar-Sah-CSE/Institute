import { getUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Analytics } from "@vercel/analytics/react";

export default async function GameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <>
      {children}
      <Analytics />
    </>
  );
}
