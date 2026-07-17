import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Share2, 
  ChevronLeft, 
  CheckCircle, 
  MessageSquare, 
  MessageCircle,
  FileText,
  Target,
  Users,
  Send, 
  Play,
  ExternalLink,
  Loader2,
  Check,
  Sparkles,
  BookOpen,
  HelpCircle,
  Trophy,
  Copy,
  Plus,
  RefreshCw,
  Info,
  User,
  Cpu,
  Heart,
  Pin,
  Camera
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { VideoLesson } from '../../types';
import { SubjectBadge } from '../ui/SubjectBadge';
import { GradeBadge } from '../ui/GradeBadge';
import { CurriculumTag } from '../ui/CurriculumTag';
import { VideoCard } from './VideoCard';
import { db, auth } from '../../lib/firebase';
import { collection, query, where, limit, getDocs, addDoc, serverTimestamp, orderBy, onSnapshot, doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { Button } from '../ui/Button';
import { AIUpgradePrompt } from '../ai/AIUpgradePrompt';

interface VideoPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  video: VideoLesson;
}

type TabType = 'explore' | 'ai-tutor' | 'comments' | 'summary' | 'quiz';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  remaining?: number;
  image?: string;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  topic: string;
  marks: number;
}

export function VideoLessonPlayer({ isOpen, onClose, video: initialVideo }: VideoPlayerProps) {
  const [currentVideo, setCurrentVideo] = useState(initialVideo);
  const [activeTab, setActiveTab] = useState<TabType>('explore');
  const [upNext, setUpNext] = useState<VideoLesson[]>([]);
  const [copied, setCopied] = useState(false);

  // --- Real-time Comments States ---
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [commentRepliesDraft, setCommentRepliesDraft] = useState<Record<string, string>>({});
  const [isDraftingReply, setIsDraftingReply] = useState<Record<string, boolean>>({});
  const [replyInputId, setReplyInputId] = useState<string | null>(null);
  const [commentReplyText, setCommentReplyText] = useState('');
  const [isEditingDraft, setIsEditingDraft] = useState<Record<string, boolean>>({});
  const [userTier, setUserTier] = useState<string>('free');
  const [aiStatus, setAiStatus] = useState<{ tier: string; remaining: number; limit: number } | null>(null);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  const [hasMarkedCompleted, setHasMarkedCompleted] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      switch (e.key.toLowerCase()) {
        case 'm':
          setActiveTab('ai-tutor');
          setIsMobileSheetOpen(true);
          break;
        case 'q':
          setActiveTab('quiz');
          setIsMobileSheetOpen(true);
          break;
        case 'n':
          setActiveTab('summary');
          setIsMobileSheetOpen(true);
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const [capsProgress, setCapsProgress] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function fetchCapsProgress() {
      if (!currentVideo?.subject || !currentVideo?.grade || !auth.currentUser) return;
      try {
        const capsRef = doc(db, 'users', auth.currentUser.uid, 'capsProgress', `${currentVideo.subject}_${currentVideo.grade}`);
        const snap = await getDoc(capsRef);
        if (snap.exists()) {
          const data = snap.data();
          delete data.updatedAt;
          setCapsProgress(data as Record<string, boolean>);
        } else {
          setCapsProgress({});
        }
      } catch(err) {}
    }
    fetchCapsProgress();
  }, [currentVideo, hasMarkedCompleted]);
  useEffect(() => {
    async function fetchTier() {
      if (!auth.currentUser) return;
      try {
        const res = await fetch(`/api/ai/status?uid=${auth.currentUser.uid}`);
        if (res.ok) {
          const data = await res.json();
          setUserTier(data.tier);
          setAiStatus(data);
        }
      } catch (err) {}
    }
    fetchTier();
  }, [auth.currentUser?.uid]);

  const formatRelativeTime = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    return `${days} day${days === 1 ? '' : 's'} ago`;
  };

  const handleProgress = async (state: any) => {
    if (state.played > 0.8 && !hasMarkedCompleted && auth.currentUser && currentVideo.id) {
      setHasMarkedCompleted(true);
      try {
        const docRef = doc(db, 'users', auth.currentUser.uid, 'watchHistory', currentVideo.id);
        await setDoc(docRef, {
          completed: true,
          completedAt: serverTimestamp(),
          subject: currentVideo.subject,
          grade: currentVideo.grade,
          topic: currentVideo.topic,
          videoId: currentVideo.id,
          uid: auth.currentUser.uid
        }, { merge: true });
        
        // Update caps progress
        if (currentVideo.subject && currentVideo.grade && currentVideo.topic) {
          const capsRef = doc(db, 'users', auth.currentUser.uid, 'capsProgress', `${currentVideo.subject}_${currentVideo.grade}`);
          await setDoc(capsRef, {
            [currentVideo.topic]: true,
            updatedAt: serverTimestamp(),
            uid: auth.currentUser.uid
          }, { merge: true });
        }
      } catch (err) {
        console.error("Error updating watch progress:", err);
      }
    }
  };

  // --- AI Tutor Chat States ---
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [capturedScreenshot, setCapturedScreenshot] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // --- AI Summary States ---
  const [studyNote, setStudyNote] = useState<string | null>(null);
  const [isLoadingNote, setIsLoadingNote] = useState(false);
  const [noteCopied, setNoteCopied] = useState(false);

  // --- AI Quiz States ---
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[] | null>(null);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  useEffect(() => {
    setCurrentVideo(initialVideo);
    setActiveTab('explore');
    setChatHistory([]);
    setStudyNote(null);
    setQuizQuestions(null);
    setSelectedAnswers({});
    setQuizScore(null);
    setQuizSubmitted(false);

    if (isOpen && initialVideo?.id) {
      updateDoc(doc(db, 'videoLessons', initialVideo.id), {
        viewCountOnGMA: increment(1)
      }).catch(err => console.error('Failed to update viewCount:', err));
    }
  }, [initialVideo, isOpen]);

  // Fetch recommended "Up Next" videos
  useEffect(() => {
    async function fetchUpNext() {
      if (!currentVideo) return;
      try {
        const q = query(
          collection(db, 'videoLessons'),
          where('subject', '==', currentVideo.subject),
          where('grade', '==', currentVideo.grade),
          orderBy('addedAt', 'desc'),
          limit(4)
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

  // Fetch existing study guide if available
  useEffect(() => {
    async function fetchStudyGuide() {
      if (!currentVideo?.id || !auth.currentUser) return;
      try {
        const docRef = doc(db, 'users', auth.currentUser.uid, 'studyGuides', currentVideo.id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().summary) {
          setStudyNote(docSnap.data().summary);
        }
      } catch (err) {
        console.error("Error fetching study guide:", err);
      }
    }
    fetchStudyGuide();
  }, [currentVideo?.id]);

  // Real-time comments listener
  useEffect(() => {
    if (!currentVideo?.id) return;
    const commentsRef = collection(db, 'videos', currentVideo.id, 'comments');
    const q = query(commentsRef, orderBy('createdAt', 'desc'), limit(50));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setComments(list);
    }, (err) => {
      console.error("Error listening to comments:", err);
    });

    return () => unsubscribe();
  }, [currentVideo?.id]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, isChatLoading]);

  const handleShare = () => {
    const url = window.location.origin + '/videos?id=' + currentVideo.id;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // --- Post a New Comment ---
  const handlePostComment = async (parentId: string | null = null, inlineText?: string, isAiAssisted = false) => {
    const textToPost = parentId ? inlineText : newComment;
    if (!textToPost || !textToPost.trim() || !currentVideo?.id) return;

    if (!parentId) {
      setIsPostingComment(true);
    }
    try {
      await addDoc(collection(db, 'videos', currentVideo.id, 'comments'), {
        videoId: currentVideo.id,
        content: textToPost,
        authorId: auth.currentUser?.uid || null,
        authorName: auth.currentUser?.displayName || 'Anonymous Student',
        authorPhotoUrl: auth.currentUser?.photoURL || null,
        isGuest: !auth.currentUser,
        isAi: false,
        isAiAssisted,
        likes: 0,
        isPinned: false,
        parentId: parentId || null,
        createdAt: serverTimestamp()
      });
      if (!parentId) {
        setNewComment('');
      } else {
        setCommentReplyText('');
        setReplyInputId(null);
        // Clear drafts for this comment if it was AI assisted
        if (isAiAssisted && parentId) {
          setCommentRepliesDraft(prev => {
            const copy = { ...prev };
            delete copy[parentId];
            return copy;
          });
          setIsEditingDraft(prev => {
            const copy = { ...prev };
            delete copy[parentId];
            return copy;
          });
        }
      }
    } catch (err) {
      console.error("Error loading comment:", err);
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!currentVideo?.id) return;
    try {
      await updateDoc(doc(db, 'videos', currentVideo.id, 'comments', commentId), {
        likes: increment(1)
      });
    } catch (err) {
      console.error("Error liking comment:", err);
    }
  };

  const handlePinComment = async (commentId: string, currentPinned: boolean) => {
    if (!currentVideo?.id) return;
    try {
      await updateDoc(doc(db, 'videos', currentVideo.id, 'comments', commentId), {
        isPinned: !currentPinned
      });
    } catch (err) {
      console.error("Error pinning comment:", err);
    }
  };

  // --- Get AI Response Suggestion ---
  const handleGetAiDraftReply = async (commentId: string, content: string) => {
    if (!content.trim()) return;
    setIsDraftingReply(prev => ({ ...prev, [commentId]: true }));
    try {
      const response = await fetch('/api/ai/suggest-comment-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: auth.currentUser?.uid || 'guest_user',
          commentContent: content,
          videoTitle: currentVideo.title,
          videoTopic: currentVideo.topic,
          videoSubject: currentVideo.subject
        })
      });
      const data = await response.json();
      if (data.error === 'limit_reached') {
        setCommentRepliesDraft(prev => ({ 
          ...prev, 
          [commentId]: "⚠️ Daily AI Limit reached! Please upgrade your plan to unlock more AI assistance." 
        }));
      } else if (data.suggestedReply) {
        setCommentRepliesDraft(prev => ({ ...prev, [commentId]: data.suggestedReply }));
      }
    } catch (err) {
      console.error(err);
      setCommentRepliesDraft(prev => ({ 
        ...prev, 
        [commentId]: "⚠️ AI is temporarily unavailable. Try again in a moment." 
      }));
    } finally {
      setIsDraftingReply(prev => ({ ...prev, [commentId]: false }));
    }
  };

  // --- AI Video Chat & Screenshot ---
  const handleSnapshotAndAsk = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'browser' },
        audio: false
      });
      const videoTrack = stream.getVideoTracks()[0];
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const screenshotDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedScreenshot(screenshotDataUrl);
      }
      
      // Stop the stream immediately
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      console.warn("Screenshot capture cancelled or failed:", err);
    }
  };

  const handleSendChatMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;

    const userMsgText = chatInput;
    const currentScreenshot = capturedScreenshot; // Capture value before clearing
    
    const newUserMsg: ChatMessage = { role: 'user', content: userMsgText, image: currentScreenshot || undefined };
    const updatedHistory: ChatMessage[] = [...chatHistory, newUserMsg].slice(-10);
    setChatHistory(updatedHistory);
    setChatInput('');
    setCapturedScreenshot(null);
    setIsChatLoading(true);

    try {
      const response = await fetch('/api/ai/video-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: auth.currentUser?.uid || 'guest_user',
          videoTitle: currentVideo.title,
          videoTopic: currentVideo.topic,
          videoSubject: currentVideo.subject,
          videoGrade: currentVideo.grade,
          chatHistory: updatedHistory.slice(0, -1),
          userMessage: userMsgText,
          image: currentScreenshot
        })
      });
      const data = await response.json();
      if (data.error === 'limit_reached') {
        const errorMsg: ChatMessage = { 
          role: 'assistant', 
          content: "⚠️ **Daily AI credits exceeded.** Upgrade to Scholar for R5/month to get 20 AI questions daily" 
        };
        setChatHistory(prev => [...prev, errorMsg].slice(-10));
      } else if (data.answer) {
        if (auth.currentUser) {
          fetch('/api/activity/record', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid: auth.currentUser.uid, action: 'ai_tutor' })
          }).catch(console.error);
        }

        // Fetch AI Status via GET to find exact remaining queries as requested
        let remainingVal: number | undefined;
        try {
          const statusRes = await fetch(`/api/ai/status?uid=${auth.currentUser?.uid || 'guest_user'}`);
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            remainingVal = statusData.remaining;
          }
        } catch (statusErr) {
          console.error("Error fetching AI status:", statusErr);
        }

        // Apply remaining count fallback from the response if any
        if (remainingVal === undefined && data.remaining !== undefined) {
          remainingVal = data.remaining;
        }

        const newReply: ChatMessage = { 
          role: 'assistant', 
          content: data.answer,
          remaining: remainingVal
        };
        setChatHistory(prev => [...prev, newReply].slice(-10));
      }
    } catch (err) {
      console.error("AI chat error:", err);
      const networkErrorMsg: ChatMessage = { 
        role: 'assistant', 
        content: "⚠️ **AI is temporarily unavailable. Try again in a moment.**" 
      };
      setChatHistory(prev => [...prev, networkErrorMsg].slice(-10));
    } finally {
      setIsChatLoading(false);
    }
  };

  // Preset Prompt Ideas for quick AI chat triggering
  const presetPrompts = [
    "What are the main exam requirements under this topic?",
    "Explain the core formula or method step-by-step",
    "Give me a common NSC exam question example for this topic"
  ];

  // --- Generate AI Study Summary ---
  const handleGenerateSummary = async () => {
    setIsLoadingNote(true);
    try {
      const response = await fetch('/api/ai/video-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: auth.currentUser?.uid || 'guest_user',
          videoTitle: currentVideo.title,
          videoTopic: currentVideo.topic,
          videoSubject: currentVideo.subject,
          videoGrade: currentVideo.grade
        })
      });
      const data = await response.json();
      if (data.error === 'limit_reached') {
        setStudyNote("⚠️ **AI quota exceeded.** Upgrade to Scholar for R5/month for instant study summaries.");
      } else if (data.summary) {
        setStudyNote(data.summary);
        if (auth.currentUser && currentVideo.id) {
          const docRef = doc(db, 'users', auth.currentUser.uid, 'studyGuides', currentVideo.id);
          await setDoc(docRef, {
            summary: data.summary,
            videoId: currentVideo.id,
            videoTitle: currentVideo.title,
            uid: auth.currentUser.uid,
            updatedAt: serverTimestamp()
          }, { merge: true });
        }
      }
    } catch (err) {
      console.error("Summary error:", err);
      setStudyNote("⚠️ **AI is temporarily unavailable**\n\nThe GMA AI service is experiencing high load or a temporary connection issue. Please try again in a moment.");
    } finally {
      setIsLoadingNote(false);
    }
  };

  const handleCopySummary = () => {
    if (!studyNote) return;
    navigator.clipboard.writeText(studyNote);
    setNoteCopied(true);
    setTimeout(() => setNoteCopied(false), 2000);
  };

  const handlePrintPDF = () => {
    if (!studyNote) return;
    window.print();
  };

  // --- Generate AI Quiz ---
  const [quizError, setQuizError] = useState<string | null>(null);

  const handleGenerateQuiz = async () => {
    setIsLoadingQuiz(true);
    setSelectedAnswers({});
    setQuizScore(null);
    setQuizSubmitted(false);
    setQuizError(null);
    try {
      const response = await fetch('/api/ai/video-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: auth.currentUser?.uid || 'guest_user',
          videoTitle: currentVideo.title,
          videoTopic: currentVideo.topic,
          videoSubject: currentVideo.subject,
          videoGrade: currentVideo.grade
        })
      });
      const data = await response.json();
      if (data.error === 'limit_reached') {
        setQuizQuestions([]);
        setQuizError("limit_reached");
      } else if (data.quiz) {
        setQuizQuestions(data.quiz);
      } else {
        setQuizError("Temporarily unavailable");
      }
    } catch (err) {
      console.error("Quiz generation error:", err);
      setQuizError("Temporarily unavailable");
    } finally {
      setIsLoadingQuiz(false);
    }
  };

  const selectQuizAnswer = (qIdx: number, oIdx: number) => {
    if (quizSubmitted) return;
    setSelectedAnswers(prev => ({ ...prev, [qIdx]: oIdx }));
  };

  const submitQuizAnswers = async () => {
    if (!quizQuestions) return;
    let score = 0;
    const wrongTopics: string[] = [];
    quizQuestions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correct) {
        score += (q.marks || 1);
      } else {
        if (q.topic) wrongTopics.push(q.topic);
      }
    });
    setQuizScore(score);
    setQuizSubmitted(true);

    if (auth.currentUser) {
      try {
        await addDoc(collection(db, 'users', auth.currentUser.uid, 'quizResults'), {
          subject: currentVideo.subject,
          grade: currentVideo.grade,
          topic: currentVideo.topic,
          questionsCorrect: quizQuestions.filter((q, idx) => selectedAnswers[idx] === q.correct).length,
          questionsTotal: quizQuestions.length,
          wrongTopics,
          completedAt: serverTimestamp()
        });

        // Record activity for study streak
        fetch('/api/activity/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: auth.currentUser.uid, action: 'submit_quiz' })
        }).catch(console.error);

        // Update learner profile
        if (wrongTopics.length > 0) {
          const userRef = doc(db, 'users', auth.currentUser.uid);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists() && userDoc.data().aiRememberPatterns !== false) {
             const lp = userDoc.data().learnerProfile || { recentWeakTopics: [] };
             let wt = [...(lp.recentWeakTopics || [])];
             const now = new Date();
             
             wrongTopics.forEach(topic => {
               const idx = wt.findIndex((w: any) => w.topic.toLowerCase() === topic.toLowerCase());
               if (idx >= 0) {
                 wt[idx].lastSeenAt = now;
                 wt[idx].count = (wt[idx].count || 1) + 1;
               } else {
                 wt.push({ topic, subject: currentVideo.subject, lastSeenAt: now, count: 1 });
               }
             });
             
             wt.sort((a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime());
             if (wt.length > 15) wt = wt.slice(0, 15);
             
             await updateDoc(userRef, {
               "learnerProfile.recentWeakTopics": wt,
               "learnerProfile.updatedAt": serverTimestamp()
             });
          }
        }
      } catch (err) {
        console.error("Failed to save quiz result", err);
      }
    }
  };

  const handleAskAboutMistakes = () => {
    if (!quizQuestions) return;
    const wrongQuestions = quizQuestions.filter((q, idx) => selectedAnswers[idx] !== q.correct);
    if (wrongQuestions.length === 0) return;

    let mistakesMessage = "Hi GMA Tutor! I got these questions wrong in the diagnostic quiz, can you please explain the concepts step-by-step?\n\n";
    wrongQuestions.forEach((q) => {
      const originalIdx = quizQuestions.indexOf(q);
      const userAnsIdx = selectedAnswers[originalIdx];
      const wrongLetter = userAnsIdx !== undefined ? ['A', 'B', 'C', 'D'][userAnsIdx] : 'unanswered';
      const correctLetter = ['A', 'B', 'C', 'D'][q.correct];
      mistakesMessage += `• **Question**: ${q.question}\n  *My selected answer*: ${wrongLetter}\n  *Correct answer*: ${correctLetter}\n  *Topic*: ${q.topic || 'General'}\n\n`;
    });

    setChatInput(mistakesMessage);
    setActiveTab('ai-tutor');
  };

  if (!isOpen) return null;

  const isShort = (currentVideo as any).isShort || 
                  (currentVideo.title.toLowerCase().includes('#short')) ||
                  (currentVideo.durationSeconds < 90);

  // Group comments: find top level comments and replies
  const topLevelComments = comments.filter(c => !c.parentId).sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return 0; // The natural order is preserved (which is ordered desc from firestore)
  });
  const repliesGrouped = comments.reduce((acc, current) => {
    if (current.parentId) {
      acc[current.parentId] = acc[current.parentId] || [];
      acc[current.parentId].push(current);
    }
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="fixed inset-0 z-[60] bg-[#090D10] flex flex-col overflow-hidden text-lux-bg font-sans">
      {/* Header */}
      <div className="h-16 px-4 sm:px-8 border-b border-lux-border flex items-center justify-between shrink-0 bg-[#090D10]/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-4 min-w-0">
          <button 
            onClick={onClose}
            className="p-2 hover:bg-lux-surface0 rounded-full transition-colors text-lux-text"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="min-w-0">
            <h2 className="text-lux-text font-serif text-base line-clamp-1">{currentVideo.title}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[9px] text-lux-text/30 px-2 py-0.5 rounded">
                ⚡ {currentVideo.subject} • Grade {currentVideo.grade}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleShare}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-[#1F2937]/50 hover:bg-[#1F2937] border border-lux-border rounded-xl transition-all text-lux-text text-xs font-bold shadow"
          >
            {copied ? <Check size={14} className="text-lux-text" /> : <Share2 size={14} />}
            {copied ? 'Copied' : 'Share Lesson'}
          </button>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-lux-surface0 rounded-full transition-colors text-lux-text"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Side: Dynamic Video Player Area */}
        <div className="flex-1 bg-lux-surface00 flex items-center justify-center relative p-0 sm:p-4 lg:p-6 select-none">
          <div className="aspect-video w-full max-w-4xl relative">
            <iframe
              src={`https://www.youtube.com/embed/${currentVideo.youtubeVideoId}?rel=0&modestbranding=1&autoplay=1`}
              width="100%"
              height="100%"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              sandbox="allow-scripts allow-same-origin allow-presentation"
              className="absolute top-0 left-0 w-full h-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-lux-border"
            />
          </div>
        </div>

        {/* Right Side: Interactive AI Sidebar / Bottom Sheet */}
        <div className={`w-full lg:w-[480px] border-l border-lux-border flex flex-col bg-[#0A0E12] shrink-0 lg:relative ${isMobileSheetOpen ? "fixed inset-x-0 bottom-0 top-[30vh] z-50 rounded-t-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] transition-transform duration-300 transform translate-y-0" : "flex-none lg:flex-1 translate-y-0"}`}>
          
          {/* Mobile Sheet Handle */}
          <div className="lg:hidden w-full flex justify-center py-2 bg-[#070A0D]" onClick={() => setIsMobileSheetOpen(!isMobileSheetOpen)}>
            <div className="w-12 h-1.5 bg-lux-surface00 rounded-full"></div>
          </div>

          {/* AI Feature Suite Navigation Tabs */}
          <div className="flex border-b border-lux-border bg-[#070A0D] p-1 shrink-0 overflow-x-auto no-scrollbar">
            <button
              onClick={() => { setActiveTab('explore'); setIsMobileSheetOpen(true); }}
              className={`flex-1 min-w-[80px] py-3 text-center text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex flex-col items-center justify-center gap-1.5 ${
                activeTab === 'explore' ? 'bg-[#1F2937] text-lux-text shadow-inner border border-lux-border' : 'text-lux-text hover:text-lux-text'
              }`}
            >
              <BookOpen size={14} className={activeTab === 'explore' ? "text-lux-text" : ""} />
              Study Hub
            </button>
            <button
              onClick={() => { setActiveTab('ai-tutor'); setIsMobileSheetOpen(true); }}
              className={`flex-1 min-w-[80px] py-3 text-center text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex flex-col items-center justify-center gap-1.5 ${
                activeTab === 'ai-tutor' ? 'bg-[#1F2937] text-lux-text shadow-inner border border-lux-border' : 'text-lux-text hover:text-lux-text'
              }`}
              title="Shortcut: M"
            >
              <MessageCircle size={14} className={activeTab === 'ai-tutor' ? "text-lux-text" : ""} />
              Q&A Tutor
            </button>
            <button
              onClick={() => { setActiveTab('comments'); setIsMobileSheetOpen(true); }}
              className={`flex-1 min-w-[80px] py-3 text-center text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex flex-col items-center justify-center gap-1.5 ${
                activeTab === 'comments' ? 'bg-[#1F2937] text-lux-text shadow-inner border border-lux-border' : 'text-lux-text hover:text-lux-text'
              }`}
            >
              <Users size={14} className={activeTab === 'comments' ? "text-lux-text" : ""} />
              Discussion
            </button>
            <button
              onClick={() => { setActiveTab('summary'); setIsMobileSheetOpen(true); }}
              className={`flex-1 min-w-[80px] py-3 text-center text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex flex-col items-center justify-center gap-1.5 ${
                activeTab === 'summary' ? 'bg-[#1F2937] text-lux-text shadow-inner border border-lux-border' : 'text-lux-text hover:text-lux-text'
              }`}
              title="Shortcut: N"
            >
              <FileText size={14} className={activeTab === 'summary' ? "text-lux-text" : ""} />
              Notes
            </button>
            <button
              onClick={() => { setActiveTab('quiz'); setIsMobileSheetOpen(true); }}
              className={`flex-1 min-w-[80px] py-3 text-center text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex flex-col items-center justify-center gap-1.5 ${
                activeTab === 'quiz' ? 'bg-[#1F2937] text-lux-text shadow-inner border border-lux-border' : 'text-lux-text hover:text-lux-text'
              }`}
              title="Shortcut: Q"
            >
              <Target size={14} className={activeTab === 'quiz' ? "text-lux-text" : ""} />
              Quiz
            </button>
          </div>

          {/* Interactive Content Windows */}
          <div className={`flex-1 overflow-y-auto p-6 flex-col scroll-smooth ${isMobileSheetOpen ? 'flex' : 'hidden lg:flex'}`}>
            <AnimatePresence mode="wait">
              
              {/* TAB 1: EXPLORE HUB */}
              {activeTab === 'explore' && (
                <motion.div
                  key="explore"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-6"
                >
                  <div className="border border-[#CCA43B]/20 bg-[#15130D]/70 p-5 rounded-2xl sm:rounded-3xl">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-lux-text block mb-2">Academic Overview</span>
                    <h3 className="text-xl font-serif text-lux-text mb-4 leading-snug">{currentVideo.title}</h3>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {currentVideo.subject && <SubjectBadge subject={currentVideo.subject} />}
                      {currentVideo.grade && <GradeBadge grade={currentVideo.grade as any} />}
                      {currentVideo.curriculum && <CurriculumTag type={currentVideo.curriculum as any} />}
                      <span className="px-3 py-1 bg-[#22D3EE]/10 border border-[#22D3EE]/20 rounded-full text-[10px] uppercase font-bold text-lux-text tracking-widest">
                        {currentVideo.topic}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 bg-lux-surface0 p-4 rounded-xl border border-lux-border">
                    <div className="w-10 h-10 rounded-full bg-[#1F2937] flex items-center justify-center border border-lux-border shrink-0">
                      <Play size={16} className="text-lux-text fill-current" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-lux-text mb-0.5">{currentVideo.creatorName || 'Genius Makers Lesson'}</div>
                      <div className="text-[9px] text-lux-text uppercase font-black tracking-widest">CAPS Syllabus Content partner</div>
                    </div>
                  </div>

                  {(currentVideo as any).playlistId && (
                    <div className="p-4 bg-[#CCA43B]/10 border border-[#CCA43B]/20 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="text-[9px] text-lux-text font-black uppercase tracking-widest mb-0.5">Study Pack Access</div>
                        <div className="text-[11px] font-medium text-lux-text">Full course curriculum structure available online</div>
                      </div>
                      <ExternalLink size={16} className="text-lux-text" />
                    </div>
                  )}

                  {/* CAPS Topic Progress */}
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-lux-text mb-3 block">CAPS Topic Progress</h4>
                    <div className="bg-lux-surface0 border border-lux-border rounded-xl p-4 space-y-3">
                      {Array.from(new Set(['Algebra', 'Calculus', 'Trigonometry', currentVideo.topic, 'Geometry', 'Term Revision'])).map((topic, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${
                            capsProgress[topic] || (topic === currentVideo.topic && hasMarkedCompleted) ? 'bg-[var(--color-lux-green-500)] border-[var(--color-lux-green-500)] text-lux-text' : 'bg-lux-surface0 border-lux-border text-transparent'
                          }`}>
                            <Check size={12} strokeWidth={3} />
                          </div>
                          <span className={`text-xs ${
                            capsProgress[topic] || (topic === currentVideo.topic && hasMarkedCompleted) ? 'text-lux-text line-through decoration-white/30' : 'text-lux-text'
                          }`}>
                            {topic}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Up Next List */}
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-lux-text mb-3 block">Next Recommended Video</h4>
                    <div className="space-y-4">
                      {upNext.length > 0 ? (
                        <div>
                          <VideoCard 
                            key={upNext[0].id} 
                            video={upNext[0]} 
                            compact 
                            onClick={(v) => setCurrentVideo(v)} 
                          />
                          <button 
                            onClick={() => setCurrentVideo(upNext[0])}
                            className="w-full mt-3 py-3 bg-[#CCA43B] text-lux-bg font-bold uppercase tracking-wider text-[10px] rounded-xl flex items-center justify-center gap-2 hover:bg-[#d8b045] transition-colors"
                          >
                            <Play size={14} className="fill-current" /> Watch Next
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-lux-text italic py-6 text-center border border-dashed border-lux-border rounded-xl">No more videos found for this topic.</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 2: AI TUTOR CHAT */}
              {activeTab === 'ai-tutor' && (
                <motion.div
                  key="ai-tutor"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="flex flex-col h-full space-y-4"
                >
                  <div className="bg-lux-surface0/80 border border-lux-border rounded-xl p-4 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <Sparkles className="text-lux-text shrink-0 mt-0.5" size={16} />
                      <div className="pr-2">
                        <h4 className="text-xs font-bold text-lux-text mb-1">Interactive Video Q&A</h4>
                        <p className="text-[11px] text-lux-text leading-normal">
                          Ask calculations, proof procedures, or definition clarifications. Our AI Tutor is trained on the CAPS curriculum guidelines.
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setChatHistory([])}
                      className="text-[10px] text-lux-text hover:text-lux-text hover:border-lux-border bg-lux-surface0 hover:bg-lux-surface00 px-2.5 py-1.5 rounded-lg border border-lux-border transition-all shrink-0 font-medium"
                    >
                      Clear chat
                    </button>
                  </div>

                  {/* Messages Bubble Container */}
                  <div className="flex-1 min-h-[220px] max-h-[380px] overflow-y-auto space-y-4 pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {chatHistory.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center py-8 text-lux-text">
                        <Cpu size={32} className="mb-3 text-lux-text/40 stroke-1" />
                        <span className="text-[11px] font-medium max-w-xs leading-relaxed">
                          Ask your first question or tap one of the suggested prompts below!
                        </span>
                      </div>
                    ) : (
                      chatHistory.map((msg, idx) => (
                        <div 
                          key={idx} 
                          className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[85%] ${msg.role === 'user' ? 'ml-auto' : 'mr-auto'}`}
                        >
                          <div className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''} w-full`}>
                            <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] ${
                              msg.role === 'user' ? 'bg-[#CCA43B] text-lux-bg font-bold' : 'bg-[#152e25] text-lux-text'
                            }`}>
                              {msg.role === 'user' ? <User size={12} /> : <Cpu size={12} />}
                            </div>
                            <div className={`p-3.5 rounded-2xl sm:rounded-3xl text-xs leading-relaxed ${
                              msg.content.includes("temporarily unavailable") ? 'bg-[var(--color-lux-green-500)]/20 text-[var(--color-lux-green-500)] border border-[var(--color-lux-green-500)]/30' :
                              msg.role === 'user' ? 'bg-[#CCA43B]/10 text-lux-text rounded-tr-none border border-[#CCA43B]/20' : 'bg-[#151D24] text-lux-text rounded-tl-none border border-lux-border shadow-md'
                            }`}>
                              {msg.image && (
                                <div className="mb-2 w-full max-w-[200px] rounded-lg overflow-hidden border border-[#CCA43B]/30 shadow-lg">
                                  <img src={msg.image} alt="Context" className="w-full h-auto object-cover" />
                                </div>
                              )}
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                          </div>
                          {msg.role === 'assistant' && msg.remaining !== undefined && (
                            <span className="text-[10px] text-lux-text mt-1 ml-9">
                              Remaining daily queries: {msg.remaining}
                            </span>
                          )}
                        </div>
                      ))
                    )}
                    {isChatLoading && (
                      <div className="flex gap-3 max-w-[85%] mr-auto items-end">
                        <div className="w-6 h-6 rounded-full bg-[#152e25] flex items-center justify-center shrink-0">
                          <Cpu size={12} className="text-lux-text" />
                        </div>
                        <div className="p-3.5 bg-[#151D24] text-lux-text font-medium rounded-2xl sm:rounded-3xl rounded-tl-none border border-lux-border shadow-md flex items-center gap-1.5" style={{ minWidth: '60px', height: '36px' }}>
                          <span className="text-[11px] text-lux-text mr-1 italic">Thinking</span>
                          <span className="flex gap-1 items-center">
                            <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: 'var(--color-lux-green-500)', animationDelay: '0ms' }}></span>
                            <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: 'var(--color-lux-green-500)', animationDelay: '150ms' }}></span>
                            <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: 'var(--color-lux-green-500)', animationDelay: '300ms' }}></span>
                          </span>
                        </div>
                      </div>
                    )}
                    <div ref={chatBottomRef} />
                  </div>

                  {/* Preset quick prompt suggestions */}
                  {chatHistory.length === 0 && (
                    <div className="space-y-2 mt-auto pt-4 border-t border-lux-border">
                      <span className="text-[9px] uppercase tracking-wider font-extrabold text-lux-text">Suggested Inquiries</span>
                      <div className="flex flex-col gap-2">
                        {presetPrompts.map((prompt, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setChatInput(prompt);
                            }}
                            className="text-left text-[11px] text-lux-text/10 px-3 py-2 rounded-xl transition-all"
                          >
                            💡 {prompt}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Prompt Send Fields */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-lux-border shrink-0 mt-4">
                    {aiStatus && aiStatus.remaining === 0 ? (
                      <AIUpgradePrompt />
                    ) : (
                      <>
                        <AnimatePresence>
                          {capturedScreenshot && (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="relative w-fit"
                            >
                              <img src={capturedScreenshot} alt="Captured frame" className="h-16 w-auto rounded-lg border border-[#CCA43B]/50" />
                              <button 
                                onClick={() => setCapturedScreenshot(null)}
                                className="absolute -top-2 -right-2 bg-[#EF4444] rounded-full p-0.5 text-lux-text shadow-lg z-10"
                                title="Remove screenshot"
                              >
                                <X size={12} />
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="flex gap-2">
                          <Button
                            onClick={handleSnapshotAndAsk}
                            className="bg-[#1F2937]/50 hover:bg-[#1F2937] text-lux-text border border-lux-border h-11 w-11 px-0 rounded-xl flex items-center justify-center shrink-0 transition-colors relative group"
                            title="Screenshot current video frame (requires Screen Share)"
                          >
                            <Camera size={16} className="text-lux-text" />
                            <span className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-black border border-lux-border text-[10px] text-lux-text px-2 py-1 rounded shadow-lg pointer-events-none z-50">
                              Add visual layout
                            </span>
                          </Button>

                          <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSendChatMessage();
                            }}
                            placeholder="Ask the AI Tutor about this lesson..."
                            className="flex-1 min-w-0 bg-lux-surface0 text-xs text-lux-text placeholder-white/20 border border-lux-border rounded-xl px-4 py-3 outline-none focus:border-[#CCA43B] transition-colors"
                          />
                          <Button 
                            onClick={handleSendChatMessage}
                            disabled={!chatInput.trim() || isChatLoading}
                            className="bg-[#CCA43B] hover:bg-[#d8b045] text-lux-bg font-bold h-11 px-4 rounded-xl flex items-center justify-center shrink-0"
                          >
                            <Send size={14} />
                          </Button>
                        </div>
                        {aiStatus && aiStatus.tier === 'free' && (
                          <div className="bg-lux-surface0 border border-lux-border px-3 py-1 rounded-full text-[10px] font-bold text-lux-text uppercase tracking-widest mx-auto mt-2 overflow-hidden relative">
                            <div className="absolute top-0 left-0 h-full bg-[var(--color-lux-green-500)]/20" style={{ width: `${(aiStatus.remaining / aiStatus.limit) * 100}%`}}></div>
                            <span className="relative z-10">{aiStatus.remaining} AI questions left today</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </motion.div>
              )}

              {/* TAB 3: DISCUSSIONS & COMMENTS */}
              {activeTab === 'comments' && (
                <motion.div
                  key="comments"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="flex flex-col h-full space-y-4"
                >
                  <div className="bg-lux-surface0/80 border border-lux-border rounded-xl p-4 flex items-center gap-3">
                    <MessageSquare size={16} className="text-lux-text" />
                    <div className="text-xs font-bold text-lux-text">Community & AI Helper</div>
                  </div>

                  {/* Comments Feed list */}
                  <div className="flex-1 min-h-[220px] max-h-[400px] overflow-y-auto space-y-4 pr-1 scrollbar-thin">
                    {topLevelComments.length === 0 ? (
                      <div className="text-center py-12 text-lux-text italic text-xs leading-relaxed">
                        This lesson doesn't have any community remarks yet. Start the conversation below!
                      </div>
                    ) : (
                      topLevelComments.map((comment) => (
                        <div key={comment.id} className={`border-b border-lux-border pb-4 space-y-3 ${comment.isPinned ? 'bg-[#CCA43B]/5 p-3 rounded-xl border border-[#CCA43B]/20' : ''}`}>
                          
                          {/* Main Comment */}
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-lux-surface0 border border-lux-border flex items-center justify-center text-xs text-lux-text font-bold uppercase shrink-0 overflow-hidden">
                              {comment.authorPhotoUrl ? (
                                <img src={comment.authorPhotoUrl} alt="Avatar" className="w-full h-full object-cover" />
                              ) : (
                                comment.authorName ? comment.authorName[0] : 'S'
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-bold text-lux-text">{comment.authorName}</span>
                                {comment.isGuest && (
                                  <span className="text-[8px] bg-lux-surface0 text-lux-text px-1 py-0.5 rounded border border-lux-border uppercase font-bold tracking-widest">Guest</span>
                                )}
                                <span className="text-[10px] text-lux-text">{formatRelativeTime(comment.createdAt)}</span>
                                {comment.isPinned && (
                                  <span className="text-[10px] bg-[#CCA43B]/20 text-lux-text/30 flex items-center gap-1"><Pin size={10} /> Pinned</span>
                                )}
                                {comment.isAiAssisted && (
                                  <span className="text-[9px] bg-[#152e25] text-lux-text/30 flex items-center gap-1 ml-1"><Sparkles size={10} /> AI-assisted reply</span>
                                )}
                              </div>
                              <p className="text-xs text-lux-text mt-1 leading-relaxed break-words">{comment.content}</p>

                              {/* Interaction Bar */}
                              <div className="flex items-center gap-4 mt-3">
                                <button 
                                  onClick={() => handleLikeComment(comment.id)} 
                                  className="flex items-center gap-1 text-[10px] font-bold text-lux-text hover:text-lux-text transition-colors"
                                >
                                  <Heart size={12} className={comment.likes > 0 ? "fill-[#EF4444] text-lux-text" : ""} /> 
                                  {comment.likes || 0}
                                </button>

                                <button 
                                  onClick={() => {
                                    setReplyInputId(comment.id);
                                    setCommentReplyText('');
                                  }}
                                  className="text-[10px] uppercase font-black text-lux-text hover:text-lux-text transition-colors"
                                >
                                  Reply
                                </button>
                                
                                {(userTier === 'scholar' || userTier === 'pro') && !commentRepliesDraft[comment.id] && !isDraftingReply[comment.id] && !isEditingDraft[comment.id] && (
                                  <button
                                    onClick={() => handleGetAiDraftReply(comment.id, comment.content)}
                                    className="text-[9px] uppercase font-black text-lux-text/20 transition-all"
                                  >
                                    <Sparkles size={10} />
                                    Draft AI response
                                  </button>
                                )}

                                {auth.currentUser?.email === 'techinfinite.banking@gmail.com' && (
                                  <button onClick={() => handlePinComment(comment.id, comment.isPinned)} className="text-[10px] uppercase font-black text-lux-text hover:text-lux-text">
                                    {comment.isPinned ? 'Unpin' : 'Pin'}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Inline suggested AI replying box */}
                          {isDraftingReply[comment.id] && (
                            <div className="ml-10 bg-[#151D24] border border-lux-border px-4 py-3 rounded-xl animate-pulse flex items-center gap-2">
                              <Loader2 size={12} className="animate-spin text-lux-text" />
                              <span className="text-[10px] text-lux-text">AI is composing a response...</span>
                            </div>
                          )}

                          {commentRepliesDraft[comment.id] && !isEditingDraft[comment.id] && (
                            <div className="ml-10 bg-yellow-400/10 border border-yellow-400/30 p-4 rounded-xl space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] text-yellow-500 font-extrabold uppercase tracking-widest flex items-center gap-1">
                                  <Sparkles size={10} />
                                  AI Suggested Reply:
                                </span>
                                <button 
                                  onClick={() => setCommentRepliesDraft(prev => {
                                    const c = { ...prev };
                                    delete c[comment.id];
                                    return c;
                                  })}
                                  className="text-lux-text hover:text-lux-text text-xs hover:bg-lux-surface0 p-1 rounded transition-colors"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                              <p className="text-[11px] text-lux-text leading-relaxed italic border-l-2 border-yellow-500/50 pl-2">
                                "{commentRepliesDraft[comment.id]}"
                              </p>
                              {!commentRepliesDraft[comment.id].includes("Daily AI Limit") && (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handlePostComment(comment.id, commentRepliesDraft[comment.id], true)}
                                    className="text-[10px] font-bold tracking-wider uppercase bg-[var(--color-lux-green-500)] text-lux-text hover:bg-[var(--color-lux-green-800)] px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all"
                                  >
                                    <Send size={11} /> Post this reply
                                  </button>
                                  <button
                                    onClick={() => setIsEditingDraft(prev => ({ ...prev, [comment.id]: true }))}
                                    className="text-[10px] font-bold tracking-wider uppercase bg-lux-surface0 text-lux-text border border-lux-border hover:bg-lux-surface00 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all"
                                  >
                                    <MessageSquare size={11} /> Edit before posting
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          {isEditingDraft[comment.id] && (
                            <div className="ml-10 flex gap-2 flex-col">
                              <textarea
                                value={commentRepliesDraft[comment.id]}
                                onChange={(e) => setCommentRepliesDraft(prev => ({...prev, [comment.id]: e.target.value}))}
                                className="w-full bg-lux-surface0 text-xs text-lux-text placeholder-white/20 border border-lux-border rounded-xl px-3 py-2 outline-none min-h-[60px]"
                              />
                              <div className="flex justify-between items-center">
                                <span className={`text-[10px] font-bold ${commentRepliesDraft[comment.id].length > 450 ? 'text-lux-text' : 'text-lux-text'}`}>
                                  {500 - commentRepliesDraft[comment.id].length} remaining
                                </span>
                                <div className="flex gap-2">
                                  <button 
                                    onClick={() => setIsEditingDraft(prev => {
                                      const c = { ...prev };
                                      delete c[comment.id];
                                      return c;
                                    })}
                                    className="text-[10px] uppercase font-bold text-lux-text hover:text-lux-text px-2"
                                  >
                                   Cancel
                                  </button>
                                  <Button 
                                    size="sm"
                                    onClick={() => handlePostComment(comment.id, commentRepliesDraft[comment.id], true)}
                                    disabled={commentRepliesDraft[comment.id].length > 500 || !commentRepliesDraft[comment.id].trim()}
                                    className="bg-[#CCA43B] text-lux-bg hover:bg-[#d8b045] font-bold tracking-wider uppercase text-[10px]"
                                  >
                                    Post Reply
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Nested Replies Lists */}
                          {repliesGrouped[comment.id] && repliesGrouped[comment.id].map((reply: any) => (
                            <div key={reply.id} className="ml-10 bg-lux-surface0 border border-lux-border p-3 rounded-xl flex items-start gap-3">
                              <div className="w-6 h-6 rounded-full overflow-hidden bg-lux-surface0 border border-lux-border flex items-center justify-center text-[10px] font-black shrink-0 text-lux-text">
                                {reply.authorPhotoUrl ? (
                                  <img src={reply.authorPhotoUrl} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                  reply.authorName ? reply.authorName[0] : 'S'
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[11px] font-bold text-lux-text">
                                    {reply.authorName}
                                  </span>
                                  <span className="text-[9px] text-lux-text">{formatRelativeTime(reply.createdAt)}</span>
                                  {reply.isAiAssisted && (
                                    <span className="text-[8px] bg-[#152e25] text-lux-text/30 flex items-center gap-1 uppercase font-black"><Sparkles size={8} /> AI Drafted</span>
                                  )}
                                </div>
                                <p className="text-[11px] text-lux-text mt-1 leading-normal break-words">{reply.content}</p>
                                
                                <div className="flex items-center gap-3 mt-2">
                                  <button onClick={() => handleLikeComment(reply.id)} className="flex items-center gap-1 text-[9px] font-bold text-lux-text hover:text-lux-text transition-colors">
                                    <Heart size={10} className={reply.likes > 0 ? "fill-[#EF4444] text-lux-text" : ""} /> 
                                    {reply.likes || 0}
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}

                          {/* Inline Reply Input Field */}
                          {replyInputId === comment.id && !isEditingDraft[comment.id] && (
                            <div className="ml-10 flex gap-2 flex-col">
                              <textarea
                                value={commentReplyText}
                                onChange={(e) => setCommentReplyText(e.target.value)}
                                placeholder="Write a reply..."
                                className="w-full bg-lux-surface0 text-xs text-lux-text placeholder-white/20 border border-lux-border rounded-xl px-3 py-2 outline-none min-h-[40px] max-h-[100px] scrollbar-thin"
                              />
                              <div className="flex justify-between items-center">
                                <span className={`text-[10px] font-bold ${commentReplyText.length > 450 ? 'text-lux-text' : 'text-lux-text'}`}>
                                  {500 - commentReplyText.length} remaining
                                </span>
                                <div className="flex gap-2">
                                  <button 
                                    onClick={() => setReplyInputId(null)}
                                    className="text-[10px] uppercase font-bold text-lux-text hover:text-lux-text px-2"
                                  >
                                   Cancel
                                  </button>
                                  <Button 
                                    size="sm"
                                    onClick={() => handlePostComment(comment.id, commentReplyText)}
                                    disabled={commentReplyText.length > 500 || !commentReplyText.trim()}
                                    className="bg-[#CCA43B] text-lux-bg hover:bg-[#d8b045] font-bold tracking-wider uppercase text-[10px]"
                                  >
                                    Post
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}

                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Primary Comment Fields */}
                  <div className="flex flex-col gap-2 pt-3 border-t border-lux-border shrink-0">
                    <div className="flex gap-2">
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handlePostComment(); }
                        }}
                        placeholder="Comment or ask a public lesson question..."
                        className="flex-1 bg-lux-surface0 text-xs text-lux-text placeholder-white/20 border border-lux-border rounded-xl px-4 py-3 outline-none focus:border-[#CCA43B] transition-colors resize-none min-h-[46px] max-h-[120px] scrollbar-thin"
                      />
                      <Button 
                        onClick={() => handlePostComment()}
                        disabled={!newComment.trim() || isPostingComment || newComment.length > 500}
                        className="bg-[#CCA43B] hover:bg-[#d8b045] text-lux-bg font-bold h-[46px] px-4 rounded-xl flex items-center justify-center shrink-0"
                      >
                        {isPostingComment ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                      </Button>
                    </div>
                    <div className="flex justify-between items-center px-1">
                      <span className={`text-[10px] font-bold ${newComment.length > 450 ? 'text-lux-text' : 'text-lux-text'}`}>
                        {500 - newComment.length} remaining
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 4: STUDY SUMMARY */}
              {activeTab === 'summary' && (
                <motion.div
                  key="summary"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-4 h-full flex flex-col"
                >
                  <div className="bg-lux-surface0/80 border border-lux-border rounded-xl p-4 flex items-start gap-4">
                    <BookOpen size={18} className="text-lux-text mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-lux-text mb-1">AI Syllabus Study Guide</h4>
                      <p className="text-[11px] text-lux-text leading-relaxed">
                        Instant analysis of lesson formulas, pitfalls, and final exam checklist items compiled dynamically using Gemini.
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 min-h-[220px] max-h-[380px] overflow-y-auto pr-1">
                    {!studyNote ? (
                      <div className="h-full flex flex-col items-center justify-center text-center py-10 space-y-4">
                        <div className="w-16 h-16 bg-[#CCA43B]/5 border border-[#CCA43B]/15 rounded-full flex items-center justify-center">
                          <BookOpen className="text-lux-text/60" size={24} />
                        </div>
                        <p className="text-xs text-lux-text max-w-sm">No notes compiled yet for this lesson. Ready to build with AI assistance?</p>
                        
                        {aiStatus && aiStatus.remaining === 0 ? (
                          <div className="mt-4"><AIUpgradePrompt /></div>
                        ) : (
                          <>
                            <Button 
                              onClick={handleGenerateSummary}
                              disabled={isLoadingNote}
                              className="bg-[#CCA43B] text-lux-bg font-bold text-[10px] uppercase tracking-wider py-2.5 px-4 rounded-xl hover:bg-[#d8b045] disabled:opacity-80 disabled:cursor-wait"
                            >
                              {isLoadingNote ? <Loader2 className="animate-spin mr-2 text-[var(--color-lux-green-500)]" size={14} /> : <Sparkles className="mr-2" size={12} />}
                              {isLoadingNote ? "GMA AI is compiling your study guide..." : "Compile Study Guide"}
                            </Button>
                            {aiStatus && aiStatus.tier === 'free' && (
                              <div className="bg-lux-surface0 border border-lux-border px-3 py-1 rounded-full text-[10px] font-bold text-lux-text uppercase tracking-widest mt-2 overflow-hidden relative">
                                <div className="absolute top-0 left-0 h-full bg-[var(--color-lux-green-500)]/20" style={{ width: `${(aiStatus.remaining / aiStatus.limit) * 100}%`}}></div>
                                <span className="relative z-10">{aiStatus.remaining} AI questions left today</span>
                              </div>
                            )}
                          </>
                        )}
                        
                      </div>
                    ) : studyNote.includes("quota exceeded") || studyNote.includes("limit_reached") ? (
                      <div className="mt-4"><AIUpgradePrompt /></div>
                    ) : (
                      <div className="bg-lux-surface0 border border-lux-border p-6 rounded-2xl sm:rounded-3xl space-y-4 prose prose-invert max-w-none text-xs text-lux-text leading-relaxed scrollbar-thin">
                        {studyNote.includes("temporarily unavailable") && (
                          <div className="bg-[var(--color-lux-green-500)]/20 text-[var(--color-lux-green-500)] border border-[var(--color-lux-green-500)]/30 p-4 rounded-xl text-[11px] leading-relaxed mb-4">
                            <ReactMarkdown>{studyNote}</ReactMarkdown>
                          </div>
                        )}
                        <div className="flex items-center justify-between pb-4 border-b border-lux-border">
                          <span className="text-[10px] text-lux-text font-bold uppercase tracking-widest flex items-center gap-1">
                            <Sparkles size={11} />
                            Syllabus Study Guide Notes:
                          </span>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={handlePrintPDF}
                              className="flex items-center gap-1.5 text-[10px] text-lux-text hover:text-lux-text transition-colors"
                            >
                              <BookOpen size={12} />
                              Download as PDF
                            </button>
                            <button
                              onClick={handleCopySummary}
                              className="flex items-center gap-1.5 text-[10px] text-lux-text hover:text-lux-text transition-colors"
                            >
                              {noteCopied ? <Check size={12} className="text-lux-text" /> : <Copy size={12} />}
                              {noteCopied ? "Copied" : "Copy Notes"}
                            </button>
                          </div>
                        </div>
                        
                        {studyNote.includes("temporarily unavailable") ? (
                          <div className="bg-[var(--color-lux-green-500)]/20 text-[var(--color-lux-green-500)] border border-[var(--color-lux-green-500)]/30 p-4 rounded-xl text-[11px] leading-relaxed mb-4">
                            <ReactMarkdown>{studyNote}</ReactMarkdown>
                          </div>
                        ) : (
                          <div id="printable-study-guide" className="print:text-lux-bg">
                            <div className="hidden print:block mb-8 text-lux-bg border-b pb-4">
                              <h1 className="text-2xl font-serif font-bold text-lux-text">Genius Makers Academy</h1>
                              <h2 className="text-lg text-lux-text mt-1">{currentVideo.title}</h2>
                              <p className="text-sm text-lux-text mt-1">Grade {currentVideo.grade} {currentVideo.subject} • {currentVideo.topic}</p>
                            </div>
                            <ReactMarkdown>{studyNote}</ReactMarkdown>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* TAB 5: DIAG_EXAM QUIZ */}
              {activeTab === 'quiz' && (
                <motion.div
                  key="quiz"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-4 h-full flex flex-col"
                >
                  <div className="bg-lux-surface0/80 border border-lux-border rounded-xl p-4 flex items-start gap-4">
                    <Trophy size={18} className="text-lux-text mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-lux-text mb-1">Diagnostic MCQ Quiz Master</h4>
                      <p className="text-[11px] text-lux-text leading-relaxed">
                        Take a custom mock diagnostic evaluation generated specifically for this video capsule.
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 min-h-[220px] max-h-[380px] overflow-y-auto pr-1">
                    {!quizQuestions ? (
                      <div className="h-full flex flex-col items-center justify-center text-center py-10 space-y-4">
                        <div className="w-16 h-16 bg-[#CCA43B]/5 border border-[#CCA43B]/15 rounded-full flex items-center justify-center">
                          <Trophy className="text-lux-text/60" size={24} />
                        </div>
                        <p className="text-xs text-lux-text max-w-sm">Need a self-evaluation diagnostic test built on this video?</p>
                        
                        {aiStatus && aiStatus.remaining === 0 ? (
                          <div className="mt-4"><AIUpgradePrompt /></div>
                        ) : (
                          <>
                            <Button 
                              onClick={handleGenerateQuiz}
                              disabled={isLoadingQuiz}
                              className="bg-[#CCA43B] text-lux-bg font-bold text-[10px] uppercase tracking-wider py-2.5 px-4 rounded-xl hover:bg-[#d8b045]"
                            >
                              {isLoadingQuiz ? <Loader2 className="animate-spin mr-2" size={14} /> : <Sparkles className="mr-2" size={12} />}
                              Generate MCQ Test
                            </Button>
                            {aiStatus && aiStatus.tier === 'free' && (
                              <div className="bg-lux-surface0 border border-lux-border px-3 py-1 rounded-full text-[10px] font-bold text-lux-text uppercase tracking-widest mt-2 overflow-hidden relative">
                                <div className="absolute top-0 left-0 h-full bg-[var(--color-lux-green-500)]/20" style={{ width: `${(aiStatus.remaining / aiStatus.limit) * 100}%`}}></div>
                                <span className="relative z-10">{aiStatus.remaining} AI questions left today</span>
                              </div>
                            )}
                          </>
                        )}
                        
                        {quizError && quizError !== "limit_reached" && (
                          <div className="bg-[var(--color-lux-green-500)]/20 text-[var(--color-lux-green-500)] border border-[var(--color-lux-green-500)]/30 p-4 rounded-xl text-[11px] leading-relaxed mt-4 w-full">
                            ⚠️ **AI is temporarily unavailable**<br/><br/>The GMA AI service is experiencing high load or a temporary connection issue. Please try again in a moment.
                          </div>
                        )}
                      </div>
                    ) : quizError === "limit_reached" || quizQuestions.length === 0 ? (
                      <div className="py-12 mt-4">
                        <AIUpgradePrompt />
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {quizQuestions.map((question, qIdx) => (
                          <div key={qIdx} className="bg-lux-surface0 border border-lux-border p-5 rounded-2xl sm:rounded-3xl space-y-4">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] uppercase font-black tracking-widest text-lux-text/10 px-2 py-0.5 rounded">
                                Question {qIdx + 1} of {quizQuestions.length}
                              </span>
                              <span style={{ backgroundColor: '#E1F5EE', color: 'var(--color-lux-green-900)' }} className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
                                {question.marks || 1} {question.marks === 1 ? 'mark' : 'marks'}
                              </span>
                            </div>
                            <h5 className="text-xs font-bold text-lux-text leading-relaxed">{question.question}</h5>
                            <div className="space-y-2">
                              {question.options.map((option, oIdx) => {
                                const isSelected = selectedAnswers[qIdx] === oIdx;
                                const isCorrect = question.correct === oIdx;
                                const showCorrect = quizSubmitted && isCorrect;
                                const showWrong = quizSubmitted && isSelected && !isCorrect;

                                return (
                                  <button
                                    key={oIdx}
                                    disabled={quizSubmitted}
                                    onClick={() => selectQuizAnswer(qIdx, oIdx)}
                                    className={`w-full text-left p-3 rounded-xl text-xs border transition-all flex items-center justify-between ${
                                      showCorrect 
                                        ? 'bg-[#152e25] border-[#2b5947] text-lux-text font-bold'
                                        : showWrong
                                        ? 'bg-[#FEF2F2]/5 border-[#EF4444]/30 text-lux-text'
                                        : isSelected
                                        ? 'bg-[#CCA43B]/10 border-[#CCA43B] text-lux-text font-medium'
                                        : 'bg-lux-surface0 border-lux-border text-lux-text hover:bg-lux-surface00 hover:border-lux-border'
                                    }`}
                                  >
                                    <span>{option}</span>
                                    {showCorrect && <CheckCircle size={14} className="text-lux-text shrink-0 ml-2" />}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Question Specific Explanation */}
                            {quizSubmitted && (
                              <div className={`p-4 rounded-xl text-[11px] leading-relaxed border ${
                                selectedAnswers[qIdx] === question.correct
                                  ? 'bg-[#152e25]/30 border-[#2b5947]/30 text-lux-text'
                                  : 'bg-[#FEF2F2]/5 border-[#EF4444]/10 text-lux-text'
                              }`}>
                                <div className="font-bold text-lux-text mb-1">
                                  {selectedAnswers[qIdx] === question.correct ? "✅ Correct!" : "❌ Incorrect"}
                                </div>
                                <p>
                                  The correct answer is {['A', 'B', 'C', 'D'][question.correct]}. Here is why: {question.explanation}. This tests CAPS topic: {question.topic || "General"}.
                                </p>
                              </div>
                            )}

                          </div>
                        ))}

                        {/* Submit Actions / Result Box */}
                        {!quizSubmitted ? (
                          <Button
                            onClick={submitQuizAnswers}
                            disabled={Object.keys(selectedAnswers).length < quizQuestions.length}
                            className="w-full bg-[#CCA43B] text-lux-bg font-bold py-3 uppercase tracking-widest text-[11px]"
                          >
                            Submit Diagnostic evaluation
                          </Button>
                        ) : (
                          <div className="bg-gradient-to-r from-[#111827] to-[#151D24] border border-[#CCA43B]/20 p-5 rounded-2xl sm:rounded-3xl text-center space-y-4">
                            <Trophy className="mx-auto text-lux-text" size={36} />
                            <div>
                              <h4 className="text-base font-serif text-lux-text">Quiz Completed!</h4>
                              <p className="text-sm mt-2 text-lux-text">
                                Score: <span className="font-bold text-lux-text">{quizScore}</span> / {quizQuestions.reduce((acc, q) => acc + (q.marks || 1), 0)} marks ({(() => {
                                  const totalAvailableMarks = quizQuestions.reduce((acc, q) => acc + (q.marks || 1), 0);
                                  return totalAvailableMarks > 0 ? Math.round((quizScore! / totalAvailableMarks) * 100) : 0;
                                })()}%)
                              </p>
                              <div className="mt-2 text-xs font-semibold text-lux-text">
                                Status: "{
                                  (() => {
                                    const totalAvailableMarks = quizQuestions.reduce((acc, q) => acc + (q.marks || 1), 0);
                                    const quizPercentage = totalAvailableMarks > 0 ? Math.round((quizScore! / totalAvailableMarks) * 100) : 0;
                                    if (quizPercentage < 40) return "Needs more practice";
                                    if (quizPercentage < 60) return "Getting there";
                                    if (quizPercentage < 75) return "Good understanding";
                                    if (quizPercentage < 100) return "Excellent";
                                    return "Perfect score — distinction level!";
                                  })()
                                }"
                              </div>
                            </div>
                            
                            <div className="flex flex-col gap-2 pt-2">
                              <Button
                                onClick={handleGenerateQuiz}
                                disabled={isLoadingQuiz}
                                className="bg-lux-surface0 hover:bg-lux-surface00 text-lux-text border border-lux-border w-full text-[10px] uppercase font-bold tracking-widest shrink-0 py-2.5 flex items-center justify-center gap-2"
                              >
                                {isLoadingQuiz ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                                Retry with new questions
                              </Button>

                              {quizQuestions.filter((q, idx) => selectedAnswers[idx] !== q.correct).length > 0 && (
                                <Button
                                  onClick={handleAskAboutMistakes}
                                  className="bg-[var(--color-lux-green-500)] hover:bg-[var(--color-lux-green-800)] text-lux-text w-full text-[10px] uppercase font-bold tracking-widest shrink-0 py-2.5 flex items-center justify-center gap-2"
                                >
                                  <Sparkles size={12} />
                                  Ask AI about my mistakes
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

        </div>
      </div>

      {/* Floating Ask AI Button (Mobile Only) */}
      <div className="lg:hidden fixed bottom-6 right-6 z-[70]">
        <button
          onClick={() => { setActiveTab('ai-tutor'); setIsMobileSheetOpen(true); }}
          className="w-14 h-14 bg-[var(--color-lux-green-500)] hover:bg-[var(--color-lux-green-800)] text-lux-text rounded-full flex items-center justify-center shadow-[0_10px_25px_rgba(29,158,117,0.5)] transition-transform hover:scale-105 active:scale-95 border-2 border-lux-border"
        >
          <Sparkles size={24} />
        </button>
      </div>

    </div>
  );
}

