import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Button } from '../ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { X, Key, Search } from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';

interface JoinRoomModalProps {
  onClose: () => void;
  onJoined: (roomId: string) => void;
}

export function JoinRoomModal({ onClose, onJoined }: JoinRoomModalProps) {
  const { user, userProfile } = useAuth();
  
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [schoolRooms, setSchoolRooms] = useState<any[]>([]);
  const [loadingSchool, setLoadingSchool] = useState(false);

  useEffect(() => {
    if (userProfile?.schoolId) {
       setLoadingSchool(true);
       const q = query(
         collection(db, "coStudyRooms"),
         where("joinMode", "==", "school"),
         where("schoolId", "==", userProfile.schoolId),
         where("status", "==", "active")
       );
       getDocs(q).then(snap => {
         const now = new Date();
         const rooms = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((r: any) => r.expiresAt && r.expiresAt.toDate() > now);
         setSchoolRooms(rooms);
       }).finally(() => setLoadingSchool(false));
    }
  }, [userProfile?.schoolId]);

  const handleJoin = async (targetRoomId?: string, targetJoinCode?: string) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/costudy/join-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          joinCode: targetJoinCode || joinCode,
          roomId: targetRoomId
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      onJoined(data.roomId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-lux-surface border border-lux-border rounded-2xl sm:rounded-3xl w-full max-w-md overflow-hidden relative flex flex-col max-h-[80vh]"
      >
        <div className="p-6 border-b border-lux-border flex justify-between items-center shrink-0">
           <h3 className="text-xl font-serif text-lux-text font-bold flex items-center gap-2">
             <Key className="text-lux-green-500" /> Join Co-Study Room
           </h3>
           <button onClick={onClose} className="text-lux-text hover:text-lux-green-900"><X size={20} /></button>
        </div>
        
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {error && <div className="p-3 mb-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold border border-red-100">{error}</div>}
          
          <div className="mb-8">
            <label className="text-xs font-bold uppercase tracking-widest text-lux-text block mb-2">Have an invite code?</label>
            <div className="flex gap-2">
               <input 
                 type="text" 
                 value={joinCode} 
                 onChange={e => setJoinCode(e.target.value.toUpperCase())}
                 className="flex-1 px-4 py-3 bg-lux-bg border border-lux-border rounded-xl text-sm font-mono tracking-widest uppercase"
                 placeholder="6-CHAR CODE"
                 maxLength={6}
               />
               <Button onClick={() => handleJoin(undefined, joinCode)} disabled={loading || joinCode.length < 6} className="rounded-xl bg-lux-surface text-lux-green-500 hover:bg-lux-bg px-6 font-bold uppercase tracking-widest text-xs">
                  Join
               </Button>
            </div>
          </div>

          {userProfile?.schoolId && (
            <div>
               <label className="text-xs font-bold uppercase tracking-widest text-lux-text block mb-4 flex items-center gap-2">
                  <Search size={14} /> Active Rooms at Your School
               </label>
               {loadingSchool ? (
                  <div className="h-20 flex items-center justify-center"><div className="w-6 h-6 border-2 border-lux-green-500 border-t-transparent rounded-full animate-spin"></div></div>
               ) : schoolRooms.length > 0 ? (
                  <div className="space-y-2">
                     {schoolRooms.map(r => (
                        <div key={r.id} className="p-4 bg-lux-bg border border-lux-border rounded-xl flex items-center justify-between">
                           <div>
                             <h4 className="font-bold text-lux-text text-sm">{r.subject} <span className="text-lux-text font-normal">Grade {r.grade}</span></h4>
                             <p className="text-xs text-lux-text mt-1">{r.members?.length || 0}/8 members</p>
                           </div>
                           <Button onClick={() => handleJoin(r.id)} disabled={loading || r.members?.length >= 8} size="sm" variant="outline" className="rounded-lg text-xs">
                              Join Room
                           </Button>
                        </div>
                     ))}
                  </div>
               ) : (
                  <div className="p-4 bg-lux-bg border border-lux-border border-dashed rounded-xl text-center text-sm text-lux-text">
                     No active rooms found at your school. Why not create one?
                  </div>
               )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
