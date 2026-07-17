import React from 'react';
import { Play, FileText, Download, Eye, FilePieChart, FileImage } from 'lucide-react';
import { motion } from 'motion/react';
import { StudyPackItem } from '../../types';
import { Button } from '../ui/Button';

interface VideoItemProps {
  item: StudyPackItem;
  order: number;
  onWatch: (videoId: string) => void;
  onComplete?: (itemId: string) => void;
  metadata?: any;
}

export function StudyPackVideoItem({ item, order, onWatch, onComplete, metadata }: VideoItemProps) {
  const [done, setDone] = React.useState(false);

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      className="p-6 bg-white border border-border-subtle rounded-2xl sm:rounded-3xl flex items-center gap-6 group hover:shadow-lg transition-all"
    >
      <button 
        onClick={() => {
           if (!done) {
              setDone(true);
              onComplete?.(item.id);
           }
        }}
        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-sm transition-colors border ${done ? 'bg-primary text-lux-text border-primary' : 'bg-primary/10 text-primary border-transparent'}`}
      >
        {done ? '✓' : order}
      </button>
      
      <div className="relative w-32 aspect-video bg-surface rounded-xl overflow-hidden shrink-0 border border-border-subtle">
        {metadata?.thumbnailUrl ? (
          <img src={metadata.thumbnailUrl} className="w-full h-full object-cover" alt="" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play size={20} className="text-lux-text" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Play size={20} className="text-lux-text fill-current" />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-primary">Video Lesson</span>
          {metadata?.duration && <span className="text-[10px] font-bold text-lux-text">• {metadata.duration}</span>}
        </div>
        <h4 className="text-sm font-bold text-text-primary line-clamp-1 mb-1 group-hover:text-primary transition-colors">
          {item.title}
        </h4>
        <p className="text-[10px] text-lux-text truncate">
          {metadata?.channelName || 'Genius Makers Academy'}
        </p>
      </div>

      <Button size="sm" onClick={() => onWatch(item.refId)} className="rounded-xl px-6">
        Watch
      </Button>
    </motion.div>
  );
}

interface DocItemProps {
  item: StudyPackItem;
  order: number;
  onPreview: (docId: string) => void;
  onComplete?: (itemId: string) => void;
  metadata?: any;
}

export function StudyPackDocItem({ item, order, onPreview, onComplete, metadata }: DocItemProps) {
  const [done, setDone] = React.useState(false);

  const getIcon = () => {
    switch (metadata?.fileType) {
      case 'PDF': return <FileText size={20} />;
      case 'PPT': return <FilePieChart size={20} />;
      case 'Image': return <FileImage size={20} />;
      default: return <FileText size={20} />;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      className="p-6 bg-white border border-border-subtle rounded-2xl sm:rounded-3xl flex items-center gap-6 group hover:shadow-lg transition-all"
    >
      <button 
        onClick={() => {
           if (!done) {
              setDone(true);
              onComplete?.(item.id);
           }
        }}
        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-sm transition-colors border ${done ? 'bg-secondary text-lux-text border-secondary' : 'bg-secondary/10 text-secondary border-transparent'}`}
      >
        {done ? '✓' : order}
      </button>

      <div className="w-12 h-12 bg-surface rounded-xl flex items-center justify-center text-lux-text shrink-0 border border-border-subtle group-hover:text-secondary group-hover:bg-secondary/5 transition-colors">
        {getIcon()}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-secondary">
             {item.type === 'paper' ? 'Past Paper' : 'Study Resource'}
          </span>
          {metadata?.fileSize && (
            <span className="text-[10px] font-bold text-lux-text">
              • {(metadata.fileSize / (1024 * 1024)).toFixed(1)}MB
            </span>
          )}
        </div>
        <h4 className="text-sm font-bold text-text-primary line-clamp-1 mb-1 group-hover:text-secondary transition-colors">
          {item.title}
        </h4>
        <p className="text-[10px] text-lux-text truncate">
          {metadata?.subject || 'CAPS Curriculum'}
        </p>
      </div>

      <Button variant="outline" size="sm" onClick={() => onPreview(item.refId)} className="rounded-xl px-6">
        Preview
      </Button>
    </motion.div>
  );
}
