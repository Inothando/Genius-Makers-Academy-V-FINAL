import { cn } from '../../lib/utils';

export type CurriculumType = 'NSC' | 'IEB' | 'CAP' | 'All' | 'Both';

export function CurriculumTag({ type, size = 'md' }: { type: CurriculumType; size?: 'sm' | 'md' }) {
  const configs: Record<CurriculumType, string> = {
    'NSC': 'bg-blue-600 text-lux-text',
    'IEB': 'bg-purple-600 text-lux-text',
    'CAP': 'bg-green-600 text-lux-text',
    'Both': 'bg-primary text-lux-text',
    'All': 'bg-lux-surface-alt text-lux-text',
  };

  return (
    <span
      className={cn(
        'rounded-md font-semibold uppercase tracking-wide',
        size === 'sm' ? 'px-1.5 py-0.5 text-[8px]' : 'px-2 py-0.5 text-[10px]',
        configs[type] || configs['All']
      )}
    >
      {type}
    </span>
  );
}
