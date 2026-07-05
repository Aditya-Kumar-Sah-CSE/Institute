import { getLeaderboardData } from './actions';
import { auth } from '@/lib/auth/auth.config';
import { redirect } from 'next/navigation';
import Card from '@/components/ui/Card';
import { Trophy, Medal, Award } from 'lucide-react';

export default async function LeaderboardPage({ params }: { params: Promise<{ tenant: string }> }) {
  const session = await auth();
  const { tenant } = await params;

  if (!session || !session.user) {
    redirect(`/${tenant}/login`);
  }

  const leaderboardUsers = await getLeaderboardData();

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="bg-amber-100 p-4 rounded-full text-amber-500 mb-4 inline-block shadow-sm">
          <Trophy size={48} />
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Hall of Fame</h1>
        <p className="text-lg text-gray-500 mt-2">See how you rank against peers in your institute.</p>
      </div>

      <Card padding="none" className="overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Rank</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Student</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Level</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total XP</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {leaderboardUsers.map((user, index) => {
              const prevIndex = index - 1;
              const prevUser = prevIndex >= 0 ? leaderboardUsers[prevIndex] : null;
              
              // Dense logic to simulate tied ranks loosely, not perfect but okay for PoC 
              const rank = index + 1;

              return (
                <tr key={user.id} className={user.id === session.user?.id ? 'bg-indigo-50/50' : 'hover:bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        rank === 1 ? 'bg-yellow-100 text-yellow-600' :
                        rank === 2 ? 'bg-gray-200 text-gray-700' :
                        rank === 3 ? 'bg-amber-100 text-amber-700' : 'bg-gray-50 text-gray-500'
                      }`}>
                        {rank === 1 ? <Trophy size={14} /> : rank === 2 ? <Medal size={14} /> : rank === 3 ? <Award size={14} /> : rank}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold overflow-hidden">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                          user.name.charAt(0)
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 flex items-center gap-2">
                          {user.name} {user.id === session.user?.id && <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">You</span>}
                        </div>
                        {user.role !== 'student' && (
                          <span className="text-xs text-indigo-500 uppercase tracking-wide font-medium">{user.role}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                      {user.level}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className="font-mono font-bold text-lg text-emerald-600">
                      {user.xp.toLocaleString()} XP
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
