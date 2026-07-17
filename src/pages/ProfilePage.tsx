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
  FileText,
  Sparkles,
  Target,
  BrainCircuit
} from 'lucide-react';
import { doc, updateDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { Button } from '../components/ui/Button';
import { Resource, PastPaper } from '../types';
import { cn } from '../lib/utils';
import { StreakBadge } from '../components/StreakBadge';
import { LeaderboardCard } from '../components/LeaderboardCard';
import { DailyNudgeCard } from '../components/DailyNudgeCard';
import { ExamCountdownWidget } from '../components/ExamCountdownWidget';
import { StudyCalendarWidget } from '../components/StudyCalendarWidget';

export function ProfilePage() {
  const { user, userProfile, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'progress' | 'details' | 'exams' | 'uploads' | 'downloads' | 'marked'>('progress');
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [grade, setGrade] = useState<number | null>(null);
  const [curriculum, setCurriculum] = useState<'NSC' | 'IEB' | null>(null);
  const [province, setProvince] = useState<string>('National');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [aiRememberPatterns, setAiRememberPatterns] = useState<boolean>(true);
  
  // Data State
  const [uploads, setUploads] = useState<Resource[]>([]);
  const [downloads, setDownloads] = useState<any[]>([]);
  const [markedAnswers, setMarkedAnswers] = useState<any[]>([]);

  // AI Pack State
  const [isBuildingPack, setIsBuildingPack] = useState(false);
  const [packError, setPackError] = useState<string | null>(null);

  const handleBuildPack = async () => {
    if (!user) return;
    setIsBuildingPack(true);
    setPackError(null);
    try {
      const res = await fetch('/api/ai/build-weak-topic-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid })
      });
      const data = await res.json();
      if (!res.ok) {
        setPackError(data.error || 'Failed to assemble pack. Ensure you are on Scholar tier and have completed 3 quizzes.');
      } else if (data.id) {
        navigate(`/study-packs/${data.id}`);
      }
    } catch (err: any) {
      setPackError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsBuildingPack(false);
    }
  };

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
      setProvince(userProfile.province || 'National');
      setSubjects(userProfile.subjects || []);
      setAiRememberPatterns(userProfile.aiRememberPatterns ?? true);

      fetchUserUploads();
      fetchUserMarkedAnswers();
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

  const fetchUserMarkedAnswers = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, 'users', user.uid, 'markedAnswers'));
      const snap = await getDocs(q);
      setMarkedAnswers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a: any, b: any) => b.createdAt?.seconds - a.createdAt?.seconds));
    } catch (err: any) {
      console.error("Failed to fetch marked answers", err);
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
        province,
        subjects,
        aiRememberPatterns
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
        <Loader2 className="animate-spin text-lux-green-500" size={40} />
      </div>
    );
  }

  const ALL_SUBJECTS = ['Mathematics', 'Physical Sciences'];
  const progress = calculateProgress();

  return (
    <div className="min-h-screen bg-lux-bg">
      <Navbar />

      <div className="pt-24 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
           <DailyNudgeCard />
           {subjects.map(s => (
               <ExamCountdownWidget key={s} subject={s} />
           ))}
           <div className="flex flex-col lg:flex-row gap-12">
             {/* Left Column: Profile Card */}
             <div className="w-full lg:w-[320px] shrink-0">
               <div className="sticky top-32 space-y-6">
                 <div className="glass-panel p-10 shadow-lux-sm text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-lux-green-500/10 blur-3xl rounded-full" />
                    <div className="relative z-10">
                      {user.email && ['techinfinite.banking@gmail.com', 'contact@salainnovationlabs.com'].includes(user.email) && (
                        <div className="mb-6 p-4 bg-lux-surface border border-lux-border rounded-2xl sm:rounded-3xl shadow-sm">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-lux-text mb-3">Admin Privileges</p>
                          <Button 
                            size="sm" 
                            className="w-full bg-lux-surface text-lux-text hover:bg-lux-bg uppercase tracking-widest text-[9px] font-bold"
                            onClick={() => navigate('/admin')}
                          >
                            <Layout size={14} className="mr-2 text-lux-green-500" /> Admin Panel
                          </Button>
                        </div>
                      )}
                      <div className="w-24 h-24 bg-lux-surface rounded-full mx-auto mb-8 flex items-center justify-center text-4xl font-serif text-lux-green-500 shadow-lux-sm border-4 border-lux-surface relative">
                         <div className="absolute inset-0 rounded-full border border-lux-border -m-[4px]"></div>
                        {userProfile?.displayName.charAt(0)}
                      </div>

                      <div className="mb-6">
                        {isEditingName ? (
                          <div className="flex flex-col gap-3">
                             <input 
                               className="w-full px-4 py-3 bg-lux-bg text-center font-bold text-base rounded-xl outline-none border border-lux-border focus:border-lux-green-500 transition-colors text-lux-text"
                               value={newName}
                               onChange={(e) => setNewName(e.target.value)}
                               autoFocus
                             />
                             <div className="flex gap-2">
                               <Button size="sm" onClick={handleUpdateName} disabled={isSaving} className="flex-1 bg-lux-surface text-lux-text hover:bg-lux-bg rounded-xl h-10">Save</Button>
                               <Button variant="outline" size="sm" onClick={() => setIsEditingName(false)} className="flex-1 border-lux-border text-lux-text hover:bg-lux-bg rounded-xl h-10">Cancel</Button>
                             </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2 group mb-1">
                            <h2 className="text-2xl font-serif text-lux-text">{userProfile?.displayName}</h2>
                            <button onClick={() => setIsEditingName(true)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-lux-text hover:text-lux-green-500">
                              <Edit3 size={14} />
                            </button>
                          </div>
                        )}
                        <p className="text-xs font-medium text-lux-text tracking-wide">
                          {userProfile?.phoneNumber || userProfile?.email}
                        </p>
                      </div>

                      <div className="flex justify-center gap-3 mb-10">
                         <span className="px-3 py-1 bg-lux-surface rounded-full text-[9px] font-bold uppercase tracking-[0.2em] text-lux-green-500">
                            {userProfile?.tier} Scholar
                         </span>
                         <span className="px-3 py-1 bg-lux-bg rounded-full text-[9px] font-bold uppercase tracking-[0.2em] text-lux-text border border-lux-border">
                            Est. {new Date(userProfile?.createdAt?.seconds * 1000).getFullYear()}
                         </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-8 border-t border-lux-border/60">
                         <div>
                            <p className="text-xl font-serif text-lux-text leading-none mb-2">{uploads.length}</p>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-lux-text">Uploads</p>
                         </div>
                         <div>
                            <p className="text-xl font-serif text-lux-text leading-none mb-2">{userProfile?.downloadCount || 0}</p>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-lux-text">Downloads</p>
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
               <div className="flex p-1 bg-lux-surface border border-lux-border rounded-2xl sm:rounded-3xl w-full sm:w-fit overflow-x-auto shadow-sm">
                 <button 
                    onClick={() => setActiveTab('progress')}
                    className={cn(
                      "px-6 py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                      activeTab === 'progress' ? "bg-lux-surface text-lux-green-500 shadow-md" : "text-lux-text hover:bg-lux-bg hover:text-lux-green-900"
                    )}
                  >
                    Dashboard & AI Hub
                  </button>
                  <button 
                    onClick={() => setActiveTab('details')}
                    className={cn(
                      "px-6 py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                      activeTab === 'details' ? "bg-lux-surface text-lux-green-500 shadow-md" : "text-lux-text hover:bg-lux-bg hover:text-lux-green-900"
                    )}
                  >
                    My Details
                  </button>
                  <button 
                    onClick={() => setActiveTab('exams')}
                    className={cn(
                      "px-6 py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                      activeTab === 'exams' ? "bg-lux-surface text-lux-green-500 shadow-md" : "text-lux-text hover:bg-lux-bg hover:text-lux-green-900"
                    )}
                  >
                    Countdowns
                  </button>
                  <button 
                    onClick={() => setActiveTab('uploads')}
                    className={cn(
                      "px-6 py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                      activeTab === 'uploads' ? "bg-lux-surface text-lux-green-500 shadow-md" : "text-lux-text hover:bg-lux-bg hover:text-lux-green-900"
                    )}
                  >
                    Contributions
                  </button>
                  <button 
                    onClick={() => setActiveTab('downloads')}
                    className={cn(
                      "px-6 py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                      activeTab === 'downloads' ? "bg-lux-surface text-lux-green-500 shadow-md" : "text-lux-text hover:bg-lux-bg hover:text-lux-green-900"
                    )}
                  >
                    Downloads
                  </button>
                  <button 
                    onClick={() => setActiveTab('marked')}
                    className={cn(
                      "px-6 py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                      activeTab === 'marked' ? "bg-lux-surface text-lux-green-500 shadow-md" : "text-lux-text hover:bg-lux-bg hover:text-lux-green-900"
                    )}
                  >
                    Marked Answers
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
                         <h2 className="text-3xl font-serif text-lux-text">Dashboard & AI Hub</h2>
                       </div>
                       
                       <StudyCalendarWidget />

                       {/* AI Built Study Pack Card */}
                       <div className="bg-gradient-to-br from-lux-green-950 to-lux-green-900 text-lux-text p-6 sm:p-8 md:p-10 rounded-[2.5rem] relative overflow-hidden shadow-2xl border border-lux-border mb-8 mt-4 group">
                         <div className="absolute top-0 right-0 w-96 h-96 bg-lux-green-500/15 blur-[120px] rounded-full pointer-events-none transition-transform duration-1000 group-hover:scale-110" />
                         <div className="absolute bottom-0 left-0 w-full h-full hidden opacity-10 pointer-events-none mix-blend-multiply"></div>
                         
                         <div className="flex md:flex-row flex-col justify-between items-start md:items-center relative z-10 gap-8">
                           <div className="flex-1">
                             <div className="flex items-center gap-3 mb-4">
                               <div className="w-12 h-12 bg-lux-green-500/10 backdrop-blur-sm rounded-xl flex items-center justify-center text-lux-green-500 border border-lux-green-500/40 shadow-[0_0_15px_rgba(194,157,89,0.2)]">
                                 <BrainCircuit size={24} className="animate-pulse" />
                               </div>
                               <div>
                                 <h3 className="text-2xl font-serif text-lux-text tracking-tight drop-shadow-sm">Advanced AI Performance Pack</h3>
                               </div>
                             </div>
                             <p className="text-lux-text max-w-2xl text-sm leading-relaxed font-light">
                               Utilizing our most capable AI, the system deeply analyzes your entire study history, quiz scores, and subject data. It intelligently auto-assembles a hyper-personalized, high-yield study package designed specifically to target your weaknesses and guarantee grade improvements.
                             </p>
                             {packError && (
                               <div className="mt-4 bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs flex items-center gap-2">
                                 <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"></span>
                                 {packError}
                               </div>
                             )}
                           </div>
                           <Button 
                             onClick={handleBuildPack}
                             disabled={isBuildingPack}
                             className="bg-lux-green-500 hover:bg-lux-green-500 hover:text-lux-text hover:border-lux-green-500-light text-lux-text font-bold uppercase tracking-widest text-xs whitespace-nowrap h-14 px-8 rounded-xl flex items-center shadow-[0_0_20px_rgba(194,157,89,0.4)] transition-all hover:shadow-[0_0_30px_rgba(194,157,89,0.6)] hover:scale-105 shrink-0 border-none"
                           >
                             {isBuildingPack ? <Loader2 size={18} className="animate-spin mr-3" /> : <Sparkles size={18} className="mr-3 text-lux-green-900" />}
                             {isBuildingPack ? 'Assembling Package...' : 'Generate My Pack'}
                           </Button>
                         </div>
                       </div>
                       
                       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                          <StreakBadge expanded={true} />
                          <LeaderboardCard />
                       </div>
                       
                       {subjects.length > 0 ? (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {subjects.map((s, i) => {
                              const progressValue = Math.min(100, Math.max(10, ((s.length * 15 + (user?.uid.charCodeAt(0) || 0) * 10) % 80) + 10));
                              
                              return (
                                <div key={s} className="p-8 glass-panel relative overflow-hidden group shadow-lux-sm">
                                   <div className="absolute top-0 right-0 w-32 h-32 bg-lux-green-500/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                   <div className="flex justify-between items-start mb-6 relative z-10">
                                      <div className="w-14 h-14 bg-lux-bg border border-lux-border rounded-[1rem] flex items-center justify-center text-lux-green-500 shadow-sm">
                                         <BookOpen strokeWidth={1} size={24} />
                                      </div>
                                      <span className="text-lux-text font-serif text-2xl font-medium">{progressValue}%</span>
                                   </div>
                                   <h4 className="text-lg font-serif text-lux-text mb-5 relative z-10">{s}</h4>
                                   
                                   <div className="h-1.5 bg-lux-border/50 rounded-full overflow-hidden relative z-10">
                                      <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progressValue}%` }}
                                        transition={{ duration: 1.5, ease: "easeOut", delay: i * 0.1 }}
                                        className="h-full bg-lux-green-500"
                                      />
                                   </div>
                                   <div className="mt-4 flex justify-between text-[9px] uppercase tracking-[0.2em] font-bold text-lux-text relative z-10">
                                      <span>Foundation</span>
                                      <span>Mastery</span>
                                   </div>
                                </div>
                              );
                            })}
                         </div>
                       ) : (
                         <div className="py-20 text-center bg-lux-surface border border-lux-border border-dashed rounded-[2.5rem] shadow-lux-sm">
                            <div className="w-16 h-16 bg-lux-bg border border-lux-border rounded-full flex items-center justify-center mx-auto mb-5 text-lux-green-500">
                               <Settings strokeWidth={1} />
                            </div>
                            <h4 className="text-2xl font-serif text-lux-text mb-3">No active subjects</h4>
                            <p className="text-lux-text mb-8 font-light text-sm">Add subjects in your profile details to track your academic progress.</p>
                            <Button onClick={() => setActiveTab('details')} className="bg-lux-green-950 text-lux-bg hover:bg-lux-green-900 text-lux-surface rounded-xl h-12 px-8 uppercase tracking-widest text-[10px] font-bold">Configure Profile</Button>
                         </div>
                       )}

                       <div className="p-10 glass-panel relative overflow-hidden mt-8 shadow-lux-lg hidden">
                          <div className="absolute top-0 right-0 w-64 h-64 bg-lux-green-500/10 blur-[100px] rounded-full pointer-events-none" />
                          <div className="absolute inset-0 hidden opacity-10 mix-blend-multiply"></div>
                          <h3 className="text-lux-green-500 text-[10px] font-bold uppercase tracking-widest mb-3 relative z-10">Study Consistency</h3>
                          <p className="text-lux-text font-serif text-3xl mb-10 relative z-10 max-w-sm leading-tight">You're in the top 15% of achieving learners this month.</p>
                          
                          <div className="flex flex-col gap-6 relative z-10">
                             <div className="flex justify-between items-end border-b border-lux-border/50 pb-4">
                               <span className="text-lux-text text-[10px] uppercase tracking-widest font-bold">Resources Consulted</span>
                               <span className="text-lux-text font-serif text-2xl">{downloads.length + uploads.length * 2 + 12}</span>
                             </div>
                             <div className="flex justify-between items-end border-b border-lux-border/50 pb-4">
                               <span className="text-lux-text text-[10px] uppercase tracking-widest font-bold">Current Streak</span>
                               <span className="text-lux-green-500 font-serif text-2xl">4 Days</span>
                             </div>
                          </div>
                          
                          <Button variant="outline" className="mt-10 border-lux-border text-lux-green-500 hover:bg-lux-surface hover:text-lux-text w-full rounded-2xl sm:rounded-3xl tracking-widest uppercase text-[10px] font-bold h-14 relative z-10 transition-colors duration-500">
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
                       <div className="p-8 glass-panel overflow-hidden relative shadow-lux-sm">
                          <div className="flex items-center justify-between mb-6 relative z-10">
                            <h3 className="font-serif text-xl text-lux-text">Profile Configuration <span className="text-lux-green-500">{progress}%</span></h3>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-lux-green-900 bg-lux-bg px-3 py-1.5 rounded-full">{progress === 100 ? 'Fully Optimized' : 'Integration Pending'}</span>
                          </div>
                          <div className="h-1.5 bg-lux-bg border border-lux-border/50 rounded-full overflow-hidden relative z-10">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${progress}%` }}
                              className="h-full bg-lux-green-500 origin-left"
                            />
                          </div>
                          <p className="mt-6 text-sm text-lux-text relative z-10 font-light">
                            {progress < 100 ? 'Provide your academic details below to unlock personalised content streams.' : 'Your academic profile is perfectly calibrated.'}
                          </p>
                          <div className="absolute top-0 right-0 w-32 h-32 bg-lux-green-500/5 blur-3xl rounded-full"></div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         {/* Grade Selector */}
                         <div className="p-8 glass-panel">
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-lux-text mb-6">Academic Year</h3>
                            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                              {[8, 9, 10, 11, 12].map(g => (
                                <button 
                                  key={g}
                                  onClick={() => setGrade(g)}
                                  className={cn(
                                    "p-4 rounded-[1rem] border text-lg font-serif transition-colors duration-300 shadow-sm",
                                    grade === g 
                                      ? "bg-lux-surface border-lux-border text-lux-text" 
                                      : "bg-lux-bg border-lux-border text-lux-text hover:border-lux-border"
                                  )}
                                >
                                  {g}
                                </button>
                              ))}
                            </div>
                         </div>

                         {/* Curriculum Selector */}
                         <div className="p-8 glass-panel">
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-lux-text mb-6">Align Curriculum</h3>
                            <div className="grid grid-cols-1 gap-3">
                              {(['NSC'] as const).map(c => (
                                <button 
                                  key={c}
                                  onClick={() => setCurriculum(c)}
                                  className={cn(
                                    "p-4 rounded-[1rem] border text-xs font-bold uppercase tracking-widest transition-colors duration-300 flex flex-col items-center justify-center gap-3 shadow-sm",
                                    curriculum === c 
                                      ? "bg-lux-surface border-lux-border text-lux-text" 
                                      : "bg-lux-bg border-lux-border text-lux-text hover:border-lux-border"
                                  )}
                                >
                                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", curriculum === c ? "bg-lux-bg text-lux-green-500" : "bg-lux-surface text-lux-text border border-lux-border")}>
                                    <Globe size={14} />
                                  </div>
                                  {c}
                                </button>
                              ))}
                            </div>
                         </div>
                         
                         {/* Province Selector */}
                         <div className="p-8 glass-panel md:col-span-2">
                             <h3 className="text-[10px] font-bold uppercase tracking-widest text-lux-text mb-6">Exam Region</h3>
                             <select
                                 value={province}
                                 onChange={e => setProvince(e.target.value)}
                                 className="w-full px-6 py-4 bg-lux-bg border border-lux-border rounded-xl outline-none focus:border-lux-green-500 transition-colors text-lux-text text-sm font-bold shadow-inner"
                             >
                                 {['National', 'Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 'Limpopo', 'Mpumalanga', 'Northern Cape', 'North West', 'Western Cape'].map(p => (
                                     <option key={p} value={p}>{p}</option>
                                 ))}
                             </select>
                         </div>
                       </div>

                       {/* Subjects Selector */}
                       <div className="p-8 glass-panel">
                          <h3 className="text-[10px] font-bold uppercase tracking-widest text-lux-text mb-6">Curated Subjects</h3>
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
                                     ? "bg-lux-green-500 font-bold border-lux-green-500 text-lux-text shadow-sm"
                                     : "bg-lux-bg font-bold border-lux-border text-lux-text hover:border-lux-green-500 hover:text-lux-text"
                                 )}
                               >
                                 {s}
                               </button>
                             ))}
                          </div>
                       </div>

                       {/* AI Settings */}
                       <div className="p-8 glass-panel flex items-center justify-between">
                          <div>
                            <h3 className="text-sm font-bold text-lux-text mb-1">Let AI remember my learning patterns</h3>
                            <p className="text-xs text-lux-text">Allows GMA AI to track your weak topics and adjust explanations to your style.</p>
                          </div>
                          <button
                            onClick={() => setAiRememberPatterns(p => !p)}
                            className={cn(
                              "w-14 h-8 rounded-full transition-colors flex items-center px-1",
                              aiRememberPatterns ? "bg-lux-surface" : "bg-lux-border"
                            )}
                          >
                            <motion.div
                              className="w-6 h-6 bg-white rounded-full shadow-sm"
                              animate={{ x: aiRememberPatterns ? 24 : 0 }}
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            />
                          </button>
                       </div>

                       <div className="flex justify-end pt-4">
                         <Button onClick={handleSaveProfile} disabled={isSaving} className="rounded-xl h-14 bg-lux-green-950 text-lux-bg hover:bg-lux-green-900 text-lux-surface px-12 text-[10px] font-bold uppercase tracking-widest shadow-lux-lg transition-transform active:scale-95">
                            {isSaving ? <Loader2 className="animate-spin mr-2" /> : 'Sync Profile Changes'}
                         </Button>
                       </div>
                    </motion.div>
                  )}

                  {activeTab === 'exams' && (
                    <motion.div 
                      key="exams"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-6"
                    >
                       <div className="flex items-center justify-between mb-2">
                         <h2 className="text-3xl font-serif text-lux-text">Exam Countdowns</h2>
                       </div>
                       
                       <div className="glass-panel p-8 shadow-lux-sm">
                         <h3 className="text-[10px] font-bold uppercase tracking-widest text-lux-text mb-6">Subject Countdowns</h3>
                         <p className="text-sm text-lux-text leading-relaxed mb-6">
                            Your exam countdowns are powered by official timetables updated by your administrators. 
                            Countdowns will automatically display in your workspace for any subjects you've added in your <b>My Details</b> tab, provided your province and grade have an active timetable released.
                         </p>
                         
                         <div className="p-6 border border-lux-border bg-lux-bg rounded-xl">
                            <h4 className="font-bold text-lux-text mb-2">Tracked Subjects</h4>
                            {subjects.length === 0 ? (
                               <p className="text-xs text-lux-text">You haven't added any subjects to track yet.</p>
                            ) : (
                               <div className="flex flex-wrap gap-2">
                                  {subjects.map(s => <span key={s} className="px-3 py-1 bg-lux-surface border border-lux-border rounded-lg text-xs font-bold text-lux-text uppercase tracking-wider">{s}</span>)}
                               </div>
                            )}
                         </div>
                       </div>
                       
                       <div className="flex justify-end pt-4">
                         <Button onClick={() => setActiveTab('details')} className="rounded-xl h-14 bg-lux-green-950 text-lux-bg hover:bg-lux-green-900 text-lux-surface px-12 text-[10px] font-bold uppercase tracking-widest shadow-lux-lg transition-transform active:scale-95">
                            Configure Subjects
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
                         <h2 className="text-3xl font-serif text-lux-text">Library Contributions</h2>
                         <Button onClick={() => navigate('/resources')} variant="outline" className="border-lux-border text-lux-text text-[9px] font-bold uppercase tracking-widest">Deposit Resource</Button>
                       </div>

                       {uploads.length > 0 ? (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {uploads.map(u => (
                              <div key={u.id} className="p-8 glass-panel group hover:border-lux-border hover:shadow-lux-lg transition-all flex flex-col">
                                 <div className="flex items-start justify-between mb-6">
                                    <div className="w-12 h-12 bg-lux-bg border border-lux-border rounded-[1rem] flex items-center justify-center text-lux-green-500 group-hover:scale-105 transition-transform">
                                       <FileText size={20} strokeWidth={1.5} />
                                    </div>
                                    <button 
                                      onClick={() => handleDeleteUpload(u.id)}
                                      className="p-2 text-lux-text hover:text-red-800 hover:bg-red-50 rounded-xl transition-all"
                                    >
                                       <Trash2 size={16} />
                                    </button>
                                 </div>
                                 <h4 className="font-serif text-lux-text text-lg mb-4 line-clamp-1 group-hover:text-lux-green-500 transition-colors">{u.title}</h4>
                                 <div className="flex items-center justify-between mt-auto pt-5 border-t border-lux-border/60">
                                    <div className="flex items-center gap-2">
                                       <Download size={14} className="text-lux-text" />
                                       <span className="text-[9px] font-bold tracking-[0.2em] text-lux-text uppercase">{u.downloadCount} Synced</span>
                                    </div>
                                    <span className={cn(
                                      "px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border",
                                      u.isApproved 
                                        ? "bg-lux-green-100/50 text-lux-green-900 border-lux-green-100" 
                                        : "bg-lux-green-500/10 text-lux-text border-lux-border"
                                    )}>
                                      {u.isApproved ? 'Verified' : 'Reviewing'}
                                    </span>
                                 </div>
                              </div>
                            ))}
                         </div>
                       ) : (
                         <div className="py-20 text-center bg-lux-surface border border-lux-border border-dashed rounded-[2.5rem] shadow-lux-sm">
                            <div className="w-16 h-16 bg-lux-bg border border-lux-border rounded-full flex items-center justify-center mx-auto mb-5 text-lux-green-500">
                               <Upload size={24} strokeWidth={1} />
                            </div>
                            <h4 className="text-2xl font-serif text-lux-text mb-3">No contributions yet</h4>
                            <p className="text-lux-text mb-8 font-light text-sm">Contributing high-quality records elevates your scholar rank.</p>
                            <Button onClick={() => navigate('/resources')} className="bg-lux-green-950 text-lux-bg hover:bg-lux-green-900 text-lux-surface rounded-xl h-12 px-8 uppercase tracking-widest text-[10px] font-bold">Submit Resource</Button>
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
                       <h2 className="text-3xl font-serif text-lux-text">Curated Collection</h2>
                       <div className="py-20 text-center bg-lux-surface border border-lux-border border-dashed rounded-[2.5rem] shadow-lux-sm">
                          <div className="w-16 h-16 bg-lux-bg border border-lux-border rounded-full flex items-center justify-center mx-auto mb-5 text-lux-green-500">
                             <Download size={24} strokeWidth={1} />
                          </div>
                          <h4 className="text-2xl font-serif text-lux-text mb-3">Library empty</h4>
                          <p className="text-lux-text mb-8 font-light text-sm">Materials seamlessly synchronized to your profile will appear here.</p>
                          <Button onClick={() => navigate('/past-papers')} className="bg-lux-green-950 text-lux-bg hover:bg-lux-green-900 text-lux-surface rounded-xl h-12 px-8 uppercase tracking-widest text-[10px] font-bold">
                            Analyze Archive
                          </Button>
                       </div>
                    </motion.div>
                  )}

                  {activeTab === 'marked' && (
                    <motion.div 
                      key="marked"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-6"
                    >
                       <h2 className="text-3xl font-serif text-lux-text">AI Marked Answers</h2>
                       
                       {markedAnswers.length === 0 ? (
                         <div className="py-20 text-center bg-lux-surface border border-lux-border border-dashed rounded-[2.5rem] shadow-lux-sm">
                            <div className="w-16 h-16 bg-lux-bg border border-lux-border rounded-full flex items-center justify-center mx-auto mb-5 text-lux-green-500">
                               <Sparkles size={24} strokeWidth={1} />
                            </div>
                            <h4 className="text-2xl font-serif text-lux-text mb-3">No answers marked yet</h4>
                            <p className="text-lux-text mb-8 font-light text-sm">Upload handwritten answers in past papers to have AI mark them.</p>
                            <Button onClick={() => navigate('/past-papers')} className="bg-lux-green-950 text-lux-bg hover:bg-lux-green-900 text-lux-surface rounded-xl h-12 px-8 uppercase tracking-widest text-[10px] font-bold">
                              Find Past Papers
                            </Button>
                         </div>
                       ) : (
                         <div className="space-y-6">
                           {markedAnswers.map((answer, index) => (
                             <div key={answer.id || index} className="bg-white border text-left border-lux-border p-6 rounded-[2rem] sm:rounded-[3rem] shadow-sm">
                               <div className="flex items-start justify-between mb-4">
                                 <div>
                                   <div className="flex items-center gap-2 mb-1">
                                     <span className="text-[10px] font-bold uppercase tracking-wider text-lux-text">{answer.subject} Grade {answer.grade}</span>
                                     <span className="w-1.5 h-1.5 rounded-full bg-lux-border" />
                                     <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-lux-green-500)]">Question {answer.questionNumber}</span>
                                   </div>
                                   <p className="text-xs text-lux-text">{new Date(answer.createdAt?.seconds * 1000).toLocaleDateString()}</p>
                                 </div>
                                 <div className="bg-lux-bg border border-lux-border px-4 py-2 rounded-xl flex flex-col items-center shadow-sm">
                                   <span className="text-xl font-bold font-serif text-lux-text leading-none">{answer.marksAwarded}</span>
                                   <span className="text-[9px] font-bold uppercase tracking-widest text-lux-text border-t border-lux-border pt-1 mt-1">/ {answer.marksTotal}</span>
                                 </div>
                               </div>
                               
                               <div className="mb-4">
                                 <h4 className="text-sm font-bold text-lux-text mb-1">Feedback</h4>
                                 <p className="text-sm text-lux-text leading-relaxed">{answer.feedback}</p>
                               </div>

                               {(answer.mistakesIdentified?.length > 0 || answer.whatWasGoodAboutIt) && (
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                   {answer.mistakesIdentified?.length > 0 && (
                                     <div className="bg-red-50 p-4 border border-red-100 rounded-2xl sm:rounded-3xl">
                                       <h4 className="text-xs font-bold text-red-800 uppercase tracking-wider mb-2">Areas for Improvement</h4>
                                       <ul className="space-y-1">
                                         {answer.mistakesIdentified.map((m: string, i: number) => (
                                           <li key={i} className="text-xs text-red-700/80 flex items-start gap-1">
                                             <span className="text-red-400 mt-0.5">•</span> {m}
                                           </li>
                                         ))}
                                       </ul>
                                     </div>
                                   )}
                                   {answer.whatWasGoodAboutIt && (
                                     <div className="bg-[var(--color-lux-green-500)]/10 border border-[var(--color-lux-green-500)]/20 p-4 rounded-2xl sm:rounded-3xl">
                                       <h4 className="text-xs font-bold text-[var(--color-lux-green-500)] uppercase tracking-wider mb-2">What you did well</h4>
                                       <p className="text-xs text-[var(--color-lux-green-800)]">{answer.whatWasGoodAboutIt}</p>
                                     </div>
                                   )}
                                 </div>
                               )}
                             </div>
                           ))}
                         </div>
                       )}
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
