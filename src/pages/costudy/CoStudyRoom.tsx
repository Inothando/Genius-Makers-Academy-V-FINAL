import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { doc, getDoc, onSnapshot, updateDoc, serverTimestamp, collection, query, orderBy } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { useTierGating } from '../../hooks/useTierGating';
import { Navbar } from '../../components/Navbar';
import { Button } from '../../components/ui/Button';
import { Users, Clock, Send, ShieldAlert, Flag, Award, Sparkles, Loader2, ArrowLeft } from 'lucide-react';

export function CoStudyRoom() {
   const { roomId } = useParams<{ roomId: string }>();
   const navigate = useNavigate();
   const { user, userProfile } = useAuth();
   const { tier, loading: tierLoading } = useTierGating();
   const isPremium = tier !== 'starter';

   const [room, setRoom] = useState<any>(null);
   const [messages, setMessages] = useState<any[]>([]);
   const [newMessage, setNewMessage] = useState('');
   const [memberPresences, setMemberPresences] = useState<Record<string, Date>>({});
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);

   const [sending, setSending] = useState(false);
   const messagesEndRef = useRef<HTMLDivElement>(null);
   const [timeLeft, setTimeLeft] = useState<number | null>(null);

   const [reportReason, setReportReason] = useState('');
   const [showReport, setShowReport] = useState(false);
   const [reporting, setReporting] = useState(false);

   const [myAnswer, setMyAnswer] = useState<number | null>(null);
   const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});

   // Real-time connections
   useEffect(() => {
      if (!roomId || !user || !isPremium) return;

      const roomRef = doc(db, 'coStudyRooms', roomId);
      
      const unsubRoom = onSnapshot(roomRef, (snap) => {
         if (snap.exists()) {
            const data = snap.data();
            
            // Check expiry
            if (data.expiresAt && data.expiresAt.toDate() < new Date() && data.status !== 'expired') {
               updateDoc(roomRef, { status: 'expired' }).catch(console.error);
               data.status = 'expired';
            }
            
            // Check if user is actually a member, otherwise boot them visually (not secure but for UX)
            if (!data.members?.includes(user.uid) && data.status !== 'expired') {
               setError("You are not a member of this room.");
            } else {
               setRoom({ id: snap.id, ...data });
               
               // Load member presence map
               if (data.presences) {
                  const pres = {} as Record<string, Date>;
                  for (const [k, v] of Object.entries(data.presences)) {
                     pres[k] = (v as any).toDate ? (v as any).toDate() : new Date();
                  }
                  setMemberPresences(pres);
               }
               
               // Timer Calculation
               if (data.status !== 'expired') {
                  if (data.timerStartedAt && data.timerDurationMinutes) {
                     const started = data.timerStartedAt.toDate();
                     const endsAt = new Date(started.getTime() + data.timerDurationMinutes * 60000);
                     const now = new Date();
                     if (now < endsAt) {
                        const secondsLeft = Math.floor((endsAt.getTime() - now.getTime()) / 1000);
                        setTimeLeft(secondsLeft);
                     } else {
                        setTimeLeft(0);
                     }
                  } else {
                     setTimeLeft(null);
                  }
               }

               // Load my answer
               if (data.groupQuiz?.answers?.[user.uid] !== undefined) {
                  setMyAnswer(data.groupQuiz.answers[user.uid]);
               } else {
                  setMyAnswer(null);
               }
               if (data.groupQuiz?.answers) {
                  setQuizAnswers(data.groupQuiz.answers);
               } else {
                  setQuizAnswers({});
               }
            }
         } else {
            setError("Room not found.");
         }
         setLoading(false);
      });

      const q = query(collection(db, 'coStudyRooms', roomId, 'messages'), orderBy('timestamp', 'asc'));
      const unsubMessages = onSnapshot(q, (snap) => {
         const msgs: any[] = [];
         snap.forEach(d => msgs.push({ id: d.id, ...d.data() }));
         setMessages(msgs);
         setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
         }, 100);
      });

      // Heartbeat presence monitor
      const interval = setInterval(() => {
         updateDoc(roomRef, {
            [`presences.${user.uid}`]: serverTimestamp()
         }).catch(console.error);
      }, 20000);

      // Initial presence update
      updateDoc(roomRef, {
         [`presences.${user.uid}`]: serverTimestamp()
      }).catch(console.error);

      // Timer countdown interval
      const timerInterval = setInterval(() => {
         setTimeLeft(prev => {
            if (prev === null) return null;
            if (prev <= 0) return 0;
            return prev - 1;
         });
      }, 1000);

      return () => {
         unsubRoom();
         unsubMessages();
         clearInterval(interval);
         clearInterval(timerInterval);
      };
   }, [roomId, user, isPremium]);

   const sendMessage = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newMessage.trim() || sending || !user || room?.status === 'expired') return;
      
      setSending(true);
      try {
         const res = await fetch('/api/costudy/send-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
               roomId,
               uid: user.uid,
               displayName: userProfile?.displayName || 'Learner',
               text: newMessage
            })
         });
         const data = await res.json();
         if (!res.ok) {
            alert(data.error);
         } else {
            setNewMessage('');
         }
      } catch(err) {
         console.error(err);
      } finally {
         setSending(false);
      }
   };

   const startTimer = async (mins: number) => {
      if (!user) return;
      try {
         await fetch('/api/costudy/start-timer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomId, uid: user.uid, durationMinutes: mins })
         });
      } catch(err) {
         console.error(err);
      }
   };

   const startQuiz = async () => {
      if (!user) return;
      try {
         await fetch('/api/costudy/start-quiz', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomId, uid: user.uid, subject: room.subject, grade: room.grade })
         });
      } catch(err) {
         console.error(err);
      }
   };

   const submitAnswer = async (index: number) => {
      if (!user || myAnswer !== null || room?.status === 'expired' || !room?.groupQuiz) return;
      try {
         const roomRef = doc(db, 'coStudyRooms', roomId!);
         await updateDoc(roomRef, {
            [`groupQuiz.answers.${user.uid}`]: index
         });
      } catch(err) {
         console.error(err);
      }
   };

   const reportRoom = async () => {
      if(!user || !roomId) return;
      setReporting(true);
      try {
          await fetch('/api/costudy/report-room', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomId, uid: user.uid, reason: reportReason })
         });
         setShowReport(false);
         alert("Room reported successfully. Our team will review the chat logs.");
      } catch (err) {
         console.error(err);
      } finally {
         setReporting(false);
      }
   }

   const formatTime = (seconds: number) => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m}:${s < 10 ? '0' : ''}${s}`;
   };

   if (tierLoading || loading) {
      return (
         <div className="min-h-screen bg-lux-bg flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-lux-green-500 animate-spin" />
         </div>
      );
   }

   if (error) {
       return (
         <div className="min-h-screen bg-lux-bg">
            <Navbar />
            <div className="pt-28 sm:pt-36 md:pt-48 px-4 max-w-2xl mx-auto text-center">
               <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                 <ShieldAlert size={32} />
               </div>
               <h2 className="text-2xl font-serif text-lux-text mb-4">{error}</h2>
               <Button onClick={() => navigate('/study-rooms')} className="bg-lux-surface text-lux-green-500 rounded-xl">Go Back</Button>
            </div>
         </div>
       )
   }

   if (!room) return null;

   const activeQuestionIndex = room?.groupQuizActiveQuestion || 0;
   const currentQuestion = room?.groupQuiz?.questions?.[activeQuestionIndex];
   const totalMembers = room.members?.length || 1;
   const answerCount = Object.keys(quizAnswers).length;
   const allAnswered = answerCount >= totalMembers;

   // Auto-reveal logic (simple client side trigger if all answered, first one triggers it)
   if (allAnswered && !room.groupQuizRevealed && user.uid === room.createdBy) {
      updateDoc(doc(db, 'coStudyRooms', roomId!), { groupQuizRevealed: true }).catch(console.error);
   }

   const nextQuestion = () => {
      if (user.uid !== room.createdBy) return;
      if (activeQuestionIndex < (room.groupQuiz?.questions?.length || 0) - 1) {
         updateDoc(doc(db, 'coStudyRooms', roomId!), {
            groupQuizActiveQuestion: activeQuestionIndex + 1,
            groupQuizRevealed: false,
            'groupQuiz.answers': {} 
         });
      } else {
         updateDoc(doc(db, 'coStudyRooms', roomId!), {
            groupQuizFinished: true
         });
      }
   };

   return (
      <div className="min-h-screen bg-lux-bg font-sans selection:bg-lux-green-500 selection:text-lux-text flex flex-col h-screen">
         <Navbar />
         
         {/* Top Header Row */}
         <div className="pt-24 px-4 sm:px-6 lg:px-8 border-b border-lux-border bg-lux-surface shrink-0 z-10">
             <div className="max-w-7xl mx-auto py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                 <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Button variant="ghost" onClick={() => navigate('/study-rooms')} className="p-0 h-auto text-lux-text hover:text-lux-text">
                        <ArrowLeft size={16} />
                      </Button>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-lux-text border px-2 py-0.5 rounded-full">{room.subject} - Gr {room.grade}</span>
                      {room.status === 'expired' && <span className="text-[10px] bg-red-100 text-red-800 font-bold uppercase tracking-widest border px-2 py-0.5 rounded-full">EXPIRED</span>}
                    </div>
                    <h1 className="text-2xl font-serif text-lux-text font-bold flex items-center gap-3">
                       Live Co-Study
                       <button onClick={() => setShowReport(true)} className="text-red-400 hover:text-red-600 transition-colors" title="Report Room"><Flag size={16} /></button>
                    </h1>
                 </div>
                 
                 <div className="flex items-center gap-4">
                     <div className="flex -space-x-2">
                        {room.members?.map((uid: string) => {
                           const lastSeen = memberPresences[uid];
                           const isOnline = lastSeen && (new Date().getTime() - lastSeen.getTime() < 60000);
                           return (
                              <div key={uid} className="relative w-8 h-8 rounded-full border-2 border-lux-surface bg-lux-bg flex items-center justify-center font-serif text-xs font-bold text-lux-text" title={uid === user.uid ? "You" : "Member"}>
                                 {uid.substring(0,2).toUpperCase()}
                                 <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-2 border-lux-green-950 rounded-full ${isOnline ? 'bg-green-500' : 'bg-lux-surface-alt'}`} />
                              </div>
                           );
                        })}
                     </div>
                     <div className="text-sm font-bold text-lux-text bg-lux-bg px-3 py-1.5 rounded-lg border border-lux-border">
                        {room.joinCode}
                     </div>
                 </div>
             </div>
         </div>

         {/* Main content area */}
         <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row gap-6 min-h-0 overflow-hidden">
             
             {/* Left Column: Shared State & Timer */}
             <div className="w-full lg:w-[40%] flex flex-col gap-6 shrink-0 overflow-y-auto custom-scrollbar pr-2">
                 
                 {/* Shared Timer Widget */}
                 <div className="glass-panel p-8 text-center shadow-lux-sm">
                     <h3 className="text-[10px] font-bold uppercase tracking-widest text-lux-text flex items-center justify-center gap-2 mb-6">
                        <Clock size={14} className="text-lux-green-500" /> Shared Timer
                     </h3>
                     
                     {timeLeft !== null ? (
                        <div>
                           <div className="text-6xl font-black text-lux-text font-mono tracking-tighter mb-4">
                             {formatTime(timeLeft)}
                           </div>
                           <p className="text-xs text-lux-text mb-4">{timeLeft === 0 ? "Time's up!" : "Focus session active"}</p>
                           {room.status === 'active' && (
                              <Button onClick={() => startTimer(0)} variant="outline" size="sm" className="rounded-xl mt-4">Reset Timer</Button>
                           )}
                        </div>
                     ) : (
                        <div>
                           <div className="flex justify-center gap-2">
                              <Button onClick={() => startTimer(15)} disabled={room.status === 'expired'} variant="outline" className="rounded-xl flex-1 border-dashed">15m</Button>
                              <Button onClick={() => startTimer(25)} disabled={room.status === 'expired'} variant="outline" className="rounded-xl flex-1 border-dashed text-lux-text hover:bg-lux-surface hover:text-lux-green-500 hover:border-lux-border">25m</Button>
                              <Button onClick={() => startTimer(45)} disabled={room.status === 'expired'} variant="outline" className="rounded-xl flex-1 border-dashed">45m</Button>
                           </div>
                        </div>
                     )}
                 </div>

                 {/* Group Quiz Widget */}
                 <div className="glass-panel p-8 shadow-lux-sm flex-1 min-h-[300px] flex flex-col">
                     <h3 className="text-[10px] font-bold uppercase tracking-widest text-lux-text flex items-center gap-2 mb-6 shrink-0">
                        <Sparkles size={14} className="text-blue-500" /> Synced AI Quiz
                     </h3>
                     
                     {!room.groupQuiz ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center">
                           <Award className="w-12 h-12 text-blue-100 mb-4" />
                           <p className="text-sm text-lux-text mb-6 px-4">Generate a quick group quiz based on this room's subject and grade.</p>
                           <Button onClick={startQuiz} disabled={room.status === 'expired'} className="bg-blue-600 text-lux-text hover:bg-blue-700 rounded-xl font-bold uppercase tracking-widest text-xs px-6 h-12 shadow-sm">
                               Start Group Quiz
                           </Button>
                        </div>
                     ) : room.groupQuizFinished ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 bg-lux-green-500/20 text-lux-green-500 rounded-full flex items-center justify-center mb-4">
                                <Award size={32} />
                            </div>
                            <h4 className="text-xl font-serif text-lux-text mb-2">Quiz Complete!</h4>
                            <p className="text-sm text-lux-text mb-6">Great group session! All questions answered.</p>
                        </div>
                     ) : (
                        <div className="flex-1 flex flex-col">
                            <div className="flex justify-between items-center mb-4">
                               <span className="text-xs font-bold text-lux-text">Q{activeQuestionIndex + 1} of {room.groupQuiz.questions?.length}</span>
                               <span className="text-[10px] font-bold uppercase tracking-widest text-lux-text">{answerCount}/{totalMembers} Answered</span>
                            </div>
                            
                            <h4 className="font-medium text-lux-text text-sm mb-6 leading-relaxed">
                               {currentQuestion?.question}
                            </h4>

                            <div className="space-y-2 flex-1">
                               {currentQuestion?.options.map((opt: string, idx: number) => {
                                  const isCorrect = idx === currentQuestion.correctAnswer;
                                  const isMyAnswer = myAnswer === idx;
                                  const showResult = room.groupQuizRevealed;
                                  
                                  let btnClass = "bg-lux-bg border-lux-border text-lux-text hover:border-lux-muted";
                                  if (isMyAnswer && !showResult) btnClass = "bg-lux-surface text-lux-text border-lux-border";
                                  else if (showResult && isCorrect) btnClass = "bg-green-100 text-green-900 border-green-200";
                                  else if (showResult && isMyAnswer && !isCorrect) btnClass = "bg-red-100 text-red-900 border-red-200";

                                  return (
                                     <button
                                        key={idx}
                                        onClick={() => submitAnswer(idx)}
                                        disabled={myAnswer !== null || showResult || room.status === 'expired'}
                                        className={`w-full text-left p-4 rounded-xl border text-sm transition-colors ${btnClass}`}
                                     >
                                        <span className="font-bold mr-3 opacity-50">{String.fromCharCode(65 + idx)}</span>
                                        {opt}
                                     </button>
                                  );
                               })}
                            </div>
                            
                            {room.groupQuizRevealed && (
                               <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl shrink-0">
                                  <p className="text-xs text-blue-900 leading-relaxed font-medium">
                                     <span className="font-bold underline mb-1 block">Explanation:</span>
                                     {currentQuestion.explanation}
                                  </p>
                                  {user.uid === room.createdBy && (
                                     <Button onClick={nextQuestion} size="sm" className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-lux-text rounded-lg">Next Question</Button>
                                  )}
                               </motion.div>
                            )}
                        </div>
                     )}
                 </div>

             </div>
             
             {/* Right Column: Chat */}
             <div className="flex-1 glass-panel p-6 sm:p-8 flex flex-col shadow-lux-sm min-h-0 overflow-hidden relative">
                 <div className="absolute top-0 right-0 w-64 h-64 bg-lux-green-500/5 blur-[80px] rounded-full pointer-events-none" />
                 
                 <h3 className="text-[10px] font-bold uppercase tracking-widest text-lux-text flex items-center gap-2 mb-6 shrink-0 relative z-10">
                    Room Chat
                 </h3>

                 <div className="flex-1 overflow-y-auto mb-6 pr-2 space-y-6 relative z-10 custom-scrollbar content-end">
                     {messages.length === 0 ? (
                        <div className="text-center text-sm text-lux-text p-8">No messages yet. Say hi!</div>
                     ) : (
                        messages.map(msg => {
                           const isMe = msg.uid === user.uid;
                           return (
                              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                 <span className="text-[10px] font-bold text-lux-text mb-1 px-1">{msg.displayName}</span>
                                 <div className={`px-4 py-3 rounded-2xl sm:rounded-3xl max-w-[85%] text-sm leading-relaxed ${isMe ? 'bg-lux-surface text-lux-text rounded-tr-sm shadow-sm' : 'bg-lux-bg border border-lux-border text-lux-text rounded-tl-sm'}`}>
                                    {msg.text}
                                 </div>
                              </div>
                           );
                        })
                     )}
                     <div ref={messagesEndRef} />
                 </div>

                 {room.status === 'expired' ? (
                    <div className="p-4 bg-lux-bg border border-lux-border rounded-xl text-center text-sm text-lux-text font-bold shrink-0">
                       Room has expired resulting in chats being disabled.
                    </div>
                 ) : (
                    <form onSubmit={sendMessage} className="relative shrink-0 z-10">
                       <input 
                          type="text"
                          value={newMessage}
                          onChange={e => setNewMessage(e.target.value)}
                          placeholder="Type a message..."
                          className="w-full pl-6 pr-14 py-4 bg-lux-bg border border-lux-border rounded-2xl sm:rounded-3xl text-sm focus:outline-none focus:border-lux-border transition-colors placeholder:text-lux-text"
                          disabled={sending}
                       />
                       <button 
                          type="submit"
                          disabled={sending || !newMessage.trim()}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-lux-surface text-lux-green-500 rounded-xl hover:bg-lux-bg disabled:opacity-50 transition-colors"
                       >
                          <Send size={14} className={sending ? "opacity-0" : "opacity-100"} />
                          {sending && <Loader2 size={14} className="absolute animate-spin" />}
                       </button>
                    </form>
                 )}
                 <p className="text-[9px] text-lux-text mt-3 text-center opacity-60">Messages are monitored to keep the community safe. No personal info.</p>
             </div>
         </div>

         {/* Report Room Modal */}
         <AnimatePresence>
            {showReport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-lux-surface border border-lux-border rounded-2xl sm:rounded-3xl w-full max-w-md overflow-hidden"
                  >
                     <div className="p-6 border-b border-lux-border flex justify-between items-center bg-red-50/50">
                        <h3 className="text-xl font-serif text-red-900 font-bold flex items-center gap-2">
                           <ShieldAlert className="text-red-600" /> Report Room
                        </h3>
                     </div>
                     <div className="p-6">
                        <p className="text-sm text-lux-text mb-4 leading-relaxed">
                           If anyone is sharing personal information, being inappropriate, or violating safety rules, please report this room. Our team reviews logs securely. Your report is anonymous to other members.
                        </p>
                        <select 
                           value={reportReason} 
                           onChange={e => setReportReason(e.target.value)}
                           className="w-full px-4 py-3 bg-lux-bg border border-lux-border rounded-xl text-sm mb-6"
                        >
                           <option value="">Select a reason...</option>
                           <option value="Sharing personal contact info (PII)">Sharing personal contact info</option>
                           <option value="Inappropriate language or bullying">Inappropriate language or bullying</option>
                           <option value="Spam or irrelevant content">Spam or irrelevant content</option>
                           <option value="Other safety concern">Other safety concern</option>
                        </select>
                        <div className="flex gap-3 justify-end mt-4">
                           <Button variant="outline" onClick={() => setShowReport(false)} className="rounded-xl">Cancel</Button>
                           <Button onClick={reportRoom} disabled={reporting || !reportReason} className="bg-red-600 text-lux-text hover:bg-red-700 rounded-xl font-bold uppercase tracking-widest text-xs">
                              {reporting ? 'Reporting...' : 'Submit Report'}
                           </Button>
                        </div>
                     </div>
                  </motion.div>
                </div>
            )}
         </AnimatePresence>
      </div>
   );
}
