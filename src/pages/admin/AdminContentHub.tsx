import React, { useState } from 'react';
import { 
  Layers, 
  FileText, 
  BookOpen, 
  Play, 
  Upload, 
  Sparkles, 
  Plus, 
  Check, 
  X, 
  Loader2,
  AlertCircle,
  Hash,
  GraduationCap,
  Calendar,
  Languages,
  Tag
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  writeBatch, 
  doc 
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { Button } from '../../components/ui/Button';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const SUBJECTS = ["Mathematics", "Physical Sciences"];
const GRADES = [12];
const CURRICULA = ["NSC"];
const YEARS = Array.from({ length: 15 }, (_, i) => new Date().getFullYear() - i);

export function AdminContentHub() {
  const { isContentAdmin, adminUser } = useAdminAuth();
  const [activeTab, setActiveTab] = useState<'papers' | 'resources' | 'videos'>('papers');
  
  if (!isContentAdmin) {
    return (
      <div className="text-center py-20">
         <h2 className="text-lux-text font-bold">Access Denied</h2>
         <p className="text-lux-text">You don't have permission to upload content.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto">
      <header>
        <h1 className="text-2xl font-bold text-lux-text mb-1">Content Upload Hub</h1>
        <p className="text-sm text-lux-text">Centralized management for all GMA learning materials.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <UploadCard 
          title="Past Papers" 
          icon={<FileText />} 
          color="border-green-500" 
          description="Upload bulk exam papers and memos"
          active={activeTab === 'papers'}
          onClick={() => setActiveTab('papers')}
        />
        <UploadCard 
          title="Resources" 
          icon={<BookOpen />} 
          color="border-blue-500" 
          description="Share notes, guides and study materials"
          active={activeTab === 'resources'}
          onClick={() => setActiveTab('resources')}
        />
        <UploadCard 
          title="Video Lessons" 
          icon={<Play />} 
          color="border-purple-500" 
          description="Add YouTube lessons with AI magic"
          active={activeTab === 'videos'}
          onClick={() => setActiveTab('videos')}
        />
      </div>

      <div className="bg-[#111111] border border-lux-border rounded-[32px] overflow-hidden min-h-[500px]">
        {activeTab === 'papers' && <PapersUploadZone />}
        {activeTab === 'resources' && <ResourcesUploadZone />}
        {activeTab === 'videos' && <VideosUploadZone />}
      </div>
    </div>
  );
}

function UploadCard({ title, icon, color, description, active, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "p-6 rounded-2xl sm:rounded-3xl border bg-[#111111] text-left transition-all hover:translate-y-[-4px]",
        active ? `${color} bg-lux-bg/50` : "border-lux-border hover:border-lux-border opacity-60 hover:opacity-100"
      )}
    >
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4", active ? color.replace('border', 'text') : "text-lux-text")}>
        {React.cloneElement(icon, { size: 24 })}
      </div>
      <h3 className="text-lux-text font-bold mb-1">{title}</h3>
      <p className="text-xs text-lux-text leading-relaxed font-medium">{description}</p>
    </button>
  );
}

// --- SUB-COMPONENTS FOR UPLOAD ZONES ---

function PapersUploadZone() {
  const { adminUser } = useAdminAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [metadata, setMetadata] = useState<any>({});

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    const batch = writeBatch(db);

    try {
      for (const file of files) {
        const path = `past-papers/${Date.now()}_${file.name}`;
        const sRef = ref(storage, path);
        const uploadTask = await uploadBytesResumable(sRef, file);
        const downloadUrl = await getDownloadURL(uploadTask.ref);

        const paperData = {
          ...metadata,
          title: metadata.title || file.name.replace('.pdf', ''),
          fileUrl: downloadUrl,
          createdAt: serverTimestamp(),
          uploaderId: adminUser?.uid,
          uploaderName: adminUser?.displayName,
          downloadCount: 0
        };

        const newDoc = doc(collection(db, 'past-papers'));
        batch.set(newDoc, paperData);

        // AuditLog
        const auditDoc = doc(collection(db, 'admin_audit_log'));
        batch.set(auditDoc, {
          action: 'paper_uploaded',
          actorUid: adminUser?.uid,
          actorName: adminUser?.displayName,
          details: `Uploaded paper: ${paperData.title}`,
          timestamp: serverTimestamp()
        });
      }

      await batch.commit();
      setFiles([]);
      alert("Success! Papers uploaded.");
    } catch (err) {
      console.error(err);
      alert("Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-8 space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-6">
          <h3 className="text-lux-text font-bold text-lg">Bulk Metadata</h3>
          <p className="text-xs text-lux-text">Apply these settings to all uploaded files.</p>
          
          <div className="grid grid-cols-2 gap-4">
            <Select label="Subject" options={SUBJECTS} onChange={v => setMetadata({...metadata, subject: v})} />
            <Select label="Grade" options={GRADES} onChange={v => setMetadata({...metadata, grade: parseInt(v)})} />
            <Select label="Curriculum" options={CURRICULA} onChange={v => setMetadata({...metadata, curriculum: v})} />
            <Select label="Year" options={YEARS} onChange={v => setMetadata({...metadata, year: parseInt(v)})} />
            <Select label="Paper" options={["P1", "P2", "P3"]} onChange={v => setMetadata({...metadata, paperNumber: v})} />
            <Select label="Type" options={["Question", "Memo"]} onChange={v => setMetadata({...metadata, type: v.toLowerCase()})} />
          </div>
        </div>

        <div className="space-y-6">
           <div 
             className="border-2 border-dashed border-lux-border rounded-[2rem] sm:rounded-[3rem] p-12 flex flex-col items-center justify-center gap-4 hover:border-[var(--color-lux-green-500)] hover:bg-[var(--color-lux-green-500)]/5 transition-all cursor-pointer"
             onClick={() => document.getElementById('file-input')?.click()}
           >
              <div className="w-16 h-16 bg-lux-bg rounded-2xl sm:rounded-3xl flex items-center justify-center text-lux-text">
                <Upload size={32} />
              </div>
              <div className="text-center">
                <p className="text-lux-text font-bold">Drag & Drop Papers</p>
                <p className="text-xs text-lux-text">PDF only • Up to 20 files</p>
              </div>
              <input 
                id="file-input" 
                type="file" 
                multiple 
                accept=".pdf" 
                className="hidden" 
                onChange={e => setFiles(Array.from(e.target.files || []))}
              />
           </div>

           {files.length > 0 && (
             <div className="bg-black/40 rounded-2xl sm:rounded-3xl p-4 space-y-3">
                <h4 className="text-[10px] font-bold text-lux-text uppercase tracking-widest">Queue ({files.length})</h4>
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-lux-bg/50 rounded-lg text-xs">
                    <span className="text-lux-text truncate max-w-[200px]">{f.name}</span>
                    <button onClick={() => setFiles(files.filter((_, idx) => idx !== i))} className="text-lux-text hover:text-red-500"><X size={14} /></button>
                  </div>
                ))}
                <Button 
                  onClick={handleUpload} 
                  disabled={uploading} 
                  className="w-full h-12 bg-[var(--color-lux-green-500)] hover:bg-[#166B51] text-lux-text"
                >
                  {uploading ? <Loader2 className="animate-spin" /> : <>Upload All to Cloud</>}
                </Button>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}

function ResourcesUploadZone() {
  const { adminUser } = useAdminAuth();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    grade: 12,
    curriculum: 'NSC',
    description: '',
    tags: ''
  });

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !adminUser) return;
    setUploading(true);

    try {
      const path = `resources/admin/${Date.now()}_${file.name}`;
      const sRef = ref(storage, path);
      const uploadTask = await uploadBytesResumable(sRef, file);
      const downloadUrl = await getDownloadURL(uploadTask.ref);

      await addDoc(collection(db, 'resources'), {
        ...formData,
        tags: formData.tags.split(',').map(t => t.trim()),
        fileUrl: downloadUrl,
        createdAt: serverTimestamp(),
        uploaderId: adminUser.uid,
        uploaderName: adminUser.displayName,
        downloadCount: 0,
        likeCount: 0,
        likedBy: []
      });

      await addDoc(collection(db, 'admin_audit_log'), {
        action: 'resource_uploaded',
        actorUid: adminUser.uid,
        actorName: adminUser.displayName,
        details: `Uploaded resource: ${formData.title}`,
        timestamp: serverTimestamp()
      });

      alert("Resource uploaded!");
      setFile(null);
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-8 flex flex-col items-center">
       <form onSubmit={handleUpload} className="w-full max-w-2xl space-y-6">
          <div className="grid grid-cols-2 gap-4">
             <div className="col-span-2">
                <label className="block text-xs font-bold text-lux-text uppercase mb-2">Resource Title</label>
                <input 
                  required
                  value={formData.title} 
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full bg-black border border-lux-border rounded-xl px-4 py-3 text-lux-text focus:border-blue-500 transition-all outline-none" 
                  placeholder="Summarized Accounting Notes"
                />
             </div>
             <Select label="Subject" options={SUBJECTS} onChange={v => setFormData({...formData, subject: v})} />
             <Select label="Grade" options={GRADES} onChange={v => setFormData({...formData, grade: parseInt(v)})} />
             <div className="col-span-2">
                <label className="block text-xs font-bold text-lux-text uppercase mb-2">Description</label>
                <textarea 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-black border border-lux-border rounded-xl px-4 py-3 text-lux-text h-24 focus:border-blue-500 transition-all outline-none" 
                />
             </div>
             <div className="col-span-2">
                <label className="block text-xs font-bold text-lux-text uppercase mb-2">Tags (Comma separated)</label>
                <input 
                  value={formData.tags} 
                  onChange={e => setFormData({...formData, tags: e.target.value})}
                  className="w-full bg-black border border-lux-border rounded-xl px-4 py-3 text-lux-text focus:border-blue-500 transition-all outline-none" 
                  placeholder="exam-tips, summary, accounting"
                />
             </div>
          </div>

          <div 
             className="border border-lux-border bg-black/50 rounded-2xl sm:rounded-3xl p-6 flex items-center justify-between"
             onClick={() => document.getElementById('res-file')?.click()}
          >
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
                   <BookOpen size={24} />
                </div>
                <div>
                   <p className="text-lux-text text-sm font-bold">{file ? file.name : "Select File"}</p>
                   <p className="text-[10px] text-lux-text">PDF, PPT, DOC, Image (Max 20MB)</p>
                </div>
             </div>
             <Button type="button" className="text-xs bg-lux-bg border border-lux-border rounded-lg">Browse</Button>
             <input id="res-file" type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
          </div>

          <Button 
            type="submit" 
            disabled={uploading || !file} 
            className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-lux-text rounded-xl font-bold"
          >
             {uploading ? <Loader2 className="animate-spin" /> : <>Upload Resource</>}
          </Button>
       </form>
    </div>
  );
}

function VideosUploadZone() {
  const { adminUser } = useAdminAuth();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [categorizing, setCategorizing] = useState(false);
  const [formData, setFormData] = useState<any>({
    title: '',
    subject: '',
    grade: 12,
    topic: '',
    curriculum: 'NSC',
    thumbnail: ''
  });

  const handleAI = async () => {
    if (!formData.title) return;
    setCategorizing(true);
    try {
      // In a real app we'd call Gemini API
      // Since it's server side secret, we should proxy it or use it if available in context
      // For now, let's mock the AI logic or use the simple heuristic
      setTimeout(() => {
        setFormData({
          ...formData,
          subject: SUBJECTS[0],
          topic: "Algebra Fundamentals",
          grade: 12
        });
        setCategorizing(false);
      }, 1500);
    } catch (err) {
      setCategorizing(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || !adminUser) return;
    setLoading(true);

    try {
      const videoId = url.split('v=')[1]?.split('&')[0] || url.split('/').pop();
      
      await addDoc(collection(db, 'videos'), {
        ...formData,
        url,
        videoId,
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        createdAt: serverTimestamp(),
        uploaderId: adminUser.uid,
        isVerified: true
      });

      await addDoc(collection(db, 'admin_audit_log'), {
        action: 'video_uploaded',
        actorUid: adminUser.uid,
        actorName: adminUser.displayName,
        details: `Added video: ${formData.title}`,
        timestamp: serverTimestamp()
      });

      alert("Video added!");
      setUrl('');
      setFormData({ title: '', subject: '', grade: 12, topic: '', curriculum: 'NSC', thumbnail: '' });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 flex flex-col items-center">
       <form onSubmit={handleUpload} className="w-full max-w-2xl space-y-8">
          <div className="space-y-4">
             <label className="block text-xs font-bold text-lux-text uppercase">YouTube Link</label>
             <div className="relative">
                <Play className="absolute left-4 top-1/2 -translate-y-1/2 text-red-500" size={20} />
                <input 
                  required
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full bg-black border border-lux-border rounded-2xl sm:rounded-3xl py-4 pl-12 pr-4 text-lux-text focus:border-purple-500 outline-none"
                />
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-lux-bg/30 p-6 rounded-[24px] border border-lux-border">
             <div className="col-span-2">
                <label className="block text-[10px] font-bold text-lux-text uppercase mb-2">Video Title</label>
                <div className="flex gap-2">
                  <input 
                    required
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    className="flex-1 bg-black border border-lux-border rounded-xl px-4 py-2.5 text-sm text-lux-text focus:border-purple-500 outline-none"
                  />
                  <button 
                    type="button"
                    onClick={handleAI}
                    disabled={categorizing || !formData.title}
                    className="px-4 bg-purple-500/10 text-purple-500 border border-purple-500/20 rounded-xl flex items-center gap-2 text-xs font-bold hover:bg-purple-500/20 transition-all"
                  >
                    {categorizing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    Magic Rank
                  </button>
                </div>
             </div>
             <Select label="Subject" options={SUBJECTS} value={formData.subject} onChange={v => setFormData({...formData, subject: v})} />
             <Select label="Grade" options={GRADES} value={formData.grade} onChange={v => setFormData({...formData, grade: parseInt(v)})} />
             <div className="col-span-2">
                <label className="block text-[10px] font-bold text-lux-text uppercase mb-2">Specific Topic</label>
                <input 
                  value={formData.topic}
                  onChange={e => setFormData({...formData, topic: e.target.value})}
                  className="w-full bg-black border border-lux-border rounded-xl px-4 py-2.5 text-xs text-lux-text focus:border-purple-500 outline-none"
                  placeholder="e.g. Euclidean Geometry"
                />
             </div>
          </div>

          <Button 
            type="submit" 
            disabled={loading} 
            className="w-full h-14 bg-purple-600 hover:bg-purple-700 text-lux-text rounded-2xl sm:rounded-3xl font-bold flex items-center justify-center gap-2"
          >
             {loading ? <Loader2 className="animate-spin" /> : <>Add to Library</>}
          </Button>
       </form>
    </div>
  );
}

function Select({ label, options, onChange, value }: any) {
  return (
    <div className="space-y-2">
       <label className="block text-[10px] font-bold text-lux-text uppercase tracking-widest">{label}</label>
       <select 
         value={value}
         onChange={e => onChange(e.target.value)}
         className="w-full bg-black border border-lux-border rounded-xl p-3 text-lux-text text-xs outline-none focus:border-lux-border cursor-pointer"
       >
          <option value="">Select {label}</option>
          {options.map((opt: any) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
       </select>
    </div>
  );
}
