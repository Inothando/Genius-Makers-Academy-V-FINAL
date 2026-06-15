import { cn } from '../../lib/utils';

export function GradeBadge({ grade, className }: { grade: 8 | 9 | 10 | 11 | 12; className?: string }) {
  return (
    <div
      className={cn(
        'w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-[10px] font-bold shadow-sm',
        className
      )}
    >
      Gr {grade}
    </div>
  );
}
