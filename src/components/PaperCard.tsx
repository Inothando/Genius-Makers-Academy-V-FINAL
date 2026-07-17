import { useState, useEffect } from 'react';
import { Calendar, MapPin, ClipboardList, Languages, Eye, Download, FileText, Check } from 'lucide-react';
import { Button } from './ui/Button';
import { PastPaper } from '../types';

interface PaperCardProps {
  paper: PastPaper;
  allPapers?: PastPaper[];
  onView: (paper: PastPaper) => void;
  onDownload: (paper: PastPaper) => void;
  downloadingId?: string | null;
}

export function PaperCard({ paper, allPapers = [], onView, onDownload, downloadingId }: PaperCardProps) {
  // Local state for the currently active selected document on this card
  const [currentPaper, setCurrentPaper] = useState<PastPaper>(paper);

  // Sync state if parent prop changes
  useEffect(() => {
    setCurrentPaper(paper);
  }, [paper]);

  // Find companion paper (the memo if current is question, or question if current is memo)
  const findCompanion = (): PastPaper | null => {
    if (!allPapers || allPapers.length === 0) return null;
    
    const cleanProvince = (prov?: string) => (prov || 'National').trim().toLowerCase();
    
    // Exact match search
    let comp = allPapers.find(p => 
      p.id !== paper.id &&
      p.type !== paper.type &&
      p.grade === paper.grade &&
      p.year === paper.year &&
      p.subject?.toLowerCase() === paper.subject?.toLowerCase() &&
      p.paperNumber?.toLowerCase() === paper.paperNumber?.toLowerCase() &&
      p.language === paper.language &&
      p.session === paper.session &&
      cleanProvince(p.province) === cleanProvince(paper.province)
    );

    if (!comp) {
      // Relaxed match search (excluding session check, but strictly retaining province to avoid cross-region mismatches)
      comp = allPapers.find(p => 
        p.id !== paper.id &&
        p.type !== paper.type &&
        p.grade === paper.grade &&
        p.year === paper.year &&
        p.subject?.toLowerCase() === paper.subject?.toLowerCase() &&
        p.paperNumber?.toLowerCase() === paper.paperNumber?.toLowerCase() &&
        p.language === paper.language &&
        cleanProvince(p.province) === cleanProvince(paper.province)
      );
    }

    return comp || null;
  };

  const companion = findCompanion();
  const isDownloading = downloadingId === currentPaper.id;

  const getSessionLabel = (session: string) => {
    switch (session) {
      case 'Term2_MayJune': return 'Term 2 (May/Jun)';
      case 'Term3_Trial': return 'Term 3 (Prep/Trial)';
      case 'Term4_November': return 'Term 4 (Nov)';
      case 'Various': return 'Various';
      default: return session;
    }
  };

  // Determine current selected view type
  const activeType = currentPaper.type === 'memo' ? 'memo' : 'question';

  const handleToggle = (type: 'question' | 'memo') => {
    if (type === paper.type) {
      setCurrentPaper(paper);
    } else if (companion && type === companion.type) {
      setCurrentPaper(companion);
    }
  };

  return (
    <div className="bg-lux-surface/60 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-[2rem] sm:rounded-[2.5rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300 flex flex-col justify-between h-full relative group hover:border-lux-green-500/30 ring-1 ring-black/5 dark:ring-white/5">
      {/* Subtle hover background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-lux-green-500)]/5 rounded-full blur-[40px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Top Section */}
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-black uppercase tracking-widest px-3 py-1 bg-lux-surface/40 backdrop-blur-md border border-white/10 dark:border-white/5 rounded-full text-lux-text font-sans shadow-sm">
            Grade {currentPaper.grade}
          </span>
          <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full transition-colors duration-200 shadow-sm ${
            currentPaper.type === 'memo' 
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/20' 
              : 'bg-[var(--color-lux-green-500)]/10 text-[var(--color-lux-green-500)] border border-[var(--color-lux-green-500)]/20'
          }`}>
            {currentPaper.type === 'memo' ? 'Memorandum' : 'Question Paper'}
          </span>
        </div>

        <div className="flex gap-2 items-center text-xs font-semibold text-[var(--color-lux-green-500)] mb-2 font-sans">
          <span className="bg-[var(--color-lux-green-500)]/10 px-2 py-0.5 rounded text-[11px] font-extrabold uppercase tracking-widest">
            {currentPaper.curriculum}
          </span>
          <span className="text-lux-text">•</span>
          <span className="font-bold tracking-tight uppercase text-[11px] text-lux-text">{currentPaper.subject}</span>
        </div>

        <h3 className="text-xl font-serif font-bold text-lux-text leading-snug mb-4 group-hover:text-[var(--color-lux-green-500)] transition-colors line-clamp-2">
          {currentPaper.title || `${currentPaper.subject} ${currentPaper.year} (${currentPaper.paperNumber})`}
        </h3>

        {/* Dynamic Dual-Toggle segments (Learners need paper + memo easily) */}
        {companion ? (
          <div className="w-full bg-lux-surface00 p-1 rounded-xl flex items-center mb-5 border border-lux-border shadow-inner">
            <button
              onClick={() => handleToggle('question')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold font-sans rounded-lg transition-all cursor-pointer ${
                activeType === 'question'
                  ? 'bg-white text-lux-text shadow-sm font-black'
                  : 'text-lux-text hover:text-lux-text'
              }`}
            >
              <FileText size={13} className={activeType === 'question' ? 'text-[var(--color-lux-green-500)]' : 'opacity-60'} />
              Paper
            </button>
            <button
              onClick={() => handleToggle('memo')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold font-sans rounded-lg transition-all cursor-pointer ${
                activeType === 'memo'
                  ? 'bg-[var(--color-lux-green-500)] text-lux-text shadow-sm font-black'
                  : 'text-lux-text hover:text-lux-text'
              }`}
            >
              <Check size={13} className={activeType === 'memo' ? 'text-lux-text' : 'opacity-60'} />
              Memo
            </button>
          </div>
        ) : (
          <div className="w-full py-1 text-center text-[11px] text-lux-text italic mb-5 border border-dashed border-gray-150 rounded-xl">
            Sister Memo not indexed in offline workspace
          </div>
        )}

        <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs font-medium text-lux-text mb-6 border-t border-b border-lux-border py-3.5">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-lux-text shrink-0" />
            <span className="font-sans font-bold text-lux-text">{currentPaper.year}</span>
          </div>
          <div className="flex items-center gap-2">
            <ClipboardList size={14} className="text-lux-text shrink-0" />
            <span className="font-sans font-bold text-lux-text">{currentPaper.paperNumber}</span>
          </div>
          <div className="flex items-center gap-2 col-span-2">
            <span className="text-[10px] uppercase font-bold text-lux-text">Session:</span>
            <span className="text-[11px] bg-lux-surface0 px-2 py-0.5 rounded text-lux-text border border-gray-150 font-semibold">
              {getSessionLabel(currentPaper.session || 'Various')}
            </span>
          </div>
          <div className="flex items-center gap-2 col-span-2">
            <MapPin size={14} className="text-lux-text shrink-0" />
            <span className="text-[11px] font-semibold text-lux-text truncate">{currentPaper.province || 'National'}</span>
          </div>
          <div className="flex items-center gap-2 col-span-2">
            <Languages size={14} className="text-lux-text shrink-0" />
            <span className="text-[11px] text-lux-text">{currentPaper.language} Medium</span>
          </div>
        </div>
      </div>

      {/* Actions and Stats Footer */}
      <div className="mt-auto space-y-4 relative z-10">
        <div className="flex gap-3">
          <Button 
             className="flex-1 font-sans font-bold text-[11px] uppercase tracking-wider py-2 h-10 bg-lux-surface/40 backdrop-blur-md border border-white/20 dark:border-white/10 hover:border-[var(--color-lux-green-500)]/50 hover:bg-lux-surface/60 text-lux-text hover:text-[var(--color-lux-green-500)] rounded-xl transition-all shadow-sm flex items-center justify-center cursor-pointer"
             variant="outline" 
             onClick={() => onView(currentPaper)}
          >
            <Eye size={14} className="mr-1.5" />
            View
          </Button>
          <Button 
             className="flex-1 font-sans font-bold text-[11px] uppercase tracking-wider py-2 h-10 bg-[var(--color-lux-green-500)] hover:bg-[var(--color-lux-green-800)] text-white rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed border-none"
             onClick={() => onDownload(currentPaper)}
            disabled={isDownloading}
          >
            <Download size={14} className="mr-1.5" />
            {isDownloading ? "..." : "Save"}
          </Button>
        </div>
        
        <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider text-lux-text/60 font-sans">
          <span>PDF Format</span>
          <span className="bg-lux-surface/40 backdrop-blur-md px-2 py-1 border border-white/10 dark:border-white/5 rounded-lg text-lux-text shadow-sm">
            {currentPaper.downloadCount || 0} reads
          </span>
        </div>
      </div>
    </div>
  );
}
