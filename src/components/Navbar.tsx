import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();
  
  const isHome = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Past Papers', path: '/past-papers' },
    { name: 'Community', path: '/discussion' },
  ];

  return (
    <header 
      className={cn(
        'fixed top-0 inset-x-0 z-50 transition-all duration-300 border-b',
        isScrolled || mobileMenuOpen
          ? 'bg-lux-surface/95 backdrop-blur-md border-lux-border shadow-lux-sm py-4'
          : isHome 
            ? 'bg-transparent border-transparent py-6' 
            : 'bg-lux-surface border-lux-border py-4'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link to="/" className="flex flex-col md:flex-row items-center gap-3 group">
            <div className="w-14 h-14 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105">
               <img src="/GMA-favicon-Logo/favicon.svg" alt="GMA Logo" className="w-full h-full object-contain drop-shadow-sm" />
            </div>
            <div className="flex flex-col items-center md:items-start gap-1">
              <div className="flex items-center gap-1.5 leading-none">
                <span className={cn(
                  "text-xl font-medium tracking-tight font-serif transition-colors duration-300",
                  isHome && !isScrolled ? "text-lux-surface group-hover:text-lux-gold" : "text-lux-green-950 group-hover:text-lux-gold"
                )}>
                  Genius Makers
                </span>
                <span className="text-xl font-light italic text-lux-gold font-serif">
                  Academy
                </span>
              </div>
              <span className={cn(
                "text-[9px] uppercase tracking-widest font-bold font-sans",
                isHome && !isScrolled ? "text-lux-gold-light/70" : "text-lux-muted"
              )}>
                National Archive
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center space-x-12">
            <div className="flex items-center space-x-8">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  className={cn(
                    'text-[11px] uppercase tracking-[0.2em] font-bold transition-all relative py-2',
                    location.pathname === link.path 
                      ? (isHome && !isScrolled ? 'text-lux-gold' : 'text-lux-green-950')
                      : (isHome && !isScrolled ? 'text-lux-surface/70 hover:text-lux-gold' : 'text-lux-muted hover:text-lux-gold')
                  )}
                >
                  {link.name}
                  {location.pathname === link.path && (
                    <motion.div 
                      layoutId="activeNavIndicator" 
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-[1px] bg-lux-gold" 
                    />
                  )}
                </Link>
              ))}
            </div>
            
            <div className={cn("flex items-center space-x-4 pl-8 border-l", isHome && !isScrolled ? "border-lux-gold/20" : "border-lux-border")}>
              {user ? (
                <Link to="/profile">
                  <Button variant="outline" size="sm" className={cn(
                    "w-8 h-8 rounded-full p-0 flex items-center justify-center transition-colors shadow-sm",
                    isHome && !isScrolled 
                      ? "border-lux-gold/30 hover:border-lux-gold text-lux-gold bg-lux-surface/10 hover:bg-lux-surface/20 hover:text-lux-gold-light" 
                      : "border-lux-gold/30 hover:border-lux-gold text-lux-green-950 bg-lux-surface"
                  )}>
                    <span className="font-serif italic font-medium">{user.email?.charAt(0).toUpperCase() || 'P'}</span>
                  </Button>
                </Link>
              ) : (
                <Link to="/sign-in">
                  <Button variant="outline" size="sm" className={cn(
                    "h-10 px-6 rounded-lg text-xs tracking-widest uppercase font-bold transition-colors",
                    isHome && !isScrolled
                      ? "text-lux-gold border-lux-gold/50 hover:bg-lux-gold hover:text-lux-green-950 hover:border-lux-gold"
                      : "text-lux-green-900 border-lux-gold/50 hover:bg-lux-surface hover:border-lux-gold"
                  )}>
                    Sign In
                  </Button>
                </Link>
              )}
            </div>
          </nav>

          {/* Mobile Menu Toggle */}
          <button 
            className={cn("md:hidden p-2 rounded-lg transition-colors", isHome && !isScrolled ? "text-lux-gold hover:bg-lux-surface/10" : "text-lux-green-950 hover:bg-lux-bg")}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} strokeWidth={1.5} /> : <Menu size={24} strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-lux-border bg-lux-surface overflow-hidden"
          >
            <div className="px-4 py-6 space-y-4 shadow-inner">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'block px-4 py-3 rounded-xl text-xs uppercase tracking-widest font-bold transition-colors',
                    location.pathname === link.path
                      ? 'bg-lux-bg text-lux-green-950'
                      : 'text-lux-muted hover:bg-lux-bg hover:text-lux-green-900'
                  )}
                >
                  {link.name}
                </Link>
              ))}
              <div className="pt-4 mt-2 border-t border-lux-border border-dashed px-4">
                {user ? (
                  <Link to="/profile" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full justify-start text-xs uppercase tracking-widest border-lux-border font-bold text-lux-green-900 h-12 hover:border-lux-gold">
                      My Profile
                    </Button>
                  </Link>
                ) : (
                  <Link to="/sign-in" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full bg-lux-green-950 hover:bg-lux-green-900 text-lux-gold-light text-xs uppercase tracking-widest font-bold h-12 shadow-md">
                      Sign In
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
