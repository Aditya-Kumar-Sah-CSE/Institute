import { getCodeArenaActor } from '@/features/code-arena/server';
import ProblemHubClient from '@/features/code-arena/components/ProblemHubClient';
import '@/features/code-arena/components/CodeArena.css';

export default async function ProblemHubPage() {
  const { user } = await getCodeArenaActor();
  if (!user) return null;
  return <ProblemHubClient userId={user.id} />;
}
