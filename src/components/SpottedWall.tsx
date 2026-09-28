import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MagneticButton from './MagneticButton';
import type { Confession } from '../types';

interface SpottedWallProps {
  confessions: Confession[];
  onAddConfession: (text: string, tag: string, isAnon: boolean) => void;
  onVote: (id: string, type: 'up' | 'down') => void;
}

export default function SpottedWall({ confessions, onAddConfession, onVote }: SpottedWallProps) {
  const [newText, setNewText] = useState('');
  const [selectedTag, setSelectedTag] = useState('Observation');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;
    onAddConfession(newText.trim(), selectedTag, true);
    setNewText('');
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Compose */}
      <form onSubmit={handleSubmit} className="luxury-card p-6 md:p-8">
        <h3 className="font-display text-2xl italic text-[var(--app-text)] mb-4">
          Campus Spotted & Confessions
        </h3>
        <textarea
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="Share an anonymous observation or campus whisper..."
          className="w-full bg-transparent border-b border-[var(--app-border)] pb-4 mb-6 text-base md:text-lg font-display text-[var(--app-text)] placeholder:text-[var(--app-text-muted)] focus:outline-none focus:border-[var(--app-border-hover)] resize-none h-20"
        />
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div className="flex gap-2">
            {['Observation', 'Quote', 'Spotted', 'Confession'].map((tag) => (
              <button
                type="button"
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-2.5 py-1 rounded text-[10px] font-mono tracking-widest uppercase transition-colors ${
                  selectedTag === tag
                    ? 'bg-[var(--app-surface-secondary)] text-[var(--app-accent)] border border-[var(--app-border)] font-semibold'
                    : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
          <MagneticButton type="submit" className="luxury-button px-6 py-2">
            Publish Secret
          </MagneticButton>
        </div>
      </form>

      {/* Grid */}
      <div className="columns-1 md:columns-2 gap-6 space-y-6">
        <AnimatePresence>
          {confessions.map((card) => (
            <motion.div
              key={card.id}
              layout
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, filter: 'blur(10px)' }}
              className="break-inside-avoid luxury-card p-6"
            >
              <div className="flex justify-between items-center mb-4 border-b border-[var(--app-border)] pb-3">
                <span className="font-mono text-[10px] tracking-widest uppercase text-[var(--app-accent)]">
                  #{card.tag.toLowerCase()}
                </span>
                <span className="font-mono text-[10px] text-[var(--app-text-muted)]">
                  8h decay
                </span>
              </div>
              <p className="font-display text-lg md:text-xl text-[var(--app-text)] leading-relaxed mb-6">
                "{card.text}"
              </p>
              <div className="flex justify-between items-center">
                <span className="font-body text-xs tracking-wider uppercase text-[var(--app-text-muted)]">
                  {card.author}
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onVote(card.id, 'up')}
                    className="flex items-center gap-1 text-xs text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-colors"
                  >
                    ▲ <span>{card.upvotes}</span>
                  </button>
                  <button
                    onClick={() => onVote(card.id, 'down')}
                    className="flex items-center gap-1 text-xs text-[var(--app-text-muted)] hover:text-rose-400 transition-colors"
                  >
                    ▼ <span>{card.downvotes}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
