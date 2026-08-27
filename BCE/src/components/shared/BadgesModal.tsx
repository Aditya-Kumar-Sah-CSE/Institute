'use client';

import React, { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import { 
  Flame, 
  Code2, 
  Trophy, 
  Brain, 
  Globe2, 
  Crown, 
  Swords, 
  TrendingUp, 
  Search, 
  Award, 
  Lock,
  Target,
  Loader2
} from 'lucide-react';
import './BadgesModal.css';

interface BadgesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const iconMap: Record<string, React.ComponentType<any>> = {
  'flame': Flame,
  'code': Code2,
  'trophy': Trophy,
  'brain': Brain,
  'globe': Globe2,
  'crown': Crown,
  'swords': Swords,
  'trending-up': TrendingUp,
  'search': Search,
  'target': Target,
  'award': Award,
};

export default function BadgesModal({ isOpen, onClose }: BadgesModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{ badges: any[]; earned: any[]; stats: any } | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    setError(null);
    fetch('/api/gamification/badges/list')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch badges list');
        return res.json();
      })
      .then(json => {
        if (json.success) {
          setData(json.data);
        } else {
          setError(json.error?.message || 'Failed details fetch');
        }
      })
      .catch(err => {
        console.error(err);
        setError('Failed to load badges. Please try again.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen]);

  const getBadgeProgress = (badge: any) => {
    if (!data?.stats) return { current: 0, target: badge.condition_value, percentage: 0 };
    const stats = data.stats;
    let current = 0;
    const target = badge.condition_value || 1;

    switch (badge.condition_type) {
      case '7_day_streak':
      case '30_day_streak':
      case 'consistency_king':
        current = stats.maxStreak || 0;
        break;
      case 'problem_starter':
      case '100_club':
      case '250_club':
      case '500_club':
      case '1000_club':
        current = stats.totalSolved || 0;
        break;
      case 'daily_grinder':
        current = stats.uniqueDaysCount || 0;
        break;
      case 'dsa_master':
        current = stats.dsaSheetsCount || 0;
        break;
      case 'multi_platform':
        current = stats.platformsCount || 0;
        break;
      case 'monthly_champion':
        current = stats.bestRank === 1 ? 1 : 0;
        break;
      case 'monthly_runner_up':
        current = stats.bestRank === 2 ? 1 : 0;
        break;
      case 'monthly_top_3':
        current = stats.bestRank <= 3 ? 1 : 0;
        break;
      case 'contest_warrior':
        current = stats.contestsJoined || 0;
        break;
      case 'problem_hunter':
        // Capped at 5 each
        current = Math.min(stats.easySolved || 0, stats.mediumSolved || 0, stats.hardSolved || 0);
        break;
      default:
        current = 0;
    }

    const percentage = Math.min(100, Math.round((current / target) * 100));
    return { current, target, percentage };
  };

  const getEarnedDate = (badgeId: string) => {
    const earnedRec = data?.earned?.find(e => e.badge_id === badgeId);
    if (!earnedRec) return null;
    try {
      return new Date(earnedRec.earned_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return null;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Coder Badges" size="lg">
      <div className="badges-modal-content">
        {loading ? (
          <div className="badges-loader">
            <Loader2 className="animate-spin text-neon-cyan" size={32} />
            <p>Evaluating achievements...</p>
          </div>
        ) : error ? (
          <div className="badges-error">
            <p>{error}</p>
          </div>
        ) : (
          <>
            <div className="badges-header-summary">
              <div className="summary-pill">
                <Trophy size={18} className="text-neon-gold" />
                <span className="summary-value">
                  {data?.earned?.length || 0} / {data?.badges?.length || 0}
                </span>
                <span className="summary-label">Badges Earned</span>
              </div>
              <div className="summary-pill">
                <Flame size={18} className="text-neon-orange" />
                <span className="summary-value">
                  {data?.stats?.maxStreak || 0} Day
                </span>
                <span className="summary-label">Max Streak</span>
              </div>
            </div>

            <div className="badges-grid">
              {data?.badges?.map(badge => {
                const earnedDate = getEarnedDate(badge.id);
                const isLocked = !earnedDate;
                const { current, target, percentage } = getBadgeProgress(badge);
                
                return (
                  <div 
                    key={badge.id} 
                    className={`badge-card ${isLocked ? 'locked' : 'unlocked'}`}
                  >
                    <div className="badge-icon-wrapper" style={{ fontSize: '20px', position: 'relative' }}>
                      <div className="badge-glow-ring" />
                      <span style={{ zIndex: 2, filter: isLocked ? 'grayscale(80%) opacity(50%)' : 'none' }}>
                        {badge.icon || '🏅'}
                      </span>
                      {isLocked && (
                        <Lock 
                          style={{ 
                            position: 'absolute', 
                            bottom: '-4px', 
                            right: '-4px', 
                            background: '#0f172a', 
                            border: '1px solid var(--glass-border)', 
                            borderRadius: '50%', 
                            padding: '2.5px', 
                            width: '17px', 
                            height: '17px', 
                            color: 'var(--text-muted)',
                            zIndex: 3 
                          }} 
                        />
                      )}
                    </div>

                    <div className="badge-info-details">
                      <h3 className="badge-name">{badge.name}</h3>
                      <p className="badge-desc">{badge.description}</p>
                      
                      {isLocked ? (
                        <div className="badge-progress-container">
                          <div className="badge-progress-text">
                            {current} / {target}
                          </div>
                          <div className="badge-progress-bar-bg">
                            <div 
                              className="badge-progress-bar-fg" 
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="badge-earned-date">
                          Earned {earnedDate}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
