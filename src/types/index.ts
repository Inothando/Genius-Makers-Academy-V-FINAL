import { Timestamp } from 'firebase/firestore';

export interface PastPaper {
  id: string;
  title: string;
  subject: string;
  grade: number;
  year: number;
  curriculum: 'NSC' | 'IEB';
  paperNumber: 'P1' | 'P2' | 'P3' | 'P4';
  type: 'question' | 'memo';
  language: 'English' | 'Afrikaans';
  session: 'Term2_MayJune' | 'Term3_Trial' | 'Term4_November' | 'Various';
  province: string;
  fileUrl: string;
  fileSize?: number; // in bytes
  downloadCount: number;
  topics?: string[];
  isVerified?: boolean;
  uploadedBy?: string;
  createdAt?: any;
}

export interface Resource {
  id: string;
  title: string;
  description: string;
  subject: string;
  grade: 8 | 9 | 10 | 11 | 12;
  curriculum: 'NSC' | 'IEB' | 'Both';
  fileType: 'PDF' | 'PPT' | 'Image' | 'Doc' | 'Other';
  fileUrl: string;
  thumbnailUrl: string;
  fileSize: number;
  uploaderName: string;
  uploaderId: string | null;
  isGuest: boolean;
  downloadCount: number;
  likeCount: number;
  tags: string[];
  isApproved: boolean;
  createdAt: Timestamp;
}

export interface DiscussionPost {
  id: string;
  subject: string;
  grade: 8 | 9 | 10 | 11 | 12;
  curriculum: 'NSC' | 'IEB' | 'Both';
  topic: string;
  content: string;
  authorId: string | null;
  authorName: string;
  isGuest: boolean;
  imageUrl: string | null;
  replyCount: number;
  likeCount: number;
  likedBy: string[];
  createdAt: Timestamp;
}

export interface DiscussionReply {
  id: string;
  postId: string;
  content: string;
  authorId: string | null;
  authorName: string;
  isGuest: boolean;
  createdAt: Timestamp;
}

export interface VideoLesson {
  id: string;
  youtubeId: string;
  title: string;
  subject: string;
  grade: 8 | 9 | 10 | 11 | 12 | null;
  curriculum: 'NSC' | 'IEB' | 'Both' | 'All';
  topic: string;
  duration: string;
  channelName: string;
  channelId: string;
  isVerified: boolean;
  thumbnailUrl: string;
  playlistId: string | null;
  isShort: boolean;
  viewCount: number;
  createdAt: Timestamp;
}

export interface StudyPackItem {
  id: string;
  type: 'video' | 'resource' | 'paper';
  refId: string;
  title: string;
  order: number;
}

export interface StudyPack {
  id: string;
  title: string;
  description: string;
  subject: string;
  grade: 8 | 9 | 10 | 11 | 12;
  curriculum: 'NSC' | 'IEB' | 'Both';
  items: StudyPackItem[];
  isPublic: boolean;
  creatorName: string;
  creatorId: string;
  enrollCount: number;
  thumbnailUrl: string;
  createdAt: Timestamp;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  phoneNumber: string | null;
  email: string | null;
  grade: 8 | 9 | 10 | 11 | 12 | null;
  curriculum: 'NSC' | 'IEB' | null;
  subjects: string[];
  tier: 'free' | 'scholar' | 'pro' | 'elite' | 'master';
  uploadCount: number;
  downloadCount: number;
  createdAt: Timestamp;
}

// Filter types for hooks
export interface PaperFilters {
  grade?: string;
  curriculum?: string;
  subject?: string;
  year?: string;
  type?: string;
  session?: string;
  language?: string;
  search?: string;
}

export interface ResourceFilters {
  grade?: string;
  curriculum?: string;
  subject?: string;
  fileType?: string;
  search?: string;
}

export interface PostFilters {
  grade?: string;
  curriculum?: string;
  subject?: string;
  topic?: string;
}

export interface VideoFilters {
  grade?: string;
  curriculum?: string;
  subject?: string;
}

export interface StudyPackFilters {
  grade?: string;
  curriculum?: string;
  subject?: string;
  search?: string;
}
