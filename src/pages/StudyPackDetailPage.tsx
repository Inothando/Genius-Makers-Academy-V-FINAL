import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  Users, 
  Clock, 
  Layout, 
  Video, 
  FileText, 
  CheckCircle, 
  Play, 
  Share2, 
  Download,
  Loader2,
  ArrowRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, query, where, limit, getDocs } from 'firebase/firestore';
import { StudyPack, VideoLesson, Resource, PastPaper } from '../types';
import { SubjectBadge } from '../components/ui/SubjectBadge';
import { GradeBadge } from '../components/ui/GradeBadge';
import { CurriculumTag } from '../components/ui/CurriculumTag';
import { Button } from '../components/ui/Button';
import { VideoLessonPlayer } from '../components/videos/VideoLessonPlayer';
import { PaperViewer } from '../components/resources/PaperViewer';
import { StudyPackVideoItem, StudyPackDocItem } from '../components/packs/StudyPackItems';
import { StudyPackCard } from '../components/packs/StudyPackCard';
import { useTierGating } from '../hooks/useTierGating';
import { useAuth } from '../contexts/AuthContext';
import { AIUpgradePrompt } from '../components/ai/AIUpgradePrompt';
import { Lock } from 'lucide-react';

export function StudyPackDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canAccessIEB, loading: tierLoading } = useTierGating();
  const [pack, setPack] = useState<StudyPack | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemsMetadata, setItemsMetadata] = useState<Record<string, any>>({});
  
  const [selectedVideo, setSelectedVideo] = useState<VideoLesson | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<{ url: string; title: string; type: string; subject?: string; grade?: string; year?: string; paperNumber?: string; } | null>(null);
  const [otherPacks, setOtherPacks] = useState<StudyPack[]>([]);

  useEffect(() => {
    async function fetchPack() {
      if (!id) return;
      setLoading(true);
      try {
        const docRef = doc(db, 'studyPacks', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const packData = { id: docSnap.id, ...docSnap.data() } as StudyPack;
          setPack(packData);

          // Fetch metadata for all items
          const metadata: Record<string, any> = {};
          await Promise.all(packData.items.map(async (item) => {
            let itemSnap;
            let collectionName = '';
            if (item.type === 'video') collectionName = 'videos';
            else if (item.type === 'resource') collectionName = 'resources';
            else if (item.type === 'paper') collectionName = 'past-papers';

            if (collectionName) {
              itemSnap = await getDoc(doc(db, collectionName, item.refId));
              if (itemSnap.exists()) {
                metadata[item.refId] = { id: itemSnap.id, ...itemSnap.data() };
              }
            }
          }));
          setItemsMetadata(metadata);

          // Fetch other packs in same subject
          const q = query(
            collection(db, 'studyPacks'),
            where('subject', '==', packData.subject),
            where('isPublic', '==', true),
            limit(5)
          );
          const otherSnap = await getDocs(q);
          setOtherPacks(otherSnap.docs
            .map(d => ({ id: d.id, ...d.data() } as StudyPack))
            .filter(p => p.id !== id)
            .slice(0, 4)
          );
        } else {
          setError('Study pack not found');
        }
      } catch (err) {
        console.error("Error fetching pack:", err);
        setError('Failed to load study pack');
      } finally {
        setLoading(false);
      }
    }
    fetchPack();
  }, [id]);

  const progress = 0; // Simulated for now

  if (loading) {
    return (
      <div className="min-h-screen bg-lux-bg flex items-center justify-center">
        <Loader2 className="animate-spin text-lux-green-500" size={40} />
      </div>
    );
  }

  if (error || !pack) {
    return (
      <div className="min-h-screen bg-lux-bg flex flex-col items-center justify-center p-4 font-sans">
        <h2 className="text-2xl font-serif mb-4 text-lux-text">{error || 'Something went wrong'}</h2>
        <Button onClick={() => navigate('/study-packs')}>Back to Study Packs</Button>
      </div>
    );
  }

  if (pack.curriculum?.toUpperCase() === 'IEB' && !canAccessIEB && !tierLoading) {
    return (
      <div className="min-h-screen bg-lux-bg flex flex-col font-sans">
        <Navbar />
        <div className="flex-1 max-w-2xl mx-auto w-full px-4 pt-28 sm:pt-36 md:pt-48 flex flex-col items-center">
          <div className="w-16 h-16 bg-lux-surface rounded-full flex items-center justify-center mb-6 border border-lux-border">
            <Lock className="text-lux-green-500" size={24} />
          </div>
          <h2 className="text-3xl font-serif font-medium text-lux-text mb-3 text-center">Premium IEB Content</h2>
          <p className="text-lux-text mb-8 text-center max-w-md">
            This study pack is created specifically for the IEB curriculum and is only available on the Scholar tier and above.
          </p>
          <div className="w-full">
            <AIUpgradePrompt />
          </div>
          <Button onClick={() => navigate('/study-packs')} className="mt-8">Back to Study Packs</Button>
        </div>
        <Footer />
      </div>
    );
  }

  const topicsCovered = Array.from(new Set(
    pack.items.map(item => itemsMetadata[item.refId]?.topic || itemsMetadata[item.refId]?.topics?.[0]).filter(Boolean)
  ));

  const handleWatch = (videoId: string) => {
    const video = itemsMetadata[videoId] as VideoLesson;
    if (video) setSelectedVideo(video);
  };

  const handlePreview = (docId: string) => {
    const docData = itemsMetadata[docId] as Resource | PastPaper;
    if (docData) {
      setSelectedDoc({
        url: docData.fileUrl,
        title: docData.title,
        type: (docData as Resource).fileType || 'PDF',
        subject: docData.subject,
        grade: docData.grade?.toString(),
        year: (docData as PastPaper).year?.toString(),
        paperNumber: (docData as PastPaper).paperNumber,
      });
    }
  };

  return (
    <div className="min-h-screen bg-lux-bg font-sans">
      <Navbar />

      <div className="pt-24 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb & Top Actions */}
          <div className="flex items-center justify-between mb-8">
             <button 
               onClick={() => navigate('/study-packs')}
               className="flex items-center gap-2 text-lux-text hover:text-lux-green-500 transition-colors font-bold text-sm tracking-wide"
             >
               <ChevronLeft size={20} />
               Back to Library
             </button>
             <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Link copied to clipboard!');
                }} className="border-lux-border text-lux-text font-bold uppercase tracking-widest text-[10px] hover:bg-lux-surface hover:border-lux-green-500 transition-colors">
                   <Share2 size={16} className="mr-2 text-lux-green-500" /> Share Pack
                </Button>
             </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-12">
            {/* Main Content */}
            <div className="flex-1 space-y-16">
               {/* Hero Section */}
               <section>
                  <div className="flex flex-wrap gap-3 mb-6">
                    <SubjectBadge subject={pack.subject} />
                    <GradeBadge grade={pack.grade} />
                    <CurriculumTag type={pack.curriculum} />
                  </div>
                  <h1 className="text-4xl sm:text-6xl font-serif text-lux-text mb-6 leading-tight">
                    {pack.title}
                  </h1>
                  <div className="flex items-center gap-4 text-lux-text">
                    <div className="flex items-center gap-2">
                       <div className="w-8 h-8 rounded-full bg-lux-surface border border-lux-border flex items-center justify-center font-bold text-lux-green-500 text-xs shadow-inner">
                         {pack.creatorName.charAt(0)}
                       </div>
                       <span className="text-sm font-bold text-lux-text">{pack.creatorName}</span>
                    </div>
                    <span>•</span>
                    <span className="text-sm font-medium">Created {new Date(pack.createdAt.seconds * 1000).toLocaleDateString()}</span>
                  </div>
               </section>

               {/* About */}
               <section className="p-8 bg-lux-surface rounded-[2.5rem] border border-lux-border shadow-lux-sm">
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-lux-text mb-6">About this Pack</h3>
                  <p className="text-lg text-lux-text leading-relaxed mb-8 font-light">
                    {pack.description}
                  </p>
                  
                  <div className="flex flex-wrap gap-2">
                     {topicsCovered.map(topic => (
                       <span key={topic as string} className="px-3 py-1.5 bg-lux-bg border border-lux-border/50 rounded-full text-[10px] uppercase tracking-widest font-bold text-lux-text shadow-sm">
                         #{topic as string}
                       </span>
                     ))}
                  </div>
               </section>

               {/* Curriculum Sequence */}
               <section>
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <Layout size={24} className="text-lux-green-500" />
                      <h2 className="text-2xl font-serif text-lux-text">Curriculum Sequence</h2>
                    </div>
                    <span className="text-[10px] font-bold text-lux-text uppercase tracking-widest">{pack.items.length} Modules</span>
                  </div>

                  <div className="space-y-4">
                     {pack.items.sort((a,b) => a.order - b.order).map((item, index) => (
                       item.type === 'video' ? (
                         <StudyPackVideoItem 
                            key={item.id} 
                            item={item} 
                            order={index + 1} 
                            onWatch={handleWatch}
                            onComplete={() => {
                              fetch('/api/activity/record', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ uid: user?.uid, action: 'study_pack_item' })
                              }).catch(console.error);
                            }}
                            metadata={itemsMetadata[item.refId]}
                         />
                       ) : (
                         <StudyPackDocItem 
                            key={item.id} 
                            item={item} 
                            order={index + 1} 
                            onPreview={handlePreview}
                            onComplete={() => {
                              fetch('/api/activity/record', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ uid: user?.uid, action: 'study_pack_item' })
                              }).catch(console.error);
                            }}
                            metadata={itemsMetadata[item.refId]}
                         />
                       )
                     ))}
                  </div>
               </section>

               {/* Related Packs */}
               {otherPacks.length > 0 && (
                 <section className="pt-8 border-t border-lux-border">
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-lux-text mb-8">Other Packs in {pack.subject}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                       {otherPacks.map(p => (
                         <StudyPackCard key={p.id} pack={p} onClick={(p) => navigate(`/study-packs/${p.id}`)} />
                       ))}
                    </div>
                 </section>
               )}
            </div>

            {/* Sticky Sidebar */}
            <div className="w-full lg:w-[320px] shrink-0">
               <div className="sticky top-32 space-y-6">
                  <div className="glass-panel p-8 shadow-lux-lg">
                     <div className="mb-8">
                       <h3 className="text-lg font-serif text-lux-text mb-2 truncate">{pack.title}</h3>
                       <div className="flex items-center gap-2">
                         <CheckCircle size={14} className="text-lux-green-500" />
                         <span className="text-[10px] font-bold uppercase tracking-widest text-lux-text">Verified Track</span>
                       </div>
                     </div>

                     <div className="space-y-4 mb-8">
                        <div className="flex justify-between items-center py-2 border-b border-lux-border/50">
                           <span className="text-[10px] uppercase font-bold tracking-widest text-lux-text">Subject</span>
                           <span className="text-xs font-bold text-lux-text">{pack.subject}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-lux-border/50">
                           <span className="text-[10px] uppercase font-bold tracking-widest text-lux-text">Grade</span>
                           <span className="text-xs font-bold text-lux-text">Grade {pack.grade}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-lux-border/50">
                           <span className="text-[10px] uppercase font-bold tracking-widest text-lux-text">Items</span>
                           <span className="text-xs font-bold text-lux-text">{pack.items.length} lessons</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-lux-border/50">
                           <span className="text-[10px] uppercase font-bold tracking-widest text-lux-text">Enrolled</span>
                           <span className="text-xs font-bold text-lux-text">{pack.enrollCount} learners</span>
                        </div>
                     </div>

                     <div className="mb-8">
                        <div className="flex justify-between items-center mb-2">
                           <span className="text-[10px] font-bold uppercase tracking-widest text-lux-text">Your Progress</span>
                           <span className="text-[10px] font-bold text-lux-green-500">{progress}%</span>
                        </div>
                        <div className="h-2 bg-lux-bg border border-lux-border rounded-full overflow-hidden shadow-inner">
                           <motion.div 
                             initial={{ width: 0 }}
                             animate={{ width: `${progress}%` }}
                             className="h-full bg-lux-green-500"
                           />
                        </div>
                     </div>

                     <Button size="lg" className="w-full h-14 rounded-2xl sm:rounded-3xl text-[11px] font-bold uppercase tracking-widest bg-lux-green-950 text-lux-bg hover:bg-lux-green-900 text-lux-surface group shadow-xl active:scale-95 transition-all">
                        Start Learning <ArrowRight size={16} className="ml-3 group-hover:translate-x-1 transition-transform" />
                     </Button>
                     
                     <p className="mt-4 text-center text-[9px] font-bold text-lux-text uppercase tracking-widest">
                        FREE TRACK • OPEN TO ALL LEARNERS
                     </p>
                  </div>

                  <div className="p-6 bg-lux-surface border border-lux-border rounded-[24px] shadow-lg relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-lux-green-500/10 blur-[40px] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
                     <h4 className="text-[10px] font-bold uppercase tracking-widest text-lux-green-500 mb-4 relative z-10">Study Tools</h4>
                     <div className="space-y-3 relative z-10">
                        <button className="w-full p-3 bg-lux-bg border border-lux-border rounded-xl text-[11px] uppercase tracking-wider font-bold text-lux-text flex items-center justify-between hover:bg-lux-green-500 hover:text-lux-text hover:border-lux-green-500 hover:border-lux-green-500 hover:text-lux-text transition-all shadow-inner">
                           Create Flashcards <ArrowRight size={14} />
                        </button>
                        <button className="w-full p-3 bg-lux-bg border border-lux-border rounded-xl text-[11px] uppercase tracking-wider font-bold text-lux-text flex items-center justify-between hover:bg-lux-green-500 hover:text-lux-text hover:border-lux-green-500 hover:border-lux-green-500 hover:text-lux-text transition-all shadow-inner">
                           Take Topic Quiz <ArrowRight size={14} />
                        </button>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />

      {/* Video Player */}
      {selectedVideo && (
        <VideoLessonPlayer 
          isOpen={!!selectedVideo}
          onClose={() => setSelectedVideo(null)}
          video={selectedVideo}
        />
      )}

      {/* Paper/Doc Viewer */}
      {selectedDoc && (
        <PaperViewer 
          isOpen={!!selectedDoc}
          onClose={() => setSelectedDoc(null)}
          fileUrl={selectedDoc.url}
          title={selectedDoc.title}
          fileType={selectedDoc.type}
          subject={selectedDoc.subject}
          grade={selectedDoc.grade}
          year={selectedDoc.year}
          paperNumber={selectedDoc.paperNumber}
        />
      )}
    </div>
  );
}
