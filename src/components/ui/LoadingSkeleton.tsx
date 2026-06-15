import { cn } from '../../lib/utils';

export function LoadingSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i} 
          className="bg-white border border-border-subtle rounded-[24px] p-6 shadow-bento-sm animate-pulse"
        >
          {/* Thumbnail area mimic */}
          <div className="aspect-[4/3] bg-surface rounded-xl mb-6 flex items-center justify-center">
            <div className="w-12 h-16 bg-white/50 rounded-md" />
          </div>

          {/* Text lines */}
          <div className="space-y-3 mb-6">
            <div className="h-5 bg-surface rounded-full w-3/4" />
            <div className="h-4 bg-surface rounded-full w-1/2" />
            <div className="h-4 bg-surface rounded-full w-2/3" />
          </div>

          {/* Badge areas */}
          <div className="flex items-center justify-between mt-auto">
            <div className="flex gap-2">
              <div className="h-6 w-12 bg-surface rounded-md" />
              <div className="h-6 w-12 bg-surface rounded-md" />
            </div>
            <div className="h-10 w-24 bg-surface rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}
