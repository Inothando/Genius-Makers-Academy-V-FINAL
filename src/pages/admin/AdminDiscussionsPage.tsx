import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Search, 
  Trash2, 
  AlertTriangle, 
  Flag, 
  Check, 
  MoreVertical,
  ThumbsUp,
  MessageCircle,
  Filter,
  Eye,
  ShieldCheck,
  CheckSquare,
  Square,
  X
} from 'lucide-react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  deleteDoc, 
  doc, 
  Timestamp,
  writeBatch,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { DiscussionPost } from '../../types';
import { Button } from '../../components/ui/Button';
import { cn } from '../../lib/utils';
import { useAdminAuth } from '../../hooks/useAdminAuth';

const DEFAULT_FLAG_KEYWORDS = ['exam leak', 'cheating', 'leak', 'papers for sale', 'buy paper', 'sell paper', 'dm for paper', 'scam', 'betting', 'bet'];

export function AdminDiscussionsPage() {
  const { adminUser } = useAdminAuth();
  const [posts, setPosts] = useState<DiscussionPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [inappropriateWords, setInappropriateWords] = useState<string[]>(DEFAULT_FLAG_KEYWORDS);

  useEffect(() => {
    // Real-time onSnapshot
    const q = query(collection(db, 'discussions'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DiscussionPost)));
      setLoading(false);
    });

    // Also fetch custom moderation words if any
    const settingsUnsubscribe = onSnapshot(doc(db, 'settings', 'moderation'), (doc) => {
      if (doc.exists() && doc.data().keywords) {
        setInappropriateWords(doc.data().keywords);
      }
    });

    return () => {
      unsubscribe();
      settingsUnsubscribe();
    };
  }, []);

  const isFlagged = (content: string, topic: string) => {
    const combined = (content + ' ' + topic).toLowerCase();
    return inappropriateWords.some(kw => combined.includes(kw.toLowerCase()));
  };

  const handleDelete = async (id: string, authorName: string) => {
    if (!confirm(`Permanently delete post by ${authorName}?`)) return;
    try {
      await deleteDoc(doc(db, 'discussions', id));
      
      await addDoc(collection(db, 'admin_audit_log'), {
        action: 'moderation_delete_post',
        actorUid: adminUser?.uid,
        actorName: adminUser?.displayName,
        targetName: authorName,
        details: `Deleted discussion post: ${id}`,
        timestamp: serverTimestamp()
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Permanently delete ${selectedIds.length} selected posts?`)) return;
    try {
      const batch = writeBatch(db);
      selectedIds.forEach(id => {
        batch.delete(doc(db, 'discussions', id));
      });

      await batch.commit();

      await addDoc(collection(db, 'admin_audit_log'), {
        action: 'moderation_bulk_delete',
        actorUid: adminUser?.uid,
        actorName: adminUser?.displayName,
        details: `Bulk deleted ${selectedIds.length} posts`,
        timestamp: serverTimestamp()
      });

      setSelectedIds([]);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const selectAll = () => {
    if (selectedIds.length === filteredPosts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredPosts.map(p => p.id));
    }
  };

  const sortedPosts = [...posts].sort((a, b) => {
    const aFlag = isFlagged(a.content, a.topic);
    const bFlag = isFlagged(b.content, b.topic);
    if (aFlag && !bFlag) return -1;
    if (!aFlag && bFlag) return 1;
    return 0;
  });

  const filteredPosts = sortedPosts.filter(p => 
    p.topic.toLowerCase().includes(search.toLowerCase()) || 
    p.content.toLowerCase().includes(search.toLowerCase()) ||
    p.authorName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-lux-text mb-1">Moderation</h1>
          <p className="text-sm text-lux-text font-medium uppercase tracking-wider flex items-center gap-2">
            Discussion posts from the community {loading && <Loader2 size={12} className="animate-spin" />}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-[#111111] border border-lux-border rounded-xl flex items-center px-4 py-2 text-[10px] font-bold text-amber-500 uppercase tracking-widest gap-2">
            <AlertTriangle size={14} />
            {posts.filter(p => isFlagged(p.content, p.topic)).length} Flagged
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-lux-text" size={16} />
            <input 
              type="text" 
              placeholder="Search forum..." 
              className="bg-[#111111] border border-lux-border rounded-xl py-2.5 pl-10 pr-4 text-xs text-lux-text focus:border-[var(--color-lux-green-500)] outline-none transition-all w-64 shadow-lg shadow-black/20"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl sm:rounded-3xl flex items-center justify-between animate-in slide-in-from-top-4 duration-300">
           <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-red-500">{selectedIds.length} posts selected for removal</span>
           </div>
           <div className="flex items-center gap-2">
              <button 
                onClick={() => setSelectedIds([])}
                className="px-4 py-2 text-xs font-bold text-lux-text hover:text-lux-text"
              >
                Cancel
              </button>
              <button 
                onClick={handleBulkDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-lux-text rounded-lg text-xs font-bold transition-all shadow-lg shadow-red-600/20 flex items-center gap-2"
              >
                <Trash2 size={14} /> Delete Selected
              </button>
           </div>
        </div>
      )}

      <div className="bg-[#111111] border border-lux-border rounded-2xl sm:rounded-3xl overflow-hidden min-h-[600px] shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-lux-border bg-lux-bg/20">
                <th className="px-6 py-4 w-12">
                   <button onClick={selectAll} className="text-lux-text hover:text-[var(--color-lux-green-500)] transition-colors">
                      {selectedIds.length === filteredPosts.length && filteredPosts.length > 0 ? <CheckSquare size={18} className="text-[var(--color-lux-green-500)]" /> : <Square size={18} />}
                   </button>
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-lux-text uppercase tracking-widest">Author</th>
                <th className="px-6 py-4 text-[10px] font-bold text-lux-text uppercase tracking-widest">Context</th>
                <th className="px-6 py-4 text-[10px] font-bold text-lux-text uppercase tracking-widest">Post Content</th>
                <th className="px-6 py-4 text-[10px] font-bold text-lux-text uppercase tracking-widest text-center">Engagement</th>
                <th className="px-6 py-4 text-[10px] font-bold text-lux-text uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/40">
              {filteredPosts.length > 0 ? (
                filteredPosts.map((p) => {
                  const flagged = isFlagged(p.content, p.topic);
                  const isSelected = selectedIds.includes(p.id);
                  return (
                    <tr key={p.id} className={cn(
                      "hover:bg-lux-bg/30 transition-all group",
                      flagged ? "bg-amber-500/[0.03]" : "",
                      isSelected ? "bg-[var(--color-lux-green-500)]/5" : ""
                    )}>
                      <td className="px-6 py-4">
                         <button onClick={() => toggleSelect(p.id)} className={cn("transition-colors", isSelected ? "text-[var(--color-lux-green-500)]" : "text-lux-text hover:text-lux-text")}>
                            {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                         </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-full border flex items-center justify-center font-bold text-xs",
                            flagged ? "bg-amber-500/10 border-amber-500/20 text-amber-500" : "bg-lux-surface-alt border-lux-border text-lux-text"
                          )}>
                            {p.authorName.charAt(0)}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-lux-text mb-0.5">{p.authorName}</span>
                            <span className="text-[10px] text-lux-text font-medium uppercase tracking-widest">{p.isGuest ? 'Guest' : 'Scholar'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-[var(--color-lux-green-500)] uppercase tracking-widest">{p.subject}</span>
                          <span className="text-[10px] text-lux-text whitespace-nowrap">Grade {p.grade} • {p.curriculum}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                         <div className="max-w-md">
                            <div className="flex items-center gap-2 mb-1.5">
                               <h4 className="text-sm font-bold text-lux-text truncate">{p.topic}</h4>
                               {flagged && (
                                 <span className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-500/10 text-amber-500 text-[8px] font-black uppercase rounded border border-amber-500/20">
                                   <AlertTriangle size={8} /> Flagged
                                 </span>
                               )}
                            </div>
                            <p className="text-xs text-lux-text italic line-clamp-2 leading-relaxed">
                               "{p.content}"
                            </p>
                         </div>
                      </td>
                      <td className="px-6 py-4">
                         <div className="flex items-center justify-center gap-6">
                            <div className="flex flex-col items-center">
                               <span className="text-xs font-bold text-lux-text">{p.replyCount}</span>
                               <span className="text-[8px] text-lux-text font-black uppercase">Replies</span>
                            </div>
                            <div className="flex flex-col items-center text-primary/70">
                               <span className="text-xs font-bold text-lux-text">{p.likeCount}</span>
                               <span className="text-[8px] text-lux-text font-black uppercase">Likes</span>
                            </div>
                         </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                         <div className="flex items-center justify-end gap-2 pr-2">
                           <button className="p-2 text-lux-text hover:text-lux-text hover:bg-lux-surface-alt rounded-lg transition-all" title="View Full Thread">
                              <Eye size={18} />
                           </button>
                           <button 
                             onClick={() => handleDelete(p.id, p.authorName)}
                             className="p-2 text-lux-text hover:text-red-500 hover:bg-red-500/5 rounded-lg transition-all" 
                             title="Delete Post"
                           >
                              <Trash2 size={18} />
                           </button>
                         </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                   <td colSpan={6} className="py-20 text-center">
                      <MessageSquare size={48} className="mx-auto text-lux-text mb-4 opacity-20" />
                      <p className="text-sm text-lux-text italic">No forum threads found</p>
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Loader2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("animate-spin", props.className)}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
