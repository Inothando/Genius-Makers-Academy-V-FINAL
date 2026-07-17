import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Search, 
  Download, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  Shield,
  FileText,
  User,
  Trash2,
  Settings,
  AlertTriangle
} from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot, where, startAfter, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { Button } from '../../components/ui/Button';
import { cn } from '../../lib/utils';

export function AdminAuditLogPage() {
  const { isSuperAdmin } = useAdminAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  useEffect(() => {
    const q = query(
      collection(db, 'admin_audit_log'),
      orderBy('timestamp', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getActionStyle = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes('delete') || act.includes('removed')) return { icon: <Trash2 size={14} />, color: 'text-red-500', bg: 'bg-red-500/10' };
    if (act.includes('upload') || act.includes('added')) return { icon: <FileText size={14} />, color: 'text-green-500', bg: 'bg-green-500/10' };
    if (act.includes('admin')) return { icon: <Shield size={14} />, color: 'text-amber-500', bg: 'bg-amber-500/10' };
    if (act.includes('settings')) return { icon: <Settings size={14} />, color: 'text-blue-500', bg: 'bg-blue-500/10' };
    return { icon: <Clock size={14} />, color: 'text-lux-text', bg: 'bg-lux-surface-alt/10' };
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.actorName?.toLowerCase().includes(search.toLowerCase()) ||
      log.details?.toLowerCase().includes(search.toLowerCase()) ||
      log.action?.toLowerCase().includes(search.toLowerCase());
    
    const matchesAction = actionFilter === 'all' || log.action.includes(actionFilter);
    
    return matchesSearch && matchesAction;
  });

  const exportCSV = () => {
    if (!isSuperAdmin) return;
    
    const headers = ['Timestamp', 'Admin', 'Action', 'Target', 'Details'];
    const rows = filteredLogs.map(log => [
      log.timestamp?.toDate().toISOString() || '',
      log.actorName || '',
      log.action || '',
      log.targetName || '',
      log.details || ''
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.map(cell => `"${cell}"`).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `gma_audit_log_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const actions = [
    { label: 'All Actions', value: 'all' },
    { label: 'Uploads', value: 'uploaded' },
    { label: 'Deletions', value: 'delete' },
    { label: 'Admin Ops', value: 'admin' },
    { label: 'Moderation', value: 'mod' },
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-lux-text mb-1">System Audit Log</h1>
          <p className="text-sm text-lux-text">Traceable history of all administrative actions.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
           <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-lux-text" size={16} />
              <input 
                type="text" 
                placeholder="Search logs..." 
                className="bg-[#111111] border border-lux-border rounded-xl py-2.5 pl-10 pr-4 text-xs text-lux-text focus:border-[var(--color-lux-green-500)] outline-none transition-all w-64"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
           </div>
           
           <div className="flex bg-[#111111] border border-lux-border rounded-xl p-1">
              {actions.map(a => (
                <button
                  key={a.value}
                  onClick={() => setActionFilter(a.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all whitespace-nowrap",
                    actionFilter === a.value ? "bg-[var(--color-lux-green-500)] text-lux-text" : "text-lux-text hover:text-lux-text"
                  )}
                >
                  {a.label}
                </button>
              ))}
           </div>

           {isSuperAdmin && (
             <Button onClick={exportCSV} className="bg-lux-surface-alt hover:bg-lux-surface-alt text-lux-text gap-2 text-xs h-[42px] px-6 rounded-xl border border-lux-border">
               <Download size={16} /> Export CSV
             </Button>
           )}
        </div>
      </header>

      <div className="bg-[#111111] border border-lux-border rounded-[24px] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-black/40 border-b border-lux-border">
              <tr>
                <th className="px-6 py-5 text-[10px] font-bold text-lux-text uppercase tracking-widest min-w-[180px]">Timestamp</th>
                <th className="px-6 py-5 text-[10px] font-bold text-lux-text uppercase tracking-widest min-w-[150px]">Admin</th>
                <th className="px-6 py-5 text-[10px] font-bold text-lux-text uppercase tracking-widest min-w-[150px]">Action</th>
                <th className="px-6 py-5 text-[10px] font-bold text-lux-text uppercase tracking-widest min-w-[150px]">Target</th>
                <th className="px-6 py-5 text-[10px] font-bold text-lux-text uppercase tracking-widest min-w-[300px]">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-6 py-6 h-16 bg-lux-bg/10"></td>
                  </tr>
                ))
              ) : filteredLogs.length > 0 ? (
                filteredLogs.map((log) => {
                  const style = getActionStyle(log.action);
                  return (
                    <tr key={log.id} className="hover:bg-lux-bg/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-lux-bg border border-lux-border flex items-center justify-center text-lux-text">
                            <Clock size={14} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-lux-text font-medium">{log.timestamp?.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                            <span className="text-[10px] text-lux-text font-mono tracking-tighter">{log.timestamp?.toDate().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                           <div className="w-6 h-6 rounded-full bg-lux-surface-alt border border-lux-border flex items-center justify-center text-[10px] font-bold text-lux-text">
                              {log.actorName?.charAt(0)}
                           </div>
                           <span className="text-xs font-bold text-lux-text">{log.actorName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 w-fit",
                          style.bg, style.color
                        )}>
                          {style.icon}
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-lux-text font-medium">{log.targetName || '-'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs text-lux-text leading-relaxed max-w-md line-clamp-2 hover:line-clamp-none transition-all">
                          {log.details}
                        </p>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <AlertTriangle size={32} className="mx-auto text-lux-text mb-4 opacity-20" />
                    <p className="text-sm text-lux-text italic">No logs found matching your criteria</p>
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
