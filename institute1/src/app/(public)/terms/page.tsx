import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ThemeToggle } from '@/components/ThemeToggle';
import '@/app/Landing.css';

export const metadata: Metadata = {
  title: 'Terms of Service | Smart Learn BCE',
  description: 'Terms of Service for the Smart Learn BCE student, instructor, and institution platform.',
};

export default function TermsOfServicePage() {
  const lastUpdated = 'August 23, 2026';

  return (
    <div className="landing-container">
      {/* Navigation */}
      <header className="landing-nav" style={{ padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10, background: 'color-mix(in srgb, var(--landing-bg) 85%, transparent)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border-divider)' }}>
        <Link href="/" className="landing-logo" style={{ display: 'flex', alignItems: 'center', background: 'transparent', textDecoration: 'none' }}>
          <Image 
            src="/images/smart_learning_logo.png" 
            alt="Company Logo" 
            width={40} 
            height={40} 
            style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '8px' }}
            unoptimized
          />
          <span className="logo-text" style={{ marginLeft: '10px', fontSize: '1.25rem', fontWeight: 800 }}>Smart Learn BCE</span>
        </Link>
        <div className="landing-nav-actions" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <ThemeToggle />
          <Link href="/">
            <button className="btn-human-ghost">Back to Home</button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="landing-main" style={{ paddingTop: '120px', paddingBottom: '80px', paddingLeft: '20px', paddingRight: '20px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 24px' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
            Terms of Service
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem' }}>
            Last Updated: {lastUpdated}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', color: 'var(--text-secondary)', lineHeight: '1.7', fontSize: '1.05rem' }}>
            
            <section>
              <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 750, marginBottom: '1rem' }}>
                1. Introduction
              </h2>
              <p>
                Welcome to Smart Learn BCE. These Terms of Service ("Terms") govern your access to and use of our platform, services, websites, and applications (collectively referred to as "Smart Learn BCE" or "Platform"). By creating an account, logging in, or otherwise using the Platform, you agree to be bound by these Terms. If you do not agree to these Terms, you must immediately cease all access and use.
              </p>
            </section>

            <section>
              <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 750, marginBottom: '1rem' }}>
                2. Eligibility
              </h2>
              <p>
                To utilize the Platform, you must be legally capable of entering into a binding contract under applicable laws (or have obtained explicit parental/guardian consent if you are a minor under the laws of your jurisdiction). You agree to comply with all applicable local, national, and international laws, regulations, and academic guidelines when using the Platform.
              </p>
            </section>

            <section>
              <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 750, marginBottom: '1rem' }}>
                3. Account Registration
              </h2>
              <p>
                To access features of the Platform, you must complete registration. Regarding your account:
              </p>
              <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li>You agree to provide true, accurate, and current information as prompted during registration.</li>
                <li>You are solely responsible for maintaining the confidentiality and security of your login credentials.</li>
                <li>You may not impersonate another individual, create an account for another student without authorization, or share your access credentials with others.</li>
                <li>You must immediately notify us if you suspect any unauthorized access to or compromise of your account.</li>
              </ul>
            </section>

            <section>
              <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 750, marginBottom: '1rem' }}>
                4. Acceptable Use
              </h2>
              <p>
                You are permitted to use the Platform only for legitimate educational and training purposes. You strictly agree NOT to:
              </p>
              <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li>Abuse, disrupt, or interfere with the infrastructure, servers, or networks hosting the Platform.</li>
                <li>Attempt to gain unauthorized access to other user accounts, system levels, databases, or API keys.</li>
                <li>Bypass, disable, or circumvent any security measures, rate limits, or access controls.</li>
                <li>Upload, transmit, or spread material containing software viruses, trojan horses, worms, or any malicious code.</li>
                <li>Engage in cheating, plagiarism, collusion, or code theft in coding challenges, assessments, and competitions.</li>
                <li>Manipulate competitive rankings, leaderboard points, or contest scores using automated scripts, bots, or deceptive practices.</li>
                <li>Falsify, forge, or misuse certificates of achievement or badges awarded by the Platform.</li>
                <li>Scrape, crawl, or collect personal information of other students or instructors from the Platform without permission.</li>
              </ul>
            </section>

            <section>
              <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 750, marginBottom: '1rem' }}>
                5. Educational and Coding Content
              </h2>
              <p>
                All courses, coding templates, compilers, lectures, tutorials, guides, and related educational resources on the Platform are provided for standard learning and practice purposes of registered students. We aim to keep all educational materials up-to-date and accurate, but cannot warrant that the materials are entirely free from typographical errors, factual discrepancies, or compiler differences.
              </p>
            </section>

            <section>
              <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 750, marginBottom: '1rem' }}>
                6. User-Generated Content
              </h2>
              <p>
                Our Platform allows you to upload, submit, or store code, projects, forum comments, chat messages, and doubt queries ("User Content"). You represent and warrant that:
              </p>
              <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li>You own or have the necessary intellectual property rights to submit the User Content.</li>
                <li>Your submission does not violate any third-party copyright, trade secret, or confidentiality agreements.</li>
                <li>You grant Smart Learn BCE the necessary hosting, database caching, and transmission permissions to serve and display your content to instructors and peers as requested by your profile settings.</li>
              </ul>
            </section>

            <section>
              <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 750, marginBottom: '1rem' }}>
                7. Certificates and Badges
              </h2>
              <p>
                The digital certificates, battle achievements, and virtual badges awarded on the Platform represent a user's performance validated by the Smart Learn BCE evaluation algorithms.
              </p>
              <p style={{ marginTop: '0.5rem' }}>
                <strong>No Professional Accreditation:</strong> You acknowledge that the certificates and badges issued by the Platform are educational performance completion records. Unless explicitly stated otherwise in a separate written agreement, they are not accredited by government education boards, university bodies, or professional certifying corporations.
              </p>
            </section>

            <section>
              <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 750, marginBottom: '1rem' }}>
                8. Coding Competitions
              </h2>
              <p>
                Participating in coding competitions (Code Arena) requires strict adherence to competition rules. The Platform reserves the right to run anti-plagiarism filters, analyze compiler submissions, and review network signatures. Cheating, copying code from external sources, or exploiting platform vulnerabilities may result in instant score disqualification, leaderboard elimination, or permanent account restriction.
              </p>
            </section>

            <section>
              <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 750, marginBottom: '1rem' }}>
                9. Intellectual Property
              </h2>
              <p>
                The Platform infrastructure, layout, artwork, CSS, proprietary compilers, test cases, and database structure remain the exclusive property of Smart Learn BCE and its licensors, protected by copyrights and intellectual property laws. You retain full ownership of the original codes and commentaries you write, subject to the hosting permissions required for the Platform's core functionality.
              </p>
            </section>

            <section>
              <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 750, marginBottom: '1rem' }}>
                10. Third-Party Services
              </h2>
              <p>
                The Platform operates on third-party infrastructure (such as hosting servers, database providers, and Google OAuth tools). You acknowledge that your usage of these services may be subject to the terms and rules of those third-party providers.
              </p>
            </section>

            <section>
              <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 750, marginBottom: '1rem' }}>
                11. Suspension and Termination
              </h2>
              <p>
                We reserve the right, without liability, to suspend, disable, or terminate your account and block your access to the Platform if:
              </p>
              <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li>You violate these Terms or the Acceptable Use specifications.</li>
                <li>Your account poses security risks, network issues, or database overload.</li>
                <li>Required by law enforcement or state authorities.</li>
              </ul>
            </section>

            <section>
              <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 750, marginBottom: '1rem' }}>
                12. Disclaimer of Warranties
              </h2>
              <p>
                THE PLATFORM IS PROVIDED TO YOU ON AN "AS IS" AND "AS AVAILABLE" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. WE DO NOT warrant that the coding platform, compilers, or lesson content will operate completely uninterrupted or error-free.
              </p>
            </section>

            <section>
              <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 750, marginBottom: '1rem' }}>
                13. Limitation of Liability
              </h2>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL SMART LEARN BCE OR ITS DEVELOPERS BE LIABLE FOR ANY INDIRECT, SPECIAL, INCIDENTAL, OR CONSEQUENTIAL DAMAGES RELATING TO OR ARISING FROM THE USE OF OR INABILITY TO USE THE PLATFORM.
              </p>
            </section>

            <section>
              <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 750, marginBottom: '1rem' }}>
                14. Changes to Terms
              </h2>
              <p>
                We reserve the right to modify these Terms of Service at any time. When modifications are made, we will update the "Last Updated" date at the top of this page. Continued utilization of the Platform following such modifications constitutes your acceptance of the updated Terms.
              </p>
            </section>

            <section>
              <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 750, marginBottom: '1rem' }}>
                15. Contact
              </h2>
              <p>
                If you have any questions or feedback regarding these Terms, please contact our support team at:
              </p>
              <p style={{ marginTop: '0.5rem' }}>
                Email: <strong>iambestadi@gmail.com</strong>
              </p>
            </section>

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="landing-footer" style={{ borderTop: '1px solid var(--border-divider)', padding: '2rem var(--space-lg)', background: 'var(--bg-secondary)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          <p>&copy; {new Date().getFullYear()} Smart Learn BCE. All rights reserved.</p>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <Link href="/terms" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 'bold' }}>Terms of Service</Link>
            <Link href="/privacy" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
