'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import './LandingNavbar.css';

export default function LandingNavbar({ companyName = 'Smart Learning', logoUrl = '/images/smart_learning%20logo.png' }: { companyName?: string, logoUrl?: string }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`landing-navbar-premium ${isScrolled ? 'scrolled' : ''}`}>
      <div className="navbar-container">
        
        {/* Left: Logo */}
        <div className="navbar-logo">
          <Image 
            src={logoUrl} 
            alt={companyName} 
            width={40} 
            height={40} 
            className="logo-img"
          />
          <span className="logo-text">{companyName}</span>
        </div>

        {/* Center: Navigation Links (Desktop) */}
        <nav className="navbar-links">
          <Link href="#features">Features</Link>
          <Link href="#how-it-works">Transform Campus</Link>
          <Link href="#pricing">Pricing</Link>
          <Link href="#institutions">Institutions</Link>
          <Link href="#resources">Resources</Link>
        </nav>

        {/* Right: Actions (Desktop) */}
        <div className="navbar-actions">
          <div className="theme-toggle-wrapper">
             <ThemeToggle />
          </div>
          <Link href="/login" className="nav-login-btn">Login</Link>
          <Link href="/apply-institution" className="nav-register-btn">Register Institution</Link>
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="navbar-mobile-toggle" onClick={() => setMobileMenuOpen(true)}>
          <Menu size={28} />
        </div>
      </div>

      {/* Mobile Drawer */}
      <div className={`mobile-drawer-overlay ${mobileMenuOpen ? 'open' : ''}`} onClick={() => setMobileMenuOpen(false)}>
        <div className={`mobile-drawer ${mobileMenuOpen ? 'open' : ''}`} onClick={(e) => e.stopPropagation()}>
          <div className="drawer-header">
            <span className="logo-text">{companyName}</span>
            <button className="drawer-close" onClick={() => setMobileMenuOpen(false)}>
              <X size={28} />
            </button>
          </div>
          
          <div className="drawer-links">
            <Link href="#home" onClick={() => setMobileMenuOpen(false)}>Home</Link>
            <Link href="#features" onClick={() => setMobileMenuOpen(false)}>Features</Link>
            <Link href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>Transform Campus</Link>
            <Link href="#pricing" onClick={() => setMobileMenuOpen(false)}>Pricing</Link>
            <Link href="/apply-institution" onClick={() => setMobileMenuOpen(false)}>Register Institution</Link>
            <Link href="/login" onClick={() => setMobileMenuOpen(false)}>Login</Link>
            <Link href="/contact" onClick={() => setMobileMenuOpen(false)}>Contact</Link>
          </div>

          <div className="drawer-actions">
             <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="nav-login-btn full-width">Login</Link>
             <Link href="/apply-institution" onClick={() => setMobileMenuOpen(false)} className="nav-register-btn full-width">Register Institution</Link>
             <div className="drawer-theme-wrapper">
               <ThemeToggle />
             </div>
          </div>
        </div>
      </div>
    </header>
  );
}
