import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { ShieldAlert, History, MessageSquare, AlertTriangle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Loader2 } from 'lucide-react';

export function AdminRoomSafetyPage() {
   const [reports, setReports] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);

   const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
   const [roomMessages, setRoomMessages] = useState<any[]>([]);
   const [loadingMessages, setLoadingMessages] = useState(false);

   useEffect(() => {
     const fetchReports = async () => {
        try {
           const q = query(collection(db, "roomReports"), orderBy('timestamp', 'desc'));
           const snap = await getDocs(q);
           const r: any[] = [];
           snap.forEach(d => r.push({ id: d.id, ...d.data() }));
           setReports(r);
        } catch(err) {
           console.error(err);
        } finally {
           setLoading(false);
        }
     };
     fetchReports();
   }, []);

   const loadRoomLogs = async (roomId: string) => {
      setSelectedRoomId(roomId);
      setLoadingMessages(true);
      try {
         const q = query(collection(db, "coStudyRooms", roomId, "messages"), orderBy('timestamp', 'asc'));
         const snap = await getDocs(q);
         const m: any[] = [];
         snap.forEach(d => m.push({ id: d.id, ...d.data() }));
         setRoomMessages(m);
      } catch(err) {
         console.error(err);
      } finally {
         setLoadingMessages(false);
      }
   };

   if (loading) {
      return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-lux-green-500 w-8 h-8" /></div>;
   }

   return (
      <div className="space-y-8">
         <div className="flex items-center justify-between">
            <div>
               <h1 className="text-3xl font-serif text-lux-text flex items-center gap-3">
                  <ShieldAlert className="text-red-500 w-8 h-8" /> Room Safety Controls
               </h1>
               <p className="text-lux-text mt-2">Monitor reported Co-Study rooms and review permanent chat logs.</p>
            </div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             <div className="lg:col-span-1 border border-lux-border bg-white rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm flex flex-col h-[600px]">
                <div className="bg-lux-bg px-4 py-3 border-b flex items-center gap-2">
                   <AlertTriangle size={16} className="text-orange-500" />
                   <h3 className="font-bold text-lux-text text-sm">Active Reports</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                   {reports.length === 0 ? (
                      <p className="text-xs text-lux-text text-center py-8">No reports found.</p>
                   ) : (
                      reports.map(report => (
                         <div 
                           key={report.id} 
                           onClick={() => loadRoomLogs(report.roomId)}
                           className={`p-3 rounded-xl border cursor-pointer transition-colors ${selectedRoomId === report.roomId ? 'bg-red-50 border-red-200' : 'bg-white hover:bg-lux-bg border-lux-border'}`}
                         >
                            <div className="flex justify-between items-start mb-2">
                               <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 bg-red-100 px-2 py-0.5 rounded-full">{report.status}</span>
                               <span className="text-[10px] text-lux-text">{report.timestamp?.toDate().toLocaleString()}</span>
                            </div>
                            <p className="text-xs font-medium text-lux-text mb-1">Room: {report.roomId}</p>
                            <p className="text-xs text-lux-text italic">"{report.reason}"</p>
                            <p className="text-[10px] text-lux-text mt-2">Reported by: ...{report.reportedBy?.substring(report.reportedBy.length - 6)}</p>
                         </div>
                      ))
                   )}
                </div>
             </div>

             <div className="lg:col-span-2 border border-lux-border bg-white rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm flex flex-col h-[600px]">
                <div className="bg-lux-bg px-4 py-3 border-b flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <History size={16} className="text-lux-green-500" />
                      <h3 className="font-bold text-lux-text text-sm">Permanent Chat Logs</h3>
                   </div>
                   {selectedRoomId && (
                      <span className="text-[10px] text-lux-text font-mono">{selectedRoomId}</span>
                   )}
                </div>
                <div className="flex-1 overflow-y-auto p-4 bg-[#f8f9fa] custom-scrollbar">
                   {!selectedRoomId ? (
                      <div className="flex flex-col items-center justify-center h-full text-lux-text opacity-50">
                         <MessageSquare size={48} className="mb-4" />
                         <p className="text-sm">Select a report to view logs</p>
                      </div>
                   ) : loadingMessages ? (
                      <div className="flex justify-center py-12"><Loader2 className="animate-spin text-lux-green-500 w-6 h-6" /></div>
                   ) : roomMessages.length === 0 ? (
                      <p className="text-xs text-lux-text text-center py-8">No messages in this room's history.</p>
                   ) : (
                      <div className="space-y-4">
                         {roomMessages.map(msg => (
                            <div key={msg.id} className="bg-white border rounded-lg p-3 shadow-sm text-sm">
                               <div className="flex justify-between items-center border-b pb-2 mb-2">
                                  <span className="font-bold text-lux-text">{msg.displayName}</span>
                                  <span className="text-[10px] text-lux-text">{msg.timestamp?.toDate().toLocaleString()}</span>
                               </div>
                               <p className="text-lux-text break-words">{msg.text}</p>
                               <p className="text-[9px] text-lux-text mt-2 text-right">UID: {msg.uid}</p>
                            </div>
                         ))}
                      </div>
                   )}
                </div>
             </div>
         </div>
      </div>
   );
}
