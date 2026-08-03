import React from 'react';
import Link from 'next/link';
import { Mail, MessageSquare, ArrowRight, ShieldCheck, MapPin, Phone } from 'lucide-react';
import ContactForm from './ContactForm';
import './Contact.css';

export const metadata = {
  title: 'Contact Support | Smart Learning AI',
  description: 'Reach out to our support team for enterprise configuration or general inquiries.'
};

export default function ContactPage() {
  return (
    <div className="contact-page-wrapper">
      <div className="contact-nav-bar">
        <Link href="/" className="contact-back-link">
          <ArrowRight size={18} style={{ transform: 'rotate(180deg)' }} /> Back to Home
        </Link>
        <span className="contact-logo-text">Smart Learning AI</span>
      </div>

      <div className="contact-container">
        <div className="contact-header">
          <div className="contact-badge">Support Desk</div>
          <h1 className="contact-title">How can we help you?</h1>
          <p className="contact-subtitle">
            Whether you need enterprise deployment help or you just want to say hi, our experts are exactly one click away.
          </p>
        </div>

        <div className="contact-grid">
          {/* Left Column - Direct Contacts */}
          <div className="contact-direct-card">
            <h3 className="direct-title">Direct Connection</h3>
            <p className="direct-desc">Prefer not to use forms? Email our core developer directly for critical enterprise queries.</p>
            
            <a href="mailto:iambestadi@gmail.com" className="direct-email-btn">
              <Mail size={20} />
              iambestadi@gmail.com
            </a>

            <div className="direct-info-list">
              <div className="info-item">
                <div className="info-icon"><ShieldCheck size={20} /></div>
                <div className="info-text">
                  <strong>Secure Channel</strong>
                  <span>Your email is routed strictly to admin priority.</span>
                </div>
              </div>
              <div className="info-item">
                <div className="info-icon"><MapPin size={20} /></div>
                <div className="info-text">
                  <strong>Global HQ</strong>
                  <span>Deployed heavily across secure cloud instances worldwide.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Feedback Form */}
          <div className="contact-form-card">
            <h3 className="form-card-title">Send Feedback or Tickets</h3>
            <p className="form-card-desc">This form will send your query directly into the secure SuperAdmin dashboard feedback channel.</p>
            <ContactForm />
          </div>
        </div>
      </div>
    </div>
  );
}
