import React, { useEffect, useState } from 'react';
import { Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export function DailyNudgeCard() {
  const { user } = useAuth();
  const [nudge, setNudge] = useState<{ text: string; topic: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchNudge() {
      if (!user) return;
      try {
        const res = await fetch('/api/ai/daily-nudge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: user.uid })
        });
        if (res.ok) {
          const data = await res.json();
          setNudge(data);
        }
      } catch (err) {
        console.error("Failed to fetch daily nudge", err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchNudge();
  }, [user]);

  if (!user) return null;

  return (
    <AnimatePresence>
      {loading ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="glass-panel p-6 mb-8 flex items-center justify-center min-h-[120px] shadow-sm"
        >
          <div className="flex items-center gap-3 text-lux-text">
             <Loader2 className="animate-spin text-lux-green-500" size={20} />
             <span className="text-xs font-bold uppercase tracking-widest">Generating daily nudge...</span>
          </div>
        </motion.div>
      ) : nudge ? (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden bg-lux-green-900 text-lux-surface rounded-[2rem] p-8 mb-8 shadow-lux-lg border border-lux-border group"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-lux-green-500/15 blur-[80px] rounded-full pointer-events-none group-hover:bg-[#CCA43B]/20 transition-all duration-700" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex-1 flex gap-5 items-start md:items-center">
              <div className="w-12 h-12 rounded-full bg-lux-surface border-lux-border text-lux-green-500 flex items-center justify-center shrink-0 shadow-inner">
                <Sparkles className="text-lux-green-500" size={20} />
              </div>
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-lux-green-500-light mb-2">Today's AI Nudge</h3>
                <p className="text-sm md:text-base text-lux-surface/90 leading-relaxed font-light">{nudge.text}</p>
              </div>
            </div>
            
            {nudge.topic && (
              <div className="shrink-0 flex justify-end">
                <button 
                  onClick={() => navigate(`/videos?topic=${encodeURIComponent(nudge.topic!)}`)}
                  className="bg-lux-green-500 hover:bg-lux-green-500 hover:text-lux-text hover:border-lux-green-500-light text-lux-text border-none hover:bg-lux-bg px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-transform active:scale-95 shadow-sm"
                >
                  Continue {nudge.topic}
                  <ArrowRight size={14} />
                </button>
              </div>
            )}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
