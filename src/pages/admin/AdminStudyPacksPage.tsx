import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Video, 
  BookOpen, 
  FileText, 
  GripVertical, 
  X, 
  Save, 
  Edit, 
  Trash2, 
  Check,
  ChevronRight,
  Eye,
  Settings,
  Layout,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  serverTimestamp, 
  deleteDoc, 
  doc,
  updateDoc 
} from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { StudyPack, StudyPackItem, VideoLesson, Resource, PastPaper } from '../../types';
import { Button } from '../../components/ui/Button';
import { cn } from '../../lib/utils';

export function AdminStudyPacksPage() {
  const [packs, setPacks] = useState<StudyPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: 'MATHEMATICS',
    grade: 12 as 8|9|10|11|12,
    curriculum: 'NSC' as 'NSC',
    isPublic: true,
    creatorName: 'GMA Team',
    thumbnailUrl: 'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&q=80&w=1470'
  });
  
  const [sequence, setSequence] = useState<StudyPackItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Search Results
  const [searchResults, setSearchResults] = useState<{
    videos: VideoLesson[],
    resources: Resource[],
    papers: PastPaper[]
  }>({ videos: [], resources: [], papers: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    fetchPacks();
  }, []);

  const fetchPacks = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'studyPacks'), orderBy('createdAt', 'desc')));
      setPacks(snap.docs.map(d => ({ id: d.id, ...d.data() } as StudyPack)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      // In a real app, use indexes or ALGOLIA. 
      // For now, we'll fetch a bunch and filter client-side.
      const [vSnap, rSnap, pSnap] = await Promise.all([
        getDocs(query(collection(db, 'videos'), where('subject', '==', formData.subject))),
        getDocs(query(collection(db, 'resources'), where('subject', '==', formData.subject))),
        getDocs(query(collection(db, 'past-papers'), where('subject', '==', formData.subject)))
      ]);

      const q = searchQuery.toLowerCase();
      setSearchResults({
        videos: vSnap.docs.map(d => ({ id: d.id, ...d.data() } as VideoLesson)).filter(v => v.title.toLowerCase().includes(q)),
        resources: rSnap.docs.map(d => ({ id: d.id, ...d.data() } as Resource)).filter(r => r.title.toLowerCase().includes(q)),
        papers: pSnap.docs.map(d => ({ id: d.id, ...d.data() } as PastPaper)).filter(p => p.title.toLowerCase().includes(q))
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const addToSequence = (item: { id: string, title: string, type: 'video' | 'resource' | 'paper' }) => {
    const newItem: StudyPackItem = {
      id: Math.random().toString(36).substr(2, 9),
      type: item.type,
      refId: item.id,
      title: item.title,
      order: sequence.length
    };
    setSequence([...sequence, newItem]);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('sourceIndex', index.toString());
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    const sourceIndex = parseInt(e.dataTransfer.getData('sourceIndex'));
    const items = Array.from(sequence);
    const [reorderedItem] = items.splice(sourceIndex, 1);
    items.splice(dropIndex, 0, reorderedItem);
    
    setSequence(items.map((item, idx) => ({ ...item, order: idx })));
  };

  const handleSave = async () => {
    if (!formData.title || sequence.length === 0) {
       alert('Please provide a title and at least one item.');
       return;
    }
    
    setIsSaving(true);
    try {
      const packData = {
        ...formData,
        items: sequence,
        enrollCount: 0,
        creatorId: auth.currentUser?.uid || 'admin',
        createdAt: serverTimestamp()
      };
      
      await addDoc(collection(db, 'studyPacks'), packData);
      
      setShowCreateForm(false);
      setSequence([]);
      setFormData({
        title: '',
        description: '',
        subject: 'MATHEMATICS',
        grade: 12,
        curriculum: 'NSC',
        isPublic: true,
        creatorName: 'GMA Team',
        thumbnailUrl: 'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&q=80&w=1470'
      });
      fetchPacks();
    } catch (err) {
      console.error(err);
      alert('Error creating study pack');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this study pack?')) return;
    try {
      await deleteDoc(doc(db, 'studyPacks', id));
      setPacks(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const togglePublic = async (id: string, current: boolean) => {
     try {
       await updateDoc(doc(db, 'studyPacks', id), { isPublic: !current });
       setPacks(prev => prev.map(p => p.id === id ? { ...p, isPublic: !current } : p));
     } catch (err) {
       console.error(err);
     }
  };

  return (
    <div className="space-y-12">
        {/* Create Form */}
        {showCreateForm ? (
          <div className="bg-white border border-border-subtle rounded-[40px] shadow-lg p-10">
             <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                   <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                      <Plus size={24} />
                   </div>
                   <h3 className="text-2xl font-serif text-text-primary">Curriculum Sequence Builder</h3>
                </div>
                <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                   Cancel & Discard
                </Button>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Left Side: Metadata & Form */}
                <div className="space-y-8">
                   <div className="grid grid-cols-2 gap-6">
                      <div className="col-span-2">
                         <label className="block text-xs font-black uppercase text-text-tertiary mb-2">Pack Title</label>
                         <input 
                           type="text" 
                           placeholder="e.g. Master Grade 12 Calculus" 
                           value={formData.title}
                           onChange={(e) => setFormData({...formData, title: e.target.value})}
                           className="w-full p-4 bg-surface border border-border-subtle rounded-2xl text-sm font-bold outline-none focus:border-primary/30"
                         />
                      </div>
                      <div className="col-span-2">
                         <label className="block text-xs font-black uppercase text-text-tertiary mb-2">Description</label>
                         <textarea 
                           placeholder="What will students learn in this pack?" 
                           value={formData.description}
                           onChange={(e) => setFormData({...formData, description: e.target.value})}
                           className="w-full h-32 p-4 bg-surface border border-border-subtle rounded-2xl text-sm outline-none focus:border-primary/30 resize-none"
                         />
                      </div>
                      <div>
                         <label className="block text-xs font-black uppercase text-text-tertiary mb-2">Subject</label>
                         <select 
                           value={formData.subject}
                           onChange={(e) => setFormData({...formData, subject: e.target.value})}
                           className="w-full p-4 bg-surface border border-border-subtle rounded-2xl text-sm font-bold outline-none"
                         >
                            {['MATHEMATICS', 'PHYSICAL SCIENCES', 'LIFE SCIENCES', 'ACCOUNTING'].map(s => <option key={s} value={s}>{s}</option>)}
                         </select>
                      </div>
                      <div>
                         <label className="block text-xs font-black uppercase text-text-tertiary mb-2">Grade</label>
                         <select 
                           value={formData.grade}
                           onChange={(e) => setFormData({...formData, grade: parseInt(e.target.value) as any})}
                           className="w-full p-4 bg-surface border border-border-subtle rounded-2xl text-sm font-bold outline-none"
                         >
                            {[8, 9, 10, 11, 12].map(g => <option key={g} value={g}>Grade {g}</option>)}
                         </select>
                      </div>
                   </div>

                   <div className="p-8 bg-surface rounded-[32px] border border-border-subtle">
                      <div className="flex items-center justify-between mb-6">
                         <h4 className="text-sm font-bold text-text-primary">Pack Sequence</h4>
                         <span className="px-3 py-1 bg-white border border-border-subtle rounded-full text-[10px] font-black text-primary">
                            {sequence.length} Items Selected
                         </span>
                      </div>
                      
                      <div className="space-y-3 min-h-[200px]">
                         {sequence.length > 0 ? (
                           sequence.map((item, idx) => (
                             <div 
                               key={item.id}
                               draggable
                               onDragStart={(e) => handleDragStart(e, idx)}
                               onDragOver={(e) => e.preventDefault()}
                               onDrop={(e) => handleDrop(e, idx)}
                               className="p-4 bg-white border border-border-subtle rounded-2xl flex items-center gap-4 group cursor-move hover:border-primary/30 transition-all shadow-sm"
                             >
                                <GripVertical size={16} className="text-text-tertiary group-hover:text-primary transition-colors" />
                                <div className="w-6 h-6 rounded-full bg-surface border border-border-subtle flex items-center justify-center text-[10px] font-black text-text-tertiary">
                                   {idx + 1}
                                </div>
                                <div className={cn(
                                   "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                   item.type === 'video' ? "bg-red-50 text-red-500" :
                                   item.type === 'resource' ? "bg-blue-50 text-blue-500" :
                                   "bg-green-50 text-green-500"
                                )}>
                                   {item.type === 'video' ? <Video size={14} /> : item.type === 'resource' ? <BookOpen size={14} /> : <FileText size={14} />}
                                </div>
                                <p className="text-xs font-bold text-text-primary flex-1 line-clamp-1">{item.title}</p>
                                <button 
                                  onClick={() => setSequence(prev => prev.filter(i => i.id !== item.id))}
                                  className="p-1.5 hover:bg-red-50 text-text-tertiary hover:text-red-500 rounded-lg transition-all"
                                >
                                   <X size={14} />
                                </button>
                             </div>
                           ))
                         ) : (
                           <div className="py-20 border-2 border-dashed border-border-subtle rounded-[24px] flex flex-col items-center justify-center text-center px-10">
                              <Package size={32} className="text-text-tertiary mb-3 opacity-20" />
                              <p className="text-xs font-bold text-text-tertiary">Sequence is empty. Search and add content from the library.</p>
                           </div>
                         )}
                      </div>
                   </div>

                   <Button className="w-full py-4 text-base rounded-2xl shadow-xl shadow-primary/20" onClick={handleSave} disabled={isSaving}>
                      {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" size={20} />}
                      Deploy Study Pack
                   </Button>
                </div>

                {/* Right Side: Content Search */}
                <div className="space-y-8 h-full flex flex-col">
                   <div className="p-8 bg-surface rounded-[32px] border border-border-subtle">
                      <h4 className="text-sm font-bold text-text-primary mb-6">Library Browser</h4>
                      <form onSubmit={handleSearch} className="relative mb-6">
                         <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary" />
                         <input 
                           type="text" 
                           placeholder={`Search ${formData.subject.toLowerCase()} library...`} 
                           className="w-full pl-12 pr-4 py-3 bg-white border border-border-subtle rounded-2xl text-xs font-bold outline-none focus:border-primary/30"
                           value={searchQuery}
                           onChange={(e) => setSearchQuery(e.target.value)}
                         />
                      </form>

                      <div className="space-y-8 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
                         {/* Videos Section */}
                         {searchResults.videos.length > 0 && (
                           <div>
                              <h5 className="text-[10px] font-black uppercase text-text-tertiary mb-3 flex items-center gap-2 tracking-widest">
                                 <Video size={12} /> Video Lessons
                              </h5>
                              <div className="space-y-2">
                                 {searchResults.videos.map(v => (
                                   <div key={v.id} className="p-3 bg-white border border-border-subtle rounded-xl flex items-center gap-3 group">
                                      <img src={v.thumbnailUrl} className="w-16 aspect-video rounded-lg object-cover" />
                                      <p className="text-[10px] font-bold text-text-primary flex-1 line-clamp-2">{v.title}</p>
                                      <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => addToSequence({ id: v.id, title: v.title, type: 'video' })}>
                                         <Plus size={14} />
                                      </Button>
                                   </div>
                                 ))}
                              </div>
                           </div>
                         )}

                         {/* Resources Section */}
                         {searchResults.resources.length > 0 && (
                           <div>
                              <h5 className="text-[10px] font-black uppercase text-text-tertiary mb-3 flex items-center gap-2 tracking-widest">
                                 <BookOpen size={12} /> Study Resources
                              </h5>
                              <div className="space-y-2">
                                 {searchResults.resources.map(r => (
                                   <div key={r.id} className="p-3 bg-white border border-border-subtle rounded-xl flex items-center gap-3 group">
                                      <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center shrink-0">
                                         <BookOpen size={18} />
                                      </div>
                                      <p className="text-[10px] font-bold text-text-primary flex-1 line-clamp-2">{r.title}</p>
                                      <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => addToSequence({ id: r.id, title: r.title, type: 'resource' })}>
                                         <Plus size={14} />
                                      </Button>
                                   </div>
                                 ))}
                              </div>
                           </div>
                         )}

                         {/* Papers Section */}
                         {searchResults.papers.length > 0 && (
                           <div>
                              <h5 className="text-[10px] font-black uppercase text-text-tertiary mb-3 flex items-center gap-2 tracking-widest">
                                 <FileText size={12} /> Past Papers
                              </h5>
                              <div className="space-y-2">
                                 {searchResults.papers.map(p => (
                                   <div key={p.id} className="p-3 bg-white border border-border-subtle rounded-xl flex items-center gap-3 group">
                                      <div className="w-10 h-10 bg-green-50 text-green-500 rounded-lg flex items-center justify-center shrink-0">
                                         <FileText size={18} />
                                      </div>
                                      <p className="text-[10px] font-bold text-text-primary flex-1 line-clamp-2">{p.title}</p>
                                      <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => addToSequence({ id: p.id, title: p.title, type: 'paper' })}>
                                         <Plus size={14} />
                                      </Button>
                                   </div>
                                 ))}
                              </div>
                           </div>
                         )}

                         {!isSearching && searchQuery && searchResults.videos.length === 0 && searchResults.resources.length === 0 && searchResults.papers.length === 0 && (
                           <div className="text-center py-10 opacity-50">
                              <p className="text-xs">No results matched your search.</p>
                           </div>
                         )}
                         {isSearching && (
                           <div className="flex items-center justify-center py-10">
                              <Loader2 className="animate-spin text-primary" />
                           </div>
                         )}
                      </div>
                   </div>
                </div>
             </div>
          </div>
        ) : (
          <div className="bg-white border border-border-subtle rounded-[40px] shadow-sm overflow-hidden">
             <div className="p-10 border-b border-border-subtle flex items-center justify-between">
                <div>
                   <h3 className="text-xl font-serif text-text-primary mb-1">Study Packs Library</h3>
                   <p className="text-xs text-text-tertiary font-bold uppercase tracking-widest">Structured learning sequences for scholars</p>
                </div>
                <Button onClick={() => setShowCreateForm(true)} className="rounded-2xl">
                   <Plus size={18} className="mr-2" /> Design New Pack
                </Button>
             </div>

             <div className="overflow-x-auto">
                <table className="w-full">
                   <thead>
                      <tr className="bg-surface text-left">
                         <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-text-tertiary">Study Pack</th>
                         <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-text-tertiary">Subject & Grade</th>
                         <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-text-tertiary text-center">Curriculum</th>
                         <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-text-tertiary text-center">Items</th>
                         <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-text-tertiary text-center">Enrolled</th>
                         <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-text-tertiary text-center">Visibility</th>
                         <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-text-tertiary text-right">Actions</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-border-subtle">
                      {loading ? (
                        [1,2,3].map(i => (
                          <tr key={i} className="animate-pulse">
                             <td colSpan={7} className="px-8 py-5 h-20 bg-surface/30"></td>
                          </tr>
                        ))
                      ) : packs.length > 0 ? (
                        packs.map((pack) => (
                          <tr key={pack.id} className="hover:bg-surface/50 transition-all group">
                             <td className="px-8 py-5">
                                <div className="flex items-center gap-4">
                                   <div className="w-16 h-10 rounded-lg overflow-hidden border border-border-subtle">
                                      <img src={pack.thumbnailUrl} className="w-full h-full object-cover" />
                                   </div>
                                   <div>
                                      <p className="text-sm font-bold text-text-primary line-clamp-1">{pack.title}</p>
                                      <p className="text-[10px] font-medium text-text-tertiary">Created by {pack.creatorName}</p>
                                   </div>
                                </div>
                             </td>
                             <td className="px-8 py-5">
                                <div className="flex flex-col">
                                   <span className="text-[10px] font-black uppercase text-primary mb-0.5">{pack.subject}</span>
                                   <span className="text-xs font-bold text-text-secondary">Grade {pack.grade}</span>
                                </div>
                             </td>
                             <td className="px-8 py-5 text-center">
                                <span className="px-2 py-1 bg-surface border border-border-subtle rounded text-[10px] font-black text-text-tertiary">
                                   {pack.curriculum}
                                </span>
                             </td>
                             <td className="px-8 py-5 text-center">
                                <span className="text-xs font-bold text-text-primary">{pack.items?.length || 0}</span>
                             </td>
                             <td className="px-8 py-5 text-center">
                                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-text-tertiary">
                                   <Users size={14} className="text-primary/50" />
                                   {pack.enrollCount}
                                </div>
                             </td>
                             <td className="px-8 py-5 text-center">
                                <button 
                                  onClick={() => togglePublic(pack.id, pack.isPublic)}
                                  className={cn(
                                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all",
                                    pack.isPublic ? "bg-green-50 text-green-600 border-green-100" : "bg-text-tertiary/10 text-text-tertiary border-border-subtle"
                                  )}
                                >
                                   {pack.isPublic ? 'Public' : 'Draft'}
                                </button>
                             </td>
                             <td className="px-8 py-5 text-right">
                                <div className="flex items-center justify-end gap-2">
                                   <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-lg">
                                      <Edit size={16} className="text-text-tertiary" />
                                   </Button>
                                   <Button 
                                     variant="outline" 
                                     size="sm" 
                                     className="h-9 w-9 p-0 rounded-lg hover:border-red-100 hover:bg-red-50"
                                     onClick={() => handleDelete(pack.id)}
                                   >
                                      <Trash2 size={16} className="text-text-tertiary hover:text-red-500" />
                                   </Button>
                                </div>
                             </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                           <td colSpan={7} className="px-8 py-20 text-center text-text-tertiary italic text-sm">
                              No study packs created yet. Launch your first one!
                           </td>
                        </tr>
                      )}
                   </tbody>
                </table>
             </div>
          </div>
        )}
      </div>
  );
}

function Users({ size, className }: { size: number, className: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}
