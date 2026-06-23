import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ valid: false, error: 'URL is required' }, { status: 400 });
    }

    // Basic format check
    if (!url.startsWith('https://github.com/')) {
      return NextResponse.json({ valid: false, error: 'Must be a valid GitHub URL' }, { status: 400 });
    }

    // Extract owner and repo
    const parts = url.split('github.com/')[1].split('/');
    if (parts.length < 2) {
      return NextResponse.json({ valid: false, error: 'Invalid repository format' }, { status: 400 });
    }

    const owner = parts[0];
    const repo = parts[1].replace('.git', '');

    // For MVP, we'll do an unauthenticated call to GitHub API
    // In production, you'd use a Personal Access Token or OAuth
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Smart Learning-App',
        // 'Authorization': `token ${process.env.GITHUB_TOKEN}` // Uncomment when adding token
      }
    });

    if (response.status === 200) {
      // We can also check for commits or readme by making additional calls
      // e.g., fetch(`https://api.github.com/repos/${owner}/${repo}/commits`)
      return NextResponse.json({ valid: true });
    } else if (response.status === 404) {
      return NextResponse.json({ valid: false, error: 'Repository not found or is private' });
    } else if (response.status === 403) {
      return NextResponse.json({ valid: true, warning: 'Rate limit exceeded, assuming valid for MVP' });
    }

    return NextResponse.json({ valid: false, error: 'Could not validate repository' });
  } catch {
    return NextResponse.json({ valid: false, error: 'Validation failed' }, { status: 500 });
  }
}
