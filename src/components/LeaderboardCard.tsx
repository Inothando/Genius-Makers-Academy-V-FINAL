import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { Trophy, Users, BookOpen, UserPlus, Flame } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/Button';

interface LeaderboardEntry {
  uid: string;
  displayName: string;
  scope: string;
  scopeId: string;
  metric: string;
  value: number;
  optedIn: boolean;
}

export function LeaderboardCard() {
  const { userProfile, user } = useAuth();
  const [scope, setScope] = useState<'school' | 'subject' | 'friends'>('school');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchLeaderboard() {
      if (!user) return;
      setLoading(true);
      
      try {
        let q;
        if (scope === 'school' && userProfile?.schoolId) {
           q = query(
             collection(db, 'leaderboardEntries'),
             where('scope', '==', 'school'),
             where('scopeId', '==', userProfile.schoolId),
             where('optedIn', '==', true),
             orderBy('value', 'desc'),
             limit(20)
           );
        } else if (scope === 'subject') {
           // For simplicity, rank by longestStreak nationally for subject
           q = query(
             collection(db, 'leaderboardEntries'),
             where('scope', '==', 'subject_grade'),
             where('optedIn', '==', true),
             orderBy('value', 'desc'),
             limit(10)
           );
        } else if (scope === 'friends' && userProfile?.friendsList && userProfile.friendsList.length > 0) {
           const allIds = [user.uid, ...userProfile.friendsList];
           q = query(
             collection(db, 'leaderboardEntries'),
             where('scope', '==', 'friends'),
             where('uid', 'in', allIds), // small group query ok
             where('optedIn', '==', true),
             orderBy('value', 'desc')
           );
        }
        
        if (q) {
          const snap = await getDocs(q);
          const results: LeaderboardEntry[] = [];
          snap.forEach(d => results.push(d.data() as LeaderboardEntry));
          setEntries(results);
        } else {
          setEntries([]);
        }
      } catch (err) {
        console.error("Leaderboard fetch error", err);
      }
      setLoading(false);
    }
    fetchLeaderboard();
  }, [scope, userProfile, user]);

  if (!userProfile) return null;

  return (
    <div className="glass-panel p-8 shadow-lux-sm overflow-hidden flex flex-col h-[500px]">
       <div className="flex items-center gap-3 mb-6 shrink-0">
          <Trophy size={24} className="text-lux-green-500" />
          <h3 className="text-xl font-serif text-lux-text">Leaderboards</h3>
       </div>

       {userProfile.optedInLeaderboard ? (
         <>
           <div className="flex gap-2 mb-6 p-1 bg-lux-bg border border-lux-border rounded-xl shrink-0">
              <button onClick={() => setScope('school')} className={cn("flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors", scope === 'school' ? "bg-lux-surface text-lux-green-500" : "text-lux-text hover:text-lux-green-900")}>School</button>
              <button onClick={() => setScope('subject')} className={cn("flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors", scope === 'subject' ? "bg-lux-surface text-lux-green-500" : "text-lux-text hover:text-lux-green-900")}>Subject</button>
              <button onClick={() => setScope('friends')} className={cn("flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors", scope === 'friends' ? "bg-lux-surface text-lux-green-500" : "text-lux-text hover:text-lux-green-900")}>Friends</button>
           </div>

           <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {loading ? (
                <div className="flex justify-center py-12"><div className="w-8 h-8 rounded-full border-2 border-lux-green-500 border-t-transparent animate-spin"/></div>
              ) : entries.length === 0 ? (
                <div className="text-center py-12">
                   <p className="text-sm text-lux-text">
                      {scope === 'school' && !userProfile.schoolId ? "Add your school in Profile Details first." : "No entries here yet."}
                   </p>
                </div>
              ) : (
                <div className="space-y-2">
                   {entries.map((entry, idx) => (
                     <div key={entry.uid} className={cn("flex items-center justify-between p-3 rounded-xl border transition-colors", entry.uid === user?.uid ? "bg-lux-surface/5 border-lux-border/20" : "bg-lux-bg border-lux-border hover:border-lux-border/80")}>
                        <div className="flex items-center gap-3">
                           <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm", idx === 0 ? "bg-lux-green-500 text-lux-text" : idx === 1 ? "bg-lux-surface00 text-lux-text" : idx === 2 ? "bg-orange-200 text-orange-800" : "bg-lux-surface text-lux-text border border-lux-border")}>
                              {idx + 1}
                           </div>
                           <span className={cn("font-medium text-sm", entry.uid === user?.uid ? "text-lux-text font-bold" : "text-lux-text")}>
                              {entry.uid === user?.uid ? "(You) " : ""}{entry.displayName}
                           </span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-lux-surface px-2 py-1 rounded border border-lux-border shadow-sm">
                           {scope === 'subject' ? <BookOpen size={12} className="text-lux-green-500" /> : <Flame size={12} className="text-orange-500" />}
                           <span className="text-xs font-bold text-lux-text">{entry.value}</span>
                        </div>
                     </div>
                   ))}
                </div>
              )}
           </div>
         </>
       ) : (
         <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-lux-bg border border-lux-border rounded-2xl sm:rounded-3xl">
            <Users size={48} className="text-lux-green-500 mb-4" />
            <h4 className="text-lg font-bold text-lux-text mb-2">Join the Community</h4>
            <p className="text-sm text-lux-text mb-6">Opt in to leaderboards to see how you compare securely and anonymously among your small groups.</p>
            <Button 
               onClick={async () => {
                 if (!user) return;
                 try {
                   const { doc, updateDoc } = await import('firebase/firestore');
                   await updateDoc(doc(db, 'users', user.uid), { optedInLeaderboard: true });
                   // The useAuth hook or local state should update.
                   window.location.reload(); 
                 } catch(err) {
                   console.error(err);
                 }
               }} 
               className="bg-lux-surface text-lux-green-500 hover:bg-lux-bg rounded-xl px-6 h-12 text-xs font-bold uppercase tracking-widest shadow-lux-sm"
            >
               Enable Leaderboards
            </Button>
         </div>
       )}
    </div>
  );
}
