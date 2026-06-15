import React, { useState } from 'react';
import { Heart, MessageCircle, Share2, MoreHorizontal, User, Clock, ChevronDown, ChevronUp, Send, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DiscussionPost, DiscussionReply } from '../../types';
import { SubjectBadge } from '../ui/SubjectBadge';
import { GradeBadge } from '../ui/GradeBadge';
import { CurriculumTag } from '../ui/CurriculumTag';
import { cn } from '../../lib/utils';
import { db, auth } from '../../lib/firebase';
import { doc, updateDoc, arrayUnion, arrayRemove, collection, addDoc, serverTimestamp, query, where, orderBy, onSnapshot } from 'firebase/firestore';

interface DiscussionPostCardProps {
  post: DiscussionPost;
}

export function DiscussionPostCard({ post }: DiscussionPostCardProps) {
  const isLiked = post.likedBy?.includes(auth.currentUser?.uid || '') || false;
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<DiscussionReply[]>([]);
  const [newReply, setNewReply] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [replyIdentity, setReplyIdentity] = useState({ name: 'Guest', isGuest: true });

  const handleLike = async () => {
    if (!auth.currentUser) {
      alert("Please sign in to like posts.");
      return;
    }
    const postRef = doc(db, 'discussions', post.id);
    const uid = auth.currentUser.uid;

    if (isLiked) {
      await updateDoc(postRef, {
        likedBy: arrayRemove(uid),
        likeCount: (post.likeCount || 1) - 1
      });
    } else {
      await updateDoc(postRef, {
        likedBy: arrayUnion(uid),
        likeCount: (post.likeCount || 0) + 1
      });
    }
  };

  const toggleReplies = () => {
    setShowReplies(!showReplies);
    if (!showReplies) {
      const q = query(
        collection(db, 'discussions', post.id, 'replies'),
        orderBy('createdAt', 'asc')
      );
      onSnapshot(q, (snapshot) => {
        setReplies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DiscussionReply)));
      });
    }
  };

  const handlePostReply = async () => {
    if (!newReply.trim()) return;
    setIsReplying(true);
    try {
      const replyRef = collection(db, 'discussions', post.id, 'replies');
      await addDoc(replyRef, {
        postId: post.id,
        content: newReply,
        authorId: replyIdentity.isGuest ? null : auth.currentUser?.uid,
        authorName: replyIdentity.isGuest ? (replyIdentity.name || 'Guest') : (auth.currentUser?.displayName || 'Member'),
        isGuest: replyIdentity.isGuest,
        createdAt: serverTimestamp()
      });
      
      const postRef = doc(db, 'discussions', post.id);
      await updateDoc(postRef, {
        replyCount: post.replyCount + 1
      });
      
      setNewReply('');
    } catch (err) {
      console.error("Error posting reply:", err);
    } finally {
      setIsReplying(false);
    }
  };

  const timeAgo = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    const seconds = Math.floor((new Date().getTime() - timestamp.seconds * 1000) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds/60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds/3600)}h ago`;
    return `${Math.floor(seconds/86400)}d ago`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl border border-border-subtle overflow-hidden hover:border-primary/20 transition-all duration-300"
    >
      <div className="p-6">
        {/* Author Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary group-hover:bg-primary group-hover:text-white transition-all">
              {post.authorName?.[0] || 'G'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-text-primary">{post.authorName}</span>
                {post.isGuest && (
                  <span className="px-1.5 py-0.5 bg-surface text-[8px] font-black uppercase tracking-widest text-text-tertiary rounded-md border border-border-subtle">
                    Guest
                  </span>
                )}
              </div>
              <div className="flex items-center text-xs text-text-tertiary">
                <Clock size={12} className="mr-1" />
                {timeAgo(post.createdAt)}
              </div>
            </div>
          </div>
          <button className="p-2 hover:bg-surface rounded-full transition-colors text-text-tertiary">
            <MoreHorizontal size={18} />
          </button>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-2 mb-4">
          <SubjectBadge subject={post.subject} size="sm" />
          <GradeBadge grade={post.grade} className="w-6 h-6 text-[8px]" />
          <CurriculumTag type={post.curriculum as any} size="sm" />
          <span className="px-2.5 py-1 bg-surface text-[10px] font-bold text-text-secondary rounded-lg border border-border-subtle">
            #{post.topic.toLowerCase().replace(/\s+/g, '')}
          </span>
        </div>

        {/* Content */}
        <h3 className="text-xl font-serif mb-3 text-text-primary">
          {post.topic}
        </h3>
        <p className="text-text-secondary leading-relaxed mb-6 whitespace-pre-wrap">
          {post.content}
        </p>

        {post.imageUrl && (
          <div className="mb-6 rounded-2xl overflow-hidden border border-border-subtle bg-surface">
            <img src={post.imageUrl} alt="Attachment" className="max-h-[300px] w-full object-contain" />
          </div>
        )}

        {/* Action Row */}
        <div className="flex items-center justify-between pt-6 border-t border-border-subtle">
          <div className="flex items-center gap-6">
            <button 
              onClick={handleLike}
              className={cn(
                "flex items-center gap-2 text-sm font-bold transition-all",
                isLiked ? "text-red-500" : "text-text-tertiary hover:text-red-500"
              )}
            >
              <Heart size={20} fill={isLiked ? "currentColor" : "transparent"} />
              {post.likeCount}
            </button>
            <button 
              onClick={toggleReplies}
              className="flex items-center gap-2 text-sm font-bold text-text-tertiary hover:text-primary transition-all"
            >
              <MessageCircle size={20} />
              {post.replyCount}
            </button>
            <button className="flex items-center gap-2 text-sm font-bold text-text-tertiary hover:text-text-primary transition-all">
              <Share2 size={20} />
            </button>
          </div>
          
          <button 
            onClick={toggleReplies}
            className="text-xs font-bold text-primary flex items-center gap-1 hover:underline"
          >
            {showReplies ? 'Hide Replies' : 'Show Replies'}
            {showReplies ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Replies Section */}
      <AnimatePresence>
        {showReplies && (
          <motion.div 
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="bg-surface overflow-hidden border-t border-border-subtle"
          >
            <div className="p-6 space-y-6">
              {/* Reply Input */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                     <span className="text-xs font-bold uppercase tracking-wider text-text-tertiary">Your Reply</span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-[10px] font-bold text-text-tertiary">Post as Guest</span>
                    <input 
                      type="checkbox" 
                      className="form-checkbox h-3 w-3 text-primary rounded" 
                      checked={replyIdentity.isGuest}
                      onChange={(e) => setReplyIdentity({ ...replyIdentity, isGuest: e.target.checked })}
                    />
                  </label>
                </div>
                
                {replyIdentity.isGuest && !auth.currentUser && (
                  <input 
                    type="text" 
                    placeholder="Your display name"
                    className="w-full bg-white border border-border-subtle rounded-xl px-4 py-2 text-sm outline-none focus:border-primary/30 transition-all"
                    value={replyIdentity.name}
                    onChange={(e) => setReplyIdentity({ ...replyIdentity, name: e.target.value })}
                  />
                )}

                <div className="relative">
                  <textarea 
                    rows={2}
                    placeholder="Type your clinical, helpful reply..."
                    className="w-full bg-white border border-border-subtle rounded-2xl p-4 pr-14 text-sm outline-none focus:border-primary/30 transition-all resize-none shadow-sm"
                    value={newReply}
                    onChange={(e) => setNewReply(e.target.value)}
                  />
                  <button 
                    onClick={handlePostReply}
                    disabled={isReplying || !newReply.trim()}
                    className="absolute right-3 bottom-3 p-2 bg-primary text-white rounded-xl hover:bg-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                  >
                    {isReplying ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  </button>
                </div>
              </div>

              {/* Replies List */}
              <div className="space-y-6 pt-4">
                {replies.length === 0 ? (
                  <p className="text-center text-sm text-text-tertiary py-4 italic">No replies yet. Be the first to help!</p>
                ) : (
                  replies.map((reply) => (
                    <div key={reply.id} className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-white border border-border-subtle flex items-center justify-center font-bold text-text-secondary text-xs">
                        {reply.authorName?.[0] || 'S'}
                      </div>
                      <div className="flex-1">
                        <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-border-subtle shadow-sm mb-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-xs text-text-primary">{reply.authorName}</span>
                            <span className="text-[10px] text-text-tertiary">{timeAgo(reply.createdAt)}</span>
                          </div>
                          <p className="text-sm text-text-secondary leading-relaxed">
                            {reply.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
