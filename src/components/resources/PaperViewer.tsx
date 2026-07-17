import React, { useEffect, useState, useRef } from 'react';
import { X, ExternalLink, Download, Sparkles, PanelRightClose, PanelRightOpen, PenTool } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../ui/Button';
import { AITutorPanel } from '../ai/AITutorPanel';
import { AnswerMarkingUpload } from '../ai/AnswerMarkingUpload';

interface PaperViewerProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  title: string;
  fileType: string;
  subject?: string;
  grade?: string;
  year?: string;
  paperNumber?: string;
}

let cachedAIPanelState = false;
let cachedAITabState: 'tutor' | 'mark' = 'tutor';

export function PaperViewer({ isOpen, onClose, fileUrl, title, fileType, subject, grade, year, paperNumber }: PaperViewerProps) {
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(cachedAIPanelState);
  const [activeAITab, setActiveAITab] = useState<'tutor' | 'mark'>(cachedAITabState);
  const [selectedText, setSelectedText] = useState("");
  const [tooltipPos, setTooltipPos] = useState<{ x: number, y: number } | null>(null);

  useEffect(() => {
    cachedAIPanelState = isAIPanelOpen;
  }, [isAIPanelOpen]);

  useEffect(() => {
    cachedAITabState = activeAITab;
  }, [activeAITab]);
  
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setTooltipPos(null);
      setSelectedText("");
    }
  }, [isOpen]);

  // Handle text selection on window (will not work for cross-origin iframe content, but added as requested)
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      if (selection && selection.toString().trim() !== "") {
        const text = selection.toString().trim();
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        setSelectedText(text);
        setTooltipPos({
          x: rect.left + rect.width / 2,
          y: rect.top - 10
        });
      } else {
        setTooltipPos(null);
        setSelectedText("");
      }
    };

    document.addEventListener('mouseup', handleSelection);
    return () => {
      document.removeEventListener('mouseup', handleSelection);
    };
  }, []);

  if (!isOpen) return null;

  const isImage = ['Image', 'jpg', 'jpeg', 'png', 'gif'].includes(fileType);
  const isPdf = ['PDF', 'pdf'].includes(fileType);
  const paperNameContext = [year, title, paperNumber].filter(Boolean).join(" - ");

  const handleTooltipClick = () => {
    setIsAIPanelOpen(true);
    setTooltipPos(null);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-7xl h-full max-h-[90vh] bg-white rounded-[32px] overflow-hidden flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="px-8 py-4 border-b border-border-subtle flex items-center justify-between bg-white z-10">
          <div className="flex flex-col">
            <h2 className="text-xl font-serif text-text-primary line-clamp-1">{title}</h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-lux-text">
              {fileType} Viewer {subject ? `· ${subject}` : ''} {grade ? `· ${grade}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
             <Button 
               variant="outline" 
               size="sm" 
               onClick={() => setIsAIPanelOpen(!isAIPanelOpen)}
               className="border-[var(--color-lux-green-500)]/30 text-[var(--color-lux-green-900)] hover:bg-[#E8F9F3]"
             >
               {isAIPanelOpen ? <PanelRightClose size={16} className="mr-2" /> : <PanelRightOpen size={16} className="mr-2" />}
               {isAIPanelOpen ? "Hide AI Tutor" : "Ask AI"}
             </Button>
             <Button variant="outline" size="sm" onClick={() => window.open(fileUrl, '_blank')}>
                <ExternalLink size={16} className="mr-2" />
                Pop-out
             </Button>
             <button onClick={onClose} className="p-2 hover:bg-surface rounded-full transition-colors">
                <X size={24} />
             </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex relative">
          
          {/* Main Viewer */}
          <div className="flex-1 bg-surface overflow-auto flex flex-col items-center justify-center p-4 relative">
            {isPdf ? (
              <iframe 
                src={`https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`} 
                className="w-full h-full rounded-xl border border-border-subtle shadow-inner bg-white"
                title={title}
                referrerPolicy="no-referrer"
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
              />
            ) : isImage ? (
              <img 
                src={fileUrl} 
                alt={title} 
                className="max-w-full max-h-full object-contain rounded-xl shadow-lg"
              />
            ) : (
              <div className="text-center p-12">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Download size={32} className="text-primary" />
                </div>
                <h3 className="text-2xl font-serif mb-4">View restricted</h3>
                <p className="text-lux-text max-w-sm mx-auto mb-8">
                  This file format ({fileType}) cannot be previewed directly in the browser. 
                  Please download it to view with your local tools.
                </p>
                <Button onClick={() => window.open(fileUrl, '_blank')}>
                  Download File
                </Button>
              </div>
            )}

            {/* Floating FAB to open AI Panel */}
            <AnimatePresence>
              {!isAIPanelOpen && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: 20 }}
                  onClick={() => setIsAIPanelOpen(true)}
                  className="absolute bottom-6 right-6 flex items-center gap-2 bg-[var(--color-lux-green-500)] text-lux-text px-4 py-3 rounded-full shadow-lg hover:bg-[var(--color-lux-green-900)] transition-colors z-20 group"
                >
                  <Sparkles size={18} className="animate-pulse" />
                  <span className="text-sm font-semibold whitespace-nowrap overflow-hidden max-w-0 group-hover:max-w-xs transition-all duration-300 ease-in-out">
                    Ask AI about this paper
                  </span>
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* AI Tutor Side Panel */}
          <AnimatePresence>
            {isAIPanelOpen && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 380, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="border-l border-[var(--color-lux-green-500)]/20 bg-[#0A0D14] text-lux-text h-full overflow-hidden shrink-0 shadow-[-10px_0_20px_-10px_rgba(0,0,0,0.5)] flex flex-col items-center"
              >
                <div className="w-[380px] h-full flex flex-col">
                  {/* AI Tabs */}
                  <div className="flex bg-lux-surface0 mx-4 mt-4 p-1 rounded-xl shrink-0">
                    <button
                      onClick={() => setActiveAITab('tutor')}
                      className={`flex-1 py-2 px-3 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2 ${
                        activeAITab === 'tutor' 
                          ? 'bg-[#CCA43B] text-lux-bg shadow-sm' 
                          : 'text-lux-text hover:text-lux-text hover:bg-lux-surface0'
                      }`}
                    >
                      <Sparkles size={14} />
                      Ask AI
                    </button>
                    <button
                      onClick={() => setActiveAITab('mark')}
                      className={`flex-1 py-2 px-3 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2 ${
                        activeAITab === 'mark' 
                          ? 'bg-[var(--color-lux-green-500)] text-lux-text shadow-sm' 
                          : 'text-lux-text hover:text-lux-text hover:bg-lux-surface0'
                      }`}
                    >
                      <PenTool size={14} />
                      Mark Answer
                    </button>
                  </div>

                  <div className="flex-1 overflow-hidden">
                    {activeAITab === 'tutor' ? (
                      <div className="h-full p-4 overflow-y-auto">
                        <AITutorPanel 
                          subject={subject} 
                          grade={grade?.toString()} 
                          paperName={paperNameContext} 
                          initialQuestion={selectedText}
                        />
                      </div>
                    ) : (
                      <div className="h-full p-0">
                        <AnswerMarkingUpload 
                          subject={subject}
                          grade={grade?.toString()}
                          paperContext={paperNameContext}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Tooltip for Selected Text */}
      <AnimatePresence>
        {tooltipPos && selectedText && !isAIPanelOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="fixed z-[60] -translate-x-1/2 -translate-y-full pb-2 pointer-events-auto"
            style={{ left: tooltipPos.x, top: tooltipPos.y }}
          >
            <button
              onClick={handleTooltipClick}
              className="flex items-center gap-2 bg-[var(--color-lux-green-500)] text-lux-text px-3 py-1.5 rounded-lg shadow-xl hover:bg-[var(--color-lux-green-900)] transition-colors text-xs font-semibold"
            >
              <Sparkles size={14} />
              Ask AI about this
            </button>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-[var(--color-lux-green-500)]"></div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
