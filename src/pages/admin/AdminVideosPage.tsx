import React, { useState, useEffect } from 'react';
import { 
  Video, 
  Plus, 
  Search, 
  Trash2, 
  ExternalLink, 
  CheckCircle, 
  RefreshCw,
  Eye,
  Settings,
  MoreVertical,
  Play
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  deleteDoc, 
  doc, 
  addDoc,
  serverTimestamp,
  updateDoc 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { VideoLesson } from '../../types';
import { Button } from '../../components/ui/Button';
import { cn } from '../../lib/utils';

export function AdminVideosPage() {
  const [videos, setVideos] = useState<VideoLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'videoLessons'), orderBy('addedAt', 'desc'));
      const snap = await getDocs(q);
      setVideos(snap.docs.map(d => ({ id: d.id, ...d.data() } as VideoLesson)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkImport = async () => {
    const channelId = prompt('Enter YouTube Channel ID to import (e.g., UCP-xxxx). Note: This will import all videos from the channel uploads!\\n\\nMlungisi Nkosi Channel ID is likely: UCUMoUN0I_2s3W_NfF3JEDnQ or you can find it using a YT channel ID finder.', 'UCUMoUN0I_2s3W_NfF3JEDnQ');
    if (!channelId) return;
    
    // Optional: Ask for Subject & Grade to categorize them
    const ansSubj = prompt('Enter primary subject for these videos:', 'Physical Sciences');
    const ansGrade = prompt('Enter primary grade (e.g. 12, 11, 10):', '12');

    if (!confirm(`Are you sure you want to bulk import ALL videos from channel ${channelId}?`)) return;

    setLoading(true);
    try {
      const response = await fetch('/api/admin/import-youtube-channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId,
          subject: ansSubj || 'General',
          grade: Number(ansGrade) || 12,
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Import failed');
      }

      alert(`🎉 Success! ${data.message}`);
      fetchVideos();
    } catch(err: any) {
      console.error(err);
      alert('Failed to import videos: ' + err.message);
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this video?')) return;
    try {
      await deleteDoc(doc(db, 'videoLessons', id));
      setVideos(prev => prev.filter(v => v.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleVerify = async (id: string, current: boolean) => {
    try {
      await updateDoc(doc(db, 'videoLessons', id), { isActive: !current });
      setVideos(prev => prev.map(v => v.id === id ? { ...v, isActive: !current } : v));
    } catch (err) {
      console.error(err);
    }
  };

  const filteredVideos = videos.filter(v => 
    v.title.toLowerCase().includes(search.toLowerCase()) || 
    v.subject.toLowerCase().includes(search.toLowerCase()) ||
    v.topic.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-white border border-border-subtle rounded-[32px] sm:rounded-[40px] shadow-sm overflow-hidden text-lux-bg">
        <div className="p-6 sm:p-10 border-b border-border-subtle flex flex-col lg:flex-row lg:items-center justify-between gap-8 text-lux-bg">
           <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-10 flex-1 text-lux-bg">
              <div className="shrink-0">
                 <h3 className="text-xl font-serif text-text-primary mb-1">Video Lessons</h3>
                 <p className="text-xs text-lux-text font-bold uppercase tracking-widest">Manage educational video content</p>
              </div>
              <div className="relative flex-1 w-full max-w-md">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-lux-text" size={18} />
                 <input 
                   type="text" 
                   placeholder="Search videos by title or topic..." 
                   className="w-full pl-12 pr-4 py-3 bg-surface border border-border-subtle rounded-2xl sm:rounded-3xl text-xs font-bold outline-none focus:border-primary/30"
                   value={search}
                   onChange={(e) => setSearch(e.target.value)}
                 />
              </div>
           </div>
           
           <div className="flex flex-col sm:flex-row items-center gap-4 text-lux-bg w-full lg:w-auto">
              <Button variant="outline" onClick={handleBulkImport} className="w-full sm:w-auto border-black/10 text-lux-text font-bold">
                 Bulk Import YT Channel
              </Button>
              <Button variant="outline" onClick={fetchVideos} className="w-full sm:w-auto border-black/10 text-lux-bg">
                 <RefreshCw size={16} className={cn("mr-2", loading && "animate-spin")} /> Refresh
              </Button>
              <Button onClick={() => navigate('/admin/add-video')} className="w-full sm:w-auto rounded-2xl sm:rounded-3xl">
                 <Plus size={18} className="mr-2" /> Add Video
              </Button>
           </div>
        </div>

        <div className="overflow-x-auto">
           <table className="w-full">
              <thead>
                 <tr className="bg-surface text-left">
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-lux-text">Video</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-lux-text">Details</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-lux-text text-center">Stats</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-lux-text text-center">Status</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-lux-text text-right">Added</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-lux-text text-right">Actions</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                 {loading ? (
                    [1,2,3,4,5].map(i => (
                      <tr key={i} className="animate-pulse">
                         <td colSpan={6} className="px-8 py-5 h-20 bg-surface/30"></td>
                      </tr>
                    ))
                 ) : filteredVideos.length > 0 ? (
                   filteredVideos.map((v) => (
                     <tr key={v.id} className="hover:bg-surface/50 transition-all group">
                        <td className="px-8 py-5">
                           <div className="flex items-center gap-4">
                              <div className="relative w-24 aspect-video rounded-lg overflow-hidden border border-border-subtle group-hover:scale-105 transition-transform shrink-0">
                                 <img src={v.thumbnailUrl} className="w-full h-full object-cover" />
                                 <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Play size={20} className="text-lux-text fill-white" />
                                 </div>
                              </div>
                              <div className="min-w-0">
                                 <p className="text-sm font-bold text-text-primary line-clamp-1 mb-1">{v.title}</p>
                                 <p className="text-[10px] font-medium text-lux-text">from {v.creatorName}</p>
                              </div>
                           </div>
                        </td>
                        <td className="px-8 py-5">
                           <div className="flex flex-col">
                              <span className="text-[10px] font-black uppercase tracking-widest text-primary mb-0.5">{v.subject}</span>
                              <span className="text-xs font-bold text-lux-text">{v.topic} • Grade {v.grade || 'All'}</span>
                           </div>
                        </td>
                        <td className="px-8 py-5 text-center">
                           <div className="flex flex-col items-center">
                              <span className="text-xs font-bold text-text-primary">{v.viewCountOnGMA || 0}</span>
                              <span className="text-[10px] font-black uppercase text-lux-text">Views</span>
                           </div>
                        </td>
                        <td className="px-8 py-5 text-center">
                           <button 
                             onClick={() => handleToggleVerify(v.id, v.isActive)}
                             className={cn(
                               "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all",
                               v.isActive ? "bg-primary/10 text-primary border-primary/20" : "bg-text-tertiary/10 text-lux-text border-border-subtle"
                             )}
                           >
                              {v.isActive ? 'Active' : 'Hidden'}
                           </button>
                        </td>
                        <td className="px-8 py-5 text-right">
                           <span className="text-xs font-medium text-lux-text">
                              {v.addedAt ? new Date(v.addedAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                           </span>
                        </td>
                        <td className="px-8 py-5 text-right">
                           <div className="flex items-center justify-end gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-9 w-9 p-0 rounded-lg"
                                onClick={() => window.open(`https://youtube.com/watch?v=${v.youtubeVideoId}`)}
                              >
                                 <ExternalLink size={16} className="text-lux-text" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-9 w-9 p-0 rounded-lg hover:border-red-100 hover:bg-red-50"
                                onClick={() => handleDelete(v.id)}
                              >
                                 <Trash2 size={16} className="text-lux-text hover:text-red-500" />
                              </Button>
                           </div>
                        </td>
                     </tr>
                   ))
                 ) : (
                   <tr>
                     <td colSpan={6} className="px-8 py-20 text-center text-lux-text italic text-sm">
                        No videos found in the library.
                     </td>
                   </tr>
                 )}
              </tbody>
           </table>
        </div>
      </div>
  );
}
