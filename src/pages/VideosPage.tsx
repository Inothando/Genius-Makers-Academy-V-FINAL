import React, { useState, useMemo } from 'react';
import { Play, Flame, BookOpen, Layers, Zap, Info, Search, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { FilterBar } from '../components/ui/FilterBar';
import { VideoCard } from '../components/videos/VideoCard';
import { VideoPlayer } from '../components/videos/VideoPlayer';
import { useVideoLessons } from '../hooks/useVideoLessons';
import { VideoFilters, VideoLesson } from '../types';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/Button';

type VideoTab = 'Discovery' | 'Full Courses' | 'Lessons' | 'Shorts';

export function VideosPage() {
  const [activeTab, setActiveTab] = useState<VideoTab>('Discovery');
  const [filters, setFilters] = useState<VideoFilters>({
    grade: 'All',
    curriculum: 'All',
    subject: 'All'
  });
  const [search, setSearch] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<VideoLesson | null>(null);

  const { videos, loading } = useVideoLessons(filters);

  const filteredVideos = useMemo(() => {
    let result = [...videos];

    // Apply search
    if (search) {
      result = result.filter(v => 
        v.title.toLowerCase().includes(search.toLowerCase()) || 
        v.topic.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Apply tab filters
    switch (activeTab) {
      case 'Full Courses':
        result = result.filter(v => v.playlistId !== null);
        break;
      case 'Lessons':
        result = result.filter(v => v.playlistId === null);
        break;
      case 'Shorts':
        result = result.filter(v => v.isShort);
        break;
      case 'Discovery':
      default:
        // Already filtered by base query, maybe randomize or just show recent
        break;
    }

    return result;
  }, [videos, activeTab, search]);

  const tabs: { id: VideoTab; icon: any; label: string }[] = [
    { id: 'Discovery', icon: Flame, label: 'Discovery' },
    { id: 'Full Courses', icon: Layers, label: 'Full Courses' },
    { id: 'Lessons', icon: BookOpen, label: 'Lessons' },
    { id: 'Shorts', icon: Zap, label: 'Shorts' }
  ];

  return (
    <div className="min-h-screen bg-lux-bg font-sans">
      <Navbar />
      
      {/* Slim Header Section */}
      <div className="bg-lux-green-950 border-b border-lux-gold/20 pt-24 pb-8 shadow-xl relative z-10 overflow-hidden mt-16 md:mt-0">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] mix-blend-overlay"></div>
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-lux-gold/10 blur-[100px] rounded-full translate-x-1/3 -translate-y-1/2 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-end justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 mb-3">
              <span className="w-8 h-[1px] bg-lux-gold"></span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-lux-gold">Watch & Learn</span>
            </div>
            <h1 className="text-4xl font-serif font-medium text-lux-surface tracking-tight">
              Masterclasses & Short Lessons
            </h1>
            <p className="text-sm text-lux-surface/70 mt-2 font-light tracking-wide max-w-lg">Curated lessons aligned meticulously to the CAPS syllabus. Taught by top performers.</p>
          </div>
          <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-lux-gold bg-lux-green-900 border border-lux-gold/30 px-4 py-2.5 rounded-lg shadow-sm self-start md:self-auto backdrop-blur-sm">
            <Play size={14} className="text-lux-gold fill-lux-gold" />
            {loading ? 'Fetching...' : `${filteredVideos.length} Broadcasts`}
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="sticky top-[72px] z-20 bg-lux-bg border-y border-lux-border/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-center py-4 gap-6">
            <div className="flex-1">
              <FilterBar 
                onChange={(newFilters) => setFilters(prev => ({ ...prev, ...newFilters }))}
              />
            </div>
            <div className="relative w-full lg:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-lux-muted" size={18} />
              <input
                type="text"
                placeholder="Search topics or titles..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-lux-surface border border-lux-border/60 rounded-2xl text-[11px] font-bold text-lux-green-950 uppercase tracking-widest placeholder:normal-case placeholder:tracking-normal placeholder:font-medium placeholder:text-lux-muted outline-none focus:border-lux-gold transition-all shadow-inner"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Tabs */}
        <div className="flex items-center gap-8 border-b border-lux-border/60 mb-12 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "relative py-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                activeTab === tab.id ? "text-lux-gold" : "text-lux-muted hover:text-lux-green-950"
              )}
            >
              <tab.icon size={16} />
              {tab.label}
              {activeTab === tab.id && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-lux-gold"
                />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-video bg-lux-surface border border-lux-border/50 rounded-3xl mb-4"></div>
                <div className="h-6 w-3/4 bg-lux-surface rounded mb-2"></div>
                <div className="h-4 w-1/2 bg-lux-surface rounded"></div>
              </div>
            ))}
          </div>
        ) : filteredVideos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredVideos.map((video) => (
              <VideoCard 
                key={video.id} 
                video={video} 
                onClick={(v) => setSelectedVideo(v)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 px-4 bg-lux-surface rounded-[3rem] border border-dashed border-lux-border shadow-lux-sm">
            <div className="w-20 h-20 bg-lux-bg border border-lux-border/50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <Play size={32} className="text-lux-muted ml-2" />
            </div>
            <h3 className="text-2xl font-serif text-lux-green-950 mb-2">No videos found</h3>
            <p className="text-lux-muted text-sm font-light max-w-sm mx-auto">
              Try adjusting your filters or search terms to find what you're looking for.
            </p>
            <Button 
              variant="outline" 
              className="mt-8 border-lux-border text-lux-green-950 text-[10px] font-bold uppercase tracking-widest hover:bg-lux-bg transition-colors"
              onClick={() => {
                setFilters({ grade: 'All', curriculum: 'All', subject: 'All' });
                setSearch('');
                setActiveTab('Discovery');
              }}
            >
              Reset All Filters
            </Button>
          </div>
        )}
      </div>

      <Footer />

      {/* Video Player Modal */}
      {selectedVideo && (
        <VideoPlayer 
          isOpen={!!selectedVideo}
          onClose={() => setSelectedVideo(null)}
          video={selectedVideo}
        />
      )}
    </div>
  );
}
