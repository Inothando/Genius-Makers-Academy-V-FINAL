import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { DiscussionPost, PostFilters } from '../types';

export function useDiscussionPosts(filters: PostFilters) {
  const [posts, setPosts] = useState<DiscussionPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const path = 'discussions';
    let q = query(collection(db, path));

    if (filters.grade && filters.grade !== 'All') {
      q = query(q, where('grade', '==', parseInt(filters.grade)));
    }
    if (filters.curriculum && filters.curriculum !== 'All') {
      q = query(q, where('curriculum', 'in', [filters.curriculum, 'Both']));
    }
    if (filters.subject && filters.subject !== 'All') {
      q = query(q, where('subject', '==', filters.subject));
    }
    if (filters.topic) {
      q = query(q, where('topic', '==', filters.topic));
    }

    q = query(q, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as DiscussionPost));
      setPosts(results);
      setLoading(false);
    }, (error) => {
      console.error("Discussion monitoring error:", error);
      if (!error.message?.includes('offline') && error.code !== 'unavailable') {
        handleFirestoreError(error, OperationType.GET, path);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [filters]);

  return { posts, loading };
}
