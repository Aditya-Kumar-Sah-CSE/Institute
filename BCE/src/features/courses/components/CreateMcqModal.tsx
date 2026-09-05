'use client';

import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input, { TextArea } from '@/components/ui/Input';
import { createCourseMcqAction, updateCourseMcqAction } from '@/features/courses/actions/mcqs';
import type { CourseMCQ, MCQSourceType } from '@/types/database';
import { X, Upload, Image as ImageIcon, CheckCircle, FileText } from 'lucide-react';

interface CreateMcqModalProps {
  courseId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingMcq?: CourseMCQ | null;
}

export default function CreateMcqModal({
  courseId,
  isOpen,
  onClose,
  onSuccess,
  editingMcq
}: CreateMcqModalProps) {
  const [sourceType, setSourceType] = useState<MCQSourceType>('image');
  const [questionText, setQuestionText] = useState('');
  const [optionA, setOptionA] = useState('1');
  const [optionB, setOptionB] = useState('2');
  const [optionC, setOptionC] = useState('3');
  const [optionD, setOptionD] = useState('4');
  const [correctOptions, setCorrectOptions] = useState<string[]>(['A']);
  const [questionMode, setQuestionMode] = useState<'single' | 'multi'>('single');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (editingMcq) {
      setSourceType(editingMcq.source_type || 'scratch');
      setQuestionText(editingMcq.question_text || '');
      setOptionA(editingMcq.option_a || '1');
      setOptionB(editingMcq.option_b || '2');
      setOptionC(editingMcq.option_c || '3');
      setOptionD(editingMcq.option_d || '4');
      const parsedCorrect = editingMcq.correct_option 
        ? editingMcq.correct_option.split(',').map(s => s.trim().toUpperCase())
        : ['A'];
      setCorrectOptions(parsedCorrect.length > 0 ? parsedCorrect : ['A']);
      setQuestionMode(parsedCorrect.length > 1 ? 'multi' : 'single');
      setImagePreview(editingMcq.question_image_url || null);
      setImageFile(null);
    } else {
      // Defaults for brand new MCQ
      setSourceType('image');
      setQuestionText('');
      setOptionA('1');
      setOptionB('2');
      setOptionC('3');
      setOptionD('4');
      setCorrectOptions(['A']);
      setQuestionMode('single');
      setImageFile(null);
      setImagePreview(null);
    }
    setErrorMsg(null);
  }, [editingMcq, isOpen]);

  const toggleCorrectOption = (opt: string) => {
    setCorrectOptions(prev => {
      if (prev.includes(opt)) {
        if (prev.length === 1) return prev; // Keep at least 1 option selected
        return prev.filter(o => o !== opt);
      } else {
        return [...prev, opt].sort();
      }
    });
  };

  if (!isOpen) return null;

  const handleSourceTypeSwitch = (type: MCQSourceType) => {
    setSourceType(type);
    setErrorMsg(null);
    if (!editingMcq) {
      if (type === 'image') {
        // Reset to default image option values
        if (!optionA || optionA === 'Option A') setOptionA('1');
        if (!optionB || optionB === 'Option B') setOptionB('2');
        if (!optionC || optionC === 'Option C') setOptionC('3');
        if (!optionD || optionD === 'Option D') setOptionD('4');
      } else {
        // Scratch defaults if empty
        if (optionA === '1') setOptionA('');
        if (optionB === '2') setOptionB('');
        if (optionC === '3') setOptionC('');
        if (optionD === '4') setOptionD('');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setErrorMsg('Image file size exceeds 10MB limit.');
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setErrorMsg(null);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (sourceType === 'image' && !imagePreview && !imageFile) {
      setErrorMsg('Please upload an MCQ image.');
      return;
    }

    if (sourceType === 'scratch' && !questionText && !imagePreview && !imageFile) {
      setErrorMsg('Question text or diagram image is required.');
      return;
    }

    if (!optionA.trim() || !optionB.trim() || !optionC.trim() || !optionD.trim()) {
      setErrorMsg('All 4 options (A, B, C, D) are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (correctOptions.length === 0) {
        setErrorMsg('Please select at least one correct option.');
        return;
      }

      const formData = new FormData();
      formData.append('course_id', courseId);
      formData.append('source_type', sourceType);
      formData.append('question_text', questionText);
      formData.append('option_a', optionA.trim());
      formData.append('option_b', optionB.trim());
      formData.append('option_c', optionC.trim());
      formData.append('option_d', optionD.trim());
      formData.append('correct_option', correctOptions.sort().join(','));

      if (imageFile) {
        formData.append('image_file', imageFile);
      }

      let res;
      if (editingMcq) {
        if (!imagePreview && !imageFile && editingMcq.question_image_url) {
          formData.append('clear_image', 'true');
        }
        res = await updateCourseMcqAction(editingMcq.id, formData);
      } else {
        res = await createCourseMcqAction(formData);
      }

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred while saving.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        minHeight: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.88)',
        backdropFilter: 'blur(8px)',
        zIndex: 999999,
        overflowY: 'auto',
        padding: '20px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <Card 
        variant="glass" 
        style={{
          width: '100%',
          maxWidth: '650px',
          maxHeight: 'calc(100vh - 40px)',
          overflowY: 'auto',
          margin: 'auto',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
          padding: 'clamp(16px, 3vw, 24px)',
          position: 'relative',
          zIndex: 1000000
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h2 style={{ fontSize: 'var(--text-xl)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{editingMcq ? 'Edit MCQ' : 'Create Course MCQ'}</span>
            </h2>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              Add multiple choice question for student self-assessment
            </p>
          </div>
          <button 
            onClick={onClose} 
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
            disabled={isSubmitting}
          >
            <X size={20} />
          </button>
        </div>

        {/* Method Toggle Buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', padding: '4px', gap: '4px', border: '1px solid var(--glass-border)', marginBottom: 'var(--space-lg)' }}>
          <button
            type="button"
            onClick={() => handleSourceTypeSwitch('image')}
            style={{
              flex: '1 1 180px',
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: 'var(--text-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              background: sourceType === 'image' ? 'var(--neon-cyan)' : 'transparent',
              color: sourceType === 'image' ? '#000' : 'var(--text-secondary)',
            }}
          >
            <ImageIcon size={16} /> Upload MCQ Image
          </button>

          <button
            type="button"
            onClick={() => handleSourceTypeSwitch('scratch')}
            style={{
              flex: '1 1 180px',
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: 'var(--text-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              background: sourceType === 'scratch' ? 'var(--neon-lime)' : 'transparent',
              color: sourceType === 'scratch' ? '#000' : 'var(--text-secondary)',
            }}
          >
            <FileText size={16} /> Create from Scratch
          </button>
        </div>

        {errorMsg && (
          <div style={{ background: 'rgba(255, 69, 58, 0.15)', border: '1px solid #ff453a', padding: '10px 14px', borderRadius: 'var(--radius-md)', color: '#ff4d4f', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-md)' }}>
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          
          {/* METHOD 1: UPLOAD MCQ IMAGE */}
          {sourceType === 'image' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
              <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>MCQ Image</label>
              
              {!imagePreview ? (
                <label 
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    padding: 'var(--space-xl)',
                    border: '2px dashed var(--glass-border)',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255,255,255,0.02)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--neon-cyan)'}
                  onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--glass-border)'}
                >
                  <Upload size={32} style={{ color: 'var(--neon-cyan)' }} />
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                    Drag & Drop or Click to Upload MCQ Image
                  </span>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    Supports JPG, PNG, WebP (Max 10MB)
                  </span>
                  <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                </label>
              ) : (
                <div style={{ position: 'relative', background: 'var(--bg-primary)', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', textAlign: 'center' }}>
                  <img 
                    src={imagePreview} 
                    alt="MCQ Preview" 
                    style={{ maxWidth: '100%', maxHeight: '250px', borderRadius: 'var(--radius-sm)', objectFit: 'contain' }} 
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                    <Button type="button" variant="danger" size="sm" onClick={handleRemoveImage}>
                      Remove Image
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* METHOD 2: CREATE FROM SCRATCH */}
          {sourceType === 'scratch' && (
            <>
              <TextArea
                label="Question Text"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="Enter the question..."
                rows={3}
                required
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                <label style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Question Diagram / Image (Optional)</label>
                {imagePreview ? (
                  <div style={{ position: 'relative', background: 'var(--bg-primary)', padding: '8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <img src={imagePreview} alt="Diagram Preview" style={{ height: '60px', borderRadius: '4px', objectFit: 'contain' }} />
                    <Button type="button" variant="danger" size="sm" onClick={handleRemoveImage}>Remove</Button>
                  </div>
                ) : (
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileChange} 
                    style={{ padding: '8px', background: 'var(--bg-input)', color: 'white', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)', fontSize: 'var(--text-xs)' }} 
                  />
                )}
              </div>
            </>
          )}

          {/* OPTIONS A, B, C, D */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)', marginTop: 'var(--space-xs)' }}>
            <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
              Question Options
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-sm)' }}>
              <div>
                <Input 
                  label="Option A" 
                  value={optionA} 
                  onChange={(e) => setOptionA(e.target.value)} 
                  placeholder="Option A text"
                  required
                />
              </div>
              <div>
                <Input 
                  label="Option B" 
                  value={optionB} 
                  onChange={(e) => setOptionB(e.target.value)} 
                  placeholder="Option B text"
                  required
                />
              </div>
              <div>
                <Input 
                  label="Option C" 
                  value={optionC} 
                  onChange={(e) => setOptionC(e.target.value)} 
                  placeholder="Option C text"
                  required
                />
              </div>
              <div>
                <Input 
                  label="Option D" 
                  value={optionD} 
                  onChange={(e) => setOptionD(e.target.value)} 
                  placeholder="Option D text"
                  required
                />
              </div>
            </div>
          </div>

          {/* QUESTION TYPE & CORRECT ANSWER SELECTOR */}
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', marginTop: 'var(--space-xs)' }}>
            
            {/* Question Answer Mode Toggle */}
            <div style={{ marginBottom: 'var(--space-md)' }}>
              <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 'bold', color: 'var(--neon-gold)', marginBottom: '8px' }}>
                Question Answer Type:
              </label>
              <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => {
                    setQuestionMode('single');
                    if (correctOptions.length > 1) {
                      setCorrectOptions([correctOptions[0]]);
                    }
                  }}
                  style={{
                    flex: '1 1 180px',
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: questionMode === 'single' ? '1px solid var(--neon-cyan)' : '1px solid var(--glass-border)',
                    background: questionMode === 'single' ? 'rgba(0, 229, 255, 0.15)' : 'var(--bg-input)',
                    color: questionMode === 'single' ? 'var(--neon-cyan)' : 'var(--text-secondary)',
                    fontWeight: 'bold',
                    fontSize: 'var(--text-sm)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>🔘 Single Correct (1 Answer)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setQuestionMode('multi')}
                  style={{
                    flex: '1 1 180px',
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: questionMode === 'multi' ? '1px solid var(--neon-lime)' : '1px solid var(--glass-border)',
                    background: questionMode === 'multi' ? 'rgba(57, 255, 20, 0.15)' : 'var(--bg-input)',
                    color: questionMode === 'multi' ? 'var(--neon-lime)' : 'var(--text-secondary)',
                    fontWeight: 'bold',
                    fontSize: 'var(--text-sm)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>☑️ Multiple Correct (Multi-Select)</span>
                </button>
              </div>
            </div>

            {/* Correct Options List */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px', marginBottom: 'var(--space-xs)' }}>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                {questionMode === 'single' ? 'Select Correct Option:' : 'Select Correct Option(s) (Check all that apply):'}
              </label>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
              {['A', 'B', 'C', 'D'].map((opt) => {
                const isChecked = correctOptions.includes(opt);
                const activeColor = questionMode === 'single' ? 'var(--neon-cyan)' : 'var(--neon-lime)';
                const activeBg = questionMode === 'single' ? 'rgba(0, 229, 255, 0.12)' : 'rgba(57, 255, 20, 0.12)';

                return (
                  <label 
                    key={opt} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      cursor: 'pointer',
                      fontWeight: isChecked ? 'bold' : 'normal',
                      color: isChecked ? activeColor : 'var(--text-secondary)',
                      fontSize: 'var(--text-md)',
                      padding: '6px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: isChecked ? activeBg : 'var(--bg-input)',
                      border: isChecked ? `1px solid ${activeColor}` : '1px solid var(--glass-border)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <input 
                      type={questionMode === 'single' ? 'radio' : 'checkbox'}
                      name="correct_option_selector"
                      value={opt} 
                      checked={isChecked} 
                      onChange={() => {
                        if (questionMode === 'single') {
                          setCorrectOptions([opt]);
                        } else {
                          toggleCorrectOption(opt);
                        }
                      }} 
                      style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                    />
                    <span>Option {opt}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Modal Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save MCQ'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
