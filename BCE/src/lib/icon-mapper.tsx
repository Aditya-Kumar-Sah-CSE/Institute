import React from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  Trophy, 
  HelpCircle, 
  Megaphone, 
  User,
  GraduationCap,
  Users,
  FileText,
  FileCode,
  MessageSquare,
  Shield,
  Building,
  Code2,
  LogOut
} from 'lucide-react';

export function getIcon(name: string, props?: any) {
  switch (name) {
    case 'Dashboard': return <LayoutDashboard {...props} />;
    case 'Courses': return <BookOpen {...props} />;
    case 'Leaderboard': return <Trophy {...props} />;
    case 'Doubts': return <HelpCircle {...props} />;
    case 'Notices': return <Megaphone {...props} />;
    case 'Profile': return <User {...props} />;
    case 'Enrollments': return <Users {...props} />;
    case 'Students': return <Users {...props} />;
    case 'Submissions': return <FileText {...props} />;
    case 'Instructors': return <GraduationCap {...props} />;
    case 'Feedback': return <MessageSquare {...props} />;
    case 'Admin': return <Shield {...props} />;
    case 'Building': return <Building {...props} />;
    case 'Logout': return <LogOut {...props} />;
    case 'Chat': return <MessageSquare {...props} />;
    case 'Code': return <Code2 {...props} />;
    case 'LaTeX': return <FileCode {...props} />;
    default: return <LayoutDashboard {...props} />;
  }
}
