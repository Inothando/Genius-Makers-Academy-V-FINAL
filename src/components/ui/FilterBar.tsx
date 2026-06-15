import { useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../lib/utils';

interface FilterState {
  grade: string;
  curriculum: string;
  subject: string;
  year: string;
  search: string;
}

interface FilterBarProps {
  onChange: (filters: FilterState) => void;
}

export function FilterBar({ onChange }: FilterBarProps) {
  const [filters, setFilters] = useState<FilterState>({
    grade: 'All',
    curriculum: 'All',
    subject: 'All',
    year: 'All',
    search: '',
  });

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const updateFilter = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onChange(newFilters);
  };

  const removeFilter = (key: keyof FilterState) => {
    updateFilter(key, 'All');
  };

  const subjects = [
    'Mathematics', 'Physical Sciences', 'Life Sciences', 'English', 
    'Afrikaans', 'History', 'Geography', 'Accounting', 'Business Studies'
  ];

  const grades = ['All', '8', '9', '10', '11', '12'];
  const curricula = ['All', 'NSC'];
  const years = ['All', ...Array.from({ length: 12 }, (_, i) => (2025 - i).toString())];

  return (
    <div className="space-y-4">
      {/* Search & Main Desktop Bar */}
      <div className="bg-white border border-gray-200/90 rounded-[22px] p-2 md:p-2.5 shadow-sm hover:shadow-md transition-all duration-300 flex items-center gap-3">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#1D9E75] transition-colors" size={18} />
          <input
            type="text"
            placeholder="Search our database of academic papers..."
            className="w-full bg-[#FDFDFD] border border-gray-150 rounded-xl py-2.5 pl-12 pr-4 text-xs font-bold outline-none transition-all focus:bg-white focus:border-[#1D9E75]/40 text-gray-800 placeholder:text-gray-400"
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
          />
        </div>

        {/* Desktop Selects */}
        <div className="hidden lg:flex items-center gap-2">
          <Select 
            value={filters.grade} 
            options={grades} 
            onChange={(v) => updateFilter('grade', v)} 
            placeholder="Grade"
          />
          {/* Custom segmented selector for curriculum containing active NSC */}
          <div className="flex items-center gap-1 bg-gray-50 border border-gray-200/80 rounded-xl p-1 text-xs">
            <button
              onClick={() => updateFilter('curriculum', 'All')}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                filters.curriculum === 'All' ? "bg-white text-primary shadow-xs" : "text-gray-500 hover:text-gray-800"
              )}
            >
              All
            </button>
            <button
              onClick={() => updateFilter('curriculum', 'NSC')}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                filters.curriculum === 'NSC' ? "bg-[#1D9E75] text-white shadow-xs" : "text-gray-500 hover:text-gray-800"
              )}
            >
              NSC
            </button>
          </div>
          <Select 
            value={filters.subject} 
            options={subjects} 
            onChange={(v) => updateFilter('subject', v)} 
            placeholder="Subject"
          />
          <Select 
            value={filters.year} 
            options={years} 
            onChange={(v) => updateFilter('year', v)} 
            placeholder="Year"
          />
        </div>

        {/* Mobile Filter Toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsDrawerOpen(true)}
          className="lg:hidden shrink-0"
        >
          <SlidersHorizontal size={18} className="mr-2" />
          Filters
        </Button>
      </div>

      {/* Active Filter Chips */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(filters).map(([key, value]) => {
          if (value === 'All' || value === '' || key === 'search') return null;
          return (
            <div 
              key={key} 
              className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-semibold flex items-center gap-2 animate-in fade-in zoom-in-95"
            >
              <span className="capitalize text-primary/60">{key}:</span> {value}
              <button 
                onClick={() => removeFilter(key as keyof FilterState)}
                className="hover:text-primary-dark"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Mobile Drawer Backdrop */}
      {isDrawerOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
            onClick={() => setIsDrawerOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] p-8 z-[70] animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-bold">Filters</h3>
              <button onClick={() => setIsDrawerOpen(false)}>
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-6">
              <MobileFilterSection 
                label="Grade" 
                value={filters.grade} 
                options={grades} 
                onChange={(v) => updateFilter('grade', v)} 
              />
              <MobileFilterSection 
                label="Curriculum" 
                value={filters.curriculum} 
                options={curricula} 
                onChange={(v) => updateFilter('curriculum', v)} 
              />
              <MobileFilterSection 
                label="Subject" 
                value={filters.subject} 
                options={['All', ...subjects]} 
                onChange={(v) => updateFilter('subject', v)} 
              />
              <MobileFilterSection 
                label="Year" 
                value={filters.year} 
                options={years} 
                onChange={(v) => updateFilter('year', v)} 
              />
              
              <Button className="w-full mt-4" onClick={() => setIsDrawerOpen(false)}>Apply Filters</Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Select({ value, options, onChange, placeholder }: { value: string; options: string[]; onChange: (v: string) => void; placeholder: string }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-[#FDFDFD] border border-gray-200/90 shadow-sm px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-gray-700 outline-none hover:border-primary/30 hover:shadow-xs focus:border-primary/45 focus:bg-white transition-all appearance-none cursor-pointer pr-9 bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%231D9E75%22%20stroke-width%3D%223%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C/polyline%3E%3C/svg%3E')] bg-[length:12px] bg-[right_12px_center] bg-no-repeat"
    >
      <option value="All">{placeholder}</option>
      {options.filter(o => o !== 'All').map(o => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

function MobileFilterSection({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  if (label === 'Curriculum') {
    return (
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-text-tertiary mb-3">{label}</div>
        <div className="flex flex-wrap gap-2">
          {options.map(o => (
            <button
              key={o}
              onClick={() => onChange(o)}
              className={cn(
                'px-4 py-2 rounded-full border text-sm font-medium transition-all active:scale-95 cursor-pointer',
                value === o 
                  ? 'bg-[#1D9E75] border-[#1D9E75] text-white active:bg-[#157c5b] active:text-white' 
                  : 'bg-white border-border-subtle text-text-secondary hover:border-primary/20 hover:text-primary active:bg-surface active:text-primary'
              )}
            >
              {o === 'All' ? 'All Curricula' : o}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wider text-text-tertiary mb-3">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map(o => (
          <button
            key={o}
            onClick={() => onChange(o)}
            className={cn(
              'px-4 py-2 rounded-full border text-sm font-medium transition-all active:scale-95 cursor-pointer',
              value === o 
                ? 'bg-primary border-primary text-white active:bg-primary-dark active:text-white' 
                : 'bg-white border-border-subtle text-text-secondary hover:border-primary/20 hover:text-primary active:bg-surface active:text-primary'
            )}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}
