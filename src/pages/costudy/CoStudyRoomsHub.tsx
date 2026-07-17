import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { useTierGating } from '../../hooks/useTierGating';
import { AIUpgradePrompt } from '../../components/ai/AIUpgradePrompt';
import { Users, Plus, Key, Loader2, ArrowRight } from 'lucide-react';
import { Navbar } from '../../components/Navbar';
import { CreateRoomModal } from '../../components/costudy/CreateRoomModal';
import { JoinRoomModal } from '../../components/costudy/JoinRoomModal';
import { useNavigate } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export function CoStudyRoomsHub() {
   const { user, userProfile } = useAuth();
   const { tier, loading: tierLoading } = useTierGating();
   const isPremium = tier !== 'starter';
   const navigate = useNavigate();

   const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
   const [loadingActive, setLoadingActive] = useState(true);

   const [showCreate, setShowCreate] = useState(false);
   const [showJoin, setShowJoin] = useState(false);

   useEffect(() => {
     if (user && isPremium) {
        // Check if user is currently in a room
        const checkActive = async () => {
           try {
             const q = query(
               collection(db, "coStudyRooms"),
               where("members", "array-contains", user.uid),
               where("status", "==", "active")
             );
             const snap = await getDocs(q);
             const now = new Date();
             
             let foundRoomId = null;
             for (const doc of snap.docs) {
                const r = doc.data();
                if (r.expiresAt && r.expiresAt.toDate() > now) {
                   foundRoomId = doc.id;
                   break;
                }
             }
             setActiveRoomId(foundRoomId);
           } catch(err) {
             console.error(err);
           } finally {
             setLoadingActive(false);
           }
        };
        checkActive();
     } else {
        setLoadingActive(false);
     }
   }, [user, isPremium]);

   if (tierLoading || loadingActive) {
      return (
         <div className="min-h-screen bg-lux-bg flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-lux-green-500 animate-spin" />
         </div>
      );
   }

   return (
      <div className="min-h-screen bg-lux-bg font-sans selection:bg-lux-green-500 selection:text-lux-text">
         <Navbar />
         <div className="pt-28 sm:pt-36 md:pt-48 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto pb-20">
            <header className="mb-12 text-center">
               <h1 className="text-4xl sm:text-5xl font-serif text-lux-text mb-4 inline-flex items-center gap-4 justify-center">
                  <Users className="text-lux-green-500 w-10 h-10" />
                  Live Co-Study Rooms
               </h1>
               <p className="text-lux-text max-w-2xl mx-auto text-lg leading-relaxed font-light">
                  Join small, closed-group study spaces. Use text-chat, sync timers, and take group AI quizzes to push your understanding further, together.
               </p>
            </header>

            {!isPremium && !tierLoading ? (
               <div className="max-w-2xl mx-auto">
                  <AIUpgradePrompt 
                    message="Upgrade to Scholar for R5/month to study live with friends. Start group timers, take synced quizzes, and master subjects together in real time."
                  />
               </div>
            ) : (
               <div className="max-w-3xl mx-auto relative">
                  {/* Decorative Elements */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-lux-green-500/5 blur-[100px] rounded-full pointer-events-none" />
                  
                  {activeRoomId ? (
                     <div className="glass-panel p-8 sm:p-12 text-center shadow-lux-lg relative z-10 overflow-hidden">
                        <div className="absolute top-0 right-0 w-full h-full hidden opacity-[0.03] pointer-events-none" />
                        <div className="w-20 h-20 bg-lux-surface/5 text-lux-text rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-lux-border/10">
                           <Users size={32} />
                        </div>
                        <h2 className="text-2xl font-serif text-lux-text mb-3">You're in an active room</h2>
                        <p className="text-lux-text mb-8 max-w-md mx-auto">You can only be in one live co-study session at a time. Rejoin your current room or wait for it to expire.</p>
                        <Button 
                           onClick={() => navigate(`/study-rooms/${activeRoomId}`)}
                           className="bg-lux-surface text-lux-green-500 hover:bg-lux-bg rounded-xl h-14 px-10 text-xs font-bold uppercase tracking-widest shadow-lux-sm"
                        >
                           Rejoin Room <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                     </div>
                  ) : (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                        <button 
                           onClick={() => setShowCreate(true)}
                           className="glass-panel p-10 text-left hover:border-lux-border transition-colors group relative overflow-hidden shadow-lux-sm hover:shadow-lux-md"
                        >
                           <div className="absolute inset-0 bg-gradient-to-br from-lux-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                           <div className="w-16 h-16 bg-lux-bg border border-lux-border rounded-2xl sm:rounded-3xl flex items-center justify-center mb-6 text-lux-text shadow-sm relative z-10 group-hover:scale-105 transition-transform">
                              <Plus size={28} />
                           </div>
                           <h3 className="text-xl font-bold text-lux-text mb-2 relative z-10">Create a Room</h3>
                           <p className="text-sm text-lux-text leading-relaxed relative z-10">Start a new private session and invite your friends, or open it to your schoolmates.</p>
                        </button>
                        
                        <button 
                           onClick={() => setShowJoin(true)}
                           className="glass-panel p-10 text-left hover:border-lux-border transition-colors group relative overflow-hidden shadow-lux-sm hover:shadow-lux-md"
                        >
                           <div className="absolute inset-0 bg-gradient-to-br from-lux-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                           <div className="w-16 h-16 bg-lux-bg border border-lux-border rounded-2xl sm:rounded-3xl flex items-center justify-center mb-6 text-lux-text shadow-sm relative z-10 group-hover:scale-105 transition-transform">
                              <Key size={28} />
                           </div>
                           <h3 className="text-xl font-bold text-lux-text mb-2 relative z-10">Join a Room</h3>
                           <p className="text-sm text-lux-text leading-relaxed relative z-10">Got an invite code? Enter it here to join a friend's active study session.</p>
                        </button>
                     </div>
                  )}
               </div>
            )}
         </div>

         {/* Modals */}
         <AnimatePresence>
            {showCreate && (
               <CreateRoomModal 
                  onClose={() => setShowCreate(false)} 
                  onCreated={(roomId) => navigate(`/study-rooms/${roomId}`)} 
               />
            )}
            {showJoin && (
               <JoinRoomModal 
                  onClose={() => setShowJoin(false)} 
                  onJoined={(roomId) => navigate(`/study-rooms/${roomId}`)} 
               />
            )}
         </AnimatePresence>
      </div>
   );
}
