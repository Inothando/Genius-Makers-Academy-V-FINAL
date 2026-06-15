import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Search, 
  Trash2, 
  Eye, 
  CheckCircle, 
  XCircle,
  Download,
  Filter,
  RefreshCw,
  MoreVertical,
  Check,
  X
} from 'lucide-react';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  updateDoc, 
  doc, 
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Resource } from '../../types';
import { Button } from '../../components/ui/Button';
import { cn } from '../../lib/utils';

export function AdminResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedResources, setSelectedResources] = useState<string[]>([]);

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'resources'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setResources(snap.docs.map(d => ({ id: d.id, ...d.data() } as Resource)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleApproval = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'resources', id), { isApproved: !currentStatus });
      setResources(prev => prev.map(r => r.id === id ? { ...r, isApproved: !currentStatus } : r));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this resource?')) return;
    try {
      await deleteDoc(doc(db, 'resources', id));
      setResources(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm('Are you sure you want to delete selected resources?')) return;
    try {
      const batch = writeBatch(db);
      selectedResources.forEach(id => batch.delete(doc(db, 'resources', id)));
      await batch.commit();
      setResources(prev => prev.filter(r => !selectedResources.includes(r.id)));
      setSelectedResources([]);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-white border border-border-subtle rounded-[32px] sm:rounded-[40px] shadow-sm overflow-hidden text-black">
        <div className="p-6 sm:p-10 border-b border-border-subtle flex flex-col lg:flex-row lg:items-center justify-between gap-8 text-black">
           <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-10 flex-1 text-black">
              <div className="shrink-0">
                <h3 className="text-xl font-serif text-text-primary mb-1">Student Library</h3>
                <p className="text-xs text-text-tertiary font-bold uppercase tracking-widest">Publically uploaded study materials</p>
              </div>
              <div className="relative flex-1 w-full max-w-md">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary" size={18} />
                 <input 
                   type="text" 
                   placeholder="Search by title, subject or author..." 
                   className="w-full pl-12 pr-4 py-3 bg-surface border border-border-subtle rounded-2xl text-xs font-bold outline-none focus:border-primary/30"
                   value={search}
                   onChange={(e) => setSearch(e.target.value)}
                 />
              </div>
           </div>
           <div className="flex flex-col sm:flex-row items-center gap-4 text-black">
              {selectedResources.length > 0 && (
                <Button variant="outline" className="w-full sm:w-auto text-red-500 border-red-200" onClick={handleBulkDelete}>
                  Delete ({selectedResources.length})
                </Button>
              )}
              <Button variant="outline" onClick={fetchResources} className="w-full sm:w-auto rounded-xl text-black border-black/10">
                 <RefreshCw size={16} className={cn("mr-2", loading && "animate-spin")} /> Refresh
              </Button>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
             <thead>
                <tr className="bg-surface text-left">
                   <th className="px-8 py-5">
                      <input 
                        type="checkbox" 
                        className="rounded border-border-subtle text-primary" 
                        onChange={(e) => setSelectedResources(e.target.checked ? resources.map(r => r.id) : [])}
                      />
                   </th>
                   <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-text-tertiary">Title</th>
                   <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-text-tertiary">Subject & Grade</th>
                   <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-text-tertiary">Uploader</th>
                   <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-text-tertiary text-center">Downloads</th>
                   <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-text-tertiary text-center">Status</th>
                   <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-text-tertiary text-right">Actions</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-border-subtle">
                {loading ? (
                   [1,2,3,4,5].map(i => (
                     <tr key={i} className="animate-pulse">
                        <td colSpan={7} className="px-8 py-5 h-20 bg-surface/30"></td>
                     </tr>
                   ))
                ) : resources.length > 0 ? (
                  resources.filter(r => 
                    r.title.toLowerCase().includes(search.toLowerCase()) || 
                    r.subject.toLowerCase().includes(search.toLowerCase()) ||
                    r.uploaderName.toLowerCase().includes(search.toLowerCase())
                  ).map((r) => (
                    <tr key={r.id} className="hover:bg-surface/50 transition-all group">
                       <td className="px-8 py-5">
                          <input 
                            type="checkbox" 
                            className="rounded border-border-subtle text-primary" 
                            checked={selectedResources.includes(r.id)}
                            onChange={(e) => setSelectedResources(prev => e.target.checked ? [...prev, r.id] : prev.filter(id => id !== r.id))}
                          />
                       </td>
                       <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 bg-white rounded-xl border border-border-subtle flex items-center justify-center text-secondary relative group-hover:scale-110 transition-transform">
                                <BookOpen size={20} />
                                {r.fileType === 'PDF' && <div className="absolute -bottom-1 -right-1 px-1 bg-red-500 text-white text-[8px] font-black rounded">PDF</div>}
                             </div>
                             <div className="min-w-0">
                                <p className="text-sm font-bold text-text-primary line-clamp-1">{r.title}</p>
                                <p className="text-[10px] font-medium text-text-tertiary">{new Date(r.createdAt.seconds * 1000).toLocaleDateString()}</p>
                             </div>
                          </div>
                       </td>
                       <td className="px-8 py-5">
                          <div className="flex flex-col">
                             <span className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">{r.subject}</span>
                             <span className="text-xs font-bold text-text-secondary">Grade {r.grade} • {r.curriculum}</span>
                          </div>
                       </td>
                       <td className="px-8 py-5">
                          <span className="text-xs font-bold text-text-primary">{r.uploaderName}</span>
                          {r.isGuest && <span className="ml-2 text-[8px] font-black uppercase bg-surface border border-border-subtle px-1.5 py-0.5 rounded text-text-tertiary">Guest</span>}
                       </td>
                       <td className="px-8 py-5 text-center">
                          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-text-tertiary">
                             <Download size={14} />
                             {r.downloadCount}
                          </div>
                       </td>
                       <td className="px-8 py-5 text-center">
                          <button 
                            onClick={() => handleToggleApproval(r.id, r.isApproved)}
                            className={cn(
                              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors outline-none",
                              r.isApproved ? "bg-primary" : "bg-text-tertiary"
                            )}
                          >
                             <span className={cn(
                               "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                               r.isApproved ? "translate-x-6" : "translate-x-1"
                             )} />
                          </button>
                       </td>
                       <td className="px-8 py-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                             <Button 
                               variant="outline" 
                               size="sm" 
                               className="h-9 w-9 p-0 rounded-lg group-hover:border-primary/20"
                               onClick={() => window.open(r.fileUrl)}
                             >
                                <Eye size={16} className="text-text-tertiary" />
                             </Button>
                             <Button 
                               variant="outline" 
                               size="sm" 
                               className="h-9 w-9 p-0 rounded-lg hover:border-red-100 hover:bg-red-50"
                               onClick={() => handleDelete(r.id)}
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
                       No resources found.
                    </td>
                  </tr>
                )}
             </tbody>
          </table>
        </div>
      </div>
    );
}
