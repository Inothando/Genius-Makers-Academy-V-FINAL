import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signOut as firebaseSignOut 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp, 
  onSnapshot
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        const profilePath = `users/${firebaseUser.uid}`;
        try {
          // Check if profile exists, if not create one
          const profileRef = doc(db, 'users', firebaseUser.uid);
          
          let profileSnap;
          try {
            profileSnap = await getDoc(profileRef);
          } catch (e: any) {
            console.warn("Failed to fetch profile during auth initialization:", e);
            // If offline, we'll try to just proceed and rely on the snapshot listener
            if (!e.message?.includes('offline') && e.code !== 'unavailable') {
              handleFirestoreError(e, OperationType.GET, profilePath);
            }
          }
          
          if (profileSnap && !profileSnap.exists()) {
            const newProfile: Partial<UserProfile> = {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || 'GMA Student',
              phoneNumber: firebaseUser.phoneNumber,
              email: firebaseUser.email,
              grade: null,
              curriculum: null,
              subjects: [],
              tier: 'free',
              uploadCount: 0,
              downloadCount: 0,
              createdAt: serverTimestamp() as any
            };
            try {
              await setDoc(profileRef, newProfile);
            } catch (e: any) {
              console.warn("Failed to create profile:", e);
              if (!e.message?.includes('offline') && e.code !== 'unavailable') {
                handleFirestoreError(e, OperationType.WRITE, profilePath);
              }
            }
          }

          // Listen for profile changes
          const unsubProfile = onSnapshot(profileRef, (doc) => {
            if (doc.exists()) {
              setUserProfile({ id: doc.id, ...doc.data() } as any);
            }
          }, (error) => {
            // Only report non-offline errors for the listener
            if (!error.message?.includes('offline') && error.code !== 'unavailable') {
              handleFirestoreError(error, OperationType.GET, profilePath);
            }
          });

          setLoading(false);
          return () => unsubProfile();
        } catch (error) {
          console.error("Auth initialization error:", error);
          setLoading(false);
        }
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
