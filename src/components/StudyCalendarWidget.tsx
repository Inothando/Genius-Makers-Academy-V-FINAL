import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, BookOpen, BrainCircuit } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

export function StudyCalendarWidget() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isScheduling, setIsScheduling] = useState(false);
  const [aiEvents, setAiEvents] = useState<any[]>([]);
  const [error, setError] = useState('');

  const handleAutoSchedule = async () => {
    if (!user) return;
    setIsScheduling(true);
    setError('');
    try {
      const res = await fetch('/api/ai/generate-study-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate plan');
      }
      setAiEvents(data.events || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsScheduling(false);
    }
  };

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  
  // Combine real generated events with some persistent logic
  const getEventsForDate = (day: number) => {
    // Determine the day of week for this date
    const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    let dayOfWeek = dateObj.getDay(); 
    if (dayOfWeek === 0) dayOfWeek = 7; // Convert to 1-7 (Mon-Sun) to match our prompt
    
    // Map AI events for this day of week
    const matchingAiEvents = aiEvents.filter(e => {
       // Support either specific date or day of week recurring
       return e.day === dayOfWeek; 
    }).map((e, idx) => ({ ...e, id: `ai-${day}-${idx}` }));

    let events = [...matchingAiEvents];
    return events;
  };

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

  const selectedEvents = getEventsForDate(selectedDate.getDate());

  return (
    <div className="glass-panel p-8 shadow-lux-sm overflow-hidden relative">
      <div className="absolute top-0 right-0 w-64 h-64 bg-lux-green-500/5 blur-3xl pointer-events-none rounded-full"></div>
      
      <div className="flex items-center justify-between mb-8 relative z-10">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 bg-gradient-to-br from-lux-green-950 to-lux-green-900 border border-lux-border rounded-2xl sm:rounded-3xl flex items-center justify-center text-lux-green-500 shadow-lg shadow-lux-green-950/20">
              <CalendarIcon size={24} strokeWidth={1.5} />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-lux-green-500 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(194,157,89,0.5)] border-2 border-lux-surface">
              <BrainCircuit size={10} className="text-lux-text" />
            </div>
          </div>
          <div>
            <h3 className="font-serif text-2xl text-lux-text tracking-tight">AI Smart Planner</h3>
            <p className="text-[10px] font-bold uppercase tracking-widest text-lux-green-500 mt-1">Dynamic Auto-Schedule</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-white border border-lux-border/50 rounded-2xl sm:rounded-3xl p-1.5 shadow-sm">
            <button onClick={prevMonth} className="p-2 hover:bg-lux-surface rounded-xl transition-colors text-lux-text hover:text-lux-green-500">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-bold w-36 text-center text-lux-text font-serif">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={nextMonth} className="p-2 hover:bg-lux-surface rounded-xl transition-colors text-lux-text hover:text-lux-green-500">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        <div className="lg:col-span-2">
          <div className="grid grid-cols-7 mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-[10px] font-bold uppercase tracking-widest text-lux-text">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="h-12" />
            ))}
            {days.map(day => {
              const hasEvents = getEventsForDate(day).length > 0;
              const isSelected = selectedDate.getDate() === day && selectedDate.getMonth() === currentDate.getMonth();
              const isToday = new Date().getDate() === day && new Date().getMonth() === currentDate.getMonth();
              
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
                  className={cn(
                    "h-12 rounded-xl flex flex-col items-center justify-center relative transition-all",
                    isSelected ? "bg-lux-surface text-lux-text shadow-md" : "hover:bg-lux-bg text-lux-text border border-transparent",
                    isToday && !isSelected && "border-lux-border text-lux-green-500"
                  )}
                >
                  <span className={cn("text-sm font-bold", isSelected ? "" : "")}>{day}</span>
                  {hasEvents && (
                    <div className="flex gap-1 mt-1">
                      {getEventsForDate(day).map((event, i) => (
                        <div key={i} className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          event.type === 'ai' ? "bg-lux-green-500" : 
                          event.type === 'exam' ? "bg-red-400" : "bg-lux-green-500"
                        )} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-lux-bg border border-lux-border rounded-[1.5rem] p-6 shadow-inner">
          <div className="flex items-center justify-between mb-6">
            <h4 className="font-bold text-lux-text">
              {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </h4>
            <span className="text-[10px] font-bold uppercase tracking-widest text-lux-text bg-lux-surface px-2 py-1 rounded-md border border-lux-border">
              {selectedEvents.length} Tasks
            </span>
          </div>

          <div className="space-y-4">
            {selectedEvents.length > 0 ? (
              selectedEvents.map(event => (
                <div key={event.id} className="p-4 bg-lux-surface border border-lux-border rounded-xl flex items-start gap-3 shadow-sm group hover:border-lux-border transition-colors">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                    event.type === 'ai' ? "bg-lux-green-500/10 text-lux-green-500 border-lux-green-500/30" : 
                    event.type === 'exam' ? "bg-red-500/10 text-red-500 border-red-500/30" : "bg-lux-surface/5 text-lux-text border-lux-border/20"
                  )}>
                    {event.type === 'ai' ? <BrainCircuit size={18} /> : 
                     event.type === 'exam' ? <Clock size={18} /> : <BookOpen size={18} />}
                  </div>
                  <div className="flex-1">
                    <h5 className="font-bold text-sm text-lux-text mb-1 tracking-tight leading-tight">{event.title}</h5>
                    <div className="flex items-center gap-3 mt-2">
                      <p className="text-[10px] font-medium uppercase tracking-widest text-lux-text flex items-center gap-1">
                        <Clock size={12} className="text-lux-green-500" /> {event.time}
                      </p>
                      {event.type === 'ai' && (
                        <span className="text-[9px] font-bold uppercase tracking-widest text-lux-green-500 bg-lux-green-500/10 px-2 py-0.5 rounded-sm border border-lux-border">
                          AI Focus
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 flex flex-col items-center">
                <div className="w-16 h-16 bg-white border border-lux-border rounded-full flex items-center justify-center text-lux-text mb-4 shadow-sm">
                  <CalendarIcon size={24} />
                </div>
                <p className="text-sm text-lux-text mb-2 font-medium">Your schedule is clear.</p>
                {aiEvents.length === 0 && (
                  <Button 
                    onClick={handleAutoSchedule}
                    disabled={isScheduling}
                    className="mt-4 bg-lux-green-950 text-lux-bg hover:bg-lux-green-900 text-lux-surface border-none shadow-[0_0_15px_rgba(4,34,24,0.3)] hover:shadow-[0_0_20px_rgba(4,34,24,0.5)] transition-all h-12 px-6 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2"
                  >
                    <BrainCircuit size={16} className={cn(isScheduling && "animate-pulse")} />
                    {isScheduling ? 'Analyzing History...' : 'Auto-Schedule AI Tasks'}
                  </Button>
                )}
                {error && <p className="text-xs text-red-500 mt-3 p-2 bg-red-500/10 rounded-md border border-red-500/20">{error}</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
