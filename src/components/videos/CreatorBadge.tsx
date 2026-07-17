import React from 'react';
import { CheckCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface CreatorBadgeProps {
  name: string;
  channelUrl?: string;
  className?: string;
}

export function CreatorBadge({ name, channelUrl, className }: CreatorBadgeProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex items-center gap-1.5 overflow-hidden">
        <CheckCircle size={12} className="text-blue-500 fill-blue-500 shrink-0" />
        <span className="text-xs font-bold text-text-primary line-clamp-1">{name || 'Creator'}</span>
      </div>
      <div className="text-[10px] text-lux-text flex items-center gap-2 mt-0.5">
        Content via YouTube
      </div>
    </div>
  );
}
