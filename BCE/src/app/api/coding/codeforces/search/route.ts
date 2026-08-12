import { NextResponse } from 'next/server';
import { getCodeArenaActor } from '@/features/code-arena/server';

export async function GET(request: Request) {
  const { user, isInstructor } = await getCodeArenaActor();
  if (!user || !isInstructor) return NextResponse.json({ error: 'Instructor access is required.' }, { status: 403 });
  const value = new URL(request.url).searchParams.get('q')?.trim().toUpperCase();
  const match = value?.match(/(?:CODEFORCES\.COM\/PROBLEMSET\/PROBLEM\/)?(\d+)\/?([A-Z][A-Z0-9]*)/i);
  if (!match) return NextResponse.json({ error: 'Use a Codeforces id such as 4A or its public URL.' }, { status: 400 });
  try {
    const response = await fetch('https://codeforces.com/api/problemset.problems', { next: { revalidate: 3600 } });
    if (!response.ok) throw new Error('Codeforces is unavailable.');
    const json = await response.json();
    const problem = json.result?.problems?.find((item: any) => String(item.contestId) === match[1] && item.index === match[2]);
    if (!problem) return NextResponse.json({ error: 'Public Codeforces problem not found.' }, { status: 404 });
    return NextResponse.json({ data: { title: problem.name, tags: problem.tags || [], rating: problem.rating || null, external_problem_id: `${problem.contestId}${problem.index}`, external_url: `https://codeforces.com/problemset/problem/${problem.contestId}/${problem.index}` } });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not contact Codeforces.' }, { status: 502 }); }
}
