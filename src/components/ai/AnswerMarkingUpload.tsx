import React, { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, Loader2, CheckCircle2, AlertTriangle, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../ui/Button';
import { AIUpgradePrompt } from './AIUpgradePrompt';
import { useAuth } from '../../contexts/AuthContext';
import { useAI } from '../../hooks/useAI';

interface AnswerMarkingUploadProps {
  subject?: string;
  grade?: string;
  paperContext?: string;
}

interface MarkingResult {
  transcribedAnswer: string;
  marksAwarded: number;
  marksTotal: number;
  feedback: string;
  mistakesIdentified: string[];
  whatWasGoodAboutIt: string;
}

export function AnswerMarkingUpload({ subject = 'General', grade = '12', paperContext = '' }: AnswerMarkingUploadProps) {
  const { user } = useAuth();
  const { status, loading: statusLoading } = useAI();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [questionNumber, setQuestionNumber] = useState('');
  const [isMarking, setIsMarking] = useState(false);
  const [result, setResult] = useState<MarkingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size should be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string);
      setResult(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleMarkAnswer = async () => {
    if (!user || !imagePreview) return;
    
    setIsMarking(true);
    setError(null);
    
    try {
      const response = await fetch('/api/ai/mark-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          imageBase64: imagePreview,
          subject,
          grade,
          paperContext,
          questionNumber
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (data.error === "limit_reached") {
          setError("limit_reached");
        } else {
          setError(data.error || "Failed to mark answer");
        }
        return;
      }
      
      setResult(data);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setIsMarking(false);
    }
  };

  if (statusLoading) {
    return <div className="flex justify-center py-10"><Loader2 className="animate-spin text-lux-text" /></div>;
  }

  // Tier Gating - requires Pro
  if (status?.tier === 'free' || status?.tier === 'starter' || status?.tier === 'scholar') {
    return (
      <div className="pt-8">
        <AIUpgradePrompt message="Upgrade to Pro for R15/month to unlock AI Answer Marking and vision capabilities." />
      </div>
    );
  }

  if (error === "limit_reached" || status?.remaining === 0) {
    return (
      <div className="pt-8">
        <AIUpgradePrompt message="You've reached your daily AI limit. Please try again tomorrow or view our plans." />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="p-4 border-b border-lux-border shrink-0">
        <h3 className="font-serif text-lux-text font-bold text-lg mb-1">Get Your Answer Marked</h3>
        <p className="text-xs text-lux-text">Upload a clear photo of your handwritten answer, and GMA AI will mark it according to NSC memo guidelines.</p>
      </div>

      <div className="p-4 space-y-6">
        
        {!result && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-lux-text mb-1.5 uppercase tracking-wider">Question Number (Optional)</label>
              <input
                type="text"
                value={questionNumber}
                onChange={(e) => setQuestionNumber(e.target.value)}
                placeholder="e.g. 2.1.3"
                className="w-full bg-lux-surface0 border border-lux-border rounded-xl px-4 py-3 text-sm text-lux-text placeholder-slate-400 outline-none focus:border-[#CCA43B] transition-colors"
              />
            </div>
          
            {!imagePreview ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-lux-border rounded-2xl sm:rounded-3xl p-8 hover:bg-lux-surface0 hover:border-[#CCA43B]/50 transition-colors cursor-pointer group flex flex-col items-center justify-center min-h-[200px]"
              >
                <div className="w-12 h-12 bg-lux-surface0 rounded-full flex items-center justify-center mb-4 group-hover:bg-[#CCA43B]/20 transition-colors">
                  <Camera className="text-lux-text group-hover:text-lux-text transition-colors" size={24} />
                </div>
                <p className="text-sm text-lux-text font-medium text-center mb-1">Click to upload photo</p>
                <p className="text-xs text-lux-text text-center">Take a clear, well-lit photo of your page</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-lux-border group">
                  <img src={imagePreview} alt="Answer preview" className="w-full object-contain max-h-[300px] bg-black" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button 
                      onClick={() => setImagePreview(null)}
                      className="bg-lux-surface00 hover:bg-lux-surface00 text-lux-text backdrop-blur-md"
                    >
                      Choose Different Photo
                    </Button>
                  </div>
                </div>
                
                <Button
                  onClick={handleMarkAnswer}
                  disabled={isMarking}
                  className="w-full bg-[var(--color-lux-green-500)] hover:bg-[var(--color-lux-green-800)] text-lux-text font-bold h-12 rounded-xl text-sm"
                >
                  {isMarking ? (
                    <>
                      <Loader2 className="animate-spin mr-2" size={16} />
                      AI is marking your answer...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2" size={16} />
                      Mark My Answer
                    </>
                  )}
                </Button>
              </div>
            )}
            
            <input 
              type="file" 
              accept="image/*" 
              capture="environment"
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileChange}
            />
          </div>
        )}

        {error && error !== "limit_reached" && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm leading-relaxed">
            {error}
          </div>
        )}

        {result && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Mark Circle */}
            <div className="flex justify-center">
              <div className="w-24 h-24 rounded-full border-4 border-[#CCA43B] flex items-center justify-center bg-lux-surface0 shadow-[0_0_20px_rgba(204,164,59,0.2)]">
                <div className="text-center">
                  <span className="block text-2xl font-bold text-lux-text leading-none">{result.marksAwarded}</span>
                  <span className="block text-lux-text text-xs font-black uppercase border-t border-lux-border mx-2 mt-1 pt-1">/ {result.marksTotal}</span>
                </div>
              </div>
            </div>

            {/* What you did well */}
            <div className="bg-[var(--color-lux-green-500)]/10 border border-[var(--color-lux-green-500)]/30 rounded-2xl sm:rounded-3xl p-5">
              <h4 className="flex items-center gap-2 text-[var(--color-lux-green-500)] font-bold text-sm mb-2">
                <CheckCircle2 size={16} />
                What You Did Well
              </h4>
              <p className="text-lux-text text-sm leading-relaxed">{result.whatWasGoodAboutIt}</p>
            </div>

            {/* Mistakes */}
            {result.mistakesIdentified && result.mistakesIdentified.length > 0 && (
              <div className="bg-red-500/5 border border-red-500/20 rounded-2xl sm:rounded-3xl p-5">
                <h4 className="flex items-center gap-2 text-red-400 font-bold text-sm mb-3">
                  <AlertTriangle size={16} />
                  Areas for Improvement
                </h4>
                <ul className="space-y-2">
                  {result.mistakesIdentified.map((mistake, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-red-200/80 leading-relaxed">
                      <span className="text-red-500 shrink-0 mt-0.5">•</span>
                      {mistake}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Feedback */}
            <div className="bg-lux-surface0 border border-lux-border rounded-2xl sm:rounded-3xl p-5">
              <h4 className="text-lux-text font-bold text-sm mb-2">Overall Feedback</h4>
              <p className="text-lux-text text-sm leading-relaxed">{result.feedback}</p>
            </div>

            {/* Transcribed Text */}
            <div className="bg-lux-surface0 rounded-2xl sm:rounded-3xl p-5">
              <h4 className="text-lux-text font-bold text-xs uppercase tracking-wider mb-2">What AI Read</h4>
              <p className="text-lux-text text-sm font-mono leading-relaxed bg-lux-surface00 p-4 rounded-xl border border-lux-border">
                {result.transcribedAnswer || "No text could be extracted."}
              </p>
            </div>

            <Button 
              onClick={() => {
                setResult(null);
                setImagePreview(null);
              }}
              className="w-full bg-lux-surface00 hover:bg-lux-surface00 text-lux-text"
            >
              Mark Another Answer
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
