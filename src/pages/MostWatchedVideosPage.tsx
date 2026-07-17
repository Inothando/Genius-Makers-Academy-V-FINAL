import React, { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { VideoLesson } from '../types';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { VideoCard } from '../components/videos/VideoCard';
import { VideoLessonPlayer } from '../components/videos/VideoLessonPlayer';
import { Loader2, TrendingUp } from 'lucide-react';
import { useTierGating } from '../hooks/useTierGating';

export function MostWatchedVideosPage() {
  const [videos, setVideos] = useState<VideoLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<VideoLesson | null>(null);
  const { filterIEBContent } = useTierGating();

  useEffect(() => {
    async function fetchTrending() {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'videoLessons'),
          where('isActive', '==', true),
          orderBy('viewCountOnGMA', 'desc'),
          limit(100) // fetch more to account for filtering
        );
        const snap = await getDocs(q);
        const results = snap.docs.map(d => ({ id: d.id, ...d.data() } as VideoLesson));
        setVideos(filterIEBContent(results).slice(0, 50));
      } catch(err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchTrending();
  }, [filterIEBContent]);

  return (
    <div className="min-h-screen bg-lux-border flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16 sm:py-24 md:py-32">
        <div className="mb-12 flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 flex items-center justify-center rounded-2xl sm:rounded-3xl">
             <TrendingUp className="text-primary" size={24} />
          </div>
          <div>
            <h1 className="text-4xl md:text-5xl font-serif text-lux-text mb-2 tracking-tight">
              Most Watched
            </h1>
            <p className="text-lux-text">Trending video lessons across Mathematics and Physical Sciences.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-20">
             <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-20 text-lux-text">
            No trending videos found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video, idx) => (
              <div key={video.id} className="relative">
                {idx < 5 && (
                  <div className="absolute -top-3 -right-3 w-8 h-8 bg-[#CCA43B] text-lux-bg font-black flex items-center justify-center rounded-full z-10 shadow-[0_0_20px_rgba(204,164,59,0.5)]">
                    #{idx + 1}
                  </div>
                )}
                <VideoCard
                  video={video}
                  onClick={(v) => setSelectedVideo(v)}
                />
              </div>
            ))}
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
