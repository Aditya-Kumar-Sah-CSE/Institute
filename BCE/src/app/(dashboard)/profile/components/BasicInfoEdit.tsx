'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { updateBasicProfile } from '../actions';

interface BasicInfoEditProps {
  initialName: string;
  initialRollNo: string | null;
  initialBatch: string | null;
}

export default function BasicInfoEdit({ initialName, initialRollNo, initialBatch }: BasicInfoEditProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await updateBasicProfile(formData);

    if (result.error) {
      setError(result.error);
    } else {
      setIsOpen(false);
    }
    setLoading(false);
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setIsOpen(true)} style={{ marginTop: '10px' }}>
        Edit Profile
      </Button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Edit Basic Info">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {error && <p style={{ color: 'var(--accent-red)' }}>{error}</p>}
          
          <Input 
            name="name" 
            label="Full Name" 
            defaultValue={initialName} 
            required 
          />
          
          <Input 
            name="institute_id" 
            label="Roll No / Registration No" 
            defaultValue={initialRollNo || ''}
            placeholder="e.g. 21CS054"
          />

          <Input 
            name="batch" 
            label="Batch (Graduation Year)" 
            defaultValue={initialBatch || ''}
            placeholder="e.g. 2025"
          />

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
            <Button variant="secondary" onClick={() => setIsOpen(false)} type="button">
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
