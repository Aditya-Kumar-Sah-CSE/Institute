'use client';

import React from 'react';
import Button from '@/components/ui/Button';

interface EnrollCourseButtonProps {
  courseId: string;
  courseTitle: string;
  formAction: (formData: FormData) => void;
}

export default function EnrollCourseButton({ courseId, courseTitle, formAction }: EnrollCourseButtonProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!window.confirm(`Do you want to enroll in ${courseTitle}?`)) {
      e.preventDefault();
    }
  };

  return (
    <form action={formAction} onSubmit={handleSubmit}>
      <Button variant="primary" size="lg" type="submit">Enroll Now (+20 XP ⚡)</Button>
    </form>
  );
}
