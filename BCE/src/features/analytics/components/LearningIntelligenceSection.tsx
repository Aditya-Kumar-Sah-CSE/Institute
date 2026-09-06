import React from 'react';
import { getStudent360Profile } from '../services/student-intelligence';
import LearningIntelligenceClient from './LearningIntelligenceClient';

interface LearningIntelligenceSectionProps {
  userId: string;
}

export default async function LearningIntelligenceSection({ userId }: LearningIntelligenceSectionProps) {
  const profile = await getStudent360Profile(userId);

  return (
    <LearningIntelligenceClient 
      userId={userId} 
      initialProfile={profile} 
    />
  );
}
