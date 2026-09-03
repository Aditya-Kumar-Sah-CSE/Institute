import { Profile } from '@/types/database';

export interface CompletionItem {
  id: string;
  label: string;
  weight: number;
  completed: boolean;
  hint: string;
}

export interface ProfileCompletionResult {
  percentage: number;
  items: CompletionItem[];
  completedCount: number;
  totalCount: number;
}

export function calculateProfileCompletion(profile: Profile | null | undefined): ProfileCompletionResult {
  if (!profile) {
    return {
      percentage: 0,
      items: [],
      completedCount: 0,
      totalCount: 0
    };
  }

  // Check basic info
  const hasBasicInfo = !!(profile.name && profile.email && (profile.avatar_url || profile.institute_id || profile.college_name));
  
  // Check academic / background info
  const hasAcademicInfo = !!(profile.graduation_period || profile.cgpa != null || (profile.sgpa && Object.keys(profile.sgpa).length > 0) || (profile.professional_details && Object.keys(profile.professional_details).length > 0));

  // Check qualifications
  const qualifications = Array.isArray(profile.qualifications) ? profile.qualifications : [];
  const hasQualifications = qualifications.length > 0;

  // Check work experience
  const workExperience = Array.isArray(profile.work_experience) ? profile.work_experience : [];
  const hasWorkExperience = workExperience.length > 0;

  // Check skills
  const skills = Array.isArray(profile.skills) ? profile.skills : [];
  const hasSkills = skills.length > 0;

  // Check interests
  const interests = Array.isArray(profile.interests) ? profile.interests : [];
  const hasInterests = interests.length > 0;

  // Check external certificates
  const externalCertificates = Array.isArray(profile.external_certificates) ? profile.external_certificates : [];
  const hasCertificates = externalCertificates.length > 0;

  // Check social / linked connections
  const socialLinks = profile.social_links || {};
  const hasSocialLinks = !!(profile.linkedin_url || Object.keys(socialLinks).length > 0);

  const items: CompletionItem[] = [
    {
      id: 'basic_info',
      label: 'Basic Info & Avatar',
      weight: 20,
      completed: hasBasicInfo,
      hint: 'Add your profile picture or Roll / Institute ID'
    },
    {
      id: 'academic_info',
      label: 'Academic / Batch Info',
      weight: 15,
      completed: hasAcademicInfo,
      hint: 'Add your batch, college name, CGPA or degree details'
    },
    {
      id: 'qualifications',
      label: 'Qualifications',
      weight: 15,
      completed: hasQualifications,
      hint: 'Add at least one educational qualification'
    },
    {
      id: 'work_experience',
      label: 'Work Experience',
      weight: 15,
      completed: hasWorkExperience,
      hint: 'Add your work, internship, or project experience'
    },
    {
      id: 'skills',
      label: 'Technical Skills',
      weight: 10,
      completed: hasSkills,
      hint: 'Add your programming languages & tech stack tags'
    },
    {
      id: 'interests',
      label: 'Interests & Domains',
      weight: 10,
      completed: hasInterests,
      hint: 'Add interest tags like AI/ML, Web Dev, Cybersecurity'
    },
    {
      id: 'certificates',
      label: 'Certificates & Credentials',
      weight: 10,
      completed: hasCertificates,
      hint: 'Add external certifications with links or file uploads'
    },
    {
      id: 'social_links',
      label: 'Social & LinkedIn Links',
      weight: 5,
      completed: hasSocialLinks,
      hint: 'Connect LinkedIn or other portfolio handles'
    }
  ];

  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  const earnedWeight = items.reduce((sum, item) => sum + (item.completed ? item.weight : 0), 0);
  
  const percentage = Math.round((earnedWeight / totalWeight) * 100);
  const completedCount = items.filter(i => i.completed).length;

  return {
    percentage,
    items,
    completedCount,
    totalCount: items.length
  };
}
