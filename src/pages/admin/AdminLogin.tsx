import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { Button } from '../../components/ui/Button';
import { Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

export function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAdminAuth();

  React.useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/admin');
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Check if user is an admin
      const SUPER_EMAILS = ['contact@salainnovationlabs.com', 'techinfinite.banking@gmail.com'];
      const isHardcodedAdmin = !!(user.email && SUPER_EMAILS.includes(user.email));
      
      let isAdminActive = false;
      if (!isHardcodedAdmin) {
        try {
          // 1. Try finding by UID directly (Standard)
          const adminDoc = await getDoc(doc(db, 'admins', user.uid));
          
          if (adminDoc.exists()) {
            isAdminActive = adminDoc.data().isActive;
          } else {
            // 2. Try finding by Email as ID (Invited admins)
            const emailId = user.email?.trim().toLowerCase();
            if (emailId) {
              const adminByEmailDoc = await getDoc(doc(db, 'admins', emailId));
              if (adminByEmailDoc.exists()) {
                isAdminActive = adminByEmailDoc.data().isActive;
              } else {
                // 3. Last resort: Query by email property
                const q = query(collection(db, 'admins'), where('email', '==', user.email));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                  isAdminActive = querySnapshot.docs[0].data().isActive;
                }
              }
            }
          }
        } catch (err: any) {
          console.warn("Failed to fetch admin status from database:", err);
          // Only throw if we absolutely need the DB to confirm they are NOT a super admin
          // (Hardcoded admins are already handled before this block)
          throw err;
        }
      }
      
      if (isHardcodedAdmin || isAdminActive) {
        navigate('/admin');
      } else {
        await auth.signOut();
        setError('You do not have admin access. Contact the Super Admin.');
      }
    } catch (err: any) {
      const isOffline = err.message?.includes('offline') || err.code === 'unavailable' || err.code === 'deadline-exceeded';
      
      if (isOffline) {
        console.warn("Admin login failed due to connectivity:", err);
        setError('Cannot connect to the server. Please check your internet connection or try again later.');
      } else {
        console.error("Admin login error:", err);
        setError('Invalid credentials or missing admin access.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-[var(--color-lux-green-500)] mx-auto mb-4">
            <span className="text-2xl font-bold">G</span>
          </div>
          <h1 className="text-2xl font-bold text-lux-text mb-2">GMA Admin Portal</h1>
          <p className="text-lux-text">Restricted access. Authorised personnel only.</p>
        </div>

        <div className="bg-lux-bg border border-lux-border rounded-[2rem] sm:rounded-[3rem] p-8 shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl sm:rounded-3xl flex items-center gap-3 text-red-500 text-sm">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-lux-text mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-lux-text" size={20} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black border border-lux-border rounded-2xl sm:rounded-3xl py-4 pl-12 pr-4 text-lux-text placeholder:text-lux-text focus:border-[var(--color-lux-green-500)] focus:ring-1 focus:ring-[var(--color-lux-green-500)] outline-none transition-all"
                  placeholder="admin@geniusmakers.co.za"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-lux-text mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-lux-text" size={20} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black border border-lux-border rounded-2xl sm:rounded-3xl py-4 pl-12 pr-4 text-lux-text placeholder:text-lux-text focus:border-[var(--color-lux-green-500)] focus:ring-1 focus:ring-[var(--color-lux-green-500)] outline-none transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-14 bg-[var(--color-lux-green-500)] hover:bg-[#166B51] text-lux-text rounded-2xl sm:rounded-3xl font-bold text-lg"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="animate-spin" size={24} />
              ) : (
                'Sign In to Admin'
              )}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
