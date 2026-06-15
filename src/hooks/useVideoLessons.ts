import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { VideoLesson, VideoFilters } from '../types';

// Global memory cache for video lessons query results to enable instant page loads and seamless transitions.
const videosCache = new Map<string, VideoLesson[]>();
const videosPromiseCache = new Map<string, Promise<VideoLesson[]>>();

export function useVideoLessons(filters: VideoFilters) {
  const cacheKey = `${filters.grade}_${filters.curriculum}_${filters.subject}`;
  const [videos, setVideos] = useState<VideoLesson[]>(videosCache.get(cacheKey) || []);
  const [loading, setLoading] = useState(!videosCache.has(cacheKey));

  useEffect(() => {
    let active = true;

    async function fetchVideos() {
      const cached = videosCache.get(cacheKey);
      if (cached) {
        if (active) {
          setVideos(cached);
          setLoading(false);
        }
      } else {
        setLoading(true);
      }

      let currentQueryPromise = videosPromiseCache.get(cacheKey);
      if (!currentQueryPromise) {
        currentQueryPromise = (async () => {
          const path = 'videos';
          let q = query(collection(db, path));

          if (filters.grade && filters.grade !== 'All') {
            q = query(q, where('grade', '==', parseInt(filters.grade)));
          }
          if (filters.curriculum && filters.curriculum !== 'All') {
            q = query(q, where('curriculum', 'in', [filters.curriculum, 'Both', 'All']));
          }
          if (filters.subject && filters.subject !== 'All') {
            q = query(q, where('subject', '==', filters.subject));
          }

          q = query(q, orderBy('createdAt', 'desc'));

          const snapshot = await getDocs(q);
          const results = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as VideoLesson));

          videosCache.set(cacheKey, results);
          return results;
        })();

        videosPromiseCache.set(cacheKey, currentQueryPromise);
      }

      try {
        const rawResults = await currentQueryPromise;
        if (active) {
          setVideos(rawResults);
        }
      } catch (err: any) {
        console.error("Error fetching videos:", err);
        if (!err.message?.includes('offline') && err.code !== 'unavailable') {
          handleFirestoreError(err, OperationType.LIST, 'videos');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
        videosPromiseCache.delete(cacheKey);
      }
    }

    fetchVideos();

    return () => {
      active = false;
    };
  }, [cacheKey]);

  return { videos, loading };
}
