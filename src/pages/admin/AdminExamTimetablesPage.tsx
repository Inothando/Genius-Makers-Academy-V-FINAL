import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { db } from '../../lib/firebase';
import { collection, doc, setDoc, query, onSnapshot, serverTimestamp, getDocs, updateDoc, where } from 'firebase/firestore';
import { ExamTimetable, ExamTimetableEntry } from '../../types/admin';
import { Button } from '../../components/ui/Button';
import { Plus, Trash2, Calendar, ShieldAlert } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Timestamp } from 'firebase/firestore';

const PROVINCES = [
  'National',
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'Northern Cape',
  'North West',
  'Western Cape'
];

export function AdminExamTimetablesPage() {
  const { adminUser, hasPermission } = useAdminAuth();
  
  const [timetables, setTimetables] = useState<ExamTimetable[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [term, setTerm] = useState<'Term1' | 'Term2' | 'Term3' | 'Term4'>('Term4');
  const [year, setYear] = useState(new Date().getFullYear());
  const [province, setProvince] = useState('National');
  const [curriculum, setCurriculum] = useState<'NSC' | 'IEB'>('NSC');
  const [entries, setEntries] = useState<ExamTimetableEntry[]>([]);
  const [bulkPaste, setBulkPaste] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!hasPermission('canManageExamTimetables')) return;
    const q = query(collection(db, 'examTimetables'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results: ExamTimetable[] = [];
      snapshot.forEach(d => {
         results.push({ id: d.id, ...d.data() } as ExamTimetable);
      });
      setTimetables(results.sort((a,b) => b.year - a.year || b.term.localeCompare(a.term)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [hasPermission]);

  if (!hasPermission('canManageExamTimetables')) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ShieldAlert size={64} className="text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-lux-text mb-2">Access Denied</h1>
        <p className="text-lux-text">You don't have permission to manage exam timetables.</p>
      </div>
    );
  }

  const parseBulkText = () => {
     if (!bulkPaste) return;
     const lines = bulkPaste.split('\n').map(l => l.trim()).filter(l => l);
     
     const newEntries: ExamTimetableEntry[] = [];
     for (const line of lines) {
       // Expecting tab or comma separated: Subject, Grade, Paper, Date, Time, Duration
       const parts = line.split(/\t|,/).map(p => p.trim());
       if (parts.length >= 6) {
          const dateStr = parts[3]; // e.g. "2024-11-05"
          let timestamp = Timestamp.now();
          if (dateStr) {
             const d = new Date(dateStr);
             if (!isNaN(d.getTime())) {
               timestamp = Timestamp.fromDate(d);
             }
          }
          newEntries.push({
            subject: parts[0],
            grade: parseInt(parts[1]) || 12,
            paperNumber: parts[2] as any || 'P1',
            examDate: timestamp,
            startTime: parts[4] || '09:00',
            durationMinutes: parseInt(parts[5]) || 120
          });
       }
     }
     
     setEntries(prev => [...prev, ...newEntries]);
     setBulkPaste('');
  };

  const handleCreateTimetable = async () => {
      if (entries.length === 0) {
          alert("Add at least one entry.");
          return;
      }
      setIsSubmitting(true);
      
      const exists = timetables.find(t => t.term === term && t.year === year && t.province === province && t.curriculum === curriculum);
      
      if (exists) {
          if (!window.confirm(`A timetable for ${term} ${year} ${province} ${curriculum} already exists, uploaded on ${exists.uploadedAt?.toDate()?.toLocaleDateString()}. Overwrite or create a new version?`)) {
              setIsSubmitting(false);
              return;
          }
      }

      try {
          const docRef = exists ? doc(db, 'examTimetables', exists.id!) : doc(collection(db, 'examTimetables'));
          const data: Omit<ExamTimetable, 'id'> = {
              term,
              year,
              province,
              curriculum,
              entries,
              uploadedBy: adminUser?.uid || 'unknown',
              uploadedAt: serverTimestamp() as any,
              isActive: true
          };
          
          await setDoc(docRef, data);
          setEntries([]); // Clear entries on success
      } catch(err) {
          console.error(err);
          alert("Error saving");
      }
      setIsSubmitting(false);
  };

  const toggleActive = async (id: string, current: boolean) => {
      await updateDoc(doc(db, 'examTimetables', id), { isActive: !current });
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      <header>
        <h1 className="text-2xl font-bold text-lux-text mb-1">Exam Timetables</h1>
        <p className="text-sm text-lux-text">Manage real official exam dates per province.</p>
      </header>

      <div className="bg-[#111111] border border-lux-border rounded-2xl sm:rounded-3xl p-6 relative overflow-hidden">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="text-xs text-lux-text font-bold uppercase block mb-1">Term</label>
              <select value={term} onChange={e => setTerm(e.target.value as any)} className="w-full bg-black border border-lux-border rounded-lg p-2 text-lux-text">
                 <option value="Term1">Term 1</option>
                 <option value="Term2">Term 2</option>
                 <option value="Term3">Term 3</option>
                 <option value="Term4">Term 4</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-lux-text font-bold uppercase block mb-1">Year</label>
              <input type="number" value={year} onChange={e => setYear(parseInt(e.target.value))} className="w-full bg-black border border-lux-border rounded-lg p-2 text-lux-text" />
            </div>
            <div>
              <label className="text-xs text-lux-text font-bold uppercase block mb-1">Province</label>
              <select value={province} onChange={e => setProvince(e.target.value)} className="w-full bg-black border border-lux-border rounded-lg p-2 text-lux-text">
                 {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-lux-text font-bold uppercase block mb-1">Curriculum</label>
              <select value={curriculum} onChange={e => setCurriculum(e.target.value as any)} className="w-full bg-black border border-lux-border rounded-lg p-2 text-lux-text">
                 <option value="NSC">NSC</option>
                 <option value="IEB">IEB</option>
              </select>
            </div>
        </div>

        <div className="mb-6 p-4 bg-black rounded-xl border border-lux-border">
           <label className="text-xs text-lux-text font-bold block mb-2">Bulk Add (Tab/Comma separated: Subject, Grade, Paper, Date, Time, Duration)</label>
           <textarea 
               value={bulkPaste}
               onChange={e => setBulkPaste(e.target.value)}
               placeholder="Mathematics,12,P1,2024-11-05,09:00,180..." 
               rows={4} 
               className="w-full bg-[#111111] text-lux-text p-3 rounded-lg border border-lux-border font-mono text-sm mb-2" 
           />
           <Button onClick={parseBulkText} className="w-full bg-lux-surface-alt text-lux-text rounded-lg hover:bg-lux-surface-alt">Parse Rows</Button>
        </div>

        <div className="space-y-4">
           {entries.map((entry, idx) => {
              // Convert timestamp to input date string
              const dateVal = entry.examDate instanceof Timestamp ? entry.examDate.toDate().toISOString().split('T')[0] : '';
              return (
              <div key={idx} className="flex gap-2 items-center bg-black p-2 rounded-lg border border-lux-border">
                 <input className="bg-[#111111] p-2 text-lux-text text-sm rounded w-1/4" placeholder="Subject" value={entry.subject} onChange={e => { const n = [...entries]; n[idx].subject = e.target.value; setEntries(n); }} />
                 <input className="bg-[#111111] p-2 text-lux-text text-sm rounded w-16" placeholder="Grade" type="number" value={entry.grade} onChange={e => { const n = [...entries]; n[idx].grade = parseInt(e.target.value); setEntries(n); }} />
                 <input className="bg-[#111111] p-2 text-lux-text text-sm rounded w-16" placeholder="P#" value={entry.paperNumber} onChange={e => { const n = [...entries]; n[idx].paperNumber = e.target.value as any; setEntries(n); }} />
                 <input className="bg-[#111111] p-2 text-lux-text text-sm rounded w-32" type="date" value={dateVal} onChange={e => { 
                    const d = new Date(e.target.value); if(isNaN(d.getTime())) return;
                    const n = [...entries]; n[idx].examDate = Timestamp.fromDate(d); setEntries(n); 
                 }} />
                 <input className="bg-[#111111] p-2 text-lux-text text-sm rounded w-20" type="time" value={entry.startTime} onChange={e => { const n = [...entries]; n[idx].startTime = e.target.value; setEntries(n); }} />
                 <input className="bg-[#111111] p-2 text-lux-text text-sm rounded w-20" type="number" placeholder="Mins" value={entry.durationMinutes} onChange={e => { const n = [...entries]; n[idx].durationMinutes = parseInt(e.target.value); setEntries(n); }} />
                 <button onClick={() => setEntries(entries.filter((_, i) => i !== idx))} className="p-2 text-red-500 hover:bg-red-500/20 rounded"><Trash2 size={16}/></button>
              </div>
           )})}
        </div>

        <div className="flex justify-between items-center mt-4">
           <Button variant="outline" onClick={() => setEntries([...entries, { subject: '', grade: 12, paperNumber: 'P1', examDate: Timestamp.now(), startTime: '09:00', durationMinutes: 120 }])} className="text-xs">
             <Plus size={14} className="mr-2" /> Add Row
           </Button>
           <Button onClick={handleCreateTimetable} disabled={isSubmitting || entries.length === 0} className="bg-green-600 text-lux-text rounded-lg">
             {isSubmitting ? 'Saving...' : 'Save Timetable'}
           </Button>
        </div>
      </div>

      <h2 className="text-xl font-bold text-lux-text mt-12 mb-4">Saved Timetables</h2>
      <div className="bg-[#111111] rounded-2xl sm:rounded-3xl border border-lux-border overflow-hidden">
          <table className="w-full text-left text-sm text-lux-text">
             <thead className="bg-black/50 border-b border-lux-border">
                <tr>
                   <th className="p-4 text-lux-text text-xs uppercase font-bold">Details</th>
                   <th className="p-4 text-lux-text text-xs uppercase font-bold">Province</th>
                   <th className="p-4 text-lux-text text-xs uppercase font-bold">Entries</th>
                   <th className="p-4 text-lux-text text-xs uppercase font-bold">Status</th>
                   <th className="p-4 text-lux-text text-xs uppercase font-bold text-right">Actions</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-gray-800">
                {timetables.map(t => (
                    <tr key={t.id} className="hover:bg-lux-bg/30">
                       <td className="p-4">
                          <div className="font-bold text-lux-text uppercase">{t.term} {t.year}</div>
                          <div className="text-xs text-lux-text">{t.curriculum} • Uploaded {t.uploadedAt?.toDate()?.toLocaleDateString()}</div>
                       </td>
                       <td className="p-4">{t.province}</td>
                       <td className="p-4 font-mono">{t.entries.length}</td>
                       <td className="p-4">
                          <span className={cn("text-xs font-bold px-2 py-1 rounded", t.isActive ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500")}>
                              {t.isActive ? 'Active' : 'Inactive'}
                          </span>
                       </td>
                       <td className="p-4 text-right">
                          <Button variant="outline" className="text-xs mr-2" onClick={() => {
                              if(window.confirm('Load this into the editor? Warning: Will clear your current unsaved entries.')) {
                                  setTerm(t.term); setYear(t.year); setProvince(t.province); setCurriculum(t.curriculum); setEntries(t.entries);
                              }
                          }}>Edit</Button>
                          <Button variant="outline" className="text-xs" onClick={() => toggleActive(t.id!, t.isActive)}>
                              {t.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                       </td>
                    </tr>
                ))}
                {timetables.length === 0 && (
                   <tr><td colSpan={5} className="p-8 text-center text-lux-text">No timetables found</td></tr>
                )}
             </tbody>
          </table>
      </div>
    </div>
  );
}
