import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { X, Users } from 'lucide-react';

interface CreateRoomModalProps {
  onClose: () => void;
  onCreated: (roomId: string) => void;
}

export function CreateRoomModal({ onClose, onCreated }: CreateRoomModalProps) {
  const { user, userProfile } = useAuth();
  
  const [subject, setSubject] = useState(userProfile?.subjects?.[0] || 'Mathematics');
  const [grade, setGrade] = useState(userProfile?.grade || 12);
  const [joinMode, setJoinMode] = useState<'code' | 'school'>('code');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/costudy/create-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          subject,
          grade,
          joinMode,
          schoolId: userProfile?.schoolId
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      onCreated(data.roomId);
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
        className="bg-lux-surface border border-lux-border rounded-2xl sm:rounded-3xl w-full max-w-md overflow-hidden relative"
      >
        <div className="p-6 border-b border-lux-border flex justify-between items-center">
           <h3 className="text-xl font-serif text-lux-text font-bold flex items-center gap-2">
             <Users className="text-lux-green-500" /> Create Co-Study Room
           </h3>
           <button onClick={onClose} className="text-lux-text hover:text-lux-green-900"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-bold border border-red-100">{error}</div>}
          
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-lux-text block mb-2">Subject</label>
            <input 
              type="text" 
              value={subject} 
              onChange={e => setSubject(e.target.value)}
              className="w-full px-4 py-3 bg-lux-bg border border-lux-border rounded-xl text-sm"
              placeholder="e.g. Mathematics"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-lux-text block mb-2">Grade</label>
            <input 
              type="number" 
              value={grade} 
              onChange={e => setGrade(Number(e.target.value) as 8 | 9 | 10 | 11 | 12)}
              className="w-full px-4 py-3 bg-lux-bg border border-lux-border rounded-xl text-sm"
            />
          </div>

          <div>
             <label className="text-xs font-bold uppercase tracking-widest text-lux-text block mb-2">Invite Mode</label>
             <div className="flex gap-2">
                <button 
                  onClick={() => setJoinMode('code')}
                  className={`flex-1 py-3 text-sm font-bold rounded-xl border ${joinMode === 'code' ? 'bg-lux-surface text-lux-green-500 border-lux-border' : 'bg-lux-bg text-lux-text border-lux-border'}`}
                >
                   By Code
                </button>
                {userProfile?.schoolId && (
                  <button 
                    onClick={() => setJoinMode('school')}
                    className={`flex-1 py-3 text-sm font-bold rounded-xl border ${joinMode === 'school' ? 'bg-lux-surface text-lux-green-500 border-lux-border' : 'bg-lux-bg text-lux-text border-lux-border'}`}
                  >
                     Same School
                  </button>
                )}
             </div>
          </div>
        </div>
        <div className="p-6 border-t border-lux-border bg-lux-bg flex justify-end gap-3">
           <Button variant="outline" onClick={onClose} className="rounded-xl">Cancel</Button>
           <Button onClick={handleCreate} disabled={loading} className="rounded-xl bg-lux-surface text-lux-green-500 hover:bg-lux-bg">
             {loading ? 'Creating...' : 'Create Room'}
           </Button>
        </div>
      </motion.div>
    </div>
  );
}
