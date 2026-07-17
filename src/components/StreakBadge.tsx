import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Flame, Calendar, Award, Zap, ChevronDown, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { Button } from './ui/Button';

interface StreakBadgeProps {
  expanded?: boolean;
}

export function StreakBadge({ expanded = false }: StreakBadgeProps) {
  const { userProfile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  if (!userProfile) return null;

  const currentStreak = userProfile.currentStreak || 0;
  const longestStreak = userProfile.longestStreak || 0;
  const totalActiveDays = userProfile.totalActiveDays || 0;
  const freezes = userProfile.streakFreezesAvailable || 0;

  if (!expanded) {
    return (
      <div className="relative">
        <button 
           onClick={() => setIsOpen(!isOpen)}
           className={cn(
             "flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all shadow-sm group",
             currentStreak > 0 
                ? "bg-orange-50 border-orange-200 hover:bg-orange-100" 
                : "bg-lux-surface border-lux-border hover:bg-lux-bg"
           )}
        >
           <Flame size={16} className={cn("transition-transform group-hover:scale-110", currentStreak > 0 ? "text-orange-500 fill-orange-500" : "text-lux-text")} />
           <span className={cn("font-bold text-sm", currentStreak > 0 ? "text-orange-700" : "text-lux-text")}>
             {currentStreak}
           </span>
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute top-full right-0 mt-2 w-72 bg-white rounded-2xl sm:rounded-3xl shadow-lux-xl border border-lux-border z-50 overflow-hidden"
            >
               <div className="p-4 bg-gradient-to-br from-orange-50 to-amber-50/50 border-b border-orange-100/50">
                  <div className="flex items-center gap-3 mb-2">
                     <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center border border-orange-200">
                        <Flame size={24} className="text-orange-500 fill-orange-500" />
                     </div>
                     <div>
                        <h4 className="text-xl font-black text-orange-900">{currentStreak} Day Streak</h4>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-orange-600/70">Keep it going</p>
                     </div>
                  </div>
                  {currentStreak === 0 && (
                     <p className="text-xs text-orange-800/80 mt-3 font-medium">
                       Start your streak today — answer one quiz question or ask the AI Tutor something!
                     </p>
                  )}
               </div>
               <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2">
                       <Award size={16} className="text-lux-green-500" />
                       <span className="text-xs font-bold text-lux-text">Longest Streak</span>
                     </div>
                     <span className="text-sm font-black text-lux-green-900">{longestStreak} days</span>
                  </div>
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2">
                       <Zap size={16} className="text-blue-500" />
                       <span className="text-xs font-bold text-lux-text">Freezes Available</span>
                     </div>
                     <span className="text-sm font-black text-blue-600">{freezes}</span>
                  </div>
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2">
                       <CheckCircle2 size={16} className="text-[var(--color-lux-green-500)]" />
                       <span className="text-xs font-bold text-lux-text">Total Active Days</span>
                     </div>
                     <span className="text-sm font-black text-[var(--color-lux-green-500)]">{totalActiveDays}</span>
                  </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Expanded Profile Version
  return (
    <div className="glass-panel p-8 shadow-lux-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-orange-400/5 blur-[80px] rounded-full pointer-events-none" />
      
      <div className="flex items-start justify-between mb-8 relative z-10">
         <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl sm:rounded-3xl bg-orange-50 border border-orange-100 flex items-center justify-center shadow-inner">
               <Flame size={32} className={cn(currentStreak > 0 ? "text-orange-500 fill-orange-500" : "text-lux-text")} />
            </div>
            <div>
               <h3 className="text-lg font-serif text-lux-text mb-1">Study Streak</h3>
               <p className="text-xs text-lux-text">Consistent learning builds mastery</p>
            </div>
         </div>
         <div className="text-right">
            <div className="text-4xl font-black text-lux-text mr-2 inline-block">
               {currentStreak}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-lux-text">Days</span>
         </div>
      </div>

      {currentStreak === 0 && (
         <div className="mb-8 p-4 bg-lux-bg border border-lux-border rounded-xl">
           <p className="text-sm font-medium text-lux-text">
             🌟 Start your streak today — answer one quiz question or ask the AI Tutor something.
           </p>
         </div>
      )}

      <div className="grid grid-cols-3 gap-4 relative z-10">
         <div className="p-4 bg-lux-bg border border-lux-border rounded-2xl sm:rounded-3xl text-center flex flex-col items-center justify-center">
            <Award size={20} className="text-lux-green-500 mb-2" />
            <div className="text-2xl font-black text-lux-text">{longestStreak}</div>
            <div className="text-[9px] font-bold uppercase tracking-widest text-lux-text mt-1">Your best ever</div>
         </div>
         <div className="p-4 bg-lux-bg border border-lux-border rounded-2xl sm:rounded-3xl text-center flex flex-col items-center justify-center">
            <CheckCircle2 size={20} className="text-[var(--color-lux-green-500)] mb-2" />
            <div className="text-2xl font-black text-lux-text">{totalActiveDays}</div>
            <div className="text-[9px] font-bold uppercase tracking-widest text-lux-text mt-1">Total active days</div>
         </div>
         <div className="p-4 bg-lux-bg border border-lux-border rounded-2xl sm:rounded-3xl text-center flex flex-col items-center justify-center relative overflow-hidden group">
            <Zap size={20} className="text-blue-500 mb-2 transition-transform group-hover:scale-110" />
            <div className="text-2xl font-black text-blue-600">{freezes}</div>
            <div className="text-[9px] font-bold uppercase tracking-widest text-lux-text mt-1">Freezes <span className="hidden sm:inline">available</span></div>
         </div>
      </div>
    </div>
  );
}
