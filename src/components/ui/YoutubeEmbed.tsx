import { cn } from '../../lib/utils';

export function YoutubeEmbed({ videoId, className }: { videoId: string; className?: string }) {
  return (
    <div className={cn('relative aspect-video w-full overflow-hidden rounded-2xl border border-border-subtle shadow-lg', className)}>
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
        title="YouTube video player"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="no-referrer"
        allowFullScreen
        className="absolute inset-0 w-full h-full"
      />
    </div>
  );
}
