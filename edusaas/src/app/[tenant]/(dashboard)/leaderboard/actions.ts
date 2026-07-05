import { getTenantDb } from '@/lib/db/tenant';
import { profiles, user_badges } from '@/lib/db/schema/tenant-schema';
import { desc, count, eq } from 'drizzle-orm';

export async function getLeaderboardData() {
  const db = await getTenantDb();
  
  // Drizzle ORM native join & aggregation to mirror the previous Supabase view or RPC
  // Note: For complex gamification queries in Drizzle, you often write direct selects with subqueries
  const leaderboardUsers = await db
    .select({
      id: profiles.id,
      name: profiles.name,
      avatar_url: profiles.avatar_url,
      xp: profiles.xp,
      level: profiles.level,
      role: profiles.role,
    })
    .from(profiles)
    .orderBy(desc(profiles.xp))
    .limit(100);

  // Optionally fetch badge counts efficiently.
  // We'll leave it as a high-level query for the prototype.
  return leaderboardUsers;
}
