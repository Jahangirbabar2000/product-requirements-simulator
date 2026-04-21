import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface RotatingTextProps {
  messages: string[];
  intervalMs?: number;
  className?: string;
}

export function RotatingText({ messages, intervalMs = 4500, className = '' }: RotatingTextProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (messages.length <= 1) return;
    const timer = setInterval(() => {
      setIndex(prev => (prev + 1) % messages.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [messages, intervalMs]);

  // Reset index when messages array changes (stage transition)
  useEffect(() => {
    setIndex(0);
  }, [messages]);

  return (
    <div
      className={`relative flex items-center justify-center gap-3 min-h-12 px-4 py-3 rounded-xl overflow-hidden ${className}`}
    >
      {/* Shimmering background sweep */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-xl"
        style={{
          background:
            'linear-gradient(110deg, transparent 0%, transparent 38%, rgba(245,158,11,0.10) 50%, transparent 62%, transparent 100%)',
          backgroundSize: '220% 100%',
        }}
        animate={{ backgroundPositionX: ['-120%', '120%'] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'linear' }}
      />

      {/* Animated sparkle icon */}
      <motion.span
        aria-hidden
        className="relative flex-shrink-0"
        animate={{ rotate: [0, 12, -8, 0], scale: [1, 1.15, 0.95, 1] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Sparkles className="w-4 h-4 text-amber-500 drop-shadow-[0_0_6px_rgba(245,158,11,0.5)]" />
      </motion.span>

      {/* Rotating message with gradient text */}
      <AnimatePresence mode="wait">
        <motion.p
          key={`${messages[0]}-${index}`}
          initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="relative text-sm md:text-base font-medium text-center bg-gradient-to-r from-foreground/90 via-primary/80 to-foreground/90 bg-clip-text text-transparent"
          style={{ backgroundSize: '200% 100%' }}
        >
          {messages[index]}
        </motion.p>
      </AnimatePresence>

      {/* Typing-cursor pulse */}
      <motion.span
        aria-hidden
        className="relative flex-shrink-0 w-1 h-4 rounded-full bg-primary/70"
        animate={{ opacity: [0.2, 1, 0.2] }}
        transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}
