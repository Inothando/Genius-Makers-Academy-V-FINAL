import { Timestamp } from 'firebase/firestore';

export type AdminRole = 'super_admin' | 'content_admin' | 'readonly_admin';

export interface AdminPermissions {
  canUploadPapers: boolean;
  canUploadResources: boolean;
  canAddVideos: boolean;
  canCreateStudyPacks: boolean;
  canModerateDiscussions: boolean;
  canDeleteContent: boolean;
  canViewUsers: boolean;
  canManageExamTimetables: boolean;
  canManageAdmins: boolean;    // ONLY super_admin = true
  canViewRevenue: boolean;     // ONLY super_admin = true
  canChangePlatformSettings: boolean;  // ONLY super_admin = true
  canReviewRoomSafety: boolean;
}

export interface ExamTimetableEntry {
  subject: string;
  grade: number;
  paperNumber: "P1" | "P2" | "P3" | "P4";
  examDate: Timestamp;
  startTime: string;      // e.g. "09:00"
  durationMinutes: number;
}

export interface ExamTimetable {
  id?: string;
  term: "Term1" | "Term2" | "Term3" | "Term4";
  year: number;
  province: string;
  curriculum: "NSC" | "IEB";
  entries: ExamTimetableEntry[];
  uploadedBy: string;
  uploadedAt: Timestamp;
  isActive: boolean;
}

export interface AdminUser {
  uid: string;
  email: string;
  displayName: string;
  role: AdminRole;
  addedBy: string;        // UID of the super admin who granted access
  addedAt: Timestamp;
  lastActive: Timestamp | null;
  isActive: boolean;      // super admin can deactivate without deleting
  permissions: AdminPermissions;
}

export interface AdminAuditLog {
  id: string;
  actorUid: string;
  actorName: string;
  action: string;
  targetUid?: string;
  targetName?: string;
  details: string;
  timestamp: Timestamp;
}
