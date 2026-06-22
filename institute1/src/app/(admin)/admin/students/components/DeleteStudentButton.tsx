'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import { deleteStudent } from '@/features/admin/actions/adminActions';

interface DeleteStudentButtonProps {
  studentId: string;
  studentName: string;
}

export default function DeleteStudentButton({ studentId, studentName }: DeleteStudentButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to permanently delete student "${studentName}"? This will remove all their progress, submissions, and XP. This action cannot be undone.`)) {
      setIsDeleting(true);
      try {
        const result = await deleteStudent(studentId);
        if (result.error) {
          alert(`Error deleting student: ${result.error}`);
        }
      } catch (err) {
        console.error(err);
        alert('An unexpected error occurred.');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <Button 
      variant="danger" 
      size="sm" 
      onClick={handleDelete} 
      isLoading={isDeleting}
      title="Delete Student"
    >
      Delete
    </Button>
  );
}
