import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export function useTierGating() {
  const { user } = useAuth();
  const [tier, setTier] = useState<string>('free');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTier() {
      if (!user) {
        setTier('free');
        setLoading(false);
        return;
      }
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setTier(docSnap.data().tier || 'starter');
        } else {
          setTier('starter');
        }
      } catch (err) {
        setTier('starter');
      } finally {
        setLoading(false);
      }
    }
    fetchTier();
  }, [user]);

  // free and starter map to 'Starter' equivalent tier visually, Scholar and upwards get IEB
  const canAccessIEB = tier !== 'free' && tier !== 'starter';

  const filterIEBContent = <T extends { curriculum?: string | null }>(items: T[]): T[] => {
    if (canAccessIEB) return items;
    return items.filter(item => {
      if (!item.curriculum) return true;
      const c = item.curriculum.toUpperCase();
      return c !== 'IEB'; // Both and NSC are fine, restrict explicitly IEB ones.
    });
  };

  return { tier, canAccessIEB, filterIEBContent, loading };
}
