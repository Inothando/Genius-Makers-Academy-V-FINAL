import { useState, useEffect, useCallback, useMemo } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  serverTimestamp, 
  collection, 
  query, 
  where, 
  getDocs,
  setDoc,
  deleteDoc
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { AdminUser, AdminPermissions } from '../types/admin';

const SUPER_EMAILS = ['contact@salainnovationlabs.com', 'techinfinite.banking@gmail.com'];

export function useAdminAuth() {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const isSuperEmail = !!(user.email && SUPER_EMAILS.includes(user.email));

        // If it's a super admin, we can skip the mandatory DB check if we want immediate access,
        // but it's better to try and fetch their personalized info (like display name if customized).
        // However, we should NEVER let an offline error block them.

        try {
          // 1. Try finding by UID directly
          const adminDocRef = doc(db, 'admins', user.uid);
          let adminSnapshot = await getDoc(adminDocRef);
          setDbError(null);

          if (!adminSnapshot.exists() && user.email) {
            // 2. Try finding by Email as ID
            const emailId = user.email.trim().toLowerCase();
            const emailDocRef = doc(db, 'admins', emailId);
            const emailSnapshot = await getDoc(emailDocRef);
            if (emailSnapshot.exists()) {
              adminSnapshot = emailSnapshot;
            }
          }

          if (adminSnapshot.exists()) {
            const data = adminSnapshot.data() as AdminUser;
            
            if (data.isActive) {
              setAdminUser({ ...data, uid: user.uid });
              
              // Update last active - non-blocking and catch errors (might fail due to rules)
              updateDoc(adminSnapshot.ref, {
                lastActive: serverTimestamp()
              }).catch(() => {});

              // Note: We've removed client-side migration to avoid permission errors.
              // Admin access works fine via email-based ID due to rule updates.
            } else {
              setAdminUser(null);
            }
          } else {
            // 3. Last fallback: Query by email property (for records with random IDs)
            const q = query(collection(db, 'admins'), where('email', '==', user.email));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
              const adminDoc = querySnapshot.docs[0];
              const data = adminDoc.data() as AdminUser;
              
              if (data.isActive) {
                setAdminUser({ ...data, uid: user.uid });
                updateDoc(adminDoc.ref, { lastActive: serverTimestamp() }).catch(() => {});
              } else {
                setAdminUser(null);
              }
            } else if (isSuperEmail) {
              // Super Admin exists in code but not in DB yet
              setAdminUser(null); 
            } else {
              setAdminUser(null);
            }
          }
        } catch (error: any) {
          const isOffline = error.message?.includes('offline') || error.code === 'unavailable' || error.code === 'deadline-exceeded';
          
          if (error.message?.includes('does not exist') || error.code === 'not-found') {
             setDbError(error.message);
          }
          
          if (isSuperEmail) {
            if (isOffline) {
              console.log("Firestore is offline, using local super admin fallback for authenticated super admin.");
            } else {
              console.log("Admin doc fetch failed, using local super admin fallback");
            }
          } else if (isOffline) {
            console.warn("Firestore is offline, cannot verify admin status for non-super admin.");
          } else {
            console.error("Error fetching admin status:", error);
          }
          setAdminUser(null);
        }
      } else {
        setAdminUser(null);
        setDbError(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const isSuperAdmin = useMemo(() => {
    if (auth.currentUser?.email && SUPER_EMAILS.includes(auth.currentUser.email)) return true;
    return adminUser?.role === 'super_admin';
  }, [adminUser]);

  const isContentAdmin = adminUser?.role === 'content_admin' || isSuperAdmin;
  const isReadOnlyAdmin = adminUser?.role === 'readonly_admin';

  const isAuthenticated = useMemo(() => {
    if (auth.currentUser?.email && SUPER_EMAILS.includes(auth.currentUser.email)) return true;
    return !!adminUser && adminUser.isActive;
  }, [adminUser]);

  const permissions = useMemo(() => {
    if (auth.currentUser?.email && SUPER_EMAILS.includes(auth.currentUser.email)) {
      return {
        canUploadPapers: true,
        canUploadResources: true,
        canAddVideos: true,
        canCreateStudyPacks: true,
        canModerateDiscussions: true,
        canDeleteContent: true,
        canViewUsers: true,
        canManageExamTimetables: true,
        canManageAdmins: true,
        canViewRevenue: true,
        canChangePlatformSettings: true
      };
    }
    return adminUser?.permissions;
  }, [adminUser]);

  const hasPermission = useCallback((perm: keyof AdminPermissions) => {
    if (auth.currentUser?.email && SUPER_EMAILS.includes(auth.currentUser.email)) return true;
    return permissions?.[perm] === true;
  }, [permissions]);

  return {
    adminUser: adminUser || (auth.currentUser?.email && SUPER_EMAILS.includes(auth.currentUser.email) ? {
      uid: auth.currentUser.uid,
      email: auth.currentUser.email,
      displayName: auth.currentUser.displayName || 'Super Admin',
      role: 'super_admin',
      isActive: true,
      permissions: {
        canUploadPapers: true,
        canUploadResources: true,
        canAddVideos: true,
        canCreateStudyPacks: true,
        canModerateDiscussions: true,
        canDeleteContent: true,
        canViewUsers: true,
        canManageExamTimetables: true,
        canManageAdmins: true,
        canViewRevenue: true,
        canChangePlatformSettings: true
      },
      createdAt: new Date(),
      lastActive: new Date(),
      addedBy: 'system',
      addedAt: new Date()
    } as any as AdminUser : null),
    loading,
    dbError,
    isSuperAdmin,
    isContentAdmin,
    isReadOnlyAdmin,
    hasPermission,
    isAuthenticated
  };
}
