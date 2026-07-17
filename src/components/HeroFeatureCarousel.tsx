import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BrainCircuit, Sparkles, Bot, FileText, MessageSquare, 
  Video, PlayCircle, Eye, CheckCircle2, Shield, Users
} from 'lucide-react';
import { Button } from './ui/Button';

export function HeroFeatureCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);

  const features = [
    {
      id: 'planner',
      title: 'AI Smart Planner',
      subtitle: 'Generating Weekly Pack',
      icon: <BrainCircuit size={28} strokeWidth={1.5} />,
      content: (
        <>
          <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
            {[
              { day: 'Mon', desc: 'Math P1 Remediation', icon: <Bot size={14}/> },
              { day: 'Wed', desc: 'Physics Mock Paper', icon: <FileText size={14}/> },
              { day: 'Fri', desc: 'Live Co-Study Room', icon: <MessageSquare size={14}/> }
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-lux-bg/60 border border-lux-green-500/15 rounded-xl sm:rounded-2xl sm:rounded-3xl shadow-sm">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-lux-bg flex items-center justify-center text-lux-text text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                   {item.day}
                 </div>
                 <div className="flex-1">
                   <div className="text-xs sm:text-sm font-serif text-lux-text">{item.desc}</div>
                   <div className="text-[9px] sm:text-[10px] text-lux-green-500 uppercase tracking-widest mt-1">Recommended by AI</div>
                </div>
                <div className="text-lux-green-500/80">
                  {item.icon}
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 sm:p-6 bg-gradient-to-br from-lux-green-800/90 to-lux-green-900/80 border border-lux-border rounded-xl sm:rounded-2xl sm:rounded-3xl relative overflow-hidden shadow-inner">
            <div className="absolute top-0 left-0 w-1 h-full bg-lux-green-500" />
            <div className="flex items-center space-x-2 sm:space-x-3 mb-2 sm:mb-3 text-lux-green-500">
              <Sparkles size={16} className="sm:w-[18px] sm:h-[18px]" />
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest">AI Insight</span>
            </div>
            <p className="text-xs sm:text-sm text-lux-text font-serif italic leading-relaxed">"Based on your recent quiz, I've scheduled a 30-min deep dive on Algebra structures. You'll master this."</p>
          </div>
        </>
      )
    },
    {
      id: 'grading',
      title: 'Visual Marking',
      subtitle: 'Analyzing handwritten answers',
      icon: <Eye size={28} strokeWidth={1.5} />,
      content: (
        <>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 sm:mb-8 sm:h-[240px]">
            <div className="flex-1 bg-lux-surface00 border border-lux-border rounded-xl sm:rounded-2xl sm:rounded-3xl p-3 sm:p-4 overflow-hidden relative shadow-sm">
              <div className="absolute top-2 right-2 px-2 py-1 bg-black/30 backdrop-blur-md rounded-md text-[8px] sm:text-[9px] text-lux-text uppercase tracking-wider">Upload</div>
              <div className="text-[10px] sm:text-xs text-lux-text mb-2 sm:mb-3 font-mono">Q3.1 Solve for x:</div>
              <div className="space-y-2 sm:space-y-3 opacity-90 pl-1 sm:pl-2">
                <div className="h-3 sm:h-4 w-3/4 bg-lux-surface00 rounded-full"></div>
                <div className="h-3 sm:h-4 w-1/2 bg-lux-surface00 rounded-full"></div>
                <div className="h-3 sm:h-4 w-5/6 bg-lux-surface00 rounded-full"></div>
              </div>
              <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-lux-green-500/70 flex items-center justify-center text-lux-green-500 bg-lux-surface/50 backdrop-blur-sm">
                <CheckCircle2 size={14} className="sm:w-[16px] sm:h-[16px]" />
              </div>
            </div>
            <div className="flex-1 bg-lux-bg/90 border border-lux-green-500/40 rounded-xl sm:rounded-2xl sm:rounded-3xl p-3 sm:p-4 relative flex flex-col shadow-inner">
              <div className="absolute top-2 right-2 px-2 py-1 bg-lux-green-500/20 rounded-md text-[8px] sm:text-[9px] text-lux-green-500 uppercase tracking-wider flex items-center gap-1 font-bold">
                <Sparkles size={10} /> AI Memo
              </div>
              <div className="text-xs sm:text-sm font-serif text-lux-text mb-2 sm:mb-3 mt-3 sm:mt-4">Marking Guideline</div>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-start gap-2">
                   <CheckCircle2 size={14} className="text-lux-green-500 mt-0.5 shrink-0" />
                   <div className="text-[10px] sm:text-xs text-lux-text leading-relaxed">Correct application of quadratic formula <span className="text-lux-green-500 ml-1 font-medium">[+1 mark]</span></div>
                </div>
                <div className="flex items-start gap-2">
                   <div className="w-3 h-3 rounded-full border border-red-400/70 flex items-center justify-center mt-0.5 shrink-0 text-[8px] text-red-400 font-bold bg-red-400/10">!</div>
                   <div className="text-[10px] sm:text-xs text-lux-text leading-relaxed">Sign error in step 2. Should be +4ac. <span className="text-red-300 ml-1 font-medium">[-1 mark]</span></div>
                </div>
              </div>
            </div>
          </div>
          <div className="p-3 sm:p-4 bg-lux-bg/70 border border-lux-border rounded-xl sm:rounded-2xl sm:rounded-3xl flex items-center justify-between shadow-sm">
            <span className="text-xs sm:text-sm font-serif text-lux-text">Total Awarded</span>
            <span className="text-base sm:text-lg font-mono text-lux-green-500 font-bold">4/5</span>
          </div>
        </>
      )
    },
    {
      id: 'costudy',
      title: 'Live Co-Study',
      subtitle: 'National Study Room 12',
      icon: <Users size={28} strokeWidth={1.5} />,
      content: (
        <>
          <div className="flex items-center justify-center mb-6 sm:mb-8 mt-2 sm:mt-0">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-lux-green-800 shadow-[0_0_30px_rgba(29,138,72,0.15)] flex flex-col items-center justify-center bg-lux-bg/60 relative">
               <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(194,157,89,0.2)" strokeWidth="4" />
                  <circle cx="50" cy="50" r="46" fill="none" stroke="#C29D59" strokeWidth="4" strokeDasharray="289" strokeDashoffset="60" className="transition-all duration-1000 drop-shadow-[0_0_5px_rgba(194,157,89,0.8)]" />
               </svg>
               <span className="text-2xl sm:text-3xl font-mono font-light text-lux-text tracking-tighter drop-shadow-sm">45:00</span>
               <span className="text-[8px] sm:text-[9px] uppercase tracking-widest text-lux-green-500 mt-1 font-bold">Focus Time</span>
            </div>
          </div>
          
          <div className="space-y-2 sm:space-y-3 mb-6 sm:mb-8">
            <div className="text-[9px] sm:text-[10px] uppercase tracking-widest text-lux-text text-center mb-2 font-medium">Active Participants</div>
            <div className="flex justify-center -space-x-2 sm:-space-x-3">
               {[1,2,3,4,5].map((i) => (
                 <div key={i} className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-lux-green-800 bg-lux-green-${900 - i*100} flex items-center justify-center text-[9px] sm:text-[10px] font-bold text-lux-text shadow-md z-${10-i}`}>
                   {String.fromCharCode(64+i)}
                 </div>
               ))}
               <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-lux-green-800 bg-lux-bg flex items-center justify-center text-[9px] sm:text-[10px] font-bold text-lux-green-500 shadow-md z-0">
                 +12
               </div>
            </div>
          </div>

          <div className="p-3 sm:p-4 bg-lux-bg/60 border border-lux-border rounded-xl sm:rounded-2xl sm:rounded-3xl flex items-center gap-2 sm:gap-3 shadow-inner mt-auto">
            <Shield size={16} className="text-lux-green-500 sm:w-[18px] sm:h-[18px]" />
            <span className="text-[10px] sm:text-xs text-lux-text font-medium">Room is strictly moderated by AI. Focus only.</span>
          </div>
        </>
      )
    },
    {
      id: 'video',
      title: 'Interactive Video',
      subtitle: 'Live Q&A Transcript Sync',
      icon: <Video size={28} strokeWidth={1.5} />,
      content: (
        <>
          <div className="w-full aspect-video bg-lux-bg/80 rounded-xl sm:rounded-2xl sm:rounded-3xl border border-lux-border relative overflow-hidden mb-4 sm:mb-6 flex items-center justify-center group shadow-md">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1632516643720-e7f5d7d6eca9?q=80&w=600&auto=format&fit=crop')] bg-cover bg-center opacity-40 mix-blend-luminosity"></div>
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-lux-green-500/90 text-lux-text flex items-center justify-center shadow-[0_0_20px_rgba(29,138,72,0.3)] relative z-10 transition-transform group-hover:scale-110">
              <PlayCircle size={28} className="sm:w-[32px] sm:h-[32px] ml-1" />
            </div>
            <div className="absolute bottom-0 inset-x-0 h-1 sm:h-1.5 bg-lux-surface00">
               <div className="h-full bg-lux-green-500 w-1/3 relative shadow-[0_0_10px_rgba(29,138,72,0.5)]">
                 <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 bg-white rounded-full shadow-md"></div>
               </div>
            </div>
            
            {/* Pop-up quiz checkpoint */}
            <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 px-2 py-1.5 sm:px-3 sm:py-2 bg-lux-bg/95 backdrop-blur-md border border-lux-border rounded-lg sm:rounded-xl shadow-lg flex items-center gap-2 sm:gap-3">
               <Bot size={14} className="text-lux-green-500 sm:w-[16px] sm:h-[16px]" />
               <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-lux-text">Checkpoint Question</span>
            </div>
          </div>
          
          <div className="space-y-2 sm:space-y-3 flex-1 flex flex-col justify-end">
            <div className="flex gap-2 sm:gap-3">
               <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-lux-green-700 flex items-center justify-center text-lux-text text-[10px] sm:text-xs shrink-0 mt-0.5 sm:mt-1 shadow-sm font-bold">U</div>
               <div className="p-2 sm:p-3 bg-lux-surface00 border border-lux-border rounded-xl sm:rounded-2xl sm:rounded-3xl rounded-tl-sm text-[10px] sm:text-xs text-lux-text shadow-sm">
                 Could you explain how they got the 2x here?
               </div>
            </div>
            <div className="flex gap-2 sm:gap-3">
               <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-lux-green-500/20 border border-lux-green-500/40 flex items-center justify-center text-lux-green-500 shrink-0 mt-0.5 sm:mt-1 shadow-sm">
                 <Sparkles size={12} className="sm:w-[14px] sm:h-[14px]" />
               </div>
               <div className="p-2 sm:p-3 bg-lux-bg/90 border border-lux-border rounded-xl sm:rounded-2xl sm:rounded-3xl rounded-tl-sm text-[10px] sm:text-xs text-lux-text shadow-sm leading-relaxed">
                 At [02:15], the instructor applies the derivative power rule. By bringing down the exponent 2 from x², you get 2x.
               </div>
            </div>
          </div>
        </>
      )
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % features.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [features.length]);

  return (
    <div className="relative w-full aspect-[4/5] sm:aspect-square max-w-lg mx-auto h-auto min-h-[500px] sm:min-h-0 sm:h-[600px]">
      <div className="absolute inset-x-0 bottom-0 bg-lux-green-500/20 rounded-[40px] blur-[80px] opacity-60 h-full animate-pulse" />
      
      <AnimatePresence mode="wait">
        <motion.div 
          key={activeIndex}
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.98 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative bg-lux-bg border border-lux-border rounded-[2rem] sm:rounded-[3rem] sm:rounded-[32px] p-6 sm:p-8 md:p-10 shadow-2xl h-full flex flex-col"
        >
          <div className="flex items-center justify-between mb-8 sm:mb-10 shrink-0">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-xl sm:rounded-2xl sm:rounded-3xl flex items-center justify-center text-lux-green-500 border border-lux-border shadow-sm shrink-0">
                {features[activeIndex].icon}
              </div>
              <div>
                <div className="text-base sm:text-lg font-serif font-medium text-lux-text mb-0.5">{features[activeIndex].title}</div>
                <div className="text-[10px] sm:text-xs text-lux-green-500 uppercase tracking-widest font-semibold">{features[activeIndex].subtitle}</div>
              </div>
            </div>
            <div className="px-2 py-1 sm:px-3 sm:py-1 bg-white border border-lux-border text-lux-green-500 rounded text-[8px] sm:text-[10px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1.5 sm:gap-2 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-lux-green-500 animate-pulse"></span>
              Active
            </div>
          </div>
          
          <div className="flex-1 flex flex-col justify-center">
             {features[activeIndex].content}
          </div>
          
          <div className="mt-6 sm:mt-8 shrink-0 flex justify-center gap-2">
            {features.map((_, idx) => (
              <button 
                key={idx}
                onClick={() => setActiveIndex(idx)}
                className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${idx === activeIndex ? 'w-6 sm:w-8 bg-lux-green-500 shadow-[0_0_8px_rgba(194,157,89,0.6)]' : 'w-1.5 sm:w-2 bg-lux-green-500/30 hover:bg-lux-green-500 hover:text-lux-text hover:border-lux-green-500/60'}`}
              />
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
