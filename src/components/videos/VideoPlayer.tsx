import React, { useState, useEffect } from 'react';
import { 
  X, 
  Share2, 
  ChevronLeft, 
  CheckCircle, 
  MessageSquare, 
  Send, 
  Play,
  ExternalLink,
  Loader2,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { VideoLesson } from '../../types';
import { SubjectBadge } from '../ui/SubjectBadge';
import { GradeBadge } from '../ui/GradeBadge';
import { CurriculumTag } from '../ui/CurriculumTag';
import { VideoCard } from './VideoCard';
import { db, auth } from '../../lib/firebase';
import { collection, query, where, limit, getDocs, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { Button } from '../ui/Button';

interface VideoPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  video: VideoLesson;
}

export function VideoPlayer({ isOpen, onClose, video: initialVideo }: VideoPlayerProps) {
  const [currentVideo, setCurrentVideo] = useState(initialVideo);
  const [upNext, setUpNext] = useState<VideoLesson[]>([]);
  const [question, setQuestion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCurrentVideo(initialVideo);
  }, [initialVideo]);

  useEffect(() => {
    async function fetchUpNext() {
      if (!currentVideo) return;
      try {
        const q = query(
          collection(db, 'videos'),
          where('subject', '==', currentVideo.subject),
          where('grade', '==', currentVideo.grade),
          orderBy('createdAt', 'desc'),
          limit(4) // Get 4 so we can exclude current
        );
        const snapshot = await getDocs(q);
        const results = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as VideoLesson))
          .filter(v => v.id !== currentVideo.id)
          .slice(0, 3);
        setUpNext(results);
      } catch (err) {
        console.error("Error fetching up next:", err);
      }
    }
    fetchUpNext();
  }, [currentVideo]);

  const handleShare = () => {
    const url = window.location.origin + '/videos?id=' + currentVideo.id;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAskQuestion = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!question.trim()) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'discussions'), {
        subject: currentVideo.subject,
        grade: currentVideo.grade,
        curriculum: currentVideo.curriculum === 'All' ? 'Both' : currentVideo.curriculum,
        topic: currentVideo.topic,
        content: `Question from lesson video "${currentVideo.title}":\n\n${question}`,
        authorId: auth.currentUser?.uid || null,
        authorName: auth.currentUser?.displayName || 'Guest Student',
        isGuest: !auth.currentUser,
        imageUrl: null,
        replyCount: 0,
        likeCount: 0,
        likedBy: [],
        createdAt: serverTimestamp()
      });
      setQuestion('');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error("Error posting question:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Detect Shorts (duration < 90s OR title contains #shorts)
  const isShort = currentVideo.isShort || 
                  (currentVideo.title.toLowerCase().includes('#short')) ||
                  (currentVideo.duration.split(':').length === 2 && 
                   parseInt(currentVideo.duration.split(':')[0]) === 0 && 
                   parseInt(currentVideo.duration.split(':')[1]) < 90);

  return (
    <div className="fixed inset-0 z-[60] bg-[#0A0A0A] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="h-16 px-4 sm:px-8 border-b border-white/10 flex items-center justify-between shrink-0 bg-[#0A0A0A]/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-4 min-w-0">
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-full transition-colors text-white"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="min-w-0">
            <h2 className="text-white font-serif text-lg line-clamp-1">{currentVideo.title}</h2>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/40 uppercase font-black tracking-widest">
                {currentVideo.subject} • Grade {currentVideo.grade}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-white text-xs font-bold border border-white/5"
          >
            {copied ? <Check size={16} className="text-primary" /> : <Share2 size={16} />}
            {copied ? 'Link Copied' : 'Share Lesson'}
          </button>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-full transition-colors text-white"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Player Area */}
        <div className="flex-1 bg-black flex items-center justify-center relative p-0 sm:p-4 lg:p-8">
          <div className={isShort ? "aspect-[9/16] h-full max-w-[400px] w-full" : "aspect-video w-full max-w-5xl"}>
            <iframe
              src={`https://www.youtube.com/embed/${currentVideo.youtubeId}?autoplay=1&rel=0&modestbranding=1`}
              className="w-full h-full rounded-2xl shadow-2xl border border-white/5"
              title={currentVideo.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-[400px] border-l border-white/10 flex flex-col overflow-y-auto bg-[#0A0A0A] shrink-0 custom-scrollbar">
          {/* Section 1: About */}
          <div className="p-8 border-b border-white/10">
            <div className="flex items-center justify-between mb-6">
               <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">About this lesson</h3>
               <div className="flex gap-2">
                 {currentVideo.isVerified && <CheckCircle size={14} className="text-primary" />}
               </div>
            </div>
            
            <h1 className="text-2xl font-serif text-white mb-6 leading-tight">
              {currentVideo.title}
            </h1>
            
            <div className="flex items-center gap-3 mb-8">
               <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                 <Play size={16} className="text-primary fill-current" />
               </div>
               <div>
                  <div className="text-sm font-bold text-white leading-none mb-1">{currentVideo.channelName}</div>
                  <div className="text-[10px] text-white/30 font-black uppercase tracking-widest">Verified Creator</div>
               </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-8">
              <SubjectBadge subject={currentVideo.subject} />
              {currentVideo.grade && <GradeBadge grade={currentVideo.grade} />}
              <CurriculumTag type={currentVideo.curriculum as any} />
              <div className="px-3 py-1.5 bg-secondary/10 rounded-full">
                <span className="text-[10px] font-black uppercase tracking-widest text-secondary">{currentVideo.topic}</span>
              </div>
            </div>

            {currentVideo.playlistId && (
              <button className="w-full p-4 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-between group">
                <div className="text-left">
                  <div className="text-[10px] text-primary font-black uppercase tracking-widest mb-1">Study Pack</div>
                  <div className="text-sm font-bold text-white group-hover:text-primary transition-colors">Master {currentVideo.topic}</div>
                </div>
                <ExternalLink size={18} className="text-primary" />
              </button>
            )}
          </div>

          {/* Section 2: Up Next */}
          <div className="p-8 border-b border-white/10">
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-6">Up next in this topic</h3>
             <div className="space-y-4">
               {upNext.length > 0 ? (
                 upNext.map(video => (
                   <VideoCard 
                      key={video.id} 
                      video={video} 
                      compact 
                      onClick={(v) => setCurrentVideo(v)} 
                   />
                 ))
               ) : (
                 <p className="text-xs text-white/20 italic">No more videos in this topic yet.</p>
               )}
             </div>
          </div>

          {/* Section 3: Ask Question */}
          <div className="p-8">
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-6">Ask about this video</h3>
             <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <textarea 
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Got a question about this lesson? Ask the community..."
                  className="w-full h-24 bg-transparent text-sm text-white placeholder-white/20 resize-none outline-none mb-4"
                />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-white/30 italic">Posts to Discussion Hub</span>
                  <Button 
                    size="sm" 
                    onClick={() => handleAskQuestion()}
                    disabled={isSubmitting || !question.trim()}
                  >
                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} className="mr-2" />}
                    Post Question
                  </Button>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Floating Bottom Bar (visible during video play) */}
      <AnimatePresence>
        {!isSubmitting && showSuccess && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 bg-primary rounded-full shadow-2xl flex items-center gap-3 z-[70] border border-white/20 backdrop-blur-md"
          >
            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
              <Check size={14} className="text-white" />
            </div>
            <span className="text-sm font-bold text-white">Your question has been posted to the Discussion Hub!</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-4 sm:px-8 border-t border-white/10 bg-[#0A0A0A]">
         <div className="max-w-4xl mx-auto relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20">
              <MessageSquare size={18} />
            </div>
            <input 
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAskQuestion()}
              placeholder="🤔 Got a question? Type it here and press Enter..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white text-sm placeholder-white/20 outline-none focus:border-primary/50 transition-all"
            />
         </div>
      </div>
    </div>
  );
}
