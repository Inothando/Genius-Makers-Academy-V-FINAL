import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Users, 
  UserPlus, 
  MoreVertical, 
  Check, 
  X, 
  AlertTriangle,
  Mail,
  User,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Trash2,
  Lock,
  Unlock,
  Info
} from 'lucide-react';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  addDoc,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { AdminUser, AdminRole, AdminPermissions } from '../../types/admin';
import { Button } from '../../components/ui/Button';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { FileUp, ListChecks } from 'lucide-react';

export function AdminManagementPage() {
  const { adminUser: currentUser, isSuperAdmin } = useAdminAuth();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [addMode, setAddMode] = useState<'single' | 'bulk'>('single');
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [bulkEmails, setBulkEmails] = useState('');
  const [newRole, setNewRole] = useState<AdminRole>('content_admin');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [progress, setProgress] = useState<{current: number, total: number} | null>(null);

  // UI State
  const [selectedAdminPerms, setSelectedAdminPerms] = useState<AdminUser | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');
    const nameParam = params.get('name');
    
    if (emailParam) {
      setNewEmail(emailParam);
      setAddMode('single');
    }
    if (nameParam) {
      setNewName(nameParam);
    }
  }, []);

  useEffect(() => {
    if (!isSuperAdmin) return;

    const q = query(collection(db, 'admins'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const adminList = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      })) as AdminUser[];
      setAdmins(adminList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isSuperAdmin]);

  const getDefaultPermissions = (role: AdminRole): AdminPermissions => {
    if (role === 'super_admin') {
      return {
        canUploadPapers: true,
        canUploadResources: true,
        canAddVideos: true,
        canCreateStudyPacks: true,
        canModerateDiscussions: true,
        canDeleteContent: true,
        canViewUsers: true,
        canManageAdmins: true,
        canViewRevenue: true,
        canChangePlatformSettings: true
      };
    }
    if (role === 'content_admin') {
      return {
        canUploadPapers: true,
        canUploadResources: true,
        canAddVideos: true,
        canCreateStudyPacks: true,
        canModerateDiscussions: true,
        canDeleteContent: true,
        canViewUsers: false,
        canManageAdmins: false,
        canViewRevenue: false,
        canChangePlatformSettings: false
      };
    }
    return {
      canUploadPapers: false,
      canUploadResources: false,
      canAddVideos: false,
      canCreateStudyPacks: false,
      canModerateDiscussions: false,
      canDeleteContent: false,
      canViewUsers: false,
      canManageAdmins: false,
      canViewRevenue: false,
      canChangePlatformSettings: false
    };
  };

  const handleBulkAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const emails = Array.from(new Set(bulkEmails
      .split(/[\n,;]/)
      .map(e => e.trim().toLowerCase())
      .filter(e => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))));

    if (emails.length === 0) {
      setFormError('No valid email addresses found.');
      return;
    }

    if (emails.length > 400) { // Firestore limit is 500, keeping 400 safe for audit logs
      setFormError('Maximum 400 emails at a time recommended for stability.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    setFormSuccess(null);
    setProgress({ current: 0, total: emails.length });

    try {
      const CHUNK_SIZE = 50; // Faster, more reliable micro-batches
      const chunks = [];
      for (let i = 0; i < emails.length; i += CHUNK_SIZE) {
        chunks.push(emails.slice(i, i + CHUNK_SIZE));
      }

      const timestamp = serverTimestamp();
      
      for (let i = 0; i < chunks.length; i++) {
        const batch = writeBatch(db);
        const currentChunk = chunks[i];
        
        for (const email of currentChunk) {
          const docId = email;
          const displayName = email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1);
          
          const newAdminData: Omit<AdminUser, 'uid'> = {
            email: email,
            displayName: displayName,
            role: newRole,
            addedBy: currentUser.uid,
            addedAt: timestamp as any,
            lastActive: null,
            isActive: true,
            permissions: getDefaultPermissions(newRole)
          };

          batch.set(doc(db, 'admins', docId), newAdminData);
        }
        
        // Single audit log for the whole batch chunk
        const auditRef = doc(collection(db, 'admin_audit_log'));
        batch.set(auditRef, {
          action: 'admin_added_bulk',
          actorUid: currentUser.uid,
          actorName: currentUser.displayName,
          targetName: `Batch ${i + 1}`,
          details: `Granted ${newRole.replace('_', ' ')} access to ${currentChunk.length} users in batch`,
          timestamp: timestamp
        });
        
        await batch.commit();
        setProgress(prev => prev ? { ...prev, current: Math.min((i + 1) * CHUNK_SIZE, emails.length) } : null);
      }

      setFormSuccess(`Access successfully granted to ${emails.length} admins.`);
      setBulkEmails('');
    } catch (err: any) {
      setFormError(err.message || 'Error processing bulk import');
    } finally {
      setIsSubmitting(false);
      setProgress(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setBulkEmails(content);
      setAddMode('bulk');
    };
    reader.readAsText(file);
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    if (addMode === 'bulk') {
      return handleBulkAdd(e);
    }
    
    e.preventDefault();
    if (!currentUser || !newEmail.trim()) return;
    
    const email = newEmail.trim().toLowerCase();
    const displayName = newName.trim() || email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1);
    const role = newRole;

    // Fast track: Clear form immediately to allow next addition
    setNewEmail('');
    setNewName('');
    setFormError(null);
    setFormSuccess(`Authorization initiated for ${displayName}...`);
    
    try {
      const docId = email;
      const newAdminData: Omit<AdminUser, 'uid'> = {
        email: email,
        displayName: displayName,
        role: role,
        addedBy: currentUser.uid,
        addedAt: serverTimestamp() as any,
        lastActive: null,
        isActive: true,
        permissions: getDefaultPermissions(role)
      };

      await Promise.all([
        setDoc(doc(db, 'admins', docId), newAdminData),
        addDoc(collection(db, 'admin_audit_log'), {
          action: 'admin_added',
          actorUid: currentUser.uid,
          actorName: currentUser.displayName,
          targetName: displayName,
          details: `Granted ${role.replace('_', ' ')} access to ${email}`,
          timestamp: serverTimestamp()
        })
      ]);

      setFormSuccess(`Access granted to ${displayName}.`);
      // Brief success state
      setTimeout(() => setFormSuccess(null), 2000);
    } catch (err: any) {
      setFormError(err.message || 'Error adding admin');
    }
  };

  const toggleStatus = async (admin: AdminUser) => {
    if (admin.role === 'super_admin') return;
    try {
      await updateDoc(doc(db, 'admins', admin.uid), {
        isActive: !admin.isActive
      });
      
      await addDoc(collection(db, 'admin_audit_log'), {
        action: admin.isActive ? 'admin_deactivated' : 'admin_reactivated',
        actorUid: currentUser?.uid,
        actorName: currentUser?.displayName,
        targetName: admin.displayName,
        details: `${admin.isActive ? 'Suspended' : 'Reactivated'} admin access`,
        timestamp: serverTimestamp()
      });
    } catch (err) {
      console.error(err);
    }
  };

  const changeRole = async (admin: AdminUser, role: AdminRole) => {
    if (admin.role === 'super_admin') return;
    try {
      await updateDoc(doc(db, 'admins', admin.uid), {
        role: role,
        permissions: getDefaultPermissions(role)
      });
      
      await addDoc(collection(db, 'admin_audit_log'), {
        action: 'role_changed',
        actorUid: currentUser?.uid,
        actorName: currentUser?.displayName,
        targetName: admin.displayName,
        details: `Changed role to ${role.replace('_', ' ')}`,
        timestamp: serverTimestamp()
      });
    } catch (err) {
      console.error(err);
    }
  };

  const removeAdmin = async (admin: AdminUser) => {
    if (admin.role === 'super_admin') return;
    if (!window.confirm(`Are you sure you want to permanently remove ${admin.displayName}'s admin access?`)) return;
    
    try {
      await deleteDoc(doc(db, 'admins', admin.uid));
      
      await addDoc(collection(db, 'admin_audit_log'), {
        action: 'admin_removed',
        actorUid: currentUser?.uid,
        actorName: currentUser?.displayName,
        targetName: admin.displayName,
        details: `Removed admin access permanently`,
        timestamp: serverTimestamp()
      });
    } catch (err) {
      console.error(err);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ShieldAlert size={64} className="text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Restricted Area</h1>
        <p className="text-gray-500">Only Super Admins can access this page.</p>
        <Button className="mt-8" onClick={() => window.history.back()}>Go Back</Button>
      </div>
    );
  }

  const filteredAdmins = admins.filter(admin => 
    admin.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
    admin.displayName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const adminStats = {
    total: admins.length,
    content: admins.filter(a => a.role === 'content_admin').length,
    readonly: admins.filter(a => a.role === 'readonly_admin').length,
    suspended: admins.filter(a => !a.isActive).length,
    pending: admins.filter(a => !/^[A-Za-z0-9]{20,}$/.test(a.uid)).length // Heuristic for "doc ID is email"
  };

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-20">
      <header>
        <h1 className="text-2xl font-bold text-white mb-1">Admin Management</h1>
        <p className="text-sm text-gray-500">Manage who has access to the GMA Admin Desk. You are the Super Admin.</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Admins', value: adminStats.total, color: 'text-white' },
          { label: 'Content Admins', value: adminStats.content, color: 'text-blue-500' },
          { label: 'Read-Only', value: adminStats.readonly, color: 'text-purple-500' },
          { label: 'Pending Sign-up', value: adminStats.pending, color: 'text-amber-500' },
          { label: 'Suspended', value: adminStats.suspended, color: 'text-red-500' },
        ].map(stat => (
          <div key={stat.label} className="bg-[#111111] border border-gray-800 rounded-xl p-4">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{stat.label}</p>
            <p className={cn("text-2xl font-bold mt-1", stat.color)}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Add Admin Panel */}
      <section className="bg-[#111111] border border-gray-800 rounded-2xl p-8 relative overflow-hidden group/form">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#1D9E75]/30 to-transparent opacity-0 group-hover/form:opacity-100 transition-opacity" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h3 className="text-white font-bold flex items-center gap-2 mb-1">
              <UserPlus size={18} className="text-[#1D9E75]" /> Quick Grant
            </h3>
            <p className="text-xs text-gray-500">Provide admin access to authenticated users by email.</p>
          </div>
          
          <div className="flex items-center bg-black/50 p-1 rounded-xl border border-gray-800 overflow-x-auto scrollbar-hide whitespace-nowrap max-w-full">
            <button 
              onClick={() => setAddMode('single')}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0",
                addMode === 'single' ? "bg-gray-800 text-white shadow-sm" : "text-gray-500 hover:text-gray-300"
              )}
            >
              <User size={14} /> Single
            </button>
            <button 
              onClick={() => setAddMode('bulk')}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0",
                addMode === 'bulk' ? "bg-gray-800 text-white shadow-sm" : "text-gray-500 hover:text-gray-300"
              )}
            >
              <ListChecks size={14} /> Bulk ({admins.length})
            </button>
            <button 
              onClick={() => {
                setBulkEmails('');
                setFormError(null);
                setFormSuccess(null);
              }}
              className="px-4 py-2 rounded-lg text-xs font-bold text-gray-500 hover:text-red-500 transition-all flex items-center gap-2 shrink-0"
            >
              <Trash2 size={14} /> Clear
            </button>
            <label className="cursor-pointer px-4 py-2 rounded-lg text-xs font-bold text-gray-500 hover:text-[#1D9E75] transition-all flex items-center gap-2 shrink-0">
              <FileUp size={14} /> Import CSV
              <input type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>
        
        <form onSubmit={handleAddAdmin} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {addMode === 'single' ? (
              <>
                <div className="md:col-span-4">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 opacity-60">1. Email Address</label>
                  <div className="relative group/input">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within/input:text-[#1D9E75] transition-colors" size={16} />
                    <input
                      type="email"
                      required
                      value={newEmail}
                      onChange={e => setNewEmail(e.target.value)}
                      placeholder="admin@email.com"
                      className="w-full bg-black border border-gray-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75]/20 outline-none transition-all placeholder:text-gray-700"
                    />
                  </div>
                </div>
                <div className="md:col-span-4">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 opacity-60">2. Display Name (Optional)</label>
                  <div className="relative group/input">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within/input:text-[#1D9E75] transition-colors" size={16} />
                    <input
                      type="text"
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      placeholder="Auto-derived from email"
                      className="w-full bg-black border border-gray-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75]/20 outline-none transition-all placeholder:text-gray-700"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="md:col-span-8">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 opacity-60">1. Paste Email List (Comma or Newline separated)</label>
                <div className="relative group/input">
                  <textarea
                    required
                    value={bulkEmails}
                    onChange={e => setBulkEmails(e.target.value)}
                    placeholder="email1@test.com&#10;email2@test.com&#10;email3@test.com"
                    rows={4}
                    className="w-full bg-black border border-gray-800 rounded-xl py-3 px-4 text-sm text-white focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75]/20 outline-none transition-all placeholder:text-gray-700 font-mono resize-none"
                  />
                  <div className="absolute bottom-3 right-3 text-[10px] text-gray-600 font-bold bg-black/50 px-2 py-1 rounded border border-gray-800">
                    {bulkEmails.split(/[\n,;]/).filter(e => e.trim()).length} detected
                  </div>
                </div>
              </div>
            )}
            
            <div className="md:col-span-4">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 opacity-60">
                {addMode === 'single' ? '3.' : '2.'} Select Default Role
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewRole('content_admin')}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                    newRole === 'content_admin' ? "bg-blue-500/10 border-blue-500" : "bg-black border-gray-800 hover:border-gray-700"
                  )}
                >
                  <div className={cn("p-1.5 rounded-lg", newRole === 'content_admin' ? "bg-blue-500 text-white" : "bg-gray-900 text-gray-500")}>
                    <ShieldCheck size={14} />
                  </div>
                  <div className="flex flex-col">
                    <span className={cn("text-[10px] font-bold uppercase", newRole === 'content_admin' ? "text-blue-500" : "text-gray-500")}>Content</span>
                    <span className="text-[10px] text-gray-600 font-medium whitespace-nowrap">Full Access</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setNewRole('readonly_admin')}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                    newRole === 'readonly_admin' ? "bg-purple-500/10 border-purple-500" : "bg-black border-gray-800 hover:border-gray-700"
                  )}
                >
                  <div className={cn("p-1.5 rounded-lg", newRole === 'readonly_admin' ? "bg-purple-500 text-white" : "bg-gray-900 text-gray-500")}>
                    <Shield size={14} />
                  </div>
                  <div className="flex flex-col">
                    <span className={cn("text-[10px] font-bold uppercase", newRole === 'readonly_admin' ? "text-purple-500" : "text-gray-500")}>Read Only</span>
                    <span className="text-[10px] text-gray-600 font-medium whitespace-nowrap">View Only</span>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4 border-t border-gray-800/50">
            <div className="text-xs text-gray-500 flex items-center gap-2">
              <Info size={14} className="text-blue-500" />
              {addMode === 'bulk' ? 'Batch processing up to 500 records. Non-blocking UI.' : 'Immediate grant for single user.'}
            </div>
            
            <div className="w-full md:w-80">
              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <Button
                  type="submit"
                  disabled={isSubmitting || (addMode === 'single' && !newEmail.trim())}
                  className={cn(
                    "w-full h-[46px] text-white rounded-xl font-bold flex items-center justify-center gap-3 transition-all duration-200",
                    isSubmitting ? "bg-gray-800" : "bg-[#1D9E75] hover:bg-[#168a65] shadow-[0_0_20px_rgba(29,158,117,0.2)]"
                  )}
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-3">
                      <Loader2 className="animate-spin" size={18} />
                      {progress && (
                        <span className="text-[10px] uppercase font-mono">
                          {progress.current} / {progress.total}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Unlock size={18} /> 
                      <span className="text-sm">
                        {addMode === 'bulk' 
                          ? `Grant Access (${bulkEmails.split(/[\n,;]/).filter(e => e.trim()).length})` 
                          : 'Grant Access Now'}
                      </span>
                    </div>
                  )}
                </Button>
              </motion.div>
            </div>
          </div>
        </form>

        <AnimatePresence>
          {formError && (
            <motion.p 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 text-xs text-red-500 flex items-center gap-2"
            >
              <X size={14} /> {formError}
            </motion.p>
          )}
          {formSuccess && (
            <motion.p 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 text-xs text-green-500 flex items-center gap-2 font-medium"
            >
              <Check size={14} className="bg-green-500/20 rounded-full p-0.5" /> {formSuccess}
            </motion.p>
          )}
        </AnimatePresence>
      </section>

      {/* Admin Table */}
      <section className="bg-[#111111] border border-gray-800 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input 
              type="text"
              placeholder="Search admins by name or email..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-black border border-gray-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:border-[#1D9E75] outline-none transition-all"
            />
          </div>
          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
            Showing {filteredAdmins.length} of {admins.length} Admins
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Admin</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Role</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Last Active</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {filteredAdmins.map((admin) => (
                <tr key={admin.uid} className="hover:bg-gray-900/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-xs font-bold text-white uppercase">
                        {admin.displayName?.charAt(0)}
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{admin.displayName}</span>
                          {!/^[A-Za-z0-9]{20,}$/.test(admin.uid) && (
                            <div className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[8px] font-black uppercase tracking-tighter border border-amber-500/20">
                                Pending Account
                              </span>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const link = `${window.location.origin}/sign-in?email=${encodeURIComponent(admin.email)}`;
                                  navigator.clipboard.writeText(link);
                                  setFormSuccess(`Invite link for ${admin.email} copied!`);
                                  setTimeout(() => setFormSuccess(null), 2000);
                                }}
                                className="p-1 hover:bg-gray-800 rounded transition-colors"
                                title="Copy Signup Link"
                              >
                                <Mail size={10} className="text-amber-500/60" />
                              </button>
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 font-mono">{admin.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => setSelectedAdminPerms(admin)}
                      className={cn(
                        "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5",
                        admin.role === 'super_admin' ? "text-amber-500 bg-amber-500/10" :
                        admin.role === 'content_admin' ? "text-blue-500 bg-blue-500/10" :
                        "text-purple-500 bg-purple-500/10"
                      )}
                    >
                      {admin.role === 'super_admin' && "⭐"} {admin.role.replace('_', ' ')}
                      <Info size={10} />
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", admin.isActive ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-gray-600")} />
                      <span className={cn("text-xs font-bold", admin.isActive ? "text-green-500" : "text-gray-500")}>
                        {admin.isActive ? "Active" : "Suspended"}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500">
                    {admin.lastActive ? admin.lastActive.toDate().toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {admin.role !== 'super_admin' && (
                      <div className="flex items-center justify-end gap-2">
                        <select 
                          value={admin.role}
                          onChange={(e) => changeRole(admin, e.target.value as AdminRole)}
                          className="bg-black border border-gray-800 text-gray-400 text-[10px] font-bold uppercase rounded p-1 outline-none hover:border-gray-700"
                        >
                          <option value="content_admin">Content Admin</option>
                          <option value="readonly_admin">Read Only</option>
                        </select>
                        
                        <button 
                          onClick={() => toggleStatus(admin)}
                          title={admin.isActive ? "Suspend Admin" : "Reactivate Admin"}
                          className={cn(
                            "p-2 rounded-lg transition-all",
                            admin.isActive ? "text-gray-500 hover:text-amber-500 hover:bg-amber-500/10" : "text-green-500 hover:bg-green-500/10"
                          )}
                        >
                          {admin.isActive ? <Lock size={16} /> : <Unlock size={16} />}
                        </button>

                        <button 
                          onClick={() => removeAdmin(admin)}
                          className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Permissions Modal */}
      <AnimatePresence>
        {selectedAdminPerms && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAdminPerms(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-[#111111] border border-gray-800 rounded-[32px] overflow-hidden"
            >
              <div className="p-8 border-b border-gray-800">
                <h3 className="text-xl font-bold text-white mb-1">Permissions Preview</h3>
                <p className="text-sm text-gray-500 uppercase tracking-widest font-bold">
                  Role: <span className="text-white">{selectedAdminPerms.role.replace('_', ' ')}</span>
                </p>
              </div>
              
              <div className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div>
                  <h4 className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Check size={12} /> Authorized
                  </h4>
                  <ul className="space-y-3">
                    {Object.entries(selectedAdminPerms.permissions)
                      .filter(([_, val]) => val === true)
                      .map(([key]) => (
                        <li key={key} className="text-xs text-gray-300 flex items-start gap-2">
                          <CheckCircle2 size={14} className="text-[#1D9E75] shrink-0 mt-0.5" />
                          {key.replace(/can([A-Z])/, '$1').replace(/([A-Z])/g, ' $1')}
                        </li>
                      ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <X size={12} /> Restricted
                  </h4>
                  <ul className="space-y-3">
                    {Object.entries(selectedAdminPerms.permissions)
                      .filter(([_, val]) => val === false)
                      .map(([key]) => (
                        <li key={key} className="text-xs text-gray-500 flex items-start gap-2">
                          <AlertTriangle size={14} className="text-red-500/50 shrink-0 mt-0.5" />
                          {key.replace(/can([A-Z])/, '$1').replace(/([A-Z])/g, ' $1')}
                        </li>
                      ))}
                  </ul>
                </div>
              </div>

              <div className="p-6 bg-black flex justify-end">
                <Button onClick={() => setSelectedAdminPerms(null)} className="rounded-xl px-8">Close</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CheckCircle2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
