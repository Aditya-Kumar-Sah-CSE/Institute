'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Trophy, Code2, User } from 'lucide-react';

export default function MobileCodeArenaToggle() {
  const pathname = usePathname();

  const isProblems = pathname?.startsWith('/code-arena/problems') ?? false;
  const isCompiler = pathname?.startsWith('/code-arena/compiler') ?? false;
  const isProfile = pathname?.startsWith('/code-arena/profile') ?? false;

  return (
    <div className="mobile-arena-toggle-container md:hidden">
      <Link
        href="/code-arena/problems"
        className={`mobile-arena-toggle-item ${isProblems ? 'active' : ''}`}
      >
        <Trophy size={14} />
        <span>Problems</span>
      </Link>
      <Link
        href="/code-arena/compiler"
        className={`mobile-arena-toggle-item ${isCompiler ? 'active' : ''}`}
      >
        <Code2 size={14} />
        <span>Compiler</span>
      </Link>
      <Link
        href="/code-arena/profile"
        className={`mobile-arena-toggle-item ${isProfile ? 'active' : ''}`}
      >
        <User size={14} />
        <span>Profile</span>
      </Link>
    </div>
  );
}
