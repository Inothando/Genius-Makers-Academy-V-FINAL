import React from 'react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';

const SUBJECTS = [
  { name: 'Mathematics', desc: 'Core algebraic and geometric concepts.', color: 'bg-blue-500' },
  { name: 'Physical Sciences', desc: 'Physics and Chemistry principles.', color: 'bg-emerald-500' }
];

export function VideosPage() {
  return (
    <div className="min-h-screen bg-lux-bg font-sans flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16 sm:py-24 md:py-32">
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 mb-3">
             <span className="w-8 h-[1px] bg-lux-green-500"></span>
             <span className="text-[10px] font-bold uppercase tracking-widest text-lux-green-500">Video Library</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-serif text-lux-text mb-2 tracking-tight">
            Browse by Subject
          </h1>
          <p className="text-lux-text max-w-2xl">Access curated CAPS and IEB-aligned video lessons separated by subject. Every lesson features our AI Study Hub.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SUBJECTS.map(subject => (
            <Link
              key={subject.name}
              to={`/videos/subject/${encodeURIComponent(subject.name.toUpperCase())}`}
              className="glass-panel sm:rounded-[3rem] p-6 shadow-lux-sm hover:shadow-lux-lg hover:border-lux-border transition-all duration-300 group flex flex-col items-start"
            >
              <div className={`w-12 h-12 rounded-2xl sm:rounded-3xl ${subject.color}/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                 <BookOpen size={24} className={`text-${subject.color.replace('bg-', '')}`} />
              </div>
              <h3 className="text-xl font-bold text-lux-text mb-2">{subject.name}</h3>
              <p className="text-sm font-medium text-lux-text">{subject.desc}</p>
            </Link>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
