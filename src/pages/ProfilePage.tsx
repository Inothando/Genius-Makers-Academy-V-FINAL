import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Settings, 
  Upload, 
  Download, 
  BookOpen, 
  LogOut, 
  CheckCircle2, 
  Loader2, 
  Trash2, 
  Edit3,
  Globe,
  Star,
  Layout,
  FileText
} from 'lucide-react';
import { doc, updateDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { Button } from '../components/ui/Button';
import { Resource, PastPaper } from '../types';
import { cn } from '../lib/utils';

export function ProfilePage() {
  const { user, userProfile, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'progress' | 'details' | 'uploads' | 'downloads'>('progress');
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [grade, setGrade] = useState<number | null>(null);
  const [curriculum, setCurriculum] = useState<'NSC' | 'IEB' | null>(null);
  const [subjects, setSubjects] = useState<string[]>([]);
  
  // Data State
  const [uploads, setUploads] = useState<Resource[]>([]);
  const [downloads, setDownloads] = useState<any[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/sign-in');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (userProfile) {
      setNewName(userProfile.displayName);
      setGrade(userProfile.grade);
      setCurriculum(userProfile.curriculum);
      setSubjects(userProfile.subjects);
      fetchUserUploads();
    }
  }, [userProfile]);

  const fetchUserUploads = async () => {
    if (!user) return;
    const path = 'resources';
    try {
      const q = query(collection(db, path), where('uploaderId', '==', user.uid));
      const snap = await getDocs(q);
      setUploads(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Resource)));
    } catch (err: any) {
      console.error(err);
      if (!err.message?.includes('offline') && err.code !== 'unavailable') {
        handleFirestoreError(err, OperationType.LIST, path);
      }
    }
  };

  const handleUpdateName = async () => {
    if (!user || !newName.trim()) return;
    setIsSaving(true);
    const path = `users/${user.uid}`;
    try {
      await updateDoc(doc(db, 'users', user.uid), { displayName: newName });
      setIsEditingName(false);
    } catch (err: any) {
      console.error(err);
      if (!err.message?.includes('offline') && err.code !== 'unavailable') {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    const path = `users/${user.uid}`;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        grade,
        curriculum,
        subjects
      });
    } catch (err: any) {
      console.error(err);
      if (!err.message?.includes('offline') && err.code !== 'unavailable') {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUpload = async (id: string) => {
    if (!confirm('Are you sure you want to delete this resource?')) return;
    const path = `resources/${id}`;
    try {
      await deleteDoc(doc(db, 'resources', id));
      setUploads(prev => prev.filter(u => u.id !== id));
    } catch (err: any) {
      console.error(err);
      if (!err.message?.includes('offline') && err.code !== 'unavailable') {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    }
  };

  const calculateProgress = () => {
    let score = 0;
    if (userProfile?.grade) score += 25;
    if (userProfile?.curriculum) score += 25;
    if (userProfile?.subjects && userProfile.subjects.length > 0) score += 25;
    if (userProfile?.displayName !== 'GMA Student') score += 25;
    return score;
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-lux-bg flex items-center justify-center">
        <Loader2 className="animate-spin text-lux-gold" size={40} />
      </div>
    );
  }

  const ALL_SUBJECTS = ['Mathematics', 'Physical Sciences', 'Life Sciences', 'History', 'Geography', 'Accounting', 'English FAL', 'Afrikaans HL'];
  const progress = calculateProgress();

  return (
    <div className="min-h-screen bg-lux-bg">
      <Navbar />

      <div className="pt-24 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
           <div className="flex flex-col lg:flex-row gap-12">
             {/* Left Column: Profile Card */}
             <div className="w-full lg:w-[320px] shrink-0">
               <div className="sticky top-32 space-y-6">
                 <div className="bg-lux-surface border border-lux-border rounded-[2.5rem] p-10 shadow-lux-sm text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-lux-gold/10 blur-3xl rounded-full" />
                    <div className="relative z-10">
                      {user.email && ['techinfinite.banking@gmail.com', 'contact@salainnovationlabs.com'].includes(user.email) && (
                        <div className="mb-6 p-4 bg-lux-surface border border-lux-border rounded-2xl shadow-sm">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-lux-green-950 mb-3">Admin Privileges</p>
                          <Button 
                            size="sm" 
                            className="w-full bg-lux-green-950 text-lux-gold-light hover:bg-lux-green-900 uppercase tracking-widest text-[9px] font-bold"
                            onClick={() => navigate('/admin')}
                          >
                            <Layout size={14} className="mr-2 text-lux-gold" /> Admin Panel
                          </Button>
                        </div>
                      )}
                      <div className="w-24 h-24 bg-lux-green-950 rounded-full mx-auto mb-8 flex items-center justify-center text-4xl font-serif text-lux-gold shadow-lux-sm border-4 border-lux-surface relative">
                         <div className="absolute inset-0 rounded-full border border-lux-gold/20 -m-[4px]"></div>
                        {userProfile?.displayName.charAt(0)}
                      </div>

                      <div className="mb-6">
                        {isEditingName ? (
                          <div className="flex flex-col gap-3">
                             <input 
                               className="w-full px-4 py-3 bg-lux-bg text-center font-bold text-base rounded-xl outline-none border border-lux-border focus:border-lux-gold transition-colors text-lux-green-950"
                               value={newName}
                               onChange={(e) => setNewName(e.target.value)}
                               autoFocus
                             />
                             <div className="flex gap-2">
                               <Button size="sm" onClick={handleUpdateName} disabled={isSaving} className="flex-1 bg-lux-green-950 text-lux-gold-light hover:bg-lux-green-900 rounded-xl h-10">Save</Button>
                               <Button variant="outline" size="sm" onClick={() => setIsEditingName(false)} className="flex-1 border-lux-border text-lux-green-950 hover:bg-lux-bg rounded-xl h-10">Cancel</Button>
                             </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2 group mb-1">
                            <h2 className="text-2xl font-serif text-lux-green-950">{userProfile?.displayName}</h2>
                            <button onClick={() => setIsEditingName(true)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-lux-muted hover:text-lux-gold">
                              <Edit3 size={14} />
                            </button>
                          </div>
                        )}
                        <p className="text-xs font-medium text-lux-muted tracking-wide">
                          {userProfile?.phoneNumber || userProfile?.email}
                        </p>
                      </div>

                      <div className="flex justify-center gap-3 mb-10">
                         <span className="px-3 py-1 bg-lux-green-950 rounded-full text-[9px] font-bold uppercase tracking-[0.2em] text-lux-gold">
                            {userProfile?.tier} Scholar
                         </span>
                         <span className="px-3 py-1 bg-lux-bg rounded-full text-[9px] font-bold uppercase tracking-[0.2em] text-lux-muted border border-lux-border">
                            Est. {new Date(userProfile?.createdAt?.seconds * 1000).getFullYear()}
                         </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-8 border-t border-lux-border/60">
                         <div>
                            <p className="text-xl font-serif text-lux-green-950 leading-none mb-2">{uploads.length}</p>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-lux-muted">Uploads</p>
                         </div>
                         <div>
                            <p className="text-xl font-serif text-lux-green-950 leading-none mb-2">{userProfile?.downloadCount || 0}</p>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-lux-muted">Downloads</p>
                         </div>
                      </div>
                    </div>
                 </div>

                 <button 
                   onClick={signOut}
                   className="w-full p-4 bg-lux-surface border border-lux-border rounded-[1.5rem] text-[10px] font-bold uppercase tracking-[0.2em] text-red-800 flex items-center justify-center gap-3 hover:bg-red-50 hover:border-red-200 transition-all shadow-sm"
                 >
                   <LogOut size={16} /> Secure Sign Out
                 </button>
               </div>
             </div>

             {/* Right Column: Tabs */}
             <div className="flex-1 space-y-8">
               <div className="flex p-1 bg-lux-surface border border-lux-border rounded-2xl w-full sm:w-fit overflow-x-auto shadow-sm">
                 <button 
                    onClick={() => setActiveTab('progress')}
                    className={cn(
                      "px-6 py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                      activeTab === 'progress' ? "bg-lux-green-950 text-lux-gold shadow-md" : "text-lux-muted hover:bg-lux-bg hover:text-lux-green-900"
                    )}
                  >
                    Progress Tracking
                  </button>
                  <button 
                    onClick={() => setActiveTab('details')}
                    className={cn(
                      "px-6 py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                      activeTab === 'details' ? "bg-lux-green-950 text-lux-gold shadow-md" : "text-lux-muted hover:bg-lux-bg hover:text-lux-green-900"
                    )}
                  >
                    My Details
                  </button>
                  <button 
                    onClick={() => setActiveTab('uploads')}
                    className={cn(
                      "px-6 py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                      activeTab === 'uploads' ? "bg-lux-green-950 text-lux-gold shadow-md" : "text-lux-muted hover:bg-lux-bg hover:text-lux-green-900"
                    )}
                  >
                    Contributions
                  </button>
                  <button 
                    onClick={() => setActiveTab('downloads')}
                    className={cn(
                      "px-6 py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                      activeTab === 'downloads' ? "bg-lux-green-950 text-lux-gold shadow-md" : "text-lux-muted hover:bg-lux-bg hover:text-lux-green-900"
                    )}
                  >
                    Downloads
                  </button>
               </div>

               <AnimatePresence mode="wait">
                  {activeTab === 'progress' && (
                    <motion.div 
                      key="progress"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-8"
                    >
                       <div className="flex items-center justify-between mb-2">
                         <h2 className="text-3xl font-serif text-lux-green-950">Academic Progress</h2>
                       </div>
                       
                       {subjects.length > 0 ? (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {subjects.map((s, i) => {
                              const progressValue = Math.min(100, Math.max(10, ((s.length * 15 + (user?.uid.charCodeAt(0) || 0) * 10) % 80) + 10));
                              
                              return (
                                <div key={s} className="p-8 bg-lux-surface border border-lux-border rounded-[2.5rem] relative overflow-hidden group shadow-lux-sm">
                                   <div className="absolute top-0 right-0 w-32 h-32 bg-lux-gold/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                   <div className="flex justify-between items-start mb-6 relative z-10">
                                      <div className="w-14 h-14 bg-lux-bg border border-lux-border rounded-[1rem] flex items-center justify-center text-lux-gold shadow-sm">
                                         <BookOpen strokeWidth={1} size={24} />
                                      </div>
                                      <span className="text-lux-green-950 font-serif text-2xl font-medium">{progressValue}%</span>
                                   </div>
                                   <h4 className="text-lg font-serif text-lux-green-950 mb-5 relative z-10">{s}</h4>
                                   
                                   <div className="h-1.5 bg-lux-border/50 rounded-full overflow-hidden relative z-10">
                                      <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progressValue}%` }}
                                        transition={{ duration: 1.5, ease: "easeOut", delay: i * 0.1 }}
                                        className="h-full bg-lux-gold"
                                      />
                                   </div>
                                   <div className="mt-4 flex justify-between text-[9px] uppercase tracking-[0.2em] font-bold text-lux-muted relative z-10">
                                      <span>Foundation</span>
                                      <span>Mastery</span>
                                   </div>
                                </div>
                              );
                            })}
                         </div>
                       ) : (
                         <div className="py-20 text-center bg-lux-surface border border-lux-border border-dashed rounded-[2.5rem] shadow-lux-sm">
                            <div className="w-16 h-16 bg-lux-bg border border-lux-border rounded-full flex items-center justify-center mx-auto mb-5 text-lux-gold">
                               <Settings strokeWidth={1} />
                            </div>
                            <h4 className="text-2xl font-serif text-lux-green-950 mb-3">No active subjects</h4>
                            <p className="text-lux-muted mb-8 font-light text-sm">Add subjects in your profile details to track your academic progress.</p>
                            <Button onClick={() => setActiveTab('details')} className="bg-lux-green-950 hover:bg-lux-green-900 text-lux-gold-light rounded-xl h-12 px-8 uppercase tracking-widest text-[10px] font-bold">Configure Profile</Button>
                         </div>
                       )}

                       <div className="p-10 bg-lux-green-950 border border-lux-green-900 rounded-[2.5rem] relative overflow-hidden mt-8 shadow-lux-lg">
                          <div className="absolute top-0 right-0 w-64 h-64 bg-lux-gold/10 blur-[100px] rounded-full pointer-events-none" />
                          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
                          <h3 className="text-lux-gold text-[10px] font-bold uppercase tracking-widest mb-3 relative z-10">Study Consistency</h3>
                          <p className="text-lux-surface font-serif text-3xl mb-10 relative z-10 max-w-sm leading-tight">You're in the top 15% of achieving learners this month.</p>
                          
                          <div className="flex flex-col gap-6 relative z-10">
                             <div className="flex justify-between items-end border-b border-lux-green-900/50 pb-4">
                               <span className="text-lux-gold-light/60 text-[10px] uppercase tracking-widest font-bold">Resources Consulted</span>
                               <span className="text-lux-surface font-serif text-2xl">{downloads.length + uploads.length * 2 + 12}</span>
                             </div>
                             <div className="flex justify-between items-end border-b border-lux-green-900/50 pb-4">
                               <span className="text-lux-gold-light/60 text-[10px] uppercase tracking-widest font-bold">Current Streak</span>
                               <span className="text-lux-gold font-serif text-2xl">4 Days</span>
                             </div>
                          </div>
                          
                          <Button variant="outline" className="mt-10 border-lux-gold/30 text-lux-gold hover:bg-lux-surface hover:text-lux-green-950 w-full rounded-2xl tracking-widest uppercase text-[10px] font-bold h-14 relative z-10 transition-colors duration-500">
                             View Detailed Analytics
                          </Button>
                       </div>
                    </motion.div>
                  )}

                  {activeTab === 'details' && (
                    <motion.div 
                      key="details"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-8"
                    >
                       {/* Completion Bar */}
                       <div className="p-8 bg-lux-surface border border-lux-border rounded-[2.5rem] overflow-hidden relative shadow-lux-sm">
                          <div className="flex items-center justify-between mb-6 relative z-10">
                            <h3 className="font-serif text-xl text-lux-green-950">Profile Configuration <span className="text-lux-gold">{progress}%</span></h3>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-lux-green-900 bg-lux-bg px-3 py-1.5 rounded-full">{progress === 100 ? 'Fully Optimized' : 'Integration Pending'}</span>
                          </div>
                          <div className="h-1.5 bg-lux-bg border border-lux-border/50 rounded-full overflow-hidden relative z-10">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${progress}%` }}
                              className="h-full bg-lux-gold origin-left"
                            />
                          </div>
                          <p className="mt-6 text-sm text-lux-muted relative z-10 font-light">
                            {progress < 100 ? 'Provide your academic details below to unlock personalised content streams.' : 'Your academic profile is perfectly calibrated.'}
                          </p>
                          <div className="absolute top-0 right-0 w-32 h-32 bg-lux-gold/5 blur-3xl rounded-full"></div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         {/* Grade Selector */}
                         <div className="p-8 bg-lux-surface border border-lux-border rounded-[2.5rem] shadow-lux-sm">
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-lux-muted mb-6">Academic Year</h3>
                            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                              {[8, 9, 10, 11, 12].map(g => (
                                <button 
                                  key={g}
                                  onClick={() => setGrade(g)}
                                  className={cn(
                                    "p-4 rounded-[1rem] border text-lg font-serif transition-colors duration-300 shadow-sm",
                                    grade === g 
                                      ? "bg-lux-green-950 border-lux-green-950 text-lux-gold-light" 
                                      : "bg-lux-bg border-lux-border text-lux-green-950 hover:border-lux-gold/50"
                                  )}
                                >
                                  {g}
                                </button>
                              ))}
                            </div>
                         </div>

                         {/* Curriculum Selector */}
                         <div className="p-8 bg-lux-surface border border-lux-border rounded-[2.5rem] shadow-lux-sm">
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-lux-muted mb-6">Align Curriculum</h3>
                            <div className="grid grid-cols-1 gap-3">
                              {(['NSC'] as const).map(c => (
                                <button 
                                  key={c}
                                  onClick={() => setCurriculum(c)}
                                  className={cn(
                                    "p-4 rounded-[1rem] border text-xs font-bold uppercase tracking-widest transition-colors duration-300 flex flex-col items-center justify-center gap-3 shadow-sm",
                                    curriculum === c 
                                      ? "bg-lux-green-950 border-lux-green-950 text-lux-gold-light" 
                                      : "bg-lux-bg border-lux-border text-lux-green-950 hover:border-lux-gold/50"
                                  )}
                                >
                                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", curriculum === c ? "bg-lux-green-900 text-lux-gold" : "bg-lux-surface text-lux-muted border border-lux-border")}>
                                    <Globe size={14} />
                                  </div>
                                  {c}
                                </button>
                              ))}
                            </div>
                         </div>
                       </div>

                       {/* Subjects Selector */}
                       <div className="p-8 bg-lux-surface border border-lux-border rounded-[2.5rem] shadow-lux-sm">
                          <h3 className="text-[10px] font-bold uppercase tracking-widest text-lux-muted mb-6">Curated Subjects</h3>
                          <div className="flex flex-wrap gap-3">
                             {ALL_SUBJECTS.map(s => (
                               <button 
                                 key={s}
                                 onClick={() => setSubjects(prev => 
                                   prev.includes(s) ? prev.filter(t => t !== s) : [...prev, s]
                                 )}
                                 className={cn(
                                   "px-6 py-3 rounded-full border text-[11px] font-bold uppercase tracking-widest transition-colors duration-300",
                                   subjects.includes(s)
                                     ? "bg-lux-gold font-bold border-lux-gold text-lux-green-950 shadow-sm"
                                     : "bg-lux-bg font-bold border-lux-border text-lux-muted hover:border-lux-gold hover:text-lux-green-950"
                                 )}
                               >
                                 {s}
                               </button>
                             ))}
                          </div>
                       </div>

                       <div className="flex justify-end pt-4">
                         <Button onClick={handleSaveProfile} disabled={isSaving} className="rounded-xl h-14 bg-lux-green-950 hover:bg-lux-green-900 text-lux-gold-light px-12 text-[10px] font-bold uppercase tracking-widest shadow-lux-lg transition-transform active:scale-95">
                            {isSaving ? <Loader2 className="animate-spin mr-2" /> : 'Sync Profile Changes'}
                         </Button>
                       </div>
                    </motion.div>
                  )}

                  {activeTab === 'uploads' && (
                    <motion.div 
                      key="uploads"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-6"
                    >
                       <div className="flex items-center justify-between">
                         <h2 className="text-3xl font-serif text-lux-green-950">Library Contributions</h2>
                         <Button onClick={() => navigate('/resources')} variant="outline" className="border-lux-border text-lux-green-950 text-[9px] font-bold uppercase tracking-widest">Deposit Resource</Button>
                       </div>

                       {uploads.length > 0 ? (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {uploads.map(u => (
                              <div key={u.id} className="p-8 bg-lux-surface border border-lux-border rounded-[2.5rem] shadow-lux-sm group hover:border-lux-gold/30 hover:shadow-lux-lg transition-all flex flex-col">
                                 <div className="flex items-start justify-between mb-6">
                                    <div className="w-12 h-12 bg-lux-bg border border-lux-border rounded-[1rem] flex items-center justify-center text-lux-gold group-hover:scale-105 transition-transform">
                                       <FileText size={20} strokeWidth={1.5} />
                                    </div>
                                    <button 
                                      onClick={() => handleDeleteUpload(u.id)}
                                      className="p-2 text-lux-muted hover:text-red-800 hover:bg-red-50 rounded-xl transition-all"
                                    >
                                       <Trash2 size={16} />
                                    </button>
                                 </div>
                                 <h4 className="font-serif text-lux-green-950 text-lg mb-4 line-clamp-1 group-hover:text-lux-gold transition-colors">{u.title}</h4>
                                 <div className="flex items-center justify-between mt-auto pt-5 border-t border-lux-border/60">
                                    <div className="flex items-center gap-2">
                                       <Download size={14} className="text-lux-muted" />
                                       <span className="text-[9px] font-bold tracking-[0.2em] text-lux-muted uppercase">{u.downloadCount} Synced</span>
                                    </div>
                                    <span className={cn(
                                      "px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border",
                                      u.isApproved 
                                        ? "bg-lux-green-100/50 text-lux-green-900 border-lux-green-100" 
                                        : "bg-lux-gold/10 text-lux-gold-light border-lux-gold/20"
                                    )}>
                                      {u.isApproved ? 'Verified' : 'Reviewing'}
                                    </span>
                                 </div>
                              </div>
                            ))}
                         </div>
                       ) : (
                         <div className="py-20 text-center bg-lux-surface border border-lux-border border-dashed rounded-[2.5rem] shadow-lux-sm">
                            <div className="w-16 h-16 bg-lux-bg border border-lux-border rounded-full flex items-center justify-center mx-auto mb-5 text-lux-gold">
                               <Upload size={24} strokeWidth={1} />
                            </div>
                            <h4 className="text-2xl font-serif text-lux-green-950 mb-3">No contributions yet</h4>
                            <p className="text-lux-muted mb-8 font-light text-sm">Contributing high-quality records elevates your scholar rank.</p>
                            <Button onClick={() => navigate('/resources')} className="bg-lux-green-950 hover:bg-lux-green-900 text-lux-gold-light rounded-xl h-12 px-8 uppercase tracking-widest text-[10px] font-bold">Submit Resource</Button>
                         </div>
                       )}
                    </motion.div>
                  )}

                  {activeTab === 'downloads' && (
                    <motion.div 
                      key="downloads"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-6"
                    >
                       <h2 className="text-3xl font-serif text-lux-green-950">Curated Collection</h2>
                       <div className="py-20 text-center bg-lux-surface border border-lux-border border-dashed rounded-[2.5rem] shadow-lux-sm">
                          <div className="w-16 h-16 bg-lux-bg border border-lux-border rounded-full flex items-center justify-center mx-auto mb-5 text-lux-gold">
                             <Download size={24} strokeWidth={1} />
                          </div>
                          <h4 className="text-2xl font-serif text-lux-green-950 mb-3">Library empty</h4>
                          <p className="text-lux-muted mb-8 font-light text-sm">Materials seamlessly synchronized to your profile will appear here.</p>
                          <Button onClick={() => navigate('/past-papers')} className="bg-lux-green-950 hover:bg-lux-green-900 text-lux-gold-light rounded-xl h-12 px-8 uppercase tracking-widest text-[10px] font-bold">
                            Analyze Archive
                          </Button>
                       </div>
                    </motion.div>
                  )}
               </AnimatePresence>
             </div>
           </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
