import React, { useState, useMemo } from 'react';
import { Plus, MessageSquare, Flame, Filter, ChevronRight, Hash, Users, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { DiscussionPostCard } from '../components/discussion/DiscussionPostCard';
import { CreatePostModal } from '../components/discussion/CreatePostModal';
import { useDiscussionPosts } from '../hooks/useDiscussionPosts';
import { PostFilters } from '../types';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/Button';

const SUBJECT_HUBS = [
  { name: 'MATHEMATICS', color: '#11cd9b' },
  { name: 'PHYSICAL SCIENCES', color: '#f7c325' },
  { name: 'LIFE SCIENCES', color: '#3182ce' },
  { name: 'ACCOUNTING', color: '#e53e3e' },
  { name: 'HISTORY', color: '#805ad5' },
  { name: 'GEOGRAPHY', color: '#f6ad55' },
];

export function DiscussionPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState<PostFilters>({
    grade: 'All',
    curriculum: 'All',
    subject: 'All',
    topic: ''
  });
  const [activeTab, setActiveTab] = useState<'Latest' | 'Most Liked'>('Latest');

  const { posts, loading } = useDiscussionPosts(filters);

  const trendingTopics = useMemo(() => {
    const topics: Record<string, number> = {};
    posts.forEach(post => {
      if (post.topic) {
        const topic = post.topic.toLowerCase().trim();
        topics[topic] = (topics[topic] || 0) + 1;
      }
    });
    return Object.entries(topics)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [posts]);

  const sortedPosts = useMemo(() => {
    if (activeTab === 'Most Liked') {
      return [...posts].sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
    }
    return posts;
  }, [posts, activeTab]);

  return (
    <div className="min-h-screen bg-lux-bg font-sans">
      <Navbar />
      
      {/* Slim Header Section */}
      <div className="bg-lux-green-950 border-b border-lux-gold/20 pt-24 pb-8 shadow-xl relative z-10 overflow-hidden mt-16 md:mt-0">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] mix-blend-overlay"></div>
        <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-lux-gold/10 blur-[100px] rounded-full -translate-x-1/3 -translate-y-1/2 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-end justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 mb-3">
              <span className="w-8 h-[1px] bg-lux-gold"></span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-lux-gold">Community Hub</span>
            </div>
            <h1 className="text-4xl font-serif font-medium text-lux-surface tracking-tight">
              Scholar Discussions
            </h1>
            <p className="text-sm text-lux-surface/70 mt-2 font-light tracking-wide max-w-lg">Engage with fellow scholars. Analyze complex problems, debate methodologies, and gain insights.</p>
          </div>
          <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-lux-gold bg-lux-green-900 border border-lux-gold/30 px-4 py-2.5 rounded-lg shadow-sm self-start md:self-auto backdrop-blur-sm">
            <Users size={14} className="text-lux-gold" />
            Active Forums
          </div>
        </div>
      </div>

      <main className="max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-8 bg-[#1e4431] relative overflow-hidden rounded-[2.5rem] border border-lux-gold/30 shadow-2xl my-8">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.05] mix-blend-overlay"></div>
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-lux-gold/20 blur-[150px] rounded-full translate-x-1/3 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-lux-gold/15 blur-[120px] rounded-full -translate-x-1/3 translate-y-1/3 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row gap-12">
          {/* Left Sidebar */}
          <aside className="w-full lg:w-[320px] shrink-0 space-y-10 lg:sticky lg:top-32 h-fit">
            {/* Subject Hubs */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 px-2">
                <BookOpen size={18} className="text-lux-gold" />
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-lux-muted">Subject Hubs</h3>
              </div>
              <div className="space-y-1">
                <button 
                  onClick={() => setFilters({ ...filters, subject: 'All' })}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all group",
                    filters.subject === 'All' ? "bg-lux-gold/10 text-lux-gold" : "hover:bg-lux-surface text-lux-green-950"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-lux-border group-hover:bg-lux-gold transition-colors" />
                    <span className="font-bold text-[11px] uppercase tracking-widest">All Discussion</span>
                  </div>
                  <ChevronRight size={16} className={cn("transition-transform", filters.subject === 'All' ? "rotate-90" : "opacity-0 group-hover:opacity-100")} />
                </button>
                {SUBJECT_HUBS.map((hub) => (
                  <button 
                    key={hub.name}
                    onClick={() => setFilters({ ...filters, subject: hub.name })}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all group text-left",
                      filters.subject === hub.name ? "bg-lux-gold/10 text-lux-gold" : "hover:bg-lux-surface text-lux-green-950"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: hub.color }} />
                      <span className="font-bold text-sm truncate max-w-[200px]">{hub.name}</span>
                    </div>
                    <ChevronRight size={16} className={cn("transition-transform", filters.subject === hub.name ? "rotate-90" : "opacity-0 group-hover:opacity-100")} />
                  </button>
                ))}
              </div>
            </div>

            {/* Trending Topics */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 px-2">
                <Flame size={18} className="text-lux-gold" />
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-lux-muted">Trending Topics</h3>
              </div>
              <div className="flex flex-wrap gap-2 px-2">
                {trendingTopics.length > 0 ? trendingTopics.map(([topic, count]) => (
                  <button 
                    key={topic}
                    onClick={() => setFilters({ ...filters, topic: topic.toUpperCase() } as any)}
                    className="px-3 py-1.5 bg-lux-surface border border-lux-border rounded-full text-[10px] font-bold text-lux-muted hover:border-lux-gold hover:bg-lux-bg transition-all flex items-center gap-2 group tracking-widest uppercase"
                  >
                    <Hash size={12} className="text-lux-muted group-hover:text-lux-gold" />
                    <span>{topic}</span>
                    <span className="text-[8px] text-lux-muted">{count}</span>
                  </button>
                )) : (
                  <p className="text-xs text-lux-muted px-2 italic">Waiting for hot topics...</p>
                )}
              </div>
            </div>

            {/* Curriculum Filter */}
            <div className="p-6 bg-lux-surface border border-lux-border rounded-[2.5rem] space-y-4 shadow-lux-sm">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-lux-muted">Curriculum</h3>
              <div className="flex flex-col gap-3">
                <div className="flex p-1 bg-lux-bg rounded-xl border border-lux-border">
                  {['All', 'NSC'].map((c) => (
                    <button
                      key={c}
                      onClick={() => setFilters({ ...filters, curriculum: c })}
                      className={cn(
                        "flex-1 py-2 rounded-lg text-[10px] uppercase tracking-widest font-bold transition-all cursor-pointer",
                        filters.curriculum === c 
                          ? "bg-lux-surface text-lux-gold shadow-sm border border-lux-border" 
                          : "text-lux-muted hover:text-lux-green-950"
                      )}
                    >
                      {c === 'All' ? 'All' : c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Main Feed */}
          <div className="flex-1 space-y-12">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h1 className="text-4xl font-serif text-lux-green-950 mb-2">Discussion Hub</h1>
                <p className="text-lux-muted font-light text-sm">Connect with fellow South African scholars and get your questions answered.</p>
              </div>
              <div className="flex bg-lux-surface p-1.5 rounded-[1.5rem] border border-lux-border shadow-inner">
                <button 
                  onClick={() => setActiveTab('Latest')}
                  className={cn(
                    "px-6 py-2.5 rounded-xl text-[10px] tracking-widest uppercase font-bold transition-all",
                    activeTab === 'Latest' ? "bg-lux-bg text-lux-gold shadow-sm border border-lux-border" : "text-lux-muted hover:text-lux-green-950"
                  )}
                >
                  Latest
                </button>
                <button 
                  onClick={() => setActiveTab('Most Liked')}
                  className={cn(
                    "px-6 py-2.5 rounded-xl text-[10px] tracking-widest uppercase font-bold transition-all",
                    activeTab === 'Most Liked' ? "bg-lux-bg text-lux-gold shadow-sm border border-lux-border" : "text-lux-muted hover:text-lux-green-950"
                  )}
                >
                  Trending
                </button>
              </div>
            </header>

            {/* Grade Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                <span className="text-[10px] font-bold uppercase tracking-widest text-lux-muted mr-2">Filter Grade:</span>
                {['All', '12', '11', '10', '9', '8'].map((g) => (
                  <button 
                    key={g}
                    onClick={() => setFilters({ ...filters, grade: g })}
                    className={cn(
                      "px-5 py-2 rounded-full text-[10px] uppercase font-bold tracking-widest transition-all whitespace-nowrap border",
                      filters.grade === g 
                        ? "bg-lux-gold border-lux-gold text-lux-green-950 shadow-md" 
                        : "bg-lux-surface border-lux-border text-lux-muted hover:border-lux-gold"
                    )}
                  >
                    {g === 'All' ? 'All Grades' : `Grade ${g}`}
                  </button>
                ))}
            </div>

            {/* Posts List */}
            <div className="space-y-8">
              {loading ? (
                [1, 2, 3].map(i => (
                  <div key={i} className="bg-lux-surface animate-pulse h-64 rounded-[2.5rem] border border-lux-border" />
                ))
              ) : sortedPosts.length > 0 ? (
                <div className="space-y-8 pb-32">
                  {sortedPosts.map((post) => (
                    <DiscussionPostCard key={post.id} post={post} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-32 bg-lux-surface border border-dashed border-lux-border rounded-[3rem] shadow-lux-sm">
                  <div className="w-24 h-24 bg-lux-bg border border-lux-border/50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                    <MessageSquare size={40} className="text-lux-muted" />
                  </div>
                  <h3 className="text-3xl font-serif mb-4 text-lux-green-950">The floor is yours...</h3>
                  <p className="text-lux-muted max-w-sm mx-auto mb-10 text-sm font-light">
                    No discussions found in this category. Why not start the conversation?
                  </p>
                  <Button 
                    onClick={() => setIsModalOpen(true)}
                    className="rounded-xl px-10 h-14 text-[11px] uppercase tracking-widest font-bold bg-lux-green-950 text-lux-gold hover:bg-lux-green-900 border-none transition-all shadow-xl"
                  >
                    <Plus size={16} className="mr-2" />
                    Ask a Question
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Floating Action Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-10 right-10 w-16 h-16 bg-lux-gold text-lux-green-950 rounded-full shadow-lux-lg flex items-center justify-center z-40 group overflow-hidden border border-lux-gold-light"
      >
        <motion.div 
            animate={{ scale: [1, 1.2, 1] }} 
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute inset-0 bg-white/20" 
        />
        <Plus size={32} strokeWidth={3} className="relative z-10" />
      </motion.button>

      {/* Create Post Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <CreatePostModal 
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSuccess={() => {
              // Handled by real-time listener
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
