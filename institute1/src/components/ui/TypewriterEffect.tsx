'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface TypewriterProps {
  words: string[];
  typingSpeed?: number;
  deletingSpeed?: number;
  delayBeforeDelete?: number;
  className?: string;
}

export default function TypewriterEffect({
  words,
  typingSpeed = 100,
  deletingSpeed = 50,
  delayBeforeDelete = 2000,
  className = ''
}: TypewriterProps) {
  const [text, setText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    const handleTyping = () => {
      const currentWord = words[wordIndex % words.length];

      if (isDeleting) {
        setText(currentWord.substring(0, text.length - 1));
      } else {
        setText(currentWord.substring(0, text.length + 1));
      }

      if (!isDeleting && text === currentWord) {
        timer = setTimeout(() => setIsDeleting(true), delayBeforeDelete);
      } else if (isDeleting && text === '') {
        setIsDeleting(false);
        setWordIndex((prev) => prev + 1);
        // Small pause before typing the next word
        timer = setTimeout(() => {}, 500);
      } else {
        timer = setTimeout(handleTyping, isDeleting ? deletingSpeed : typingSpeed);
      }
    };

    timer = setTimeout(handleTyping, isDeleting ? deletingSpeed : typingSpeed);
    return () => clearTimeout(timer);
  }, [text, isDeleting, wordIndex, words, typingSpeed, deletingSpeed, delayBeforeDelete]);

  return (
    <span className={className}>
      {text}
      <motion.span
        animate={{ opacity: [1, 0, 1] }}
        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
        style={{ display: 'inline-block', marginLeft: '2px', color: 'inherit' }}
      >
        |
      </motion.span>
    </span>
  );
}
