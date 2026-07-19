'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Plus, Upload, Trophy } from 'lucide-react';

export default function FloatingShareMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const toggleOpen = () => setIsOpen((prev) => !prev);

  // Animations variants
  const menuVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95, y: -10 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 25,
        mass: 0.8,
        duration: 0.25
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.95, 
      y: -10,
      transition: { ease: 'easeOut', duration: 0.2 }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, x: -10 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: { delay: i * 0.05, duration: 0.2, ease: 'easeOut' }
    })
  };

  return (
    <div className="fixed top-8 left-8 z-[100]" ref={menuRef}>
      <button
        onClick={toggleOpen}
        className="w-14 h-14 rounded-full bg-[#0F172A] border border-slate-700 shadow-xl flex items-center justify-center text-white hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900"
        aria-label="Toggle Share Menu"
        aria-expanded={isOpen}
      >
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <Plus size={28} />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={menuVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute top-[72px] left-0 w-[220px] rounded-[20px] overflow-hidden"
            style={{
              background: 'rgba(15, 23, 42, 0.7)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)'
            }}
          >
            <div className="flex flex-col p-2 space-y-1">
              {/* Share Action */}
              <motion.button
                custom={0}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                className="group relative flex items-center w-full p-3 rounded-2xl text-left bg-transparent hover:bg-blue-500/12 transition-colors duration-200 focus:outline-none focus:bg-blue-500/12"
              >
                 <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform duration-200">
                   <Upload size={20} className="stroke-2" />
                 </div>
                 <div className="ml-3 flex flex-col">
                   <span className="font-semibold text-[16px] leading-snug text-slate-100 group-hover:text-blue-500 transition-colors" style={{ fontFamily: 'var(--font-inter, sans-serif)' }}>Share</span>
                   <span className="text-[13px] leading-tight text-slate-400 mt-[2px] group-hover:text-blue-200/70 transition-colors">Material, PDF, Link</span>
                 </div>
              </motion.button>

              {/* Achievement Action */}
              <motion.button
                custom={1}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                whileHover={{ y: -2 }}
                className="group relative flex items-center w-full p-3 rounded-2xl text-left bg-transparent hover:bg-blue-500/12 transition-colors duration-200 focus:outline-none focus:bg-blue-500/12"
              >
                 <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 group-hover:scale-110 group-hover:text-amber-400 transition-all duration-200" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(217,119,6,0.1))' }}>
                   <Trophy size={20} className="stroke-2" />
                 </div>
                 <div className="ml-3 flex flex-col">
                   <span className="font-semibold text-[16px] leading-snug text-slate-100 group-hover:text-amber-400 transition-colors" style={{ fontFamily: 'var(--font-inter, sans-serif)' }}>Achievement</span>
                   <span className="text-[13px] leading-tight text-slate-400 mt-[2px] group-hover:text-amber-200/70 transition-colors">Badges, XP, Rank</span>
                 </div>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
