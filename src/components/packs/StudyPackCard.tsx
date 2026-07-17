import React from 'react';
import { motion } from 'motion/react';
import { Users, Video, FileText, ArrowRight } from 'lucide-react';
import { StudyPack } from '../../types';
import { SubjectBadge } from '../ui/SubjectBadge';
import { GradeBadge } from '../ui/GradeBadge';
import { CurriculumTag } from '../ui/CurriculumTag';
import { cn } from '../../lib/utils';

interface StudyPackCardProps {
  pack: StudyPack;
  onClick: (pack: StudyPack) => void;
}

const GRADIENT_MAPPING: Record<string, string> = {
  'MATHEMATICS': 'from-blue-600 to-blue-800',
  'PHYSICAL SCIENCES': 'from-orange-500 to-red-700',
  'LIFE SCIENCES': 'from-green-500 to-emerald-700',
  'HISTORY': 'from-amber-600 to-yellow-800',
  'GEOGRAPHY': 'from-teal-500 to-cyan-700',
  'ACCOUNTING': 'from-indigo-600 to-violet-800',
  'DEFAULT': 'from-gray-600 to-gray-800'
};

export function StudyPackCard({ pack, onClick }: StudyPackCardProps) {
  const videoCount = pack.items.filter(item => item.type === 'video').length;
  const docCount = pack.items.filter(item => item.type !== 'video').length;
  const gradient = GRADIENT_MAPPING[pack.subject.toUpperCase()] || GRADIENT_MAPPING['DEFAULT'];

  return (
    <motion.div
      whileHover={{ y: -6 }}
      onClick={() => onClick(pack)}
      className="bg-white border border-border-subtle rounded-[32px] overflow-hidden shadow-sm hover:shadow-2xl hover:border-primary/20 transition-all duration-300 group cursor-pointer flex flex-col h-full"
    >
      {/* Thumbnail */}
      <div className={cn("relative aspect-[16/10] bg-gradient-to-br flex items-end p-6 overflow-hidden", gradient)}>
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-lux-surface00 blur-3xl rounded-full translate-x-16 -translate-y-16" />
        
        <div className="relative z-10">
          <h3 className="text-xl font-serif text-lux-text mb-1 leading-tight">{pack.title}</h3>
          <p className="text-[10px] font-black uppercase tracking-widest text-lux-text">{pack.subject}</p>
        </div>

        {/* Floating Badges */}
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          <div className="px-2 py-1 bg-white/90 backdrop-blur-md rounded-lg flex items-center gap-1.5 shadow-lg">
            <Video size={10} className="text-text-primary" />
            <span className="text-[10px] font-bold text-text-primary uppercase tracking-tight">{videoCount} Videos</span>
          </div>
          <div className="px-2 py-1 bg-white/90 backdrop-blur-md rounded-lg flex items-center gap-1.5 shadow-lg">
            <FileText size={10} className="text-text-primary" />
            <span className="text-[10px] font-bold text-text-primary uppercase tracking-tight">{docCount} Docs</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-6 flex-1 flex flex-col">
        <div className="flex flex-wrap gap-2 mb-4">
          <SubjectBadge subject={pack.subject} />
          <GradeBadge grade={pack.grade} />
          <CurriculumTag type={pack.curriculum} />
        </div>

        <p className="text-lux-text text-sm mb-6 line-clamp-2 leading-relaxed">
          {pack.description}
        </p>

        <div className="mt-auto pt-6 border-t border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-surface border border-border-subtle flex items-center justify-center font-bold text-primary text-xs">
              {pack.creatorName.charAt(0)}
            </div>
            <div className="min-w-0">
               <p className="text-[10px] font-black uppercase tracking-widest text-lux-text mb-0.5">Created by</p>
               <p className="text-xs font-bold text-text-primary truncate">{pack.creatorName}</p>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-lux-text">
              <Users size={10} />
              <span>{pack.enrollCount} Enrolled</span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center py-3 bg-surface group-hover:bg-primary/5 rounded-2xl sm:rounded-3xl border border-transparent group-hover:border-primary/20 transition-all">
          <span className="text-xs font-bold text-text-primary group-hover:text-primary transition-colors flex items-center gap-2">
            View Pack <ArrowRight size={14} />
          </span>
        </div>
      </div>
    </motion.div>
  );
}
