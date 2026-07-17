import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ExamTimetableEntry, ExamTimetable } from '../types/admin';

export function useExamTimetable(
  subject: string, 
  grade: number = 12, 
  province: string = 'National', 
  curriculum: 'NSC' | 'IEB' = 'NSC'
) {
  const [entries, setEntries] = useState<ExamTimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!subject || !province) {
       setLoading(false);
       return;
    }

    async function fetchTimetable() {
      setLoading(true);
      try {
        const currentYear = new Date().getFullYear();
        
        // Lookup timetables that apply to this region and national
        const q = query(
          collection(db, 'examTimetables'),
          where('isActive', '==', true),
          where('year', '==', currentYear),
          where('curriculum', '==', curriculum),
          where('province', 'in', [province, 'National'])
        );
        
        const snapshot = await getDocs(q);
        const allEntries: ExamTimetableEntry[] = [];
        
        snapshot.forEach(doc => {
            const data = doc.data() as ExamTimetable;
            const matches = data.entries.filter(e => e.subject === subject && e.grade === grade);
            allEntries.push(...matches);
        });

        // De-duplicate by paper number, picking the closest date if duplicates exist across province/national
        const unique = allEntries.sort((a, b) => a.examDate.toMillis() - b.examDate.toMillis());
        setEntries(unique);
      } catch (err) {
        console.error("Error fetching timetable", err);
      }
      setLoading(false);
    }

    fetchTimetable();
  }, [subject, grade, province, curriculum]);

  return { entries, loading };
}
