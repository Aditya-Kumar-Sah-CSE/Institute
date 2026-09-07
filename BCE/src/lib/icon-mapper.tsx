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
  LogOut,
  Database,
  Gamepad2,
  Vote,
  Settings
} from 'lucide-react';

export function getIcon(name: string, props?: any) {
  const iconProps = { suppressHydrationWarning: true, ...props };
  switch (name) {
    case 'Dashboard': return <LayoutDashboard {...iconProps} />;
    case 'Courses': return <BookOpen {...iconProps} />;
    case 'Leaderboard': return <Trophy {...iconProps} />;
    case 'Doubts': return <HelpCircle {...iconProps} />;
    case 'Notices': return <Megaphone {...iconProps} />;
    case 'Polls': return <Vote {...iconProps} />;
    case 'Profile': return <User {...iconProps} />;
    case 'Settings': return <Settings {...iconProps} />;
    case 'Enrollments': return <Users {...iconProps} />;
    case 'Students': return <Users {...iconProps} />;
    case 'Submissions': return <FileText {...iconProps} />;
    case 'Instructors': return <GraduationCap {...iconProps} />;
    case 'Feedback': return <MessageSquare {...iconProps} />;
    case 'Admin': return <Shield {...iconProps} />;
    case 'Building': return <Building {...iconProps} />;
    case 'Logout': return <LogOut {...iconProps} />;
    case 'Chat': return <MessageSquare {...iconProps} />;
    case 'Code': return <Code2 {...iconProps} />;
    case 'LaTeX': return <FileCode {...iconProps} />;
    case 'Database':
    case 'SQL': return <Database {...iconProps} />;
    case 'Game': return <Gamepad2 {...iconProps} />;
    default: return <LayoutDashboard {...iconProps} />;
  }
}
