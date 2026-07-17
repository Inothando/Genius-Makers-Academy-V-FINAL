import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { VideoLesson } from '../types';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { VideoCard } from '../components/videos/VideoCard';
import { VideoLessonPlayer } from '../components/videos/VideoLessonPlayer';
import { Loader2, Search, Filter } from 'lucide-react';
import { useTierGating } from '../hooks/useTierGating';
import { ExamCountdownWidget } from '../components/ExamCountdownWidget';

export function VideosBySubjectPage() {
  const { subject } = useParams<{ subject: string }>();
  const [videos, setVideos] = useState<VideoLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<VideoLesson | null>(null);
  const { filterIEBContent } = useTierGating();
  const [dismissedCountdown, setDismissedCountdown] = useState(false);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCreator, setSelectedCreator] = useState<string>('All');
  const [selectedTopic, setSelectedTopic] = useState<string>('All');
  const [selectedGrade, setSelectedGrade] = useState<string>('All');

  useEffect(() => {
    async function fetchVideos() {
      if (!subject) return;
      setLoading(true);
      try {
        const decodedSubject = decodeURIComponent(subject);
        const q = query(
          collection(db, 'videoLessons'),
          where('subject', '==', decodedSubject),
          where('isActive', '==', true),
          // orderBy('addedAt', 'desc')
        );
        const snap = await getDocs(q);
        const results = snap.docs.map(d => ({ id: d.id, ...d.data() } as VideoLesson));
        // Sort in memory to avoid needing compound index immediately, or you can add index
        results.sort((a, b) => b.addedAt?.seconds - a.addedAt?.seconds);
        setVideos(filterIEBContent(results));
      } catch(err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchVideos();
  }, [subject, filterIEBContent]);

  // Derived Filter Options
  const { creators, topics, grades } = useMemo(() => {
    const creatorSet = new Set<string>();
    const topicSet = new Set<string>();
    const gradeSet = new Set<number>();
    
    videos.forEach(v => {
      if (v.creatorName) creatorSet.add(v.creatorName);
      if (v.topic) topicSet.add(v.topic);
      if (v.grade) gradeSet.add(v.grade);
    });

    return {
      creators: Array.from(creatorSet).sort(),
      topics: Array.from(topicSet).sort(),
      grades: Array.from(gradeSet).sort((a, b) => b - a), // Descending
    };
  }, [videos]);

  const filteredVideos = useMemo(() => {
    return videos.filter(v => {
      const matchSearch = v.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (v.creatorName && v.creatorName.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchCreator = selectedCreator === 'All' || v.creatorName === selectedCreator;
      const matchTopic = selectedTopic === 'All' || v.topic === selectedTopic;
      const matchGrade = selectedGrade === 'All' || v.grade === Number(selectedGrade);
      
      return matchSearch && matchCreator && matchTopic && matchGrade;
    });
  }, [videos, searchQuery, selectedCreator, selectedTopic, selectedGrade]);

  const gradesToRender = selectedGrade === 'All' ? grades : [Number(selectedGrade)];

  return (
    <div className="min-h-screen bg-lux-border flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16 sm:py-24 md:py-32">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-serif text-lux-text mb-4 tracking-tight capitalize">
            {decodeURIComponent(subject || '').toLowerCase()}
          </h1>
          <p className="text-lux-text">Video lessons mapped to CAPS curriculum.</p>
        </div>

        {!dismissedCountdown && subject && (
          <div className="mb-8 relative z-20">
             <ExamCountdownWidget 
                subject={decodeURIComponent(subject)}
                onDismiss={() => setDismissedCountdown(true)}
             />
          </div>
        )}

        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-12 bg-lux-surface-alt p-4 rounded-2xl sm:rounded-3xl border border-lux-border backdrop-blur-sm relative z-20">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-lux-text" size={18} />
            <input 
              type="text" 
              placeholder="Search lessons..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-lux-surface-alt border border-lux-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-lux-text focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
          
          <div className="flex gap-4 overflow-x-auto pb-2 md:pb-0 scrollbar-hide shrink-0">
            <select 
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="bg-lux-surface-alt border border-lux-border rounded-xl px-4 py-2.5 text-sm text-lux-text focus:outline-none focus:border-primary/50 appearance-none min-w-[120px]"
            >
              <option value="All" className="bg-surface text-lux-text">Grade 12 Only</option>
              {grades.map(g => (
                <option key={g} value={g} className="bg-surface text-lux-text">Grade {g}</option>
              ))}
            </select>

            <select 
              value={selectedCreator}
              onChange={(e) => setSelectedCreator(e.target.value)}
              className="bg-lux-surface-alt border border-lux-border rounded-xl px-4 py-2.5 text-sm text-lux-text focus:outline-none focus:border-primary/50 appearance-none min-w-[150px]"
            >
              <option value="All" className="bg-surface text-lux-text">All Creators</option>
              {creators.map(c => (
                <option key={c} value={c} className="bg-surface text-lux-text">{c}</option>
              ))}
            </select>

            <select 
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="bg-lux-surface-alt border border-lux-border rounded-xl px-4 py-2.5 text-sm text-lux-text focus:outline-none focus:border-primary/50 appearance-none min-w-[150px]"
            >
              <option value="All" className="bg-surface text-lux-text">All Topics</option>
              {topics.map(t => (
                <option key={t} value={t} className="bg-surface text-lux-text">{t}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-20">
             <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="text-center py-20 text-lux-text">
            No videos found matching your filters.
          </div>
        ) : (
          <div className="space-y-16">
            {gradesToRender.map(grade => {
              const gradeVideos = filteredVideos.filter(v => v.grade === grade);
              if (gradeVideos.length === 0) return null;
              
              return (
                <section key={grade}>
                  <h2 className="text-xl font-bold text-lux-text mb-6 flex items-center gap-3">
                    Grade {grade}
                    <div className="h-px bg-lux-border flex-1 ml-4 shadow-sm" />
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {gradeVideos.map(video => (
                      <VideoCard
                        key={video.id}
                        video={video}
                        onClick={(v) => setSelectedVideo(v)}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>

      {selectedVideo && (
        <VideoLessonPlayer
          isOpen={true}
          onClose={() => setSelectedVideo(null)}
          video={selectedVideo}
        />
      )}
      
      <Footer />
    </div>
  );
}
