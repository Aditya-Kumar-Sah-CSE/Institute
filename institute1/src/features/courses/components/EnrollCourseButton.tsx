'use client';

import React from 'react';
import Button from '@/components/ui/Button';

interface EnrollCourseButtonProps {
  courseId: string;
  courseTitle: string;
  formAction: (formData: FormData) => void;
}

export default function EnrollCourseButton({ courseId, courseTitle, formAction }: EnrollCourseButtonProps) {
  return (
    <form action={formAction}>
      <Button 
        variant="primary" 
        size="lg" 
        type="submit" 
        confirmMessage={`Do you want to enroll in ${courseTitle}?`}
      >
        Enroll Now (+20 XP ⚡)
      </Button>
    </form>
  );
}
