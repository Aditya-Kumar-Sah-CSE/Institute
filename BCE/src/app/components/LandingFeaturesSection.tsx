import React from 'react';
import Image from 'next/image';
import {
  Award,
  BookOpen,
  Code2,
  Compass,
  Cpu,
  Database,
  FileText,
  Layers,
  Laptop,
  Rocket,
  Shield,
  Star,
  Swords,
  Target,
  Terminal,
  Trophy,
  UserCheck,
  Users,
  Zap,
} from 'lucide-react';
import AutoScrollMarquee from '@/components/ui/AutoScrollMarquee';

export interface CoreFeatureItem {
  id: string;
  title: string;
  description?: string | null;
  icon?: string | null;
  image_url?: string | null;
  sort_order?: number;
}

function renderFeatureIcon(rawIcon: string | null | undefined, size: number) {
  const key = String(rawIcon || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  switch (key) {
    case 'award':
      return <Award size={size} strokeWidth={1.9} />;
    case 'bookopen':
      return <BookOpen size={size} strokeWidth={1.9} />;
    case 'code2':
      return <Code2 size={size} strokeWidth={1.9} />;
    case 'compass':
      return <Compass size={size} strokeWidth={1.9} />;
    case 'cpu':
      return <Cpu size={size} strokeWidth={1.9} />;
    case 'database':
      return <Database size={size} strokeWidth={1.9} />;
    case 'filetext':
      return <FileText size={size} strokeWidth={1.9} />;
    case 'layers':
      return <Layers size={size} strokeWidth={1.9} />;
    case 'laptop':
      return <Laptop size={size} strokeWidth={1.9} />;
    case 'rocket':
      return <Rocket size={size} strokeWidth={1.9} />;
    case 'shield':
      return <Shield size={size} strokeWidth={1.9} />;
    case 'star':
      return <Star size={size} strokeWidth={1.9} />;
    case 'swords':
      return <Swords size={size} strokeWidth={1.9} />;
    case 'target':
      return <Target size={size} strokeWidth={1.9} />;
    case 'terminal':
      return <Terminal size={size} strokeWidth={1.9} />;
    case 'trophy':
      return <Trophy size={size} strokeWidth={1.9} />;
    case 'usercheck':
      return <UserCheck size={size} strokeWidth={1.9} />;
    case 'users':
      return <Users size={size} strokeWidth={1.9} />;
    case 'zap':
      return <Zap size={size} strokeWidth={1.9} />;
    default:
      return <Layers size={size} strokeWidth={1.9} />;
  }
}

function FeatureVisual({
  feature,
  size = 22,
  imgSize,
}: {
  feature: CoreFeatureItem;
  size?: number;
  imgSize?: number;
}) {
  if (feature.image_url) {
    const isRemote =
      feature.image_url.startsWith('http://') || feature.image_url.startsWith('https://');
    const px = imgSize ?? size + 6;
    return (
      <Image
        src={feature.image_url}
        alt={feature.title || 'Feature icon'}
        width={px}
        height={px}
        unoptimized={isRemote}
        style={{ objectFit: 'contain', borderRadius: '6px' }}
      />
    );
  }
  return renderFeatureIcon(feature.icon, size);
}

export default function LandingFeaturesSection({ features }: { features: CoreFeatureItem[] }) {
  if (!features || features.length === 0) return null;

  const marqueeItems = features.length >= 2 ? [...features, ...features] : features;

  return (
    <section id="features" className="core-features-section">
      <div className="club-showcase-header">
        <span className="section-tag landing-eyebrow">Platform Capabilities</span>
        <h2 className="section-title">Core Platform Features</h2>
        <p className="section-desc" style={{ marginBottom: '1.75rem' }}>
          Real developer tools built in — from cloud compilation, Monaco IDE &amp; SQL sandboxes to
          LaTeX resumes, coding battles, and live contest tracking.
        </p>
      </div>

      {/* Smooth horizontal marquee ticker controlled by Super Admin Core Features CMS */}
      <AutoScrollMarquee className="features-marquee-wrapper core-features-ticker" innerClassName="core-features-ticker-track">
        {marqueeItems.map((feature, idx) => (
          <div className="core-feature-chip" key={`${feature.id}-chip-${idx}`}>
            <span className="core-feature-chip-icon">
              <FeatureVisual feature={feature} size={15} />
            </span>
            <span className="core-feature-chip-label">{feature.title}</span>
          </div>
        ))}
      </AutoScrollMarquee>

      {/* Readable card grid of every verified feature */}
      <div className="core-features-grid">
        {features.map((feature, idx) => (
          <article key={feature.id} className="core-feature-card">
            <div className="core-feature-card-top">
              <div className="core-feature-icon-box">
                <FeatureVisual feature={feature} size={46} imgSize={58} />
              </div>
              <span className="core-feature-index">
                {String(idx + 1).padStart(2, '0')}
              </span>
            </div>

            <h3 className="core-feature-card-title">{feature.title}</h3>

            {feature.description && (
              <p className="core-feature-card-desc">{feature.description}</p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
