import React from 'react';
import Image from 'next/image';
import { Award, ExternalLink, History, Users } from 'lucide-react';
import {
  getTodayIstDateString,
  resolveCoordinatorStatus,
  sanitizeClubPhotoUrl,
  sanitizePublicHref,
  type ClubCoordinator,
  type ClubFacultyMentor,
} from '@/lib/club-utils';

interface CohortGroup {
  key: string;
  batchLabel: string;
  termLabel: string;
  members: ClubCoordinator[];
}

function groupByCohort(list: ClubCoordinator[]): CohortGroup[] {
  const map = new Map<string, CohortGroup>();
  list.forEach((c) => {
    const key = `${c.batch_label}::${c.term_label}`;
    const existing = map.get(key);
    if (existing) {
      existing.members.push(c);
    } else {
      map.set(key, {
        key,
        batchLabel: c.batch_label,
        termLabel: c.term_label,
        members: [c],
      });
    }
  });
  return Array.from(map.values());
}

export default function LandingCodingClub({
  mentors,
  coordinators,
}: {
  mentors: ClubFacultyMentor[];
  coordinators: ClubCoordinator[];
}) {
  if ((!mentors || mentors.length === 0) && (!coordinators || coordinators.length === 0)) {
    return null;
  }

  const todayIst = getTodayIstDateString();
  const activeCoordinators: ClubCoordinator[] = [];
  const pastCoordinators: ClubCoordinator[] = [];

  (coordinators || []).forEach((coord) => {
    if (resolveCoordinatorStatus(coord, todayIst) === 'active') {
      activeCoordinators.push(coord);
    } else {
      pastCoordinators.push(coord);
    }
  });

  const activeGroups = groupByCohort(activeCoordinators);
  const pastGroups = groupByCohort(pastCoordinators);

  const renderCoordinatorBadge = (coord: ClubCoordinator, isCurrent: boolean) => {
    const safeUrl = sanitizePublicHref(coord.profile_url);
    const chipClass = `club-coord-chip ${isCurrent ? 'is-current' : 'is-past'}${safeUrl ? ' has-link' : ''}`;

    if (safeUrl) {
      return (
        <a
          key={coord.id}
          href={safeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={chipClass}
          title={`View ${coord.name}'s portfolio / profile`}
        >
          <span className="club-coord-name">{coord.name}</span>
          <ExternalLink size={13} className="club-coord-ext" aria-hidden="true" />
        </a>
      );
    }

    return (
      <span key={coord.id} className={chipClass}>
        <span className="club-coord-name">{coord.name}</span>
      </span>
    );
  };

  return (
    <section id="coding-club" className="club-showcase-section">
      <div className="club-showcase-header">
        <span className="section-tag landing-eyebrow">
          Debuggerzz Coding Club &bull; BCE Bhagalpur
        </span>
        <h2 className="section-title">Mentors &amp; Student Coordinators</h2>
        <p className="section-desc" style={{ marginBottom: '2rem' }}>
          Guided by CSE faculty mentors and led by elected batch coordinators.
        </p>
      </div>

      {/* Faculty Mentors / Heads */}
      {mentors.length > 0 && (
        <div className="club-mentors-grid">
          {mentors.map((mentor) => {
            const safePhoto = sanitizeClubPhotoUrl(mentor.photo_url);
            const safeProfile = sanitizePublicHref(mentor.profile_url);
            const isRemote = !!(safePhoto && /^https?:\/\//i.test(safePhoto));
            const initials = mentor.name
              .replace(/^(Dr\.?|Prof\.?)\s+/i, '')
              .split(/\s+/)
              .slice(0, 2)
              .map((w) => w[0]?.toUpperCase() || '')
              .join('');

            return (
              <article key={mentor.id} className="club-mentor-card">
                <div className="club-mentor-avatar-wrap">
                  {safePhoto ? (
                    <Image
                      src={safePhoto}
                      alt={mentor.name}
                      width={84}
                      height={84}
                      unoptimized={isRemote}
                      className="club-mentor-avatar"
                    />
                  ) : (
                    <div className="club-mentor-avatar-fallback">{initials || 'CM'}</div>
                  )}
                </div>

                <div className="club-mentor-info">
                  <div className="club-mentor-meta">
                    <span className="club-mentor-role-pill">
                      <Award size={12} /> {mentor.club_role || 'Club Mentor'}
                    </span>
                    {mentor.timeline && (
                      <span className="club-mentor-timeline">{mentor.timeline}</span>
                    )}
                  </div>

                  <div className="club-mentor-name-row">
                    <h3>{mentor.name}</h3>
                    {safeProfile && (
                      <a
                        href={safeProfile}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="club-mentor-profile-link"
                        aria-label={`${mentor.name} profile`}
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>

                  {mentor.post && <p className="club-mentor-post">{mentor.post}</p>}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Coordinators Cohorts (Active first, then Past) */}
      {(activeGroups.length > 0 || pastGroups.length > 0) && (
        <div className="club-coordinators-wrap">
          {activeGroups.map((group) => (
            <div key={group.key} className="club-cohort-card is-current">
              <div className="club-cohort-header">
                <div className="club-cohort-title">
                  <span className="club-live-dot" aria-hidden="true" />
                  <Users size={15} className="club-cohort-icon-current" />
                  <h3>Coordinators &bull; {group.termLabel || group.batchLabel}</h3>
                  <span className="club-cohort-batch">{group.batchLabel}</span>
                </div>
                <span className="club-cohort-badge is-current">
                  Current ({group.members.length})
                </span>
              </div>

              <div className="club-coord-chips-grid">
                {group.members.map((m) => renderCoordinatorBadge(m, true))}
              </div>
            </div>
          ))}

          {pastGroups.map((group) => (
            <div key={group.key} className="club-cohort-card is-past">
              <div className="club-cohort-header">
                <div className="club-cohort-title">
                  <History size={15} className="club-cohort-icon-past" />
                  <h3>Past Coordinators &bull; {group.termLabel || group.batchLabel}</h3>
                  <span className="club-cohort-batch">{group.batchLabel}</span>
                </div>
                <span className="club-cohort-badge is-past">
                  <Users size={12} /> {group.members.length} Alumni
                </span>
              </div>

              <div className="club-coord-chips-grid">
                {group.members.map((m) => renderCoordinatorBadge(m, false))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

