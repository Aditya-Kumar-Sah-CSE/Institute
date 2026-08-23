import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ThemeToggle } from '@/components/ThemeToggle';
import '@/app/Landing.css';

export const metadata: Metadata = {
  title: 'Privacy Policy | Smart Learn BCE',
  description: 'Privacy Policy for the Smart Learn BCE student, instructor, and institution platform.',
};

export default function PrivacyPolicyPage() {
  const lastUpdated = 'August 23, 2026';

  return (
    <div className="landing-container">
      {/* Navigation */}
      <header className="landing-nav">
        <Link href="/" className="landing-logo" style={{ display: 'flex', alignItems: 'center', background: 'transparent' }}>
          <Image 
            src="/images/smart_learning%20logo.png" 
            alt="Company Logo" 
            width={40} 
            height={40} 
            style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '8px' }}
            unoptimized
          />
          <span className="logo-text" style={{ marginLeft: '10px' }}>Smart Learn BCE</span>
        </Link>
        <div className="landing-nav-actions">
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
            Privacy Policy
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
                Smart Learn BCE is an educational and coding platform designed to provide learning resources, coding practice, user profiles, courses, badges, certificates, competitions, and related educational features. We respect your privacy and are committed to protecting the personal information you share with us. This Privacy Policy explains how we collect, use, store, and share information when you access or use our platform.
              </p>
            </section>

            <section>
              <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 750, marginBottom: '1rem' }}>
                2. Information We Collect
              </h2>
              <p>
                We only collect information that is necessary to provide the services offered by Smart Learn BCE. This may include:
              </p>
              <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li><strong>Account Information:</strong> Name, email address, profile photo, and password when you register an account.</li>
                <li><strong>Google Account Information:</strong> When you choose to authenticate via Google Sign-In, we may receive basic account details provided by Google (name, email, profile picture, account identifier).</li>
                <li><strong>Profiles & Activity:</strong> Information and code inputs entered by you, files uploaded to your Google Drive connection, course progress, quiz answers, and coding practice history.</li>
                <li><strong>Achievements & Competitions:</strong> Certificates earned, virtual badges, competition participation data, and scores/rankings.</li>
                <li><strong>Usage & Technical Data:</strong> Browser or device details, IP address, request logs, and cookies used strictly for technical performance and session management.</li>
              </ul>
            </section>

            <section>
              <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 750, marginBottom: '1rem' }}>
                3. Google Sign-In
              </h2>
              <p>
                You may choose to register and sign in to the platform using Google. When doing so:
              </p>
              <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li>Google provides basic account information such as your name, email address, profile picture, and a unique identifier depending on the OAuth configuration.</li>
                <li>Smart Learn BCE never receives, stores, or requests your Google account password.</li>
                <li>Google permissions and OAuth configurations are fully governed by Google's own privacy policies and user settings. You can revoke this connection at any time in your Google Account settings.</li>
              </ul>
            </section>

            <section>
              <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 750, marginBottom: '1rem' }}>
                4. How We Use Information
              </h2>
              <p>
                We use the information we collect for legitimate educational and operational purposes, including to:
              </p>
              <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li>Create, manage, and verify your account.</li>
                <li>Provide courses, coding environments, assignments, and learning tools.</li>
                <li>Save and sync your learning progress, competition statistics, and scores.</li>
                <li>Generate and display academic certificates and badges.</li>
                <li>Host and manage coding competitions and rankings fairly.</li>
                <li>Improve usability, optimize performance, and secure the platform against fraud or malicious execution.</li>
                <li>Send important announcements or support answers.</li>
              </ul>
            </section>

            <section>
              <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 750, marginBottom: '1rem' }}>
                5. Public Profiles and Achievements
              </h2>
              <p>
                Smart Learn BCE allows users to showcase their accomplishments. Certain features make information public by design:
              </p>
              <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li>Your public coding profile, including username, badges, certificates, and leaderboard rankings.</li>
                <li>Public contest results, submission outcomes, and leaderboard scores.</li>
              </ul>
              <p style={{ marginTop: '0.5rem' }}>
                We advise users not to publish sensitive personal data (such as financial information, phone numbers, or residential addresses) on their public profile or comments.
              </p>
            </section>

            <section>
              <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 750, marginBottom: '1rem' }}>
                6. Cookies and Similar Technologies
              </h2>
              <p>
                Our platform uses local storage, session storage, and functional cookies which are strictly required to keep you signed in, remember your preferences, and maintain safety settings. We do not use third-party advertising or cross-site tracking cookies.
              </p>
            </section>

            <section>
              <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 750, marginBottom: '1rem' }}>
                7. Data Security
              </h2>
              <p>
                We use industry-standard technical and organizational security measures to protect your account details, access tokens, and stored codes. However, please be aware that no method of transmission over the internet or database storage is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 750, marginBottom: '1rem' }}>
                8. Data Retention
              </h2>
              <p>
                We retain your personal data for as long as your account remains active or as needed to provide you with the learning services. We may also retain information as required to comply with our legal obligations, resolve disputes, and maintain platform security histories.
              </p>
            </section>

            <section>
              <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 750, marginBottom: '1rem' }}>
                9. Account Deletion
              </h2>
              <p>
                If you wish to delete your account and associated personal data, you can submit a deletion request directly by reaching out to our support team at <strong>iambestadi@gmail.com</strong>. Upon receiving your request, we will verify your identity and delete your personal information within a reasonable timeframe, unless legally required to retain it.
              </p>
            </section>

            <section>
              <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 750, marginBottom: '1rem' }}>
                10. Third-Party Services
              </h2>
              <p>
                We collaborate with select third-party infrastructure providers to run the platform. These include:
              </p>
              <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li>Authentication and Database Management (Supabase)</li>
                <li>App hosting and deployment infrastructure (Vercel)</li>
                <li>Optional file backups (Google Drive, if explicitly connected by the user)</li>
              </ul>
            </section>

            <section>
              <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 750, marginBottom: '1rem' }}>
                11. Children's Privacy
              </h2>
              <p>
                Smart Learn BCE is intended for students and learners who are legally permitted to use online services in their jurisdiction. We do not knowingly collect personal information from children under the applicable legal age limit without parental consent. If we learn we have collected such data, we will act promptly to delete it.
              </p>
            </section>

            <section>
              <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 750, marginBottom: '1rem' }}>
                12. Changes to Privacy Policy
              </h2>
              <p>
                We may revise this Privacy Policy from time to time. When changes are made, we will update the "Last Updated" date at the top of this page. We encourage you to review this policy periodically to stay informed about how we safeguard your information.
              </p>
            </section>

            <section>
              <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 750, marginBottom: '1rem' }}>
                13. Contact Us
              </h2>
              <p>
                If you have any questions or feedback regarding this Privacy Policy, please contact our support team at:
              </p>
              <p style={{ marginTop: '0.5rem' }}>
                Email: <strong>iambestadi@gmail.com</strong>
              </p>
            </section>

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="landing-footer">
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          <p>&copy; {new Date().getFullYear()} Smart Learn BCE. All rights reserved.</p>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <Link href="/terms" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Terms of Service</Link>
            <Link href="/privacy" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 'bold' }}>Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
