import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  ChevronDown, 
  ChevronUp,
  Download,
  Upload,
  Trophy,
  Filter,
  RefreshCw,
  MoreHorizontal,
  ArrowDownRight,
  ArrowUpRight,
  GraduationCap,
  ShieldCheck
} from 'lucide-react';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  where,
  doc,
  updateDoc,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { UserProfile } from '../../types';
import { Button } from '../../components/ui/Button';
import { cn } from '../../lib/utils';
import { useAdminAuth } from '../../hooks/useAdminAuth';

export function AdminUsersPage() {
  const { isSuperAdmin } = useAdminAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  useEffect(() => {
    if (!isSuperAdmin) return;

    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isSuperAdmin]);

  const handleUpdateTier = async (uid: string, tier: UserProfile['tier']) => {
    try {
      await updateDoc(doc(db, 'users', uid), { tier });
    } catch (err) {
      console.error(err);
    }
  };

  const filteredUsers = users.filter(u => 
    u.displayName?.toLowerCase().includes(search.toLowerCase()) || 
    u.phoneNumber?.includes(search) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (!isSuperAdmin) {
    return (
       <div className="flex flex-col items-center justify-center py-20 text-center">
         <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mb-4">
           <ShieldCheck size={32} />
         </div>
         <h2 className="text-xl font-bold text-white mb-2">Super Admin Access Required</h2>
         <p className="text-gray-500 max-w-sm">
           The scholar registry contains sensitive personal data and is only accessible by Super Admins.
         </p>
       </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-20">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
           <h1 className="text-2xl font-bold text-white mb-1">Scholar Registry</h1>
           <p className="text-sm text-gray-500">Manage all registered students and their access levels.</p>
        </div>
 
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
           <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
              <input 
                type="text" 
                placeholder="Search scholars..." 
                className="bg-[#111111] border border-gray-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:border-[#1D9E75] outline-none transition-all w-full shadow-lg shadow-black/20"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
           </div>
           <Button className="w-full sm:w-auto bg-gray-800 text-white gap-2 text-xs border border-gray-700 h-[42px] px-6 rounded-xl">
              <Download size={16} /> Export
           </Button>
        </div>
      </header>

      <div className="bg-[#111111] border border-gray-800 rounded-[24px] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/20">
                <th className="px-6 py-5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Scholar</th>
                <th className="px-6 py-5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Educational Info</th>
                <th className="px-6 py-5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Account Tier</th>
                <th className="px-6 py-5 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center">Engagement</th>
                <th className="px-6 py-5 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">Joined</th>
                <th className="px-6 py-5 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">More</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/40">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-6 py-6 h-20 bg-gray-900/10"></td>
                  </tr>
                ))
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((u) => (
                  <React.Fragment key={u.uid}>
                    <tr 
                      className={cn(
                        "hover:bg-gray-900/30 transition-all cursor-pointer group",
                        expandedUser === u.uid && "bg-gray-900/50"
                      )}
                      onClick={() => setExpandedUser(expandedUser === u.uid ? null : u.uid)}
                    >
                      <td className="px-6 py-5">
                         <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center font-bold text-lg text-white group-hover:scale-105 transition-transform">
                               {u.displayName?.charAt(0) || '?'}
                            </div>
                            <div className="flex flex-col">
                               <p className="text-sm font-bold text-white mb-0.5">{u.displayName}</p>
                               <span className="text-[10px] text-gray-500 font-medium flex items-center gap-1"><Mail size={10} /> {u.email}</span>
                            </div>
                         </div>
                      </td>
                      <td className="px-6 py-5">
                         <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Grade {u.grade || 'N/A'}</span>
                            <span className="text-[10px] text-[#1D9E75] font-black uppercase">{u.curriculum || 'GMA'} Track</span>
                         </div>
                      </td>
                      <td className="px-6 py-5">
                         <select 
                           value={u.tier}
                           onClick={(e) => e.stopPropagation()}
                           onChange={(e) => handleUpdateTier(u.uid, e.target.value as any)}
                           className={cn(
                             "px-3 py-1.5 rounded-xl bg-black border border-gray-800 text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer",
                             u.tier === 'elite' ? "text-amber-500 border-amber-500/20" :
                             u.tier === 'pro' ? "text-blue-500 border-blue-500/20" :
                             "text-gray-500"
                           )}
                         >
                            <option value="free">Free</option>
                            <option value="pro">Pro</option>
                            <option value="elite">Elite</option>
                         </select>
                      </td>
                      <td className="px-6 py-5">
                         <div className="flex items-center justify-center gap-6">
                            <div className="flex flex-col items-center">
                               <span className="text-xs font-bold text-white">{u.downloadCount || 0}</span>
                               <span className="text-[8px] text-gray-600 font-black uppercase">Hits</span>
                            </div>
                            <div className="flex flex-col items-center">
                               <span className="text-xs font-bold text-white">{u.uploadCount || 0}</span>
                               <span className="text-[8px] text-gray-600 font-black uppercase">Ups</span>
                            </div>
                         </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                         <span className="text-xs text-gray-500 font-medium">
                            {u.createdAt ? new Date(u.createdAt.seconds * 1000).toLocaleDateString() : 'Unknown'}
                         </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                         <div className="flex items-center justify-end">
                            {expandedUser === u.uid ? <ChevronUp size={18} className="text-[#1D9E75]" /> : <ChevronDown size={18} className="text-gray-600" />}
                         </div>
                      </td>
                    </tr>
                    {expandedUser === u.uid && (
                      <tr className="bg-gray-900/10">
                        <td colSpan={6} className="px-12 py-8 border-b border-gray-800/40">
                           <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                              <div className="space-y-6">
                                 <h5 className="text-[10px] font-black uppercase tracking-widest text-[#1D9E75] border-b border-gray-800 pb-2 flex items-center gap-2">
                                    <ShieldCheck size={12} /> Account Intelligence
                                 </h5>
                                 <div className="space-y-4">
                                    <div className="flex items-center gap-3 text-xs text-gray-400">
                                       <Calendar size={14} className="text-gray-600" />
                                       <span>Registered {new Date(u.createdAt.seconds * 1000).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-gray-400">
                                       <MapPin size={14} className="text-gray-600" />
                                       <span>Region: South Africa (Default)</span>
                                    </div>
                                    {u.phoneNumber && (
                                      <div className="flex items-center gap-3 text-xs text-gray-400">
                                         <Phone size={14} className="text-gray-600" />
                                         <span>Verified Mobile: {u.phoneNumber}</span>
                                      </div>
                                    )}

                                    <Button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        window.location.href = `/admin/manage?email=${encodeURIComponent(u.email || '')}&name=${encodeURIComponent(u.displayName || '')}`;
                                      }}
                                      className="w-full bg-[#1D9E75]/10 hover:bg-[#1D9E75] text-[#1D9E75] hover:text-white border border-[#1D9E75]/20 text-[10px] font-black uppercase py-2 rounded-xl transition-all flex items-center justify-center gap-2"
                                    >
                                      <ShieldCheck size={14} /> Promote to Admin
                                    </Button>
                                 </div>
                              </div>

                              <div className="col-span-2 space-y-6">
                                 <h5 className="text-[10px] font-black uppercase tracking-widest text-gray-500 border-b border-gray-800 pb-2">Academic Profile</h5>
                                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                    <div>
                                       <label className="block text-[8px] font-black uppercase text-gray-600 mb-2">Top Performance Subjects</label>
                                       <div className="flex flex-wrap gap-2">
                                          {u.subjects?.length > 0 ? u.subjects.map(s => (
                                            <span key={s} className="px-2 py-1 bg-gray-900 border border-gray-800 rounded-lg text-[10px] font-bold text-gray-400">
                                              {s}
                                            </span>
                                          )) : <span className="text-xs text-gray-600 italic">No profile data</span>}
                                       </div>
                                    </div>
                                    <div className="flex gap-4">
                                       <div className="flex-1 p-4 bg-black border border-gray-800 rounded-2xl flex flex-col justify-center">
                                          <p className="text-[10px] font-black text-gray-600 uppercase mb-1">Total Hits</p>
                                          <div className="flex items-center gap-2">
                                             <span className="text-xl font-bold text-white">{u.downloadCount || 0}</span>
                                             <ArrowDownRight size={14} className="text-red-500/50" />
                                          </div>
                                       </div>
                                       <div className="flex-1 p-4 bg-black border border-gray-800 rounded-2xl flex flex-col justify-center">
                                          <p className="text-[10px] font-black text-gray-600 uppercase mb-1">Total Ups</p>
                                          <div className="flex items-center gap-2">
                                             <span className="text-xl font-bold text-white">{u.uploadCount || 0}</span>
                                             <ArrowUpRight size={14} className="text-green-500/50" />
                                          </div>
                                       </div>
                                    </div>
                                 </div>
                              </div>
                           </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <tr>
                   <td colSpan={6} className="py-20 text-center">
                      <Users size={48} className="mx-auto text-gray-800 mb-4 opacity-20" />
                      <p className="text-sm text-gray-600 italic">No registered scholars found</p>
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

