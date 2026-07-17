import React from 'react';
import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';
import { useNavigate } from 'react-router-dom';

interface AIUpgradePromptProps {
  message?: string;
}

export function AIUpgradePrompt({ message = "Upgrade to Scholar for R5/month for 20 AI questions daily" }: AIUpgradePromptProps) {
  const navigate = useNavigate();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-lux-surface0 border border-[#CCA43B]/30 rounded-xl p-4 sm:p-6 text-center shadow-lg"
    >
      <div className="w-12 h-12 bg-[#CCA43B]/10 rounded-full flex items-center justify-center mx-auto mb-3">
        <Sparkles size={24} className="text-lux-text" />
      </div>
      <h3 className="text-lux-text font-serif text-lg mb-2">Limit Reached</h3>
      <p className="text-lux-text text-sm mb-4 leading-relaxed max-w-sm mx-auto">
        {message}
      </p>
      <Button 
        onClick={() => navigate('/pricing')}
        className="w-full sm:w-auto bg-[#CCA43B] hover:bg-[#d8b045] text-lux-bg font-bold"
      >
        View Pricing Plans
      </Button>
    </motion.div>
  );
}
