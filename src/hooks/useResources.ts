import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Resource, ResourceFilters } from '../types';

// Global memory cache for resources query results to enable instant page loads and seamless transitions.
const resourcesCache = new Map<string, Resource[]>();
const resourcesPromiseCache = new Map<string, Promise<Resource[]>>();

export function useResources(filters: ResourceFilters) {
  const cacheKey = `${filters.grade}_${filters.curriculum}_${filters.subject}_${filters.fileType}`;
  const [resources, setResources] = useState<Resource[]>(resourcesCache.get(cacheKey) || []);
  const [loading, setLoading] = useState(!resourcesCache.has(cacheKey));

  useEffect(() => {
    let active = true;

    async function fetchResources() {
      const cached = resourcesCache.get(cacheKey);
      if (cached) {
        if (active) {
          let filtered = [...cached];
          if (filters.search) {
            filtered = filtered.filter(r => 
              r.title.toLowerCase().includes(filters.search!.toLowerCase()) ||
              r.description.toLowerCase().includes(filters.search!.toLowerCase()) ||
              r.tags.some(t => t.toLowerCase().includes(filters.search!.toLowerCase()))
            );
          }
          setResources(filtered);
          setLoading(false);
        }
      } else {
        setLoading(true);
      }

      let currentQueryPromise = resourcesPromiseCache.get(cacheKey);
      if (!currentQueryPromise) {
        currentQueryPromise = (async () => {
          const path = 'resources';
          let q = query(collection(db, path), where('isApproved', '==', true));

          if (filters.grade && filters.grade !== 'All') {
            q = query(q, where('grade', '==', parseInt(filters.grade)));
          }
          if (filters.curriculum && filters.curriculum !== 'All') {
            q = query(q, where('curriculum', 'in', [filters.curriculum, 'Both']));
          }
          if (filters.subject && filters.subject !== 'All') {
            q = query(q, where('subject', '==', filters.subject));
          }
          if (filters.fileType && filters.fileType !== 'All') {
            q = query(q, where('fileType', '==', filters.fileType));
          }

          q = query(q, orderBy('createdAt', 'desc'));

          const snapshot = await getDocs(q);
          const results = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as Resource));

          resourcesCache.set(cacheKey, results);
          return results;
        })();

        resourcesPromiseCache.set(cacheKey, currentQueryPromise);
      }

      try {
        const rawResults = await currentQueryPromise;
        if (!active) return;

        let displayResults = [...rawResults];
        if (filters.search) {
          displayResults = displayResults.filter(r => 
            r.title.toLowerCase().includes(filters.search!.toLowerCase()) ||
            r.description.toLowerCase().includes(filters.search!.toLowerCase()) ||
            r.tags.some(t => t.toLowerCase().includes(filters.search!.toLowerCase()))
          );
        }

        setResources(displayResults);
      } catch (err: any) {
        console.error("Error fetching resources:", err);
        if (!err.message?.includes('offline') && err.code !== 'unavailable') {
          handleFirestoreError(err, OperationType.LIST, 'resources');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
        resourcesPromiseCache.delete(cacheKey);
      }
    }

    fetchResources();

    return () => {
      active = false;
    };
  }, [cacheKey, filters.search]);

  return { resources, loading };
}
