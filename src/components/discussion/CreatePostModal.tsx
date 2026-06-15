import React, { useState, useEffect } from 'react';
import { X, User, MessageCircle, ArrowRight, ArrowLeft, Send, Sparkles, Check, Image as ImageIcon, Globe, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../ui/Button';
import { db, auth } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { cn } from '../../lib/utils';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreatePostModal({ isOpen, onClose, onSuccess }: CreatePostModalProps) {
  const [step, setStep] = useState(1);
  
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

  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    subject: 'MATHEMATICS',
    grade: 12,
    curriculum: 'Both',
    topic: '',
    content: '',
    postAsGuest: true,
    displayName: '',
    imageUrl: null as string | null
  });

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const uploaderName = formData.postAsGuest 
        ? formData.displayName || 'Guest Scholar' 
        : auth.currentUser?.displayName || 'Member';

      await addDoc(collection(db, 'discussions'), {
        subject: formData.subject,
        grade: formData.grade,
        curriculum: formData.curriculum,
        topic: formData.topic,
        content: formData.content,
        authorId: formData.postAsGuest ? null : auth.currentUser?.uid,
        authorName: uploaderName,
        isGuest: formData.postAsGuest,
        imageUrl: formData.imageUrl,
        replyCount: 0,
        likeCount: 0,
        likedBy: [],
        createdAt: serverTimestamp()
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error creating post:", err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-white rounded-[40px] overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-border-subtle flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">
              Step {step} of 3
            </span>
            <h2 className="text-2xl font-serif text-text-primary">Ask A Question</h2>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-surface rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-surface flex">
          {[1, 2, 3].map((s) => (
            <div 
              key={s} 
              className={cn(
                "flex-1 transition-all duration-500",
                step >= s ? "bg-primary" : "bg-transparent"
              )} 
            />
          ))}
        </div>

        <div className="p-8">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <h3 className="text-xl font-bold mb-2">How do you want to post?</h3>
                  <p className="text-text-secondary">Choose your identity for this discussion thread.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => setFormData({ ...formData, postAsGuest: true })}
                    className={cn(
                      "p-6 rounded-[32px] border-2 text-left transition-all group",
                      formData.postAsGuest 
                        ? "border-primary bg-primary/5" 
                        : "border-border-subtle hover:border-primary/20"
                    )}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-surface border border-border-subtle flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Globe size={24} className="text-text-tertiary" />
                    </div>
                    <div className="flex items-center justify-between mb-2">
                       <h4 className="font-bold text-lg">Post as Guest</h4>
                       {formData.postAsGuest && <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white"><Check size={12} /></div>}
                    </div>
                    <p className="text-sm text-text-secondary">Fastest way. No account needed. Totally anonymous.</p>
                  </button>

                  <button
                    onClick={() => {
                        if (auth.currentUser) {
                            setFormData({ ...formData, postAsGuest: false });
                        } else {
                            // Redirect to sign in or show login hint
                            alert("Please sign in to post as a member.");
                        }
                    }}
                    className={cn(
                      "p-6 rounded-[32px] border-2 text-left transition-all group",
                      !formData.postAsGuest 
                        ? "border-primary bg-primary/5" 
                        : "border-border-subtle hover:border-primary/20"
                    )}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-surface border border-border-subtle flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Lock size={24} className="text-text-tertiary" />
                    </div>
                    <div className="flex items-center justify-between mb-2">
                       <h4 className="font-bold text-lg">As Member</h4>
                       {!formData.postAsGuest && <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white"><Check size={12} /></div>}
                    </div>
                    <p className="text-sm text-text-secondary">Build your reputation. Track replies easily.</p>
                  </button>
                </div>

                {formData.postAsGuest && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="pt-4"
                  >
                    <input 
                      type="text" 
                      placeholder="Your Display Name (e.g. MathsMaster24)"
                      className="w-full bg-surface border border-border-subtle rounded-2xl px-6 py-4 outline-none focus:border-primary/30 transition-all font-medium"
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    />
                  </motion.div>
                )}

                <div className="flex gap-4 mt-8">
                  <Button 
                    variant="outline"
                    onClick={onClose}
                    className="flex-1 h-14 rounded-2xl"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={nextStep} 
                    disabled={formData.postAsGuest && !formData.displayName}
                    className="flex-1 h-14 rounded-2xl"
                  >
                    Continue <ArrowRight size={20} className="ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-text-tertiary">Subject</label>
                    <select 
                        className="w-full bg-surface border border-border-subtle rounded-xl px-4 py-3 outline-none focus:border-primary/30 transition-all font-medium appearance-none"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    >
                        <option>MATHEMATICS</option>
                        <option>PHYSICAL SCIENCES</option>
                        <option>LIFE SCIENCES</option>
                        <option>ACCOUNTING</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-text-tertiary">Grade</label>
                    <select 
                        className="w-full bg-surface border border-border-subtle rounded-xl px-4 py-3 outline-none focus:border-primary/30 transition-all font-medium appearance-none"
                        value={formData.grade}
                        onChange={(e) => setFormData({ ...formData, grade: parseInt(e.target.value) })}
                    >
                        <option value="12">Grade 12</option>
                        <option value="11">Grade 11</option>
                        <option value="10">Grade 10</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                   <label className="text-xs font-bold uppercase tracking-wider text-text-tertiary">Topic / Headline</label>
                   <input 
                      type="text" 
                      placeholder="e.g. Help with Functions or Periodic Table"
                      className="w-full bg-surface border border-border-subtle rounded-xl px-4 py-4 outline-none focus:border-primary/30 transition-all font-medium"
                      value={formData.topic}
                      onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                    />
                </div>

                <div className="space-y-2">
                   <label className="text-xs font-bold uppercase tracking-wider text-text-tertiary">Your Question</label>
                   <textarea 
                      rows={5}
                      placeholder="Explain what you're struggling with. Be clinical..."
                      className="w-full bg-surface border border-border-subtle rounded-2xl p-6 outline-none focus:border-primary/30 transition-all font-medium resize-none shadow-inner"
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    />
                </div>

                <div className="flex gap-4 mt-8">
                  <button onClick={prevStep} className="px-6 py-4 bg-surface rounded-2xl font-bold text-text-secondary hover:bg-border-subtle transition-colors flex items-center">
                    <ArrowLeft size={20} className="mr-2" /> Back
                  </button>
                  <Button 
                    variant="outline"
                    onClick={onClose}
                    className="px-6 h-14 rounded-2xl font-bold text-text-secondary"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={nextStep} 
                    disabled={!formData.topic || !formData.content}
                    className="flex-1 h-14 rounded-2xl"
                  >
                    Review <ArrowRight size={20} className="ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="space-y-8"
              >
                <div className="p-6 bg-surface rounded-[32px] border border-dashed border-border-subtle">
                  <div className="flex items-center gap-3 mb-4">
                     <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">
                        {formData.postAsGuest ? formData.displayName?.[0] : auth.currentUser?.displayName?.[0]}
                     </div>
                     <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-text-tertiary">Previewing As</p>
                        <p className="font-bold text-text-primary">{formData.postAsGuest ? formData.displayName : auth.currentUser?.displayName}</p>
                     </div>
                  </div>
                  
                  <h4 className="text-xl font-serif mb-2">{formData.topic}</h4>
                  <p className="text-sm text-text-secondary line-clamp-3 mb-4">{formData.content}</p>
                  
                  <div className="flex gap-2">
                    <span className="px-2 py-1 bg-white rounded text-[10px] font-bold border border-border-subtle">{formData.subject}</span>
                    <span className="px-2 py-1 bg-white rounded text-[10px] font-bold border border-border-subtle">GR {formData.grade}</span>
                  </div>
                </div>

                <div className="text-center p-4 bg-primary/5 rounded-2xl border border-primary/10">
                  <p className="text-xs font-medium text-text-secondary">By posting, you agree to follow the GMA community guidelines. Keep it clinical and helpful! ✨</p>
                </div>

                <div className="flex gap-4">
                  <button onClick={prevStep} className="px-6 py-4 bg-surface rounded-2xl font-bold text-text-secondary hover:bg-border-subtle transition-colors flex items-center">
                    <ArrowLeft size={20} className="mr-2" /> Back
                  </button>
                  <Button 
                    variant="outline"
                    onClick={onClose}
                    className="px-6 h-14 rounded-2xl font-bold text-text-secondary"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSubmit} 
                    loading={submitting}
                    className="flex-1 h-14 rounded-2xl shadow-xl shadow-primary/20"
                  >
                    <Send size={20} className="mr-2" />
                    Post
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
