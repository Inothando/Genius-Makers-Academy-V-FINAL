import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FileText, BookOpen, MessageSquare, Play, 
  Archive, Bot, Star, ArrowRight, CalendarDays, Zap
} from 'lucide-react';
import { motion, useInView } from 'motion/react';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { SubjectTile } from '../components/ui/SubjectBadge';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';

function StatsCounter({ end, label }: { end: string; label: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (isInView) {
      let startValue = 0;
      const endValue = parseInt(end.replace(/\D/g, ''));
      if (isNaN(endValue)) return;
      
      const duration = 2000;
      const increment = endValue / (duration / 16);
      
      const timer = setInterval(() => {
        startValue += increment;
        if (startValue >= endValue) {
          setCount(endValue);
          clearInterval(timer);
        } else {
          setCount(Math.floor(startValue));
        }
      }, 16);
      return () => clearInterval(timer);
    }
  }, [isInView, end]);

  return (
    <motion.div 
      ref={ref} 
      className="text-center group p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-all duration-300 hover:bg-white cursor-default hover:shadow-sm"
      whileHover={{ y: -2 }}
    >
      <div className="text-2xl font-serif text-lux-green-950 mb-1 tracking-tight">
        {label === 'Curricula' || label === 'Always Included' || end === 'NSC' || end === 'Free' || label === 'Active Curriculum' ? end : (count === 0 ? end : (end.includes('+') ? `${count}+` : count))}
      </div>
      <div className="text-[10px] uppercase tracking-widest text-lux-muted font-semibold group-hover:text-lux-green-800 transition-colors">{label}</div>
    </motion.div>
  );
}

function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const toggleVisible = () => {
      if (window.scrollY > 400) setVisible(true);
      else setVisible(false);
    };
    window.addEventListener('scroll', toggleVisible);
    return () => window.removeEventListener('scroll', toggleVisible);
  }, []);

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className={cn(
        "fixed bottom-8 right-8 z-50 w-12 h-12 bg-lux-green-900 border border-lux-gold-light/30 text-lux-gold rounded-full shadow-lux-lg flex items-center justify-center transition-all duration-500 hover:scale-105 hover:bg-lux-green-800",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"
      )}
    >
      <ArrowRight className="-rotate-90" size={20} />
    </button>
  );
}

export function LandingPage() {
  const navigate = useNavigate();
  const subjects = [
    'Mathematics', 'Mathematical Literacy', 'Physical Sciences', 'Life Sciences',
    'English HL', 'Afrikaans HL', 'History', 'Geography', 'Accounting',
    'Business Studies', 'Economics', 'Consumer Studies', 'Tourism', 'IT/CAT',
    'Engineering Graphics and Design', 'Civil Technology', 'Electrical Technology',
    'Agricultural Sciences', 'Life Orientation', 'Music', 'Visual Arts', 'Dramatic Arts'
  ];

  return (
    <div className="min-h-screen bg-lux-bg font-sans">
      <Navbar />

      {/* Hero Section */}
      <section className="relative min-h-[95vh] flex items-center pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden bg-lux-green-950">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] mix-blend-overlay"></div>
        <div className="absolute top-0 right-0 w-[60%] h-[70%] -z-0" 
             style={{ background: 'radial-gradient(circle at 80% 20%, rgba(194,157,89,0.15) 0%, transparent 60%)' }} />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-lux-green-900 border border-lux-gold/20 rounded-full text-lux-gold mb-8 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-lux-gold animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest font-sans text-lux-gold-light">National Academic Vault</span>
              </div>
              <h1 className="text-6xl md:text-8xl font-serif text-lux-surface leading-[1.05] mb-8 tracking-tight">
                Master your <br /><span className="text-lux-gold font-serif italic text-7xl md:text-9xl">academics.</span>
              </h1>
              <p className="text-lg md:text-xl text-lux-surface/70 mb-12 max-w-xl leading-relaxed font-sans font-light">
                South Africa's most beautiful and powerful learning platform. 
                Premium NSC papers, intelligent explanations, and handcrafted study guides. Prepared by top achievers.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-5 mb-16">
                <Link to="/past-papers" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto bg-lux-gold hover:bg-lux-gold-light text-lux-green-950 px-10 py-4 h-auto rounded-xl text-sm uppercase tracking-widest font-bold transition-all shadow-lux-lg hover:shadow-xl active:scale-98 flex items-center justify-center border-none">
                    Browse Papers 
                    <ArrowRight size={16} className="ml-3 text-lux-green-900" />
                  </Button>
                </Link>
                <Link to="/discussion" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto bg-lux-green-900 border border-lux-gold/30 text-lux-gold-light px-10 py-4 h-auto rounded-xl text-sm uppercase tracking-widest font-bold hover:bg-lux-surface hover:text-lux-green-950 transition-all active:scale-98">
                    Join Community
                  </Button>
                </Link>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="hidden lg:block relative"
            >
              <div className="relative w-full aspect-square max-w-lg mx-auto">
                <div className="absolute inset-x-0 bottom-0 bg-lux-gold/20 rounded-[40px] blur-3xl opacity-50 h-full" />
                <div className="relative bg-lux-green-900/40 backdrop-blur-xl border border-lux-gold/20 rounded-[32px] p-10 shadow-2xl animate-float">
                  <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center space-x-4">
                      <div className="w-14 h-14 bg-lux-green-800 rounded-2xl flex items-center justify-center text-lux-gold border border-lux-gold/30">
                        <FileText size={24} strokeWidth={1.5} />
                      </div>
                      <div>
                        <div className="text-lg font-serif font-medium text-lux-surface mb-0.5">Mathematics P1</div>
                        <div className="text-xs text-lux-gold-light/60 uppercase tracking-widest">Final Exam 2024</div>
                      </div>
                    </div>
                    <div className="px-3 py-1 bg-lux-green-950 border border-lux-gold/30 text-lux-gold rounded text-[10px] font-bold uppercase tracking-wider shadow-inner">NSC</div>
                  </div>
                  <div className="space-y-5 mb-10">
                    <div className="h-2 bg-lux-gold/20 rounded-full w-full" />
                    <div className="h-2 bg-lux-gold/20 rounded-full w-5/6" />
                    <div className="h-2 bg-lux-gold/20 rounded-full w-4/6" />
                  </div>
                  <div className="p-6 bg-lux-green-950/80 border border-lux-gold/10 rounded-2xl mb-10 relative overflow-hidden shadow-inner">
                    <div className="absolute top-0 left-0 w-1 h-full bg-lux-gold" />
                    <div className="flex items-center space-x-3 mb-3 text-lux-gold">
                      <Bot size={18} />
                      <span className="text-xs font-bold uppercase tracking-widest">AI Explainer</span>
                    </div>
                    <p className="text-sm text-lux-surface/90 font-serif italic leading-relaxed">"To solve for x in this quadratic equation, we must first recognize the coefficient structures..."</p>
                  </div>
                  <Button className="w-full bg-lux-gold hover:bg-lux-gold-light text-lux-green-950 rounded-xl h-14 font-bold tracking-widest uppercase text-xs transition-colors shadow-lg shadow-lux-gold/20">Study Document</Button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-lux-surface border-y border-lux-border py-4 relative z-10 shadow-[0_-20px_40px_rgba(0,0,0,0.01)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 lg:gap-4 items-center">
            <div className="text-center md:border-r border-lux-border/50 last:border-0 relative">
               <StatsCounter end="3500+" label="Past Papers" />
            </div>
            <div className="text-center md:border-r border-lux-border/50 last:border-0 relative">
               <StatsCounter end="30+" label="Subjects Covered" />
            </div>
            <div className="text-center md:border-r border-lux-border/50 last:border-0 relative flex flex-col items-center justify-center">
               <StatsCounter end="NSC" label="Active Curriculum" />
            </div>
            <div className="text-center relative">
               <StatsCounter end="Free" label="Always Included" />
            </div>
          </div>
        </div>
      </section>

      {/* Curriculum Cards */}
      <section className="py-10 bg-lux-bg relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="text-center max-w-3xl mx-auto mb-8">
            <div className="inline-flex items-center justify-center mb-4">
              <span className="w-12 h-[1px] bg-lux-gold"></span>
              <span className="uppercase text-[10px] tracking-widest mx-4 font-bold text-lux-gold">Accreditation</span>
              <span className="w-12 h-[1px] bg-lux-gold"></span>
            </div>
            <h2 className="text-4xl md:text-5xl font-serif text-lux-green-950 tracking-tight leading-none mb-4">
              Your curriculum. <span className="italic font-light text-lux-gold">Your future.</span>
            </h2>
            <p className="text-lux-muted font-sans text-sm tracking-wide font-light max-w-xl mx-auto">
              Aligned immaculately with the Department of Basic Education standards, crafted for excellence.
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            {/* NSC Card */}
            <div className="bg-lux-surface border border-lux-border rounded-3xl p-6 md:p-8 shadow-lux-sm hover:shadow-lux-lg hover:border-lux-gold/30 transition-all duration-500 relative group flex flex-col justify-between cursor-pointer">
              <div>
                <span className="inline-block bg-lux-green-900 text-lux-gold-light text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest font-sans mb-4">
                  Active System
                </span>
                <h3 className="text-2xl font-serif font-medium text-lux-green-950 mb-2 group-hover:text-lux-gold transition-colors">National Senior Certificate</h3>
                <p className="text-lux-muted text-sm leading-relaxed mb-6 font-light">
                  Official DBE past papers from 2014–2025 across all CAPS subjects. Unrestricted access, meticulously organized.
                </p>
              </div>
              <Link to="/past-papers?curriculum=NSC" className="inline-flex items-center gap-2 text-lux-green-900 font-bold text-xs uppercase tracking-widest group-hover:text-lux-gold transition-colors">
                Explore The Archive <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-32 bg-lux-green-950 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] mix-blend-overlay"></div>
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-lux-gold/10 blur-[120px] rounded-full translate-x-1/3 -translate-y-1/2 pointer-events-none"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <div className="inline-flex items-center justify-center mb-6">
              <span className="w-8 h-[1px] bg-lux-gold/50"></span>
              <span className="uppercase text-[10px] tracking-widest mx-4 font-bold text-lux-gold">Platform Features</span>
              <span className="w-8 h-[1px] bg-lux-gold/50"></span>
            </div>
            <h2 className="text-5xl font-serif text-lux-surface leading-tight mb-4">
              Everything you need. <br /><span className="italic text-lux-gold font-light">Nothing you don't.</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: FileText, title: 'Archive Vault', desc: 'A pristine collection of every NSC paper. Flawlessly categorized by subject, grade, and term.', link: '/past-papers' },
              { icon: BookOpen, title: 'Resource Library', desc: 'Handcrafted notes, precise summaries, and elite academic materials uploaded by the community.', link: '/resources' },
              { icon: MessageSquare, title: 'Discussion Hub', desc: 'Engage with scholars. Ask complex questions and receive beautifully formatted answers.', link: '/discussion' },
              { icon: Play, title: 'Masterclasses', desc: 'Curated cinematic lessons by distinguished educators and top achievers. Available seamlessly.', link: '/videos' },
              { icon: Archive, title: 'Study Collections', desc: 'Curated learning paths merging video lectures and definitive reading materials.', link: '/study-packs' },
              { icon: CalendarDays, title: 'Academic Planner', desc: 'Structure your time elegantly. A personalised schedule mapping perfectly to your final exams.', link: '/pricing' }
            ].map((f, i) => (
              <Link to={f.link} key={i} className="group relative block p-8 rounded-[2.5rem] bg-[#dae3d6] border border-[#c1d1bb] shadow-sm hover:shadow-lux-lg hover:border-[#184a33]/40 transition-all duration-300">
                <div className="w-14 h-14 mb-8 bg-lux-surface border border-lux-border rounded-2xl flex items-center justify-center text-[#184a33] group-hover:scale-110 group-hover:bg-[#184a33] group-hover:text-lux-gold transition-all shadow-inner">
                  <f.icon size={24} strokeWidth={1.5} />
                </div>
                <h4 className="text-2xl font-serif font-bold text-[#0c261a] mb-3 group-hover:text-[#184a33] transition-colors">{f.title}</h4>
                <p className="text-[#1b3d2b] text-sm leading-relaxed font-medium">{f.desc}</p>
                <div className="absolute top-8 right-8 text-[#184a33]/40 group-hover:text-[#184a33] group-hover:-translate-y-1 group-hover:translate-x-1 transition-all">
                  <ArrowRight size={20} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Subject Grid */}
      <section className="py-32 bg-lux-bg px-4 overflow-hidden relative">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <div className="inline-flex items-center justify-center mb-6">
              <span className="w-12 h-[1px] bg-lux-gold"></span>
              <span className="uppercase text-[10px] tracking-widest mx-4 font-bold text-lux-gold">CAPS Catalog</span>
              <span className="w-12 h-[1px] bg-lux-gold"></span>
            </div>
            <h2 className="text-5xl font-serif text-lux-green-950 tracking-tight leading-none mb-6">
              Every subject. <span className="italic font-light text-lux-gold">Cataloged.</span>
            </h2>
            <p className="text-lux-muted font-sans text-xs uppercase tracking-widest">
              Direct Access • No Logins required
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-4 max-w-6xl mx-auto">
            {subjects.map((s) => (
              <SubjectTile 
                key={s} 
                subject={s} 
                onClick={() => navigate(`/past-papers?subject=${encodeURIComponent(s)}`)}
              />
            ))}
          </div>
        </div>
      </section>

      <ScrollToTopButton />

      {/* CTA Banner */}
      <section className="mx-4 my-32">
        <div className="max-w-7xl mx-auto bg-lux-green-950 rounded-[3rem] py-32 px-8 md:px-16 text-center overflow-hidden relative shadow-2xl">
          <div className="absolute inset-x-0 bottom-0 top-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-lux-green-800 blur-[150px] rounded-full opacity-50" />
          <h2 className="text-5xl md:text-7xl font-serif text-lux-surface mb-8 relative z-10 leading-[1.1]">
            Elevate your <span className="text-lux-gold italic font-light">standards.</span><br /> Right now.
          </h2>
          <p className="text-lux-gold-light/70 text-lg mb-12 relative z-10 font-light tracking-wide">
            Exceptional resources. Unrestricted access. Free forever.
          </p>
          <Link to="/past-papers" className="relative z-10 inline-block">
            <Button size="lg" className="px-14 bg-lux-gold hover:bg-lux-gold-light text-lux-green-950 border-none rounded-2xl font-bold uppercase tracking-widest text-xs h-16 shadow-xl transition-all hover:-translate-y-1">
              Enter The Archive
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
