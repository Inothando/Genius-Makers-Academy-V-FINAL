import React, { useState, useMemo } from 'react';
import { Search, Sparkles, BookOpen, Users, ArrowRight, Play, FileText, Layout } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { FilterBar } from '../components/ui/FilterBar';
import { StudyPackCard } from '../components/packs/StudyPackCard';
import { useStudyPacks } from '../hooks/useStudyPacks';
import { StudyPack, StudyPackFilters } from '../types';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';

export function StudyPacksPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<StudyPackFilters>({
    grade: 'All',
    curriculum: 'All',
    subject: 'All',
    search: ''
  });

  const { packs, loading } = useStudyPacks(filters);

  const featuredPack = useMemo(() => {
    return packs[0] || null;
  }, [packs]);

  const handlePackClick = (pack: StudyPack) => {
    navigate(`/study-packs/${pack.id}`);
  };

  return (
    <div className="min-h-screen bg-lux-bg font-sans">
      <Navbar />
      
      {/* Slim Header Section */}
      <div className="bg-lux-surface border-b border-lux-border pt-24 pb-8 shadow-xl relative z-10 overflow-hidden mt-16 md:mt-0">
        <div className="absolute inset-0 hidden opacity-[0.03] mix-blend-multiply"></div>
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-lux-green-500/10 blur-[100px] rounded-full translate-x-1/3 -translate-y-1/2 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-end justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 mb-3">
              <span className="w-8 h-[1px] bg-lux-green-500"></span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-lux-green-500">Learning Tracks</span>
            </div>
            <h1 className="text-4xl font-serif font-medium text-lux-text tracking-tight">
              Curated Study Packs
            </h1>
            <p className="text-sm text-lux-text mt-2 font-light tracking-wide max-w-lg">Structured learning tracks built by top students and educators. Sequenced notes, videos, and past papers.</p>
          </div>
          <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-lux-green-500 bg-lux-bg border border-lux-border px-4 py-2.5 rounded-lg shadow-sm self-start md:self-auto backdrop-blur-sm">
            <Layout size={14} className="text-lux-green-500" />
            {loading ? 'Curating...' : `${packs.length} Active Tracks`}
          </div>
        </div>
      </div>

      {/* Search & Filter Section */}
      <div className="sticky top-[72px] z-20 bg-lux-bg border-y border-lux-border/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="space-y-6">
            <div className="relative w-full">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-lux-text" size={24} />
              <input
                type="text"
                placeholder="Search by topic, subject, or grade..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-16 pr-6 py-5 bg-lux-surface border border-lux-border/60 rounded-[1.5rem] text-sm text-lux-text font-medium uppercase tracking-widest outline-none focus:border-lux-green-500 transition-all shadow-inner placeholder:normal-case placeholder:tracking-normal placeholder:font-medium placeholder:text-lux-text"
              />
            </div>
            
            <FilterBar 
              onChange={(newFilters) => setFilters(prev => ({ ...prev, ...newFilters }))}
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Featured Pack */}
        {!loading && featuredPack && !filters.search && filters.subject === 'All' && (
          <div className="mb-20">
             <div className="flex items-center gap-2 mb-6">
               <Sparkles size={16} className="text-lux-green-500" />
               <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-lux-text">Staff Pick study pack</h3>
             </div>

             <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               className="glass-panel overflow-hidden flex flex-col lg:flex-row shadow-lux-lg relative border border-lux-border"
             >
                <div className="flex-1 p-8 sm:p-16 relative z-10 text-lux-text">
                   <div className="flex flex-wrap gap-2 mb-8">
                     <span className="px-3 py-1 bg-lux-surface/10 hover:bg-lux-surface/20 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-widest text-lux-text border border-lux-surface/20 transition-colors">
                       {featuredPack.subject}
                     </span>
                     <span className="px-3 py-1 bg-lux-green-500/20 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-widest text-lux-text border border-lux-border">
                       Grade {featuredPack.grade}
                     </span>
                     <span className="px-3 py-1 bg-lux-surface/10 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-widest text-lux-text border border-lux-surface/20">
                       {featuredPack.items.length} Lessons
                     </span>
                   </div>

                   <h2 className="text-4xl sm:text-5xl font-serif mb-6 leading-tight">
                     {featuredPack.title}
                   </h2>
                   <p className="text-lux-text text-lg mb-10 max-w-xl leading-relaxed font-light">
                     {featuredPack.description}
                   </p>

                   <div className="flex flex-wrap items-center gap-10">
                      <Button 
                        size="lg" 
                        onClick={() => handlePackClick(featuredPack)}
                        className="bg-lux-green-500 text-lux-text hover:bg-lux-green-500 hover:text-lux-text hover:border-lux-green-500-light py-6 px-10 rounded-2xl sm:rounded-3xl text-[11px] uppercase tracking-widest font-bold group shadow-xl transition-all"
                      >
                         Start this Pack <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>

                      <div className="flex items-center gap-3">
                         <div className="flex -space-x-3">
                           {[1, 2, 3].map(i => (
                             <div key={i} className="w-10 h-10 rounded-full border-2 border-lux-border bg-lux-surface/20 flex items-center justify-center font-bold text-[10px] backdrop-blur-sm text-lux-text">
                               {i}
                             </div>
                           ))}
                         </div>
                         <span className="text-[10px] uppercase font-bold tracking-widest text-lux-text">{featuredPack.enrollCount}+ enrolled</span>
                      </div>
                   </div>
                </div>

                <div className="lg:w-[400px] bg-lux-surface/5 backdrop-blur-sm border-l border-lux-surface/10 p-12 flex items-center justify-center">
                   <div className="relative">
                      {/* Document Stack Visual */}
                      <motion.div 
                        initial={{ rotate: -5 }}
                        whileHover={{ rotate: -10, x: -10 }}
                        className="w-32 sm:w-48 aspect-[3/4] bg-lux-surface rounded-2xl sm:rounded-3xl shadow-lux-lg flex items-center justify-center p-6 border border-lux-border"
                      >
                         <FileText size={48} className="text-lux-text" />
                      </motion.div>
                      <motion.div 
                        initial={{ rotate: 10, x: 20, y: 20 }}
                        whileHover={{ rotate: 15, x: 40, y: 30 }}
                        className="absolute bottom-0 right-0 w-32 sm:w-48 aspect-video bg-lux-green-500 rounded-2xl sm:rounded-3xl shadow-lux-lg flex items-center justify-center p-6 -translate-y-8"
                      >
                         <Play size={48} className="text-lux-text fill-lux-green-950" />
                      </motion.div>
                   </div>
                </div>

                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-20 pointer-events-none">
                   <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-lux-green-500/30 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
                </div>
             </motion.div>
          </div>
        )}

        {/* Regular Grid */}
        <div className="space-y-12">
          {packs.length > 0 && !filters.search && filters.subject === 'All' && (
            <div className="flex items-center gap-3 mb-10">
              <BookOpen size={20} className="text-lux-green-500" />
              <h2 className="text-2xl font-serif text-lux-text border-b border-lux-border pb-2">Explore All Tracks</h2>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[16/10] glass-panel mb-6 shadow-inner"></div>
                  <div className="h-6 w-3/4 bg-lux-surface rounded mb-4"></div>
                  <div className="h-4 w-1/2 bg-lux-surface rounded"></div>
                </div>
              ))}
            </div>
          ) : packs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {packs.map((pack) => (
                <StudyPackCard 
                  key={pack.id} 
                  pack={pack} 
                  onClick={handlePackClick}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 px-4 glass-panel border border-dashed border-lux-border shadow-lux-sm">
              <div className="w-20 h-20 bg-lux-bg border border-lux-border/50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Layout size={32} className="text-lux-text" />
              </div>
              <h3 className="text-2xl font-serif text-lux-text mb-2">No Study Packs found</h3>
              <p className="text-lux-text text-sm font-light max-w-sm mx-auto">
                Try adjusting your filters or search terms to find what you're looking for.
              </p>
              <Button 
                variant="outline" 
                className="mt-8 border-lux-border text-lux-text text-[10px] uppercase font-bold tracking-widest hover:bg-lux-bg transition-colors"
                onClick={() => setFilters({ grade: 'All', curriculum: 'All', subject: 'All', search: '' })}
              >
                Reset All Filters
              </Button>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
