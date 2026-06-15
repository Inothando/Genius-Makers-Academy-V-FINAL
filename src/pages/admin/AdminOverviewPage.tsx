import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  BookOpen, 
  Users, 
  MessageSquare, 
  TrendingUp,
  Clock,
  Plus,
  ArrowUpRight,
  Shield,
  Activity,
  History
} from 'lucide-react';
import { collection, query, orderBy, limit, getDocs, getCountFromServer, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { Link } from 'react-router-dom';

interface AuditEntry {
  id: string;
  action: string;
  actorName: string;
  details: string;
  timestamp: Timestamp;
}

export function AdminOverviewPage() {
  const { isSuperAdmin } = useAdminAuth();
  const [stats, setStats] = useState({
    papers: 0,
    resources: 0,
    users: 0,
    discussions: 0
  });
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userGrowth, setUserGrowth] = useState<number[]>([12, 18, 15, 25, 32, 28, 45, 52, 48, 60, 65, 58, 70, 85]);

  useEffect(() => {
    async function fetchStats() {
      try {
        const collections = ['past-papers', 'resources', 'users', 'discussions'];
        const results = await Promise.all(
          collections.map(c => getCountFromServer(collection(db, c)))
        );
        
        setStats({
          papers: results[0].data().count,
          resources: results[1].data().count,
          users: results[2].data().count,
          discussions: results[3].data().count
        });
      } catch (err: any) {
        const isOffline = err.message?.includes('offline') || err.code === 'unavailable' || err.code === 'deadline-exceeded';
        if (err.message?.includes('does not exist') || isOffline) {
          console.warn("Analytics data inaccessible:", isOffline ? "Client is offline" : "Database missing", err.message);
        } else {
          console.error("Error fetching counts:", err);
        }
        // Set fallback values or just leave at 0
      } finally {
        setLoading(false);
      }
    }
    fetchStats();

    // Real-time Audit Logs
    const auditQuery = query(
      collection(db, 'admin_audit_log'),
      orderBy('timestamp', 'desc'),
      limit(15)
    );

    const unsubscribeAudit = onSnapshot(auditQuery, (snapshot) => {
      const entries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AuditEntry[];
      setAuditLogs(entries);
    });

    return () => unsubscribeAudit();
  }, []);

  const statCards = [
    { title: 'Total Papers', value: stats.papers, icon: FileText, color: 'text-green-500', change: '+24' },
    { title: 'Total Resources', value: stats.resources, icon: BookOpen, color: 'text-blue-500', change: '+12' },
    { title: 'Registered Users', value: stats.users, icon: Users, color: 'text-purple-500', change: '+156' },
    { title: 'Discussion Posts', value: stats.discussions, icon: MessageSquare, color: 'text-amber-500', change: '+8' },
  ];

  const getActionStyles = (action: string) => {
    if (action.includes('upload') || action.includes('added')) return { icon: '📄', color: 'text-green-500', bg: 'bg-green-500/10' };
    if (action.includes('delete') || action.includes('removed')) return { icon: '🗑️', color: 'text-red-500', bg: 'bg-red-500/10' };
    if (action.includes('admin_added')) return { icon: '⭐', color: 'text-amber-500', bg: 'bg-amber-500/10' };
    if (action.includes('moderation')) return { icon: '🛡️', color: 'text-amber-500', bg: 'bg-amber-500/10' };
    return { icon: '⚡', color: 'text-blue-500', bg: 'bg-blue-500/10' };
  };

  const getTimeAgo = (timestamp?: Timestamp) => {
    if (!timestamp) return 'Just now';
    const seconds = Math.floor((new Date().getTime() - timestamp.toDate().getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return timestamp.toDate().toLocaleDateString();
  };

  const maxValue = Math.max(...userGrowth);

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-[#111111] border border-gray-800 rounded-2xl p-6 relative overflow-hidden group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={cn("p-3 rounded-xl bg-gray-900 group-hover:bg-gray-800 transition-colors", card.color.replace('text', 'bg').replace('-500', '-500/10'))}>
                <card.icon size={20} className={card.color} />
              </div>
              <span className="text-[10px] text-green-500 font-bold bg-green-500/10 px-2 py-1 rounded-full">
                {card.change} this week
              </span>
            </div>
            <h4 className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{card.title}</h4>
            <p className="text-3xl font-bold text-white mt-1">
              {loading ? <span className="animate-pulse">...</span> : card.value.toLocaleString()}
            </p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Actions & Chart */}
        <div className="lg:col-span-8 space-y-8">
          {isSuperAdmin && (
            <section className="bg-[#111111] border border-gray-800 rounded-2xl p-6">
              <h3 className="text-white font-bold text-sm mb-6 flex items-center gap-2">
                <Shield size={16} className="text-[#1D9E75]" /> Quick Actions
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                <Link to="/admin/papers" className="w-full">
                  <button className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-[#1D9E75] hover:bg-[#166B51] text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-[#1D9E75]/20">
                    <Plus size={18} /> Quick Upload
                  </button>
                </Link>
                <Link to="/admin/manage" className="w-full">
                  <button className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-sm font-bold transition-all border border-gray-700">
                    <Plus size={18} /> Add Admin
                  </button>
                </Link>
                <Link to="/admin/discussions" className="w-full">
                  <button className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-gray-950 hover:bg-gray-900 text-gray-400 hover:text-white rounded-xl text-sm font-bold transition-all border border-gray-800">
                    <MessageSquare size={18} /> Moderate Forum
                  </button>
                </Link>
              </div>
            </section>
          )}

          {/* SVG Bar Chart */}
          <section className="bg-[#111111] border border-gray-800 rounded-2xl p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-white font-bold text-lg mb-1">New Learners</h3>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Last 14 Days Growth</p>
              </div>
              <div className="px-3 py-1 bg-green-500/10 text-green-500 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-green-500/20">
                +124% Overall
              </div>
            </div>

            <div className="h-48 flex items-end justify-between gap-2 px-2">
              {userGrowth.map((val, i) => {
                const height = (val / maxValue) * 100;
                const isToday = i === userGrowth.length - 1;
                return (
                  <div key={i} className="flex-1 group relative">
                    <div 
                      className={cn(
                        "w-full rounded-t-sm transition-all duration-500 ease-out flex flex-col items-center justify-end group-hover:opacity-80 cursor-pointer",
                        isToday ? "bg-[#1D9E75]" : "bg-gray-800"
                      )}
                      style={{ height: `${height}%` }}
                    >
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        <span className="text-[10px] font-bold text-white bg-gray-800 px-2 py-1 rounded shadow-xl">
                          {val} signups
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-4 px-2">
              <span className="text-[10px] font-bold text-gray-600 uppercase">14 days ago</span>
              <span className="text-[10px] font-bold text-[#1D9E75] uppercase">Today</span>
            </div>
          </section>
        </div>

        {/* Right Column: Live Activity */}
        <div className="lg:col-span-4">
          <section className="bg-[#111111] border border-gray-800 rounded-2xl p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                <Activity size={16} className="text-[#1D9E75]" /> Live Activity
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-sm shadow-green-500" />
              </h3>
              <Link to="/admin/audit" className="text-[10px] font-bold text-gray-500 hover:text-white uppercase tracking-widest transition-colors flex items-center gap-1">
                <History size={12} /> View All
              </Link>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
              {auditLogs.length > 0 ? (
                auditLogs.map((log) => {
                  const style = getActionStyles(log.action);
                  return (
                    <div key={log.id} className="flex gap-4 p-3 hover:bg-gray-900/50 rounded-xl transition-all group border border-transparent hover:border-gray-800">
                      <div className={cn("w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-lg", style.bg)}>
                        {style.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] text-gray-400 mb-0.5">
                          <span className="text-white font-bold">{log.actorName}</span>
                        </p>
                        <p className="text-xs text-white/90 leading-relaxed truncate group-hover:text-clip">
                          {log.details}
                        </p>
                        <span className="text-[10px] text-gray-600 mt-1 block">
                          {getTimeAgo(log.timestamp)}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="h-40 flex flex-col items-center justify-center text-gray-600 border-2 border-dashed border-gray-800 rounded-2xl">
                  <Clock size={24} className="mb-2 opacity-20" />
                  <p className="text-xs">No activity yet</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
