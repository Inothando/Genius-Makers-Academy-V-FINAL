import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { StudyPack, StudyPackFilters } from '../types';

// Global memory cache for study packs query results to enable instant page loads and seamless back-and-forth transitions.
const packsCache = new Map<string, StudyPack[]>();
const packsPromiseCache = new Map<string, Promise<StudyPack[]>>();

export function useStudyPacks(filters: StudyPackFilters) {
  // Generate a distinct cache key based on non-search filter parameters
  const cacheKey = `${filters.grade}_${filters.curriculum}_${filters.subject}`;
  
  const [packs, setPacks] = useState<StudyPack[]>(packsCache.get(cacheKey) || []);
  const [loading, setLoading] = useState(!packsCache.has(cacheKey));

  useEffect(() => {
    let active = true;

    async function fetchPacks() {
      // Check search in key - we don't want to cache search queries to keep cache smaller, but we can do it client-side
      const cached = packsCache.get(cacheKey);
      if (cached) {
        if (active) {
          // Client-side search filtering on fast cache
          let filtered = [...cached];
          if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filtered = filtered.filter(p => 
              p.title.toLowerCase().includes(searchLower) || 
              p.subject.toLowerCase().includes(searchLower) ||
              p.description.toLowerCase().includes(searchLower)
            );
          }
          setPacks(filtered);
          setLoading(false);
        }
        // Proceed to refresh in background silently to ensure up-to-date data without blocking loading spinners
      } else {
        setLoading(true);
      }

      // Check for shared in-flight fetch promise for this specific filter key
      let currentQueryPromise = packsPromiseCache.get(cacheKey);
      if (!currentQueryPromise) {
        currentQueryPromise = (async () => {
          let q = query(
            collection(db, 'studyPacks'),
            where('isPublic', '==', true)
          );

          if (filters.grade && filters.grade !== 'All') {
            q = query(q, where('grade', '==', parseInt(filters.grade)));
          }
          if (filters.curriculum && filters.curriculum !== 'All') {
            q = query(q, where('curriculum', 'in', [filters.curriculum, 'Both']));
          }
          if (filters.subject && filters.subject !== 'All') {
            q = query(q, where('subject', '==', filters.subject));
          }

          q = query(q, orderBy('createdAt', 'desc'));

          const snapshot = await getDocs(q);
          const results = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as StudyPack));
          
          packsCache.set(cacheKey, results);
          return results;
        })();

        packsPromiseCache.set(cacheKey, currentQueryPromise);
      }

      try {
        const rawResults = await currentQueryPromise;
        if (!active) return;

        // Apply client-side search text filtering
        let displayResults = [...rawResults];
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          displayResults = displayResults.filter(p => 
            p.title.toLowerCase().includes(searchLower) || 
            p.subject.toLowerCase().includes(searchLower) ||
            p.description.toLowerCase().includes(searchLower)
          );
        }

        setPacks(displayResults);
      } catch (err) {
        console.error("Error fetching study packs:", err);
      } finally {
        if (active) {
          setLoading(false);
        }
        // Clean up promise cache once resolved completed
        packsPromiseCache.delete(cacheKey);
      }
    }

    fetchPacks();

    return () => {
      active = false;
    };
  }, [cacheKey, filters.search]);

  return { packs, loading };
}
