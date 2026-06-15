import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  Save, 
  Sparkles, 
  Check, 
  AlertCircle, 
  Loader2, 
  Trash2, 
  Link as LinkIcon,
  Play,
  Upload
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { db, auth } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp, writeBatch, doc } from 'firebase/firestore';
import { cn } from '../../lib/utils';

// Consts
const SUBJECTS = [
  'MATHEMATICS', 'PHYSICAL SCIENCES', 'LIFE SCIENCES', 'HISTORY', 'GEOGRAPHY', 
  'ACCOUNTING', 'BUSINESS STUDIES', 'ECONOMICS', 'ENGLISH HL', 'AFRIKAANS FAL'
];

const GRADES = [
  { value: 8, label: 'Grade 8' },
  { value: 9, label: 'Grade 9' },
  { value: 10, label: 'Grade 10' },
  { value: 11, label: 'Grade 11' },
  { value: 12, label: 'Grade 12' },
  { value: 0, label: 'All Grades' } 
];

const CURRICULUMS = ['NSC', 'All'];

interface BulkVideo {
  url: string;
  id: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
  subject: string;
  grade: number | null;
  curriculum: string;
  topic: string;
  isShort: boolean;
  duration: string;
  isVerified: boolean;
  status: 'pending' | 'loading' | 'success' | 'error';
}

export function AddVideoPage() {
  // Single Video Form State
  const [url, setUrl] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    youtubeId: '',
    thumbnailUrl: '',
    channelName: '',
    channelId: '',
    subject: '',
    grade: 12 as number | null,
    curriculum: 'Both',
    topic: '',
    duration: '00:00',
    isVerified: true,
    isShort: false,
    playlistId: ''
  });
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Bulk Import State
  const [bulkInput, setBulkInput] = useState('');
  const [bulkVideos, setBulkVideos] = useState<BulkVideo[]>([]);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);

  const extractYoutubeId = (url: string) => {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : url;
  };

  const fetchOEmbed = async (videoUrl: string) => {
    try {
      const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`);
      if (!response.ok) throw new Error('Failed to fetch video details');
      return await response.json();
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const handleUrlBlur = async () => {
    if (!url) return;
    setIsFetching(true);
    const videoId = extractYoutubeId(url);
    const details = await fetchOEmbed(url.includes('http') ? url : `https://www.youtube.com/watch?v=${videoId}`);
    
    if (details) {
      setFormData(prev => ({
        ...prev,
        title: details.title,
        youtubeId: videoId,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        channelName: details.author_name,
        channelId: details.author_url.split('@')[1] || '',
        isShort: details.title.toLowerCase().includes('#short')
      }));
    }
    setIsFetching(false);
  };

  const handleSave = async () => {
    if (!formData.youtubeId || !formData.subject) return;
    setIsSaving(true);
    try {
      await addDoc(collection(db, 'videos'), {
        ...formData,
        grade: formData.grade === 0 ? null : formData.grade,
        viewCount: 0,
        createdAt: serverTimestamp()
      });
      setUrl('');
      setFormData({
        title: '',
        youtubeId: '',
        thumbnailUrl: '',
        channelName: '',
        channelId: '',
        subject: '',
        grade: 12,
        curriculum: 'Both',
        topic: '',
        duration: '00:00',
        isVerified: true,
        isShort: false,
        playlistId: ''
      });
      alert('Video saved successfully!');
    } catch (err) {
      console.error(err);
      alert('Error saving video');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkProcess = async () => {
    const urls = bulkInput.split('\n').filter(u => u.trim());
    if (urls.length === 0) return;

    setIsProcessingBulk(true);
    const newVideos: BulkVideo[] = [];

    for (const videoUrl of urls) {
      const videoId = extractYoutubeId(videoUrl);
      newVideos.push({
        url: videoUrl,
        id: videoId,
        title: 'Fetching...',
        channelName: '',
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        subject: '',
        grade: 12,
        curriculum: 'Both',
        topic: '',
        isShort: false,
        duration: '10:00',
        isVerified: true,
        status: 'loading'
      });
    }
    setBulkVideos(newVideos);

    // Gemini bulk categorisation disabled temporarily for security
    // We should move this logic to a backend /api route.
    const processedVideos = [...newVideos];
    
    for (let i = 0; i < processedVideos.length; i++) {
        try {
          const details = await fetchOEmbed(processedVideos[i].url.includes('http') ? processedVideos[i].url : `https://www.youtube.com/watch?v=${processedVideos[i].id}`);
          if (details) {
            processedVideos[i].title = details.title;
            processedVideos[i].channelName = details.author_name;
            processedVideos[i].status = 'success';
          } else {
            processedVideos[i].status = 'error';
          }
        } catch (err) {
          console.error(err);
          processedVideos[i].status = 'error';
        }
        setBulkVideos([...processedVideos]);
    }
    setIsProcessingBulk(false);
  };

  const handleBulkSaveAll = async () => {
    setIsSaving(true);
    try {
      const batch = writeBatch(db);
      bulkVideos.forEach(v => {
        if (v.status === 'success' && v.subject) {
          const newDocRef = doc(collection(db, 'videos'));
          batch.set(newDocRef, {
            youtubeId: v.id,
            title: v.title,
            thumbnailUrl: v.thumbnailUrl,
            channelName: v.channelName,
            channelId: '', // Would need more API calls
            subject: v.subject,
            grade: v.grade,
            curriculum: v.curriculum,
            topic: v.topic,
            isShort: v.isShort,
            duration: v.duration,
            isVerified: v.isVerified,
            playlistId: null,
            viewCount: 0,
            createdAt: serverTimestamp()
          });
        }
      });
      await batch.commit();
      setBulkVideos([]);
      setBulkInput('');
      alert('All videos saved to Firestore!');
    } catch (err) {
      console.error(err);
      alert('Error saving batch');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
          {/* Single Import */}
          <div className="space-y-8">
            <div className="bg-white rounded-[32px] p-8 border border-border-subtle shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Plus size={20} className="text-primary" />
                </div>
                <h2 className="text-xl font-bold text-text-primary">Add Single Video</h2>
              </div>

              <div className="space-y-6">
                <div>
                   <label className="block text-xs font-black uppercase tracking-widest text-text-tertiary mb-2">YouTube URL / ID</label>
                   <div className="relative">
                     <Play className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary" size={18} />
                     <input 
                       type="text"
                       placeholder="Paste URL or ID here..."
                       value={url}
                       onChange={(e) => setUrl(e.target.value)}
                       onBlur={handleUrlBlur}
                       className="w-full pl-12 pr-4 py-3 bg-surface border border-border-subtle rounded-2xl text-sm outline-none focus:border-primary/30 transition-all font-medium"
                     />
                     {isFetching && (
                       <div className="absolute right-4 top-1/2 -translate-y-1/2">
                         <Loader2 size={16} className="text-primary animate-spin" />
                       </div>
                     )}
                   </div>
                </div>

                {formData.youtubeId && (
                  <div className="p-4 bg-surface rounded-2xl border border-border-subtle flex gap-4">
                    <img src={formData.thumbnailUrl} className="w-32 aspect-video object-cover rounded-xl shadow-sm" alt="Thumbnail" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-primary uppercase tracking-widest mb-1">{formData.channelName}</p>
                      <h4 className="text-sm font-bold text-text-primary line-clamp-2">{formData.title}</h4>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-text-tertiary mb-2">Subject</label>
                    <select 
                      value={formData.subject}
                      onChange={(e) => setFormData({...formData, subject: e.target.value})}
                      className="w-full p-3 bg-surface border border-border-subtle rounded-2xl text-sm outline-none focus:border-primary/30"
                    >
                      <option value="">Select Subject</option>
                      {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-text-tertiary mb-2">Grade</label>
                    <select 
                      value={formData.grade || 0}
                      onChange={(e) => setFormData({...formData, grade: parseInt(e.target.value)})}
                      className="w-full p-3 bg-surface border border-border-subtle rounded-2xl text-sm outline-none focus:border-primary/30"
                    >
                      {GRADES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-text-tertiary mb-2">Curriculum</label>
                    <select 
                      value={formData.curriculum}
                      onChange={(e) => setFormData({...formData, curriculum: e.target.value})}
                      className="w-full p-3 bg-surface border border-border-subtle rounded-2xl text-sm outline-none focus:border-primary/30"
                    >
                      {CURRICULUMS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-text-tertiary mb-2">Topic</label>
                    <input 
                      type="text"
                      placeholder="e.g. Calculus"
                      value={formData.topic}
                      onChange={(e) => setFormData({...formData, topic: e.target.value})}
                      className="w-full p-3 bg-surface border border-border-subtle rounded-2xl text-sm outline-none focus:border-primary/30"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-text-tertiary mb-2">Duration (MM:SS)</label>
                    <input 
                      type="text"
                      placeholder="12:34"
                      value={formData.duration}
                      onChange={(e) => setFormData({...formData, duration: e.target.value})}
                      className="w-full p-3 bg-surface border border-border-subtle rounded-2xl text-sm outline-none focus:border-primary/30"
                    />
                  </div>
                  <div className="flex items-center gap-4 pt-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={formData.isVerified}
                        onChange={(e) => setFormData({...formData, isVerified: e.target.checked})}
                        className="w-4 h-4 rounded text-primary border-border-subtle focus:ring-primary"
                      />
                      <span className="text-xs font-bold text-text-secondary">Verified Provider</span>
                    </label>
                  </div>
                </div>

                <Button 
                  className="w-full py-4 text-base rounded-2xl"
                  onClick={handleSave}
                  disabled={isSaving || !formData.youtubeId || !formData.subject}
                >
                  {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" size={20} />}
                  Save to Video Library
                </Button>
              </div>
            </div>
          </div>

          {/* Bulk Import */}
          <div className="space-y-8">
            <div className="bg-white rounded-[32px] p-8 border border-border-subtle shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center">
                    <LinkIcon size={20} className="text-secondary" />
                  </div>
                  <h2 className="text-xl font-bold text-text-primary">Bulk Import</h2>
                </div>
                {bulkVideos.length > 0 && (
                  <Button variant="outline" size="sm" onClick={() => setBulkVideos([])}>
                    <Trash2 size={14} className="mr-2" /> Clear
                  </Button>
                )}
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-text-tertiary mb-2">YouTube URLs (one per line)</label>
                  <textarea 
                    placeholder="https://www.youtube.com/watch?v=...&#10;https://www.youtube.com/watch?v=..."
                    value={bulkInput}
                    onChange={(e) => setBulkInput(e.target.value)}
                    className="w-full h-40 p-4 bg-surface border border-border-subtle rounded-3xl text-sm outline-none focus:border-primary/30 resize-none font-mono"
                  />
                </div>

                <Button 
                  className="w-full py-4 rounded-2xl bg-secondary hover:bg-secondary/90 text-white"
                  onClick={handleBulkProcess}
                  disabled={isProcessingBulk || !bulkInput.trim()}
                >
                  {isProcessingBulk ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2" size={20} />}
                  Auto-categorise with Gemini AI
                </Button>

                {bulkVideos.length > 0 && (
                  <div className="space-y-4">
                    <div className="max-h-[500px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                      {bulkVideos.map((video, idx) => (
                        <div key={idx} className="p-4 bg-surface rounded-2xl border border-border-subtle group">
                          <div className="flex gap-4 mb-4">
                            <img src={video.thumbnailUrl} className="w-24 aspect-video object-cover rounded-lg" alt="Thumbnail" />
                            <div className="flex-1 min-w-0">
                               <h4 className="text-xs font-bold text-text-primary line-clamp-1 mb-1">{video.title}</h4>
                               <div className="flex items-center gap-2">
                                  {video.status === 'loading' && <Loader2 size={12} className="animate-spin text-primary" />}
                                  {video.status === 'success' && <Check size={12} className="text-primary" />}
                                  {video.status === 'error' && <AlertCircle size={12} className="text-red-500" />}
                                  <span className={cn(
                                    "text-[10px] font-black uppercase tracking-widest",
                                    video.status === 'success' ? "text-primary" : "text-text-tertiary"
                                  )}>
                                    {video.status}
                                  </span>
                               </div>
                            </div>
                          </div>
                          
                          {video.status === 'success' && (
                            <div className="grid grid-cols-2 gap-2">
                              <select 
                                value={video.subject}
                                onChange={(e) => {
                                  const next = [...bulkVideos];
                                  next[idx].subject = e.target.value;
                                  setBulkVideos(next);
                                }}
                                className="p-2 bg-white border border-border-subtle rounded-xl text-[10px] font-bold outline-none"
                              >
                                <option value="">Subject</option>
                                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                              <select 
                                value={video.grade || 0}
                                onChange={(e) => {
                                  const next = [...bulkVideos];
                                  next[idx].grade = parseInt(e.target.value);
                                  setBulkVideos(next);
                                }}
                                className="p-2 bg-white border border-border-subtle rounded-xl text-[10px] font-bold outline-none"
                              >
                                {GRADES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                              </select>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <Button 
                      className="w-full py-4 rounded-2xl"
                      disabled={isSaving || bulkVideos.every(v => v.status !== 'success')}
                      onClick={handleBulkSaveAll}
                    >
                      {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" size={20} />}
                      Save All to Library
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
    );
}
