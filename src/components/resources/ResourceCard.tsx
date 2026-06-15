import React from 'react';
import { Download, Eye, FileText, FileImage, FileSpreadsheet, File as FileIcon, User } from 'lucide-react';
import { motion } from 'motion/react';
import { Resource } from '../../types';
import { SubjectBadge } from '../ui/SubjectBadge';
import { GradeBadge } from '../ui/GradeBadge';
import { CurriculumTag } from '../ui/CurriculumTag';
import { cn } from '../../lib/utils';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface ResourceCardProps {
  resource: Resource;
  onPreview: (resource: Resource) => void;
}

const SUBJECT_THUMBNAILS: Record<string, string> = {
  'MATHEMATICS': 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400',
  'PHYSICAL SCIENCES': 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=400',
  'LIFE SCIENCES': 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400',
  'HISTORY': 'https://images.unsplash.com/photo-1461360228754-6e81c478b882?w=400',
  'GEOGRAPHY': 'https://images.unsplash.com/photo-1446776899648-aa78eefe8ed0?w=400',
  'ACCOUNTING': 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400',
  'BUSINESS STUDIES': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
  'DEFAULT': 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400'
};

const FILE_TYPE_ICONS: Record<string, any> = {
  'PDF': FileText,
  'PPT': FileIcon,
  'Image': FileImage,
  'Doc': FileIcon,
  'Other': FileIcon
};

export function ResourceCard({ resource, onPreview }: ResourceCardProps) {
  const Icon = FILE_TYPE_ICONS[resource.fileType] || FileIcon;
  const thumbnail = SUBJECT_THUMBNAILS[resource.subject.toUpperCase()] || SUBJECT_THUMBNAILS['DEFAULT'];

  const handleDownload = async () => {
    try {
      const resourceRef = doc(db, 'resources', resource.id);
      await updateDoc(resourceRef, {
        downloadCount: increment(1)
      });
      window.open(resource.fileUrl, '_blank');
    } catch (err) {
      console.error("Error updating download count:", err);
      // Still trigger download even if count fails
      window.open(resource.fileUrl, '_blank');
    }
  };

  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="group bg-white rounded-2xl border border-border-subtle overflow-hidden hover:shadow-xl hover:border-primary/20 transition-all duration-300 flex flex-col h-full"
    >
      <div className="relative aspect-video overflow-hidden">
        <img 
          src={resource.thumbnailUrl || thumbnail} 
          alt={resource.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-3 left-3 flex gap-2">
          <GradeBadge grade={resource.grade} className="shadow-lg" />
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <SubjectBadge subject={resource.subject} size="sm" />
          <CurriculumTag type={resource.curriculum as any} size="sm" />
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 min-h-[3.5rem]">
          {resource.title}
        </h3>

        <p className="text-sm text-text-secondary line-clamp-2 mb-4 flex-1">
          {resource.description}
        </p>

        <div className="flex items-center justify-between mb-6 pt-4 border-t border-border-subtle">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
              <User size={14} className="text-primary" />
            </div>
            <span className="text-xs font-medium text-text-secondary truncate max-w-[100px]">
              {resource.uploaderName}
            </span>
          </div>
          <div className="flex items-center gap-3 text-text-tertiary">
            <div className="flex items-center gap-1">
              <Icon size={14} />
              <span className="text-[10px] font-bold uppercase">{resource.fileType}</span>
            </div>
            <div className="flex items-center gap-1">
              <Download size={14} />
              <span className="text-[10px] font-bold">{resource.downloadCount}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-auto">
          <button 
            onClick={() => onPreview(resource)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-surface text-text-primary rounded-xl text-sm font-semibold hover:bg-border-subtle transition-colors"
          >
            <Eye size={16} />
            Preview
          </button>
          <button 
            onClick={handleDownload}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-dark transition-colors shadow-sm"
          >
            <Download size={16} />
            Download
          </button>
        </div>
      </div>
    </motion.div>
  );
}
