import { useTheme } from "../contexts/ThemeContext";
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ArrowRight, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

import { Flame } from 'lucide-react';
import { StreakBadge } from './StreakBadge';

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
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
    { name: 'Live Co-Study', path: '/study-rooms' },
    { name: 'Community', path: '/discussion' },
  ];

  const videosLinks = [
    { name: 'Browse by Subject', path: '/videos' },
    { name: 'Most Watched', path: '/videos/trending' }
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
                  isHome && !isScrolled ? "text-lux-text group-hover:text-lux-green-500" : "text-lux-text group-hover:text-lux-green-500"
                )}>
                  Genius Makers
                </span>
                <span className="text-xl font-light italic text-lux-green-500 font-serif">
                  Academy
                </span>
              </div>
              <span className={cn(
                "text-[9px] uppercase tracking-widest font-bold font-sans",
                isHome && !isScrolled ? "text-lux-text" : "text-lux-text"
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
                      ? (isHome && !isScrolled ? 'text-lux-green-500' : 'text-lux-text')
                      : (isHome && !isScrolled ? 'text-lux-text hover:text-lux-green-500' : 'text-lux-text hover:text-lux-green-500')
                  )}
                >
                  {link.name}
                  {location.pathname === link.path && (
                    <motion.div 
                      layoutId="activeNavIndicator" 
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-[1px] bg-lux-green-500" 
                    />
                  )}
                </Link>
              ))}

              <div className="relative group p-2">
                <span className={cn(
                  'text-[11px] uppercase tracking-[0.2em] font-bold transition-all cursor-pointer flex items-center',
                  location.pathname.startsWith('/videos')
                    ? (isHome && !isScrolled ? 'text-lux-green-500' : 'text-lux-text')
                    : (isHome && !isScrolled ? 'text-lux-text hover:text-lux-green-500' : 'text-lux-text hover:text-lux-green-500')
                )}>
                  Videos
                </span>
                <div className="absolute top-full left-0 mt-0 w-48 bg-lux-surface shadow-lux-sm border border-lux-border rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all flex flex-col py-2 overflow-hidden z-50">
                   {videosLinks.map((vlink) => (
                     <Link key={vlink.name} to={vlink.path} className="px-4 py-2 text-xs font-medium text-lux-text hover:text-lux-text hover:bg-lux-bg transition-colors">
                        {vlink.name}
                     </Link>
                   ))}
                </div>
              </div>
            </div>
            
            <div className={cn("flex items-center space-x-4 pl-8 border-l", isHome && !isScrolled ? "border-lux-border" : "border-lux-border")}>
              {user ? (
                <div className="flex items-center space-x-3">
                  <StreakBadge expanded={false} />
                  <Link to="/profile">
                    <Button variant="outline" size="sm" className={cn(
                      "w-8 h-8 rounded-full p-0 flex items-center justify-center transition-colors shadow-sm",
                      isHome && !isScrolled 
                        ? "border-lux-border hover:border-lux-green-500 text-lux-green-500 bg-lux-surface/10 hover:bg-lux-surface/20 hover:text-lux-text" 
                        : "border-lux-border hover:border-lux-green-500 text-lux-text bg-lux-surface"
                    )}>
                      <span className="font-serif italic font-medium">{user.email?.charAt(0).toUpperCase() || 'P'}</span>
                    </Button>
                  </Link>
                </div>
              ) : (
                <Link to="/sign-in">
                  <Button variant="outline" size="sm" className={cn(
                    "h-10 px-6 rounded-lg text-xs tracking-widest uppercase font-bold transition-colors",
                    isHome && !isScrolled
                      ? "text-lux-green-500 border-lux-border hover:bg-lux-green-500 hover:text-lux-text hover:border-lux-green-500 hover:text-lux-text hover:border-lux-green-500"
                      : "text-lux-green-900 border-lux-border hover:bg-lux-surface hover:border-lux-green-500"
                  )}>
                    Sign In
                  </Button>
                </Link>
              )}
            </div>
          </nav>

          {/* Mobile Menu Toggle */}
          <button 
            className={cn("md:hidden p-2 rounded-lg transition-colors", isHome && !isScrolled ? "text-lux-green-500 hover:bg-lux-surface/10" : "text-lux-text hover:bg-lux-bg")}
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
                      ? 'bg-lux-bg text-lux-text'
                      : 'text-lux-text hover:bg-lux-bg hover:text-lux-green-900'
                  )}
                >
                  {link.name}
                </Link>
              ))}

              <div className="pt-2 pb-1 px-4 border-t border-lux-border">
                 <div className="text-[10px] uppercase tracking-widest font-bold text-lux-text mb-2">Videos</div>
                 {videosLinks.map((vlink) => (
                    <Link
                      key={vlink.name}
                      to={vlink.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        'block px-4 py-3 rounded-xl text-xs uppercase tracking-widest font-bold transition-colors mb-2',
                        location.pathname === vlink.path
                          ? 'bg-lux-bg text-lux-text'
                          : 'text-lux-text hover:bg-lux-bg hover:text-lux-green-900'
                      )}
                    >
                      {vlink.name}
                    </Link>
                 ))}
              </div>
              <div className="pt-4 mt-2 border-t border-lux-border border-dashed px-4">
                {user ? (
                  <Link to="/profile" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full justify-start text-xs uppercase tracking-widest border-lux-border font-bold text-lux-green-900 h-12 hover:border-lux-green-500">
                      My Profile
                    </Button>
                  </Link>
                ) : (
                  <Link to="/sign-in" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full bg-lux-green-950 text-lux-bg hover:bg-lux-green-900 text-lux-surface text-xs uppercase tracking-widest font-bold h-12 shadow-md">
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
