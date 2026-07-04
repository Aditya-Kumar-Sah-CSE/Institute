'use client';

import React, { useState } from 'react';
import { submitAdmission } from './actions';
import './admission.css';

export default function AdmissionForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    // Basic Client-Side Validation for mobile numbers
    const mobileRegex = /^\d{10}$/;
    if (!mobileRegex.test(data.mobile as string)) {
      setErrorMsg('Student mobile number must be exactly 10 digits.');
      setIsLoading(false);
      return;
    }
    if (!mobileRegex.test(data.fatherMobile as string)) {
      setErrorMsg("Father's mobile number must be exactly 10 digits.");
      setIsLoading(false);
      return;
    }
    if (!mobileRegex.test(data.motherMobile as string)) {
      setErrorMsg("Mother's mobile number must be exactly 10 digits.");
      setIsLoading(false);
      return;
    }
    if (!data.declaration) {
      setErrorMsg('You must check the declaration checkbox.');
      setIsLoading(false);
      return;
    }

    try {
      const result = await submitAdmission(data);
      if (result.error) {
        setErrorMsg(result.error);
      } else {
        setSuccess(true);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="admission-container" style={{ alignItems: 'center' }}>
        <div className="admission-card" style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
          <h1 style={{ fontSize: '48px', marginBottom: 'var(--space-md)' }}>🎉</h1>
          <h2 style={{ color: 'var(--neon-green)', fontSize: '24px', marginBottom: 'var(--space-sm)' }}>Registration Successful!</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Thank you for filling out the admission form. Your details have been recorded safely.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admission-container">
      <div className="admission-card">
        <div className="admission-header">
          <h1>Bhagalpur College of Engineering</h1>
          <h2>New Admission Registration Form (Batch 2026–2030)</h2>
          <p>Kindly fill all the details carefully. The information provided by you will be used for admission verification and institute records. Fields marked (*) are mandatory.</p>
        </div>

        {errorMsg && (
          <div style={{ background: 'rgba(255, 0, 0, 0.1)', border: '1px solid var(--neon-red)', color: 'var(--neon-red)', padding: 'var(--space-md)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-lg)', textAlign: 'center' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          
          {/* SECTION 1: Student Information */}
          <div className="form-section">
            <h3 className="section-title">Section 1: Student Information</h3>
            <div className="form-row">
              <div className="form-group">
                <label>First Name <span>*</span></label>
                <input type="text" name="firstName" required placeholder="John" />
              </div>
              <div className="form-group">
                <label>Middle Name</label>
                <input type="text" name="middleName" placeholder="Kumar" />
              </div>
              <div className="form-group">
                <label>Last Name <span>*</span></label>
                <input type="text" name="lastName" required placeholder="Doe" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Gender <span>*</span></label>
                <select name="gender" required>
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Mobile Number <span>*</span></label>
                <input type="tel" name="mobile" required pattern="\d{10}" placeholder="10 Digits" maxLength={10} />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" name="email" placeholder="example@gmail.com" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Branch <span>*</span></label>
                <select name="branch" required>
                  <option value="">Select Branch</option>
                  <option value="CSE">Computer Science & Engineering</option>
                  <option value="ECE">Electronics & Comm. Engineering</option>
                  <option value="CE">Civil Engineering</option>
                  <option value="ME">Mechanical Engineering</option>
                  <option value="EE">Electrical Engineering</option>
                </select>
              </div>
              <div className="form-group">
                <label>Roll Number (If Allotted)</label>
                <input type="text" name="rollNumber" placeholder="E.g. 26CSE01" />
              </div>
            </div>
          </div>

          {/* SECTION 2: Parent Details */}
          <div className="form-section">
            <h3 className="section-title">Section 2: Parent Details</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Father's Name <span>*</span></label>
                <input type="text" name="fatherName" required placeholder="Full Name" />
              </div>
              <div className="form-group">
                <label>Father's Mobile Number <span>*</span></label>
                <input type="tel" name="fatherMobile" required pattern="\d{10}" placeholder="10 Digits" maxLength={10} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Mother's Name <span>*</span></label>
                <input type="text" name="motherName" required placeholder="Full Name" />
              </div>
              <div className="form-group">
                <label>Mother's Mobile Number <span>*</span></label>
                <input type="tel" name="motherMobile" required pattern="\d{10}" placeholder="10 Digits" maxLength={10} />
              </div>
            </div>
          </div>

          {/* SECTION 3: Academic Details */}
          <div className="form-section">
            <h3 className="section-title">Section 3: Academic Details</h3>
            
            <h4 style={{ color: 'var(--neon-cyan)', marginBottom: 'var(--space-sm)' }}>Class 10th Details</h4>
            <div className="form-row">
              <div className="form-group">
                <label>Class 10 Board <span>*</span></label>
                <select name="board10" required>
                  <option value="">Select Board</option>
                  <option value="CBSE">CBSE</option>
                  <option value="BSEB">BSEB</option>
                  <option value="ICSE">ICSE</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Passing Year <span>*</span></label>
                <input type="number" name="year10" required placeholder="YYYY" min="2010" max="2026" />
              </div>
            </div>
            <div className="form-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              <div className="form-group">
                <label>Marks Obtained <span>*</span></label>
                <input type="number" name="marks10" required step="0.01" />
              </div>
              <div className="form-group">
                <label>Total Marks <span>*</span></label>
                <input type="number" name="total10" required step="0.01" />
              </div>
              <div className="form-group">
                <label>Percentage % <span>*</span></label>
                <input type="number" name="percent10" required step="0.01" max="100" />
              </div>
            </div>

            <div style={{ height: '24px' }}></div>

            <h4 style={{ color: 'var(--neon-cyan)', marginBottom: 'var(--space-sm)' }}>Class 12th Details</h4>
            <div className="form-row">
              <div className="form-group">
                <label>Class 12 Board <span>*</span></label>
                <select name="board12" required>
                  <option value="">Select Board</option>
                  <option value="CBSE">CBSE</option>
                  <option value="BSEB">BSEB</option>
                  <option value="ICSE">ICSE</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Passing Year <span>*</span></label>
                <input type="number" name="year12" required placeholder="YYYY" min="2010" max="2026" />
              </div>
            </div>
            <div className="form-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              <div className="form-group">
                <label>Marks Obtained <span>*</span></label>
                <input type="number" name="marks12" required step="0.01" />
              </div>
              <div className="form-group">
                <label>Total Marks <span>*</span></label>
                <input type="number" name="total12" required step="0.01" />
              </div>
              <div className="form-group">
                <label>Percentage % <span>*</span></label>
                <input type="number" name="percent12" required step="0.01" max="100" />
              </div>
            </div>
          </div>

          {/* SECTION 4: Hostel Requirement */}
          <div className="form-section">
            <h3 className="section-title">Section 4: Requirement</h3>
            <div className="form-group">
              <label>Do you require Hostel? <span>*</span></label>
              <div className="radio-group">
                <label className="radio-label">
                  <input type="radio" name="hostel" value="Yes" required />
                  Yes
                </label>
                <label className="radio-label">
                  <input type="radio" name="hostel" value="No" required />
                  No
                </label>
              </div>
            </div>
          </div>

          <div className="declaration-box">
            <input type="checkbox" name="declaration" id="declaration" required />
            <label htmlFor="declaration" style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', cursor: 'pointer' }}>
              I hereby declare that the information provided by me is true and correct to the best of my knowledge.
            </label>
          </div>

          <button type="submit" className="submit-btn" disabled={isLoading}>
            {isLoading ? "Submitting..." : "Submit Registration"}
          </button>
        </form>
      </div>
    </div>
  );
}
