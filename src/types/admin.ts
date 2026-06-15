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
  canManageAdmins: boolean;    // ONLY super_admin = true
  canViewRevenue: boolean;     // ONLY super_admin = true
  canChangePlatformSettings: boolean;  // ONLY super_admin = true
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
