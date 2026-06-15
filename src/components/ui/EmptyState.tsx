import { Button } from './Button';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon = '🧐', title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center bg-surface border border-dashed border-border-subtle rounded-[48px]">
      <div className="text-6xl mb-6 filter drop-shadow-lg">{icon}</div>
      <h3 className="text-2xl font-serif mb-4 leading-tight">{title}</h3>
      <p className="text-text-secondary max-w-md mb-10 leading-relaxed">{description}</p>
      {actionLabel && (
        <Button onClick={onAction} size="lg">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
