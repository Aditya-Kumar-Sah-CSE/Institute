export type NptelAssignmentStatus = 'UPCOMING' | 'DUE_SOON' | 'URGENT' | 'OVERDUE';
export interface NptelProviderCourse { id: string; courseName: string; courseCode?: string; instructor?: string; semester?: string; year?: number; courseUrl?: string; }
export interface NptelProviderAssignment { id: string; assignmentNumber?: string; title: string; description?: string; assignmentUrl?: string; releaseDate?: string; deadline: string; status?: string; }
export interface NptelProvider { searchCourses(query: string): Promise<NptelProviderCourse[]>; getCourseAssignments(courseId: string): Promise<NptelProviderAssignment[]>; }
