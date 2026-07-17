import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, Loader2, CheckCircle2, Crown, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/Button';
import Markdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';

interface PlanData {
  daysRemaining?: number;
  planMarkdown?: string | null;
  isProGate?: boolean;
  error?: string;
  message?: string;
}

export function ExamCountdownWidget({ subject, onDismiss }: { subject: string; onDismiss?: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [markedDone, setMarkedDone] = useState(false);

  useEffect(() => {
    async function fetchPlan() {
      if (!user || !subject) return;
      try {
        const res = await fetch(`/api/ai/exam-countdown-plan?uid=${user.uid}&subject=${encodeURIComponent(subject)}`);
        const json = await res.json();
        // Even if !res.ok, we might get { error, message } which we want to store in data
        setData(json);
      } catch (err) {
        console.error("Failed to fetch exam plan", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPlan();
  }, [user, subject]);

  const handleMarkDone = async () => {
    if (!user || markedDone) return;
    setMarkedDone(true);
    try {
      await fetch('/api/ai/mark-exam-plan-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid, subject })
      });
    } catch (err) {
      console.error(err);
    }
  };

  if (!user || loading) {
    return null; // Don't show loading state to avoid popping layout
  }

  if (!data) return null;

  if (data.error === 'no_timetable') {
      return (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="glass-panel p-6 shadow-lux-sm mb-8 relative overflow-hidden"
        >
           {onDismiss && (
             <button onClick={onDismiss} className="absolute top-4 right-4 text-lux-text hover:text-lux-green-900 transition-colors">
               ✕
             </button>
           )}
           <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-lux-bg/50 rounded-xl flex items-center justify-center text-lux-text border border-lux-border">
               <Calendar size={24} />
             </div>
             <div>
               <h3 className="text-xl font-serif text-lux-text font-bold">{subject}</h3>
               <p className="text-sm text-lux-text">{data.message}</p>
             </div>
           </div>
        </motion.div>
      );
  }

  if (data.daysRemaining === undefined) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="glass-panel p-6 shadow-lux-sm mb-8 relative overflow-hidden"
    >
      {onDismiss && (
        <button onClick={onDismiss} className="absolute top-4 right-4 text-lux-text hover:text-lux-green-900 transition-colors">
          ✕
        </button>
      )}
      
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 bg-lux-bg rounded-xl flex items-center justify-center text-lux-text border border-lux-border">
          <Calendar size={24} />
        </div>
        <div>
          <h3 className="text-xl font-serif text-lux-text font-bold">
            {data.daysRemaining} days until {subject} exam
          </h3>
          <p className="text-xs text-lux-text font-bold uppercase tracking-widest">
            NSC Grade 12 Countdown
          </p>
        </div>
      </div>

      {data.isProGate ? (
        <div className="mt-4 p-4 border border-[#CCA43B]/30 bg-[#CCA43B]/5 rounded-xl">
          <div className="flex items-start gap-3">
             <Crown className="text-lux-text shrink-0 mt-0.5" size={18} />
             <div>
                <h4 className="text-sm font-bold text-lux-text mb-1">Unlock Personalized Study Plan</h4>
                <p className="text-xs text-lux-text mb-3">Upgrade to Pro to get a daily AI-generated study plan based on your weak topics leading up to your exam.</p>
                <Button onClick={() => navigate('/pricing')} className="h-8 text-[10px] bg-lux-surface text-lux-text hover:bg-lux-bg rounded-lg px-4">
                  View Plans
                </Button>
             </div>
          </div>
        </div>
      ) : data.planMarkdown ? (
        <div className="mt-6 border-t border-lux-border pt-6">
           <div className="flex items-center gap-2 mb-3 text-[var(--color-lux-green-500)]">
             <Sparkles size={16} />
             <span className="text-[10px] font-bold uppercase tracking-widest text-lux-text">AI Study Plan</span>
           </div>
           
           <div className="prose prose-sm prose-p:leading-relaxed prose-a:text-blue-600 max-w-none text-lux-text markdown-body">
             <Markdown>{data.planMarkdown}</Markdown>
           </div>
           
           <div className="mt-6">
             <Button 
               onClick={handleMarkDone}
               disabled={markedDone}
               className={markedDone ? "bg-lux-border text-lux-text h-10 rounded-xl px-6 w-full sm:w-auto" : "bg-[var(--color-lux-green-500)] hover:bg-[var(--color-lux-green-800)] h-10 rounded-xl px-6 text-lux-text font-bold text-xs w-full sm:w-auto shadow-lux-sm transition-transform active:scale-95"}
             >
               {markedDone ? (
                 <><CheckCircle2 className="mr-2" size={16}/> Marked as Done</>
               ) : (
                 "Mark today's focus as done"
               )}
             </Button>
           </div>
        </div>
      ) : null}
    </motion.div>
  );
}
