import Link from 'next/link';
import { Sparkles, Shield, Zap, Globe, Layers, ArrowRight } from 'lucide-react';

export default function EduSaaSGlobalLanding() {
  return (
    <div className="min-h-screen bg-[#030712] text-white selection:bg-indigo-500/30 overflow-hidden font-sans">
      
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-[#030712]/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 rounded-lg p-1.5">
              <Layers className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">Edu<span className="text-indigo-400">SaaS</span></span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-300">
            <Link href="#features" className="hover:text-white transition-colors">Features</Link>
            <Link href="#how-it-works" className="hover:text-white transition-colors">Architecture</Link>
            <Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/admin/institutes" className="text-sm font-medium text-gray-300 hover:text-white">Admin Login</Link>
            <Link href="#contact" className="bg-white text-black px-4 py-2 rounded-full text-sm font-bold hover:bg-gray-200 transition-colors">
              Talk to Sales
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="max-w-7xl mx-auto text-center relative z-10 flex flex-col items-center">
          
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-indigo-300 mb-8 backdrop-blur-sm">
            <Sparkles className="h-4 w-4" />
            <span>The Multi-Tenant OS for Engineering Colleges</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 max-w-4xl leading-[1.1]">
            Run 100+ Institutes on a <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Single Codebase.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mb-10 leading-relaxed">
            EduSaaS provisions isolated PostgreSQL schemas for every college instantly. Deploy gamified student dashboards, course managers, and leaderboards at scale.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Link href="/bce/login" className="h-12 px-8 flex items-center justify-center gap-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all hover:scale-105 shadow-[0_0_40px_-10px_rgba(79,70,229,0.5)]">
              View Demo College (BCE) <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/admin/institutes/new" className="h-12 px-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/15 border border-white/5 text-white font-medium transition-colors">
              Provision New Tenant
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-black/50 border-t border-white/5 relative z-10 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Enterprise-grade isolation.</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">Everything an institute needs, securely sandboxed inside their own subdomain.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/5 border border-white/10 p-8 rounded-2xl hover:bg-white/10 transition-colors">
              <div className="bg-indigo-500/20 w-12 h-12 rounded-xl flex items-center justify-center mb-6">
                <Shield className="h-6 w-6 text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">Schema-per-Tenant DB</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Zero data leakage. Drizzle ORM dynamically switches the PostgreSQL `search_path` per request based on the subdomain.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 p-8 rounded-2xl hover:bg-white/10 transition-colors">
              <div className="bg-emerald-500/20 w-12 h-12 rounded-xl flex items-center justify-center mb-6">
                <Globe className="h-6 w-6 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">Wildcard Subdomains</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                `bce.edusaas.com` or `mit.edusaas.com`. Next.js Middleware resolves tenants instantly without separate deployments.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 p-8 rounded-2xl hover:bg-white/10 transition-colors">
              <div className="bg-pink-500/20 w-12 h-12 rounded-xl flex items-center justify-center mb-6">
                <Zap className="h-6 w-6 text-pink-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">Gamified LMS</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Built-in course catalog, assignments, leaderboards, and XP tracking. Ported directly from Institute1's proven architecture.
              </p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
