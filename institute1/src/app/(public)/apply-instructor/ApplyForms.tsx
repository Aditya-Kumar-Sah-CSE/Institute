'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Input, { TextArea } from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { handleRegister, handleSubmitApplication, handleFullRegistrationAndApplication } from './actions';

export function InstructorRegistrationForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    bio: '',
    experience: '',
    instructor_id: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const nextStep = () => {
    if (!formData.name || !formData.email || !(formData as any).confirmEmail || !formData.password) {
      setError('Please fill all account details.');
      return;
    }
    if (formData.email !== (formData as any).confirmEmail) {
      setError('Email addresses do not match.');
      return;
    }
    setError('');
    setStep(2);
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (step === 1) {
      nextStep();
      return;
    }

    setLoading(true);
    setError('');
    
    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      data.append(key, value);
    });

    try {
      const result = await handleFullRegistrationAndApplication(data);
      if (result?.error) {
        setError(result.error);
        setLoading(false);
        return;
      }
      setShowPopup(true);
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      setLoading(false);
    }
  };

  return (
    <>
      {showPopup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            padding: 'var(--space-2xl)',
            borderRadius: 'var(--radius-lg)',
            maxWidth: '400px',
            textAlign: 'center',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
          }}>
            <h2 style={{ color: 'var(--neon-cyan)', marginBottom: 'var(--space-md)' }}>Success!</h2>
            <p className="text-secondary" style={{ fontSize: 'var(--text-lg)' }}>
              You have applied successfully. Wait for admin approval. Until then explore your student view.
            </p>
          </div>
        </div>
      )}
      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
        {error && <div style={{ color: 'var(--neon-red)' }}>{error}</div>}
        
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <h3 style={{ color: 'var(--text-primary)' }}>Account Details</h3>
            <Input name="name" label="Full Name" value={formData.name} onChange={handleChange} required />
            <Input name="email" type="email" label="Email Address" value={formData.email} onChange={handleChange} required />
            <Input name="confirmEmail" type="email" label="Confirm Email Address" value={(formData as any).confirmEmail || ''} onChange={handleChange} required />
            <Input name="password" type="password" label="Password" value={formData.password} onChange={handleChange} required />
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <h3 style={{ color: 'var(--text-primary)' }}>Professional Profile</h3>
            <Input 
              name="instructor_id" 
              label="Instructor ID (Optional)" 
              placeholder="Enter your Instructor ID" 
              value={formData.instructor_id}
              onChange={handleChange}
            />
            <TextArea 
              name="bio" 
              label="Short Bio" 
              placeholder="Tell us about yourself..." 
              value={formData.bio}
              onChange={handleChange}
              required 
              style={{ minHeight: '100px' }}
            />
            <TextArea 
              name="experience" 
              label="Teaching / Industry Experience" 
              placeholder="Detail your relevant experience..." 
              value={formData.experience}
              onChange={handleChange}
              required 
              style={{ minHeight: '120px' }}
            />
          </div>
        )}

        {step === 1 ? (
          <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
            <Button type="button" onClick={() => router.push('/')} variant="secondary" size="lg" style={{ flex: 1 }} disabled={loading}>
              Back
            </Button>
            <Button type="button" onClick={nextStep} variant="primary" size="lg" style={{ flex: 1 }}>
              Go Next
            </Button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
            <Button type="button" onClick={() => setStep(1)} variant="secondary" size="lg" style={{ flex: 1 }} disabled={loading}>
              Back
            </Button>
            <Button type="submit" variant="primary" size="lg" style={{ flex: 1 }} disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Application'}
            </Button>
          </div>
        )}
      </form>
    </>
  );
}

export function InstructorApplicationForm({ userEmail }: { userEmail: string }) {
  const router = useRouter();
  const [showPopup, setShowPopup] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    
    try {
      const result = await handleSubmitApplication(formData);
      if (result?.error) {
        console.error(result.error);
        setLoading(false);
        return;
      }
      setShowPopup(true);
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  return (
    <>
      {showPopup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            padding: 'var(--space-2xl)',
            borderRadius: 'var(--radius-lg)',
            maxWidth: '400px',
            textAlign: 'center',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
          }}>
            <h2 style={{ color: 'var(--neon-cyan)', marginBottom: 'var(--space-md)' }}>Success!</h2>
            <p className="text-secondary" style={{ fontSize: 'var(--text-lg)' }}>
              You have applied successfully. Wait for admin approval. Until then explore your student view.
            </p>
          </div>
        </div>
      )}
      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
        <p style={{ color: 'var(--neon-cyan)', fontSize: 'var(--text-sm)', textAlign: 'center' }}>
          You are applying with your current account: <strong>{userEmail}</strong>
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <h3 style={{ color: 'var(--text-primary)' }}>Professional Profile</h3>
          <Input 
            name="instructor_id" 
            label="Instructor ID (Optional)" 
            placeholder="Enter your Instructor ID" 
          />
          <TextArea 
            name="bio" 
            label="Short Bio" 
            placeholder="Tell us about yourself..." 
            required 
            style={{ minHeight: '100px' }}
          />
          <TextArea 
            name="experience" 
            label="Teaching / Industry Experience" 
            placeholder="Detail your relevant experience..." 
            required 
            style={{ minHeight: '120px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
          <Button type="button" onClick={() => router.push('/dashboard')} variant="secondary" size="lg" style={{ flex: 1 }} disabled={loading}>
            Back
          </Button>
          <Button type="submit" variant="primary" size="lg" style={{ flex: 1 }} disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Application'}
          </Button>
        </div>
      </form>
    </>
  );
}
