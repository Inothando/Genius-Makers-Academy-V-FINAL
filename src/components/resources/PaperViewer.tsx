import React, { useEffect } from 'react';
import { X, ExternalLink, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../ui/Button';

interface PaperViewerProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  title: string;
  fileType: string;
}

export function PaperViewer({ isOpen, onClose, fileUrl, title, fileType }: PaperViewerProps) {
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

  if (!isOpen) return null;

  const isImage = ['Image', 'jpg', 'jpeg', 'png', 'gif'].includes(fileType);
  const isPdf = ['PDF', 'pdf'].includes(fileType);

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
        className="relative w-full max-w-6xl h-full max-h-[90vh] bg-white rounded-[32px] overflow-hidden flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="px-8 py-4 border-b border-border-subtle flex items-center justify-between bg-white z-10">
          <div className="flex flex-col">
            <h2 className="text-xl font-serif text-text-primary line-clamp-1">{title}</h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-text-tertiary">
              {fileType} Viewer
            </p>
          </div>
          <div className="flex items-center gap-3">
             <Button variant="outline" size="sm" onClick={() => window.open(fileUrl, '_blank')}>
                <ExternalLink size={16} className="mr-2" />
                Pop-out
             </Button>
             <button onClick={onClose} className="p-2 hover:bg-surface rounded-full transition-colors">
                <X size={24} />
             </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 bg-surface overflow-auto flex flex-col items-center justify-center p-4">
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
              <p className="text-text-secondary max-w-sm mx-auto mb-8">
                This file format ({fileType}) cannot be previewed directly in the browser. 
                Please download it to view with your local tools.
              </p>
              <Button onClick={() => window.open(fileUrl, '_blank')}>
                Download File
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
