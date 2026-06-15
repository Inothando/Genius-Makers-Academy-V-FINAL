import React from 'react';
import { Play, CheckCircle, Clock, Eye, User } from 'lucide-react';
import { motion } from 'motion/react';
import { VideoLesson } from '../../types';
import { SubjectBadge } from '../ui/SubjectBadge';
import { GradeBadge } from '../ui/GradeBadge';
import { CurriculumTag } from '../ui/CurriculumTag';

interface VideoCardProps {
  video: VideoLesson;
  onClick: (video: VideoLesson) => void;
  compact?: boolean;
}

export function VideoCard({ video, onClick, compact = false }: VideoCardProps) {
  const formatViewCount = (count: number) => {
    if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
    if (count >= 1000) return (count / 1000).toFixed(1) + 'k';
    return count.toString();
  };

  if (compact) {
    return (
      <button 
        onClick={() => onClick(video)}
        className="flex gap-4 p-2 rounded-2xl hover:bg-surface transition-colors text-left group"
      >
        <div className="relative aspect-video w-32 shrink-0 rounded-xl overflow-hidden shadow-sm">
          <img 
            src={video.thumbnailUrl} 
            alt={video.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Play size={20} className="text-white fill-current" />
          </div>
          <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/80 rounded text-[10px] text-white font-medium">
            {video.duration}
          </div>
        </div>
        <div className="flex flex-col justify-center min-w-0">
          <h4 className="text-xs font-bold text-text-primary line-clamp-2 leading-tight mb-1">
            {video.title}
          </h4>
          <p className="text-[10px] text-text-tertiary truncate">
            {video.channelName}
          </p>
        </div>
      </button>
    );
  }

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="bg-white border border-border-subtle rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-300 group cursor-pointer"
      onClick={() => onClick(video)}
    >
      <div className="relative aspect-video overflow-hidden bg-surface">
        <img 
          src={video.thumbnailUrl} 
          alt={video.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />
        
        {/* Play Overlay */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center scale-90 group-hover:scale-100 transition-transform duration-300">
            <Play size={24} className="text-white fill-current translate-x-0.5" />
          </div>
        </div>

        {/* Video Info Overlay */}
        <div className="absolute top-3 left-3 flex gap-2">
          {video.isVerified && (
            <div className="p-1 px-2 bg-primary/90 backdrop-blur-md rounded-full flex items-center gap-1 shadow-lg">
              <CheckCircle size={12} className="text-white" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white">Verified</span>
            </div>
          )}
        </div>

        <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/80 backdrop-blur-md rounded-lg text-xs text-white font-bold tracking-tighter">
          {video.duration}
        </div>
      </div>

      <div className="p-5">
        <div className="flex flex-wrap gap-2 mb-4">
          <SubjectBadge subject={video.subject} />
          {video.grade && <GradeBadge grade={video.grade} />}
          <CurriculumTag type={video.curriculum === 'All' ? 'Both' : (video.curriculum as any)} />
        </div>

        <h3 className="text-lg font-serif text-text-primary mb-3 line-clamp-2 leading-tight group-hover:text-primary transition-colors">
          {video.title}
        </h3>

        <div className="flex items-center justify-between pt-5 border-t border-border-subtle">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-surface border border-border-subtle flex items-center justify-center">
              <User size={12} className="text-text-tertiary" />
            </div>
            <span className="text-xs font-bold text-text-secondary truncate max-w-[120px]">
              {video.channelName}
            </span>
          </div>

          <div className="flex items-center gap-3">
             <div className="px-2.5 py-1 bg-secondary/10 rounded-full">
                <span className="text-[10px] font-black uppercase tracking-widest text-secondary">
                  {video.topic}
                </span>
             </div>
             <div className="flex items-center gap-1 text-[10px] font-bold text-text-tertiary uppercase tracking-wider">
               <Eye size={12} />
               {formatViewCount(video.viewCount)}
             </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
