import React, { useState, useEffect } from 'react';
import { X, Download, Share } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './Button';

export function InstallBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if it's iOS
    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIosDevice);

    // Check last dismissal
    const lastDismissed = localStorage.getItem('gma-install-dismissed');
    const oneWeekInMs = 7 * 24 * 60 * 60 * 1000;
    
    if (lastDismissed && Date.now() - parseInt(lastDismissed) < oneWeekInMs) {
      return;
    }

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    const handler = (e: any) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      
      // Delay showing the banner by 30 seconds
      setTimeout(() => {
        setIsVisible(true);
      }, 30000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // For iOS, just show it after 30s if not dismissed
    if (isIosDevice) {
      setTimeout(() => {
        setIsVisible(true);
      }, 30000);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    setIsVisible(false);
    localStorage.setItem('gma-install-dismissed', Date.now().toString());
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-6 left-4 right-4 z-50 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-[480px]"
        >
          <div className="bg-primary rounded-3xl p-5 shadow-2xl border border-white/10 flex items-center gap-4 text-white relative overflow-hidden">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
            
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 border border-white/20">
              <Download size={24} className="text-white" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold leading-tight mb-1">Install GMA for Offline Access</p>
              <p className="text-[11px] opacity-80 leading-snug">
                {isIOS 
                  ? "Tap Share → Add to Home Screen to install GMA." 
                  : "Get the GMA app on your phone to keep studying during loadshedding."}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {!isIOS && (
                <Button 
                  size="sm" 
                  className="bg-white text-primary hover:bg-white/90 rounded-xl px-4 py-2 h-auto text-xs font-black uppercase tracking-wider"
                  onClick={handleInstall}
                >
                  Install
                </Button>
              )}
              <button 
                onClick={dismiss}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                aria-label="Dismiss"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
