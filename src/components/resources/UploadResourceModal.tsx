import React, { useState, useCallback, useEffect } from 'react';
import { X, Upload, File as FileIcon, Check, Loader2, Sparkles, User, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../ui/Button';
import { db, storage, auth } from '../../lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { cn } from '../../lib/utils';
import { v4 as uuidv4 } from 'uuid';

interface UploadResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const SUBJECTS = [
  'MATHEMATICS', 'PHYSICAL SCIENCES'
];

  const GRADES = [12, 11, 10, 9, 8];
  
  export function UploadResourceModal({ isOpen, onClose, onSuccess }: UploadResourceModalProps) {
    useEffect(() => {
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      if (isOpen) {
        window.addEventListener('keydown', handleEsc);
      }
      return () => {
        window.removeEventListener('keydown', handleEsc);
      };
    }, [isOpen, onClose]);
  
    const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    subject: 'MATHEMATICS',
    grade: 12,
    curriculum: 'NSC',
    description: '',
    tags: '',
    postAsGuest: true,
    displayName: '',
    school: ''
  });

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 20 * 1024 * 1024) {
        alert("File size exceeds 20MB limit.");
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file || !formData.title || !formData.subject) return;

    setIsUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const storagePath = `resources/${formData.subject.toLowerCase()}/${formData.grade}/${fileName}`;
    const storageRef = ref(storage, storagePath);

    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed', 
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        console.error("Upload failed:", error);
        setIsUploading(false);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        
        // Map file extension to type
        let fileType: 'PDF' | 'PPT' | 'Image' | 'Doc' | 'Other' = 'Other';
        if (['pdf'].includes(fileExt?.toLowerCase() || '')) fileType = 'PDF';
        else if (['ppt', 'pptx'].includes(fileExt?.toLowerCase() || '')) fileType = 'PPT';
        else if (['jpg', 'jpeg', 'png'].includes(fileExt?.toLowerCase() || '')) fileType = 'Image';
        else if (['doc', 'docx'].includes(fileExt?.toLowerCase() || '')) fileType = 'Doc';

        const uploaderName = formData.postAsGuest 
          ? formData.displayName || 'Guest Scholar' 
          : auth.currentUser?.displayName || 'Scholar';

        await addDoc(collection(db, 'resources'), {
          title: formData.title,
          description: formData.description,
          subject: formData.subject,
          grade: formData.grade,
          curriculum: formData.curriculum,
          fileType,
          fileUrl: downloadURL,
          thumbnailUrl: '', // Will be handled by subject mapping in card
          fileSize: file.size,
          uploaderName,
          uploaderId: formData.postAsGuest ? null : auth.currentUser?.uid,
          isGuest: formData.postAsGuest,
          downloadCount: 0,
          likeCount: 0,
          tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
          isApproved: true, // Auto-approve for demo, normally false
          createdAt: serverTimestamp()
        });

        setIsUploading(false);
        onSuccess();
        onClose();
      }
    );
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-white rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl maxHeight-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Upload size={18} className="text-primary" />
            </div>
            <h2 className="text-xl font-serif">Upload Resource</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* File Selection */}
          <div className="space-y-4">
            <label className="text-xs font-bold uppercase tracking-wider text-lux-text">1. Select File</label>
            {!file ? (
              <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-border-subtle rounded-[2rem] sm:rounded-[3rem] cursor-pointer hover:border-primary/30 hover:bg-primary/5 transition-all group">
                <Upload size={32} className="text-lux-text mb-2 group-hover:text-primary transition-colors" />
                <span className="text-sm font-medium text-lux-text">Click to upload or drag and drop</span>
                <span className="text-xs text-lux-text mt-1">PDF, PPT, DOC, Image (Max 20MB)</span>
                <input type="file" className="hidden" onChange={onFileChange} accept=".pdf,.ppt,.pptx,.doc,.docx,.png,.jpg,.jpeg" />
              </label>
            ) : (
              <div className="p-4 bg-surface rounded-2xl sm:rounded-3xl border border-border-subtle flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-border-subtle flex items-center justify-center">
                    <FileIcon size={20} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold truncate max-w-[200px]">{file.name}</p>
                    <p className="text-xs text-lux-text">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                </div>
                <button onClick={() => setFile(null)} className="text-xs font-bold text-red-500 hover:underline">Remove</button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <label className="text-xs font-bold uppercase tracking-wider text-lux-text">2. Resource Details</label>
              <div className="space-y-4">
                <input 
                  type="text" 
                  placeholder="Title (e.g. Gr 12 Calculus Summary)"
                  className="w-full bg-surface border border-border-subtle rounded-xl px-4 py-3 outline-none focus:border-primary/30 transition-all font-medium"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
                <select 
                  className="w-full bg-surface border border-border-subtle rounded-xl px-4 py-3 outline-none focus:border-primary/30 transition-all font-medium appearance-none"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                >
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <div className="space-y-2">
                  <span className="text-xs font-medium text-lux-text">Grade</span>
                  <div className="flex gap-2">
                    {GRADES.map(g => (
                      <button
                        key={g}
                        onClick={() => setFormData({ ...formData, grade: g })}
                        className={cn(
                          "w-10 h-10 rounded-xl font-bold transition-all",
                          formData.grade === g 
                            ? "bg-primary text-lux-text" 
                            : "bg-surface text-lux-text border border-border-subtle hover:border-primary/30"
                        )}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
               <div className="space-y-4">
                <label className="text-xs font-bold uppercase tracking-wider text-lux-text">3. Curriculum</label>
                <div className="flex p-1 bg-surface rounded-xl border border-border-subtle">
                  {['NSC'].map((c) => (
                    <button
                      key={c}
                      onClick={() => setFormData({ ...formData, curriculum: c })}
                      className={cn(
                        "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                        formData.curriculum === c 
                          ? "bg-white text-primary shadow-sm" 
                          : "text-lux-text hover:text-lux-text"
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

               <div className="space-y-4">
                <label className="text-xs font-bold uppercase tracking-wider text-lux-text">4. Description & Tags</label>
                <textarea 
                  placeholder="Explain what's inside... (optional)"
                  className="w-full bg-surface border border-border-subtle rounded-xl px-4 py-3 outline-none focus:border-primary/30 transition-all font-medium resize-none"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
                <input 
                  type="text" 
                  placeholder="Tags (comma separated)"
                  className="w-full bg-surface border border-border-subtle rounded-xl px-4 py-3 outline-none focus:border-primary/30 transition-all font-medium"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="p-6 bg-surface rounded-[2rem] sm:rounded-[3rem] border border-border-subtle space-y-4">
             <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User size={18} className="text-lux-text" />
                <span className="font-semibold">Identity</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={formData.postAsGuest}
                  onChange={() => setFormData({ ...formData, postAsGuest: !formData.postAsGuest })}
                />
                <div className="w-11 h-6 bg-lux-surface00 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-lux-green-950 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-lux-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                <span className="ml-3 text-sm font-medium text-lux-text">Post as Guest</span>
              </label>
            </div>

            {formData.postAsGuest ? (
              <div className="grid grid-cols-2 gap-4">
                <input 
                  type="text" 
                  placeholder="Display Name"
                  className="bg-white border border-border-subtle rounded-xl px-4 py-3 outline-none focus:border-primary/30 transition-all font-medium"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                />
                <input 
                  type="text" 
                  placeholder="School (Optional)"
                  className="bg-white border border-border-subtle rounded-xl px-4 py-3 outline-none focus:border-primary/30 transition-all font-medium"
                  value={formData.school}
                  onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                />
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-border-subtle">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                  {auth.currentUser?.displayName?.[0] || 'S'}
                </div>
                <div>
                  <p className="text-sm font-bold">{auth.currentUser?.displayName || 'Signed In Member'}</p>
                  <p className="text-xs text-lux-text">Verified Contributor</p>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 flex gap-4">
            {!isUploading && (
              <Button 
                variant="outline" 
                onClick={onClose}
                className="flex-1 h-14 text-lg rounded-2xl sm:rounded-3xl"
              >
                Cancel
              </Button>
            )}
            {isUploading ? (
              <div className="flex-1 space-y-3">
                <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-primary">
                  <span>Uploading...</span>
                  <span>{Math.round(uploadProgress)}%</span>
                </div>
                <div className="w-full h-3 bg-primary/10 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    className="h-full bg-primary"
                  />
                </div>
              </div>
            ) : (
              <Button 
                onClick={handleUpload}
                disabled={!file || !formData.title || (formData.postAsGuest && !formData.displayName)}
                className="flex-[2] h-14 text-lg rounded-2xl sm:rounded-3xl shadow-lg shadow-primary/20"
              >
                <Sparkles size={20} className="mr-2" />
                Upload Resource
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
