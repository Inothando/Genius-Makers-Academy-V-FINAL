import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="bg-lux-green-950 text-lux-bg text-lux-surface relative overflow-hidden py-20 px-4 border-t border-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-16 mb-20">
          {/* Brand - Span 4 cols */}
          <div className="md:col-span-4">
            <Link to="/" className="inline-block mb-6 group">
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-lux-green-500/5 blur-[120px] rounded-full translate-x-1/3 translate-y-1/3 pointer-events-none" /><div className="flex items-center gap-4 relative z-10">
                <div className="w-14 h-14 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105">
                   <img src="/GMA-favicon-Logo/favicon.svg" alt="GMA Logo" className="w-full h-full object-contain drop-shadow-md" />
                </div>
                <div className="flex flex-col items-start gap-1">
                  <div className="flex items-center gap-1.5 leading-none mt-1">
                    <span className="text-2xl font-medium text-lux-surface tracking-tight font-serif group-hover:text-lux-green-500 transition-colors duration-300">
                      Genius Makers
                    </span>
                    <span className="text-2xl font-light italic text-lux-green-500 font-serif">
                      Academy
                    </span>
                  </div>
                  <span className="text-[10px] uppercase tracking-widest text-lux-surface/60 font-bold font-sans">
                    National Archive
                  </span>
                </div>
              </div>
            </Link>
            <p className="text-lux-surface/60 text-sm leading-relaxed max-w-sm mb-8 font-light tracking-wide">
              South Africa’s premier academic vault. Uncompromising quality, free for every learner, forever.
            </p>
            <div className="flex gap-4">
               {/* Social placeholders */}
               <div className="w-10 h-10 border border-lux-green-800 rounded-full flex justify-center items-center hover:border-lux-green-500 hover:text-lux-green-500 transition-colors cursor-pointer text-lux-surface/60">
                 <span className="text-xs font-serif italic">In</span>
               </div>
               <div className="w-10 h-10 border border-lux-green-800 rounded-full flex justify-center items-center hover:border-lux-green-500 hover:text-lux-green-500 transition-colors cursor-pointer text-lux-surface/60">
                 <span className="text-xs font-serif italic">X</span>
               </div>
               <div className="w-10 h-10 border border-lux-green-800 rounded-full flex justify-center items-center hover:border-lux-green-500 hover:text-lux-green-500 transition-colors cursor-pointer text-lux-surface/60">
                 <span className="text-xs font-serif italic">Ig</span>
               </div>
            </div>
          </div>

          {/* Links padding space */}
          <div className="md:col-span-1 hidden md:block"></div>

          {/* Links sections - exactly what we need, nothing more */}
          <div className="md:col-span-2">
            <h4 className="font-serif text-lux-green-500 mb-6 text-lg">Archive</h4>
            <ul className="space-y-4 text-sm text-lux-surface/70 font-light">
              <li><Link to="/past-papers" className="hover:text-lux-surface transition-colors">National Senior Certificate</Link></li>
              <li><Link to="/past-papers" className="hover:text-lux-surface transition-colors">By Subject</Link></li>
              <li><Link to="/past-papers" className="hover:text-lux-surface transition-colors">By Year</Link></li>
            </ul>
          </div>
          
          <div className="md:col-span-2">
            <h4 className="font-serif text-lux-green-500 mb-6 text-lg">Platform</h4>
            <ul className="space-y-4 text-sm text-lux-surface/70 font-light">
              <li><Link to="/discussion" className="hover:text-lux-surface transition-colors">Community Hub</Link></li>
              <li><span className="cursor-not-allowed hover:text-lux-surface transition-colors">Masterclasses</span></li>
              <li><span className="cursor-not-allowed hover:text-lux-surface transition-colors">Study Planner</span></li>
              <li><Link to="/auth" className="hover:text-lux-surface transition-colors">Create Account</Link></li>
            </ul>
          </div>

          <div className="md:col-span-3">
            <h4 className="font-serif text-lux-green-500 mb-6 text-lg">About</h4>
            <ul className="space-y-4 text-sm text-lux-surface/70 font-light">
              <li><span className="cursor-not-allowed hover:text-lux-surface transition-colors">Our Mission</span></li>
              <li><span className="cursor-not-allowed hover:text-lux-surface transition-colors">The Curriculum</span></li>
              <li><span className="cursor-not-allowed hover:text-lux-surface transition-colors">Terms of Standard</span></li>
              <li><span className="cursor-not-allowed hover:text-lux-surface transition-colors">Privacy Paradigm</span></li>
            </ul>
          </div>
        </div>

        <div className="pt-10 border-t border-lux-border flex flex-col md:flex-row items-center justify-between gap-6 text-[11px] uppercase tracking-widest text-lux-surface/40 font-semibold">
          <div className="flex flex-col items-center md:items-start gap-4">
            <p>© {new Date().getFullYear()} Genius Makers Academy. All rights reserved.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <Link 
              to="/admin" 
              className="px-4 py-2 border border-lux-green-800 hover:border-lux-green-500 bg-lux-green-900/50 border-lux-green-800 hover:border-lux-green-500 hover:bg-lux-green-500/10 text-lux-green-500 rounded-xl tracking-widest text-[10px] uppercase font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-lux-green-500 animate-pulse" />
              Admin Portal
            </Link>
            <p>Elevating academic standards.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
