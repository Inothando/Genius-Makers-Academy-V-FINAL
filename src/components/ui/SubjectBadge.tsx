import { cn } from '../../lib/utils';

const subjectColorConfig: Record<string, string> = {
  'Mathematics': 'bg-lux-bg border-lux-border text-lux-text shadow-sm',
  'Mathematical Literacy': 'bg-lux-bg border-lux-border text-lux-text shadow-sm',
  'Physical Sciences': 'bg-lux-bg border-lux-border text-lux-text shadow-sm',
  'Life Sciences': 'bg-lux-bg border-lux-border text-lux-text shadow-sm',
  'English': 'bg-lux-bg border-lux-border text-lux-text shadow-sm',
  'Afrikaans': 'bg-lux-bg border-lux-border text-lux-text shadow-sm',
  'History': 'bg-lux-bg border-lux-border text-lux-text shadow-sm',
  'Geography': 'bg-lux-bg border-lux-border text-lux-text shadow-sm',
  'Accounting': 'bg-lux-bg border-lux-border text-lux-text shadow-sm',
  'Business Studies': 'bg-lux-bg border-lux-border text-lux-text shadow-sm',
  'Economics': 'bg-lux-bg border-lux-border text-lux-text shadow-sm',
  'Consumer Studies': 'bg-lux-bg border-lux-border text-lux-text shadow-sm',
  'Tourism': 'bg-lux-bg border-lux-border text-lux-text shadow-sm',
  'IT/CAT': 'bg-lux-bg border-lux-border text-lux-text shadow-sm',
};

interface SubjectBadgeProps {
  subject: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function SubjectBadge({ subject, size = 'md', className }: SubjectBadgeProps) {
  const colorClass = subjectColorConfig[subject] || 'bg-lux-bg border-lux-border text-lux-text shadow-sm';
  
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-full border',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs',
        colorClass,
        className
      )}
    >
      {subject}
    </span>
  );
}

const interactiveSubjectColors: Record<string, string> = {
  'Mathematics': 'bg-lux-surface border-lux-border text-lux-text shadow-sm hover:border-lux-green-500 hover:text-lux-green-500 hover:shadow-lux-md',
  'Mathematical Literacy': 'bg-lux-surface border-lux-border text-lux-text shadow-sm hover:border-lux-green-500 hover:text-lux-green-500 hover:shadow-lux-md',
  'Physical Sciences': 'bg-lux-surface border-lux-border text-lux-text shadow-sm hover:border-lux-green-500 hover:text-lux-green-500 hover:shadow-lux-md',
  'Life Sciences': 'bg-lux-surface border-lux-border text-lux-text shadow-sm hover:border-lux-green-500 hover:text-lux-green-500 hover:shadow-lux-md',
  'English HL': 'bg-lux-surface border-lux-border text-lux-text shadow-sm hover:border-lux-green-500 hover:text-lux-green-500 hover:shadow-lux-md',
  'Afrikaans HL': 'bg-lux-surface border-lux-border text-lux-text shadow-sm hover:border-lux-green-500 hover:text-lux-green-500 hover:shadow-lux-md',
  'History': 'bg-lux-surface border-lux-border text-lux-text shadow-sm hover:border-lux-green-500 hover:text-lux-green-500 hover:shadow-lux-md',
  'Geography': 'bg-lux-surface border-lux-border text-lux-text shadow-sm hover:border-lux-green-500 hover:text-lux-green-500 hover:shadow-lux-md',
  'Accounting': 'bg-lux-surface border-lux-border text-lux-text shadow-sm hover:border-lux-green-500 hover:text-lux-green-500 hover:shadow-lux-md',
  'Business Studies': 'bg-lux-surface border-lux-border text-lux-text shadow-sm hover:border-lux-green-500 hover:text-lux-green-500 hover:shadow-lux-md',
  'Economics': 'bg-lux-surface border-lux-border text-lux-text shadow-sm hover:border-lux-green-500 hover:text-lux-green-500 hover:shadow-lux-md',
  'Consumer Studies': 'bg-lux-surface border-lux-border text-lux-text shadow-sm hover:border-lux-green-500 hover:text-lux-green-500 hover:shadow-lux-md',
  'Tourism': 'bg-lux-surface border-lux-border text-lux-text shadow-sm hover:border-lux-green-500 hover:text-lux-green-500 hover:shadow-lux-md',
  'IT/CAT': 'bg-lux-surface border-lux-border text-lux-text shadow-sm hover:border-lux-green-500 hover:text-lux-green-500 hover:shadow-lux-md',
  'Engineering Graphics and Design': 'bg-lux-surface border-lux-border text-lux-text shadow-sm hover:border-lux-green-500 hover:text-lux-green-500 hover:shadow-lux-md',
  'Civil Technology': 'bg-lux-surface border-lux-border text-lux-text shadow-sm hover:border-lux-green-500 hover:text-lux-green-500 hover:shadow-lux-md',
  'Electrical Technology': 'bg-lux-surface border-lux-border text-lux-text shadow-sm hover:border-lux-green-500 hover:text-lux-green-500 hover:shadow-lux-md',
  'Agricultural Sciences': 'bg-lux-surface border-lux-border text-lux-text shadow-sm hover:border-lux-green-500 hover:text-lux-green-500 hover:shadow-lux-md',
  'Life Orientation': 'bg-lux-surface border-lux-border text-lux-text shadow-sm hover:border-lux-green-500 hover:text-lux-green-500 hover:shadow-lux-md',
  'Music': 'bg-lux-surface border-lux-border text-lux-text shadow-sm hover:border-lux-green-500 hover:text-lux-green-500 hover:shadow-lux-md',
  'Visual Arts': 'bg-lux-surface border-lux-border text-lux-text shadow-sm hover:border-lux-green-500 hover:text-lux-green-500 hover:shadow-lux-md',
  'Dramatic Arts': 'bg-lux-surface border-lux-border text-lux-text shadow-sm hover:border-lux-green-500 hover:text-lux-green-500 hover:shadow-lux-md',
};

export function SubjectTile({ subject, onClick }: { subject: string; onClick?: () => void; key?: string | number }) {
  const colorClass = interactiveSubjectColors[subject] || 'bg-lux-surface0/80 text-lux-text border-gray-150 hover:bg-lux-surface-alt hover:text-lux-text shadow-xs';
  
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-4.5 py-3.5 rounded-2xl sm:rounded-3xl border text-xs font-black uppercase tracking-wider transition-all text-center focus-ring cursor-pointer active:scale-95 duration-300',
        colorClass
      )}
    >
      {subject}
    </button>
  );
}
