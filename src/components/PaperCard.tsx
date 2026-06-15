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
    <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between h-full relative group hover:border-[#1D9E75]/30">
      {/* Top Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-black uppercase tracking-widest px-3 py-1 bg-gray-50 border border-gray-150 rounded-full text-gray-500 font-sans">
            Grade {currentPaper.grade}
          </span>
          <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full transition-colors duration-200 ${
            currentPaper.type === 'memo' 
              ? 'bg-amber-50 text-amber-700 border border-amber-200' 
              : 'bg-[#1D9E75]/10 text-[#1D9E75] border border-[#1D9E75]/20'
          }`}>
            {currentPaper.type === 'memo' ? 'Memorandum' : 'Question Paper'}
          </span>
        </div>

        <div className="flex gap-2 items-center text-xs font-semibold text-[#1D9E75] mb-2 font-sans">
          <span className="bg-[#1D9E75]/10 px-2 py-0.5 rounded text-[11px] font-extrabold uppercase tracking-widest">
            {currentPaper.curriculum}
          </span>
          <span className="text-gray-300">•</span>
          <span className="font-bold tracking-tight uppercase text-[11px] text-gray-500">{currentPaper.subject}</span>
        </div>

        <h3 className="text-xl font-serif font-bold text-gray-900 leading-snug mb-4 group-hover:text-[#1D9E75] transition-colors line-clamp-2">
          {currentPaper.title || `${currentPaper.subject} ${currentPaper.year} (${currentPaper.paperNumber})`}
        </h3>

        {/* Dynamic Dual-Toggle segments (Learners need paper + memo easily) */}
        {companion ? (
          <div className="w-full bg-gray-100 p-1 rounded-xl flex items-center mb-5 border border-gray-200 shadow-inner">
            <button
              onClick={() => handleToggle('question')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold font-sans rounded-lg transition-all cursor-pointer ${
                activeType === 'question'
                  ? 'bg-white text-gray-950 shadow-sm font-black'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <FileText size={13} className={activeType === 'question' ? 'text-[#1D9E75]' : 'opacity-60'} />
              Paper
            </button>
            <button
              onClick={() => handleToggle('memo')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold font-sans rounded-lg transition-all cursor-pointer ${
                activeType === 'memo'
                  ? 'bg-[#1D9E75] text-white shadow-sm font-black'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Check size={13} className={activeType === 'memo' ? 'text-white' : 'opacity-60'} />
              Memo
            </button>
          </div>
        ) : (
          <div className="w-full py-1 text-center text-[11px] text-gray-400 italic mb-5 border border-dashed border-gray-150 rounded-xl">
            Sister Memo not indexed in offline workspace
          </div>
        )}

        <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs font-medium text-gray-500 mb-6 border-t border-b border-gray-100 py-3.5">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-gray-400 shrink-0" />
            <span className="font-sans font-bold text-gray-700">{currentPaper.year}</span>
          </div>
          <div className="flex items-center gap-2">
            <ClipboardList size={14} className="text-gray-400 shrink-0" />
            <span className="font-sans font-bold text-gray-700">{currentPaper.paperNumber}</span>
          </div>
          <div className="flex items-center gap-2 col-span-2">
            <span className="text-[10px] uppercase font-bold text-gray-400">Session:</span>
            <span className="text-[11px] bg-gray-50 px-2 py-0.5 rounded text-gray-600 border border-gray-150 font-semibold">
              {getSessionLabel(currentPaper.session || 'Various')}
            </span>
          </div>
          <div className="flex items-center gap-2 col-span-2">
            <MapPin size={14} className="text-gray-400 shrink-0" />
            <span className="text-[11px] font-semibold text-gray-700 truncate">{currentPaper.province || 'National'}</span>
          </div>
          <div className="flex items-center gap-2 col-span-2">
            <Languages size={14} className="text-gray-400 shrink-0" />
            <span className="text-[11px] text-gray-650">{currentPaper.language} Medium</span>
          </div>
        </div>
      </div>

      {/* Actions and Stats Footer */}
      <div className="mt-auto space-y-3.5">
        <div className="flex gap-3">
          <Button 
            className="flex-1 font-sans font-semibold text-xs py-2 h-10 border-gray-250 hover:border-[#1D9E75] hover:text-[#1D9E75]" 
            variant="outline" 
            onClick={() => onView(currentPaper)}
          >
            <Eye size={15} className="mr-1.5" />
            View Premium
          </Button>
          <Button 
            className="flex-1 font-sans font-semibold text-xs py-2 h-10 bg-[#1D9E75] hover:bg-[#157c5b]" 
            onClick={() => onDownload(currentPaper)}
            disabled={isDownloading}
          >
            <Download size={15} className="mr-1.5" />
            {isDownloading ? 'Downloading...' : 'Download'}
          </Button>
        </div>
        <div className="flex items-center justify-between text-[11px] text-gray-400 font-sans font-semibold">
          <span>Format: Document (PDF)</span>
          <span className="bg-gray-50 px-2 py-0.5 border border-gray-100 rounded text-gray-500">
            {currentPaper.downloadCount || 0} reads & downloads
          </span>
        </div>
      </div>
    </div>
  );
}
