import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FileText, BookOpen, MessageSquare, Play, 
  Archive, Bot, Star, ArrowRight, CalendarDays, Zap,
  BrainCircuit, Sparkles
} from 'lucide-react';
import { motion, useInView } from 'motion/react';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { SubjectTile } from '../components/ui/SubjectBadge';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { useAuth } from '../contexts/AuthContext';
import { DailyNudgeCard } from '../components/DailyNudgeCard';
import { HeroFeatureCarousel } from '../components/HeroFeatureCarousel';

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
      className="text-center group p-3 sm:p-4 rounded-xl sm:rounded-2xl sm:rounded-3xl transition-all duration-300 hover:bg-white cursor-default hover:shadow-sm"
      whileHover={{ y: -2 }}
    >
      <div className="text-2xl font-serif text-lux-text mb-1 tracking-tight">
        {label === 'Curricula' || label === 'Always Included' || end === 'NSC' || end === 'Free' || label === 'Active Curriculum' ? end : (count === 0 ? end : (end.includes('+') ? `${count}+` : count))}
      </div>
      <div className="text-[10px] uppercase tracking-widest text-lux-text font-semibold group-hover:text-lux-green-800 transition-colors">{label}</div>
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
        "fixed bottom-8 right-8 z-50 w-12 h-12 bg-lux-bg border border-lux-green-500-light/30 text-lux-green-500 rounded-full shadow-lux-lg flex items-center justify-center transition-all duration-500 hover:scale-105 hover:bg-lux-bg",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"
      )}
    >
      <ArrowRight className="-rotate-90" size={20} />
    </button>
  );
}

export function LandingPage() {
  const navigate = useNavigate();
  const subjects = ['Mathematics', 'Physical Sciences'];

  return (
    <div className="min-h-screen bg-lux-bg font-sans">
      <Navbar />

      {/* Hero Section */}
      <section className="relative min-h-[95vh] flex items-center pt-28 sm:pt-36 md:pt-48 pb-20 md:pt-48 md:pb-24 sm:pb-20 sm:pb-24 md:pb-32 md:pb-40 overflow-hidden bg-lux-bg">
        <div className="absolute inset-0 hidden opacity-[0.05] mix-blend-multiply"></div>
        <div className="absolute top-0 right-0 w-[60%] h-[70%] -z-0" 
             style={{ background: 'radial-gradient(circle at 80% 20%, rgba(38, 122, 74, 0.1) 0%, transparent 60%)' }} />
        <div className="absolute bottom-0 left-0 w-[50%] h-[50%] -z-0" 
             style={{ background: 'radial-gradient(circle at 20% 80%, rgba(10, 38, 22, 0.15) 0%, transparent 60%)' }} />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10">
          <DailyNudgeCard />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-serif text-lux-text leading-[1.05] mb-8 tracking-tight drop-shadow-sm">
                Master Grade 12 <br /><span className="text-gradient font-serif italic text-4xl sm:text-5xl lg:text-6xl xl:text-7xl drop-shadow-md">Mathematics and Physical Sciences.</span>
              </h1>
              <p className="text-lg md:text-xl text-lux-text mb-12 max-w-xl leading-relaxed font-sans font-light">
                South Africa's most beautiful and powerful learning platform. 
                Powered by our most capable AI to auto-assemble hyper-personalized study packages guaranteed to improve your grades.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-5 mb-16">
                <Link to="/pricing" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto glass-button text-white px-10 py-4 h-auto rounded-xl text-sm uppercase tracking-widest font-bold transition-all shadow-[0_0_20px_rgba(29,138,72,0.3)] hover:shadow-[0_0_30px_rgba(29,138,72,0.5)] active:scale-98 flex items-center justify-center border-none">
                    Start Free Trial 
                    <ArrowRight size={16} className="ml-3 text-lux-green-900" />
                  </Button>
                </Link>
                <Link to="/past-papers" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto bg-transparent border border-lux-border text-lux-text hover:bg-lux-bg hover:text-lux-green-900 px-10 py-4 h-auto rounded-xl text-sm uppercase tracking-widest font-bold hover:bg-lux-bg/50 hover:text-lux-green-500 transition-all active:scale-98">
                    Browse Papers
                  </Button>
                </Link>
              </div>
              
              <div className="flex items-center gap-4 text-lux-text text-xs font-sans">
                 <div className="flex -space-x-2">
                    {[1,2,3,4].map((i) => (
                      <div key={i} className={`w-8 h-8 rounded-full border-2 border-lux-border bg-lux-green-${800 - i*100} flex items-center justify-center text-[10px] font-bold text-lux-text`}>
                        {String.fromCharCode(64+i)}
                      </div>
                    ))}
                 </div>
                 <p>Join 50,000+ top achievers already using GMA AI.</p>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="hidden lg:block relative"
            >
              <HeroFeatureCarousel />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      {/* Curriculum Cards - Removed by request */}

      {/* Features Grid */}
      <section className="py-16 sm:py-24 md:py-32 bg-lux-bg px-4 relative overflow-hidden">
        <div className="absolute inset-0 hidden opacity-[0.03] mix-blend-multiply"></div>
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-lux-green-500/10 blur-[120px] rounded-full translate-x-1/3 -translate-y-1/2 pointer-events-none"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <div className="inline-flex items-center justify-center mb-6">
              <span className="w-8 h-[1px] bg-lux-green-500/50"></span>
              <span className="uppercase text-[10px] tracking-widest mx-4 font-bold text-lux-green-500">Platform Features</span>
              <span className="w-8 h-[1px] bg-lux-green-500/50"></span>
            </div>
            <h2 className="text-5xl font-serif text-lux-text leading-tight mb-4">
              Everything you need. <br /><span className="italic text-lux-green-500 font-light">Nothing you don't.</span>
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
              <Link to={f.link} key={i} className="group relative block p-8 rounded-[2.5rem] bg-[var(--color-lux-green-100)] border border-[var(--color-lux-green-500)] shadow-sm hover:shadow-lux-lg hover:border-[var(--color-lux-green-800)]/40 transition-all duration-300">
                <div className="w-14 h-14 mb-8 bg-lux-surface border border-lux-border rounded-2xl sm:rounded-3xl flex items-center justify-center text-[var(--color-lux-green-800)] group-hover:scale-110 group-hover:bg-[var(--color-lux-green-800)] group-hover:text-lux-green-500 transition-all shadow-inner">
                  <f.icon size={24} strokeWidth={1.5} />
                </div>
                <h4 className="text-2xl font-serif font-bold text-[var(--color-lux-green-950)] mb-3 group-hover:text-[var(--color-lux-green-800)] transition-colors">{f.title}</h4>
                <p className="text-lux-text text-sm leading-relaxed font-medium">{f.desc}</p>
                <div className="absolute top-8 right-8 text-[var(--color-lux-green-800)]/40 group-hover:text-[var(--color-lux-green-800)] group-hover:-translate-y-1 group-hover:translate-x-1 transition-all">
                  <ArrowRight size={20} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <ScrollToTopButton />

      {/* CTA Banner */}
      <section className="mx-4 my-32">
        <div className="max-w-7xl mx-auto glass-panel py-16 sm:py-24 md:py-32 px-6 md:px-12 lg:px-16 text-center overflow-hidden relative shadow-2xl">
          <div className="absolute inset-x-0 bottom-0 top-0 hidden opacity-10 mix-blend-multiply"></div>
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-lux-bg blur-[150px] rounded-full opacity-50" />
          <h2 className="text-5xl md:text-7xl font-serif text-lux-text mb-8 relative z-10 leading-[1.1]">
            Elevate your <span className="text-lux-green-500 italic font-light">standards.</span><br /> Right now.
          </h2>
          <p className="text-lux-text text-lg mb-12 relative z-10 font-light tracking-wide">
            Exceptional resources. Unrestricted access. Free forever.
          </p>
          <Link to="/past-papers" className="relative z-10 inline-block">
            <Button size="lg" className="px-14 glass-button text-white hover:from-lux-green-900 hover:to-lux-green-500 border-none shadow-lux-lg rounded-2xl sm:rounded-3xl font-bold uppercase tracking-widest text-xs h-16 shadow-xl transition-all hover:-translate-y-1">
              Enter The Archive
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
