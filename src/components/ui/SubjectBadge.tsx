import { cn } from '../../lib/utils';

const subjectColorConfig: Record<string, string> = {
  'Mathematics': 'bg-blue-100 text-blue-800 border-blue-200',
  'Mathematical Literacy': 'bg-sky-100 text-sky-800 border-sky-200',
  'Physical Sciences': 'bg-orange-100 text-orange-800 border-orange-200',
  'Life Sciences': 'bg-green-100 text-green-800 border-green-200',
  'English': 'bg-purple-100 text-purple-800 border-purple-200',
  'Afrikaans': 'bg-teal-100 text-teal-800 border-teal-200',
  'History': 'bg-amber-100 text-amber-800 border-amber-200',
  'Geography': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Accounting': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  'Business Studies': 'bg-rose-100 text-rose-800 border-rose-200',
  'Economics': 'bg-cyan-100 text-cyan-800 border-cyan-200',
  'Consumer Studies': 'bg-lime-100 text-lime-800 border-lime-200',
  'Tourism': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'IT/CAT': 'bg-slate-100 text-slate-800 border-slate-200',
};

interface SubjectBadgeProps {
  subject: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function SubjectBadge({ subject, size = 'md', className }: SubjectBadgeProps) {
  const colorClass = subjectColorConfig[subject] || 'bg-gray-100 text-gray-800 border-gray-200';
  
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
  'Mathematics': 'bg-blue-50/75 text-blue-700 border-blue-200/50 hover:bg-blue-600 hover:text-white hover:border-transparent shadow-xs',
  'Mathematical Literacy': 'bg-sky-50/75 text-sky-700 border-sky-200/50 hover:bg-sky-600 hover:text-white hover:border-transparent shadow-xs',
  'Physical Sciences': 'bg-orange-50/75 text-orange-700 border-orange-200/50 hover:bg-orange-600 hover:text-white hover:border-transparent shadow-xs',
  'Life Sciences': 'bg-green-50/75 text-green-700 border-green-200/50 hover:bg-green-600 hover:text-white hover:border-transparent shadow-xs',
  'English HL': 'bg-purple-50/75 text-purple-700 border-purple-200/50 hover:bg-purple-600 hover:text-white hover:border-transparent shadow-xs',
  'Afrikaans HL': 'bg-teal-50/75 text-teal-700 border-teal-200/50 hover:bg-teal-600 hover:text-white hover:border-transparent shadow-xs',
  'History': 'bg-amber-50/75 text-amber-700 border-amber-200/50 hover:bg-amber-600 hover:text-white hover:border-transparent shadow-xs',
  'Geography': 'bg-emerald-50/75 text-emerald-700 border-emerald-200/50 hover:bg-emerald-600 hover:text-white hover:border-transparent shadow-xs',
  'Accounting': 'bg-indigo-50/75 text-indigo-700 border-indigo-200/50 hover:bg-indigo-600 hover:text-white hover:border-transparent shadow-xs',
  'Business Studies': 'bg-rose-50/75 text-rose-700 border-rose-200/50 hover:bg-rose-600 hover:text-white hover:border-transparent shadow-xs',
  'Economics': 'bg-cyan-50/75 text-cyan-700 border-cyan-200/50 hover:bg-cyan-600 hover:text-white hover:border-transparent shadow-xs',
  'Consumer Studies': 'bg-lime-50/75 text-lime-700 border-lime-200/50 hover:bg-lime-600 hover:text-white hover:border-transparent shadow-xs',
  'Tourism': 'bg-yellow-50/75 text-yellow-700 border-yellow-200/50 hover:bg-yellow-600 hover:text-white hover:border-transparent shadow-xs',
  'IT/CAT': 'bg-slate-50/75 text-slate-700 border-slate-200/50 hover:bg-slate-600 hover:text-white hover:border-transparent shadow-xs',
  'Engineering Graphics and Design': 'bg-violet-50/75 text-violet-700 border-violet-200/40 hover:bg-violet-600 hover:text-white hover:border-transparent shadow-xs',
  'Civil Technology': 'bg-stone-50/75 text-stone-700 border-stone-200/40 hover:bg-stone-600 hover:text-white hover:border-transparent shadow-xs',
  'Electrical Technology': 'bg-amber-50/60 text-amber-800 border-amber-200/40 hover:bg-amber-600 hover:text-white hover:border-transparent shadow-xs',
  'Agricultural Sciences': 'bg-teal-50/50 text-teal-800 border-teal-200/30 hover:bg-teal-700 hover:text-white hover:border-transparent shadow-xs',
  'Life Orientation': 'bg-pink-50/75 text-pink-700 border-pink-200/50 hover:bg-pink-600 hover:text-white hover:border-transparent shadow-xs',
  'Music': 'bg-fuchsia-50/75 text-fuchsia-700 border-fuchsia-200/50 hover:bg-fuchsia-600 hover:text-white hover:border-transparent shadow-xs',
  'Visual Arts': 'bg-rose-50/60 text-rose-800 border-rose-200/40 hover:bg-rose-700 hover:text-white hover:border-transparent shadow-xs',
  'Dramatic Arts': 'bg-purple-50/60 text-purple-800 border-purple-200/40 hover:bg-purple-700 hover:text-white hover:border-transparent shadow-xs',
};

export function SubjectTile({ subject, onClick }: { subject: string; onClick?: () => void; key?: string | number }) {
  const colorClass = interactiveSubjectColors[subject] || 'bg-gray-50/80 text-gray-700 border-gray-150 hover:bg-gray-700 hover:text-white shadow-xs';
  
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-4.5 py-3.5 rounded-2xl border text-xs font-black uppercase tracking-wider transition-all text-center focus-ring cursor-pointer active:scale-95 duration-300',
        colorClass
      )}
    >
      {subject}
    </button>
  );
}
