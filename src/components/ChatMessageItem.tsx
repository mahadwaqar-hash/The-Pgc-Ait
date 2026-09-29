import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ChatMessage } from '../types';
import { Flame, Sparkles } from 'lucide-react';

interface ChatMessageItemProps {
  message: ChatMessage;
  isCurrentUser?: boolean;
  onVaporize: (id: string) => void;
  onReact: (id: string, emoji: string) => void;
}

export default function ChatMessageItem({
  message,
  isCurrentUser = false,
  onVaporize,
  onReact,
}: ChatMessageItemProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [isVaporizing, setIsVaporizing] = useState(false);

  const triggerVaporize = () => {
    setIsVaporizing(true);
    setTimeout(() => onVaporize(message.id), 600);
  };

  const timeFormatted = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <AnimatePresence>
      {!isVaporizing && (
        <motion.div
          layout
          initial={{ opacity: 0, scale: 0.88, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, filter: 'blur(10px)', scale: 0.85 }}
          transition={{ type: 'spring', stiffness: 450, damping: 28 }}
          className={`flex flex-col group w-full mb-3 ${
            isCurrentUser ? 'items-end' : 'items-start'
          }`}
        >
          {/* Sender Header Info */}
          <div
            className={`flex items-center gap-2 mb-1 px-2 ${
              isCurrentUser ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            <div className="w-5 h-5 rounded-full overflow-hidden border border-[var(--app-border)] bg-[var(--app-surface-secondary)] flex-shrink-0">
              <img
                src={`https://api.dicebear.com/7.x/${message.avatarSeed?.includes(':') ? message.avatarSeed.split(':')[0] : 'notionists'}/svg?seed=${message.avatarSeed?.includes(':') ? message.avatarSeed.split(':')[1] : message.avatarSeed}&backgroundColor=transparent`}
                alt="avatar"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="font-body text-[11px] tracking-wider uppercase font-semibold text-[var(--app-text)]">
              {isCurrentUser ? 'You' : message.sender}
            </span>
            <span className="font-mono text-[9px] text-[var(--app-text-muted)]">
              {timeFormatted}
            </span>
            {message.isBurnOnRead && (
              <span className="flex items-center gap-1 text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-full bg-rose-950/40 text-rose-300 border border-rose-800/40">
                <Flame className="w-2.5 h-2.5 animate-pulse" />
                Burn
              </span>
            )}
          </div>

          {/* Bubbly Chat Container */}
          <div
            className={`relative max-w-[85%] md:max-w-[70%] p-4 md:p-5 shadow-sm transition-all duration-200 ${
              isCurrentUser
                ? 'rounded-3xl rounded-br-sm bg-[var(--app-surface-secondary)] border border-[var(--app-border-hover)] text-[var(--app-text)] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)]'
                : 'rounded-3xl rounded-bl-sm bg-[var(--app-surface)] border border-[var(--app-border)] text-[var(--app-text)] shadow-[0_2px_12px_-2px_rgba(0,0,0,0.08)]'
            }`}
          >
            {/* Message Text */}
            <div className="font-body text-sm md:text-base leading-relaxed break-words">
              {message.isBurnOnRead && !isRevealed ? (
                <div
                  onMouseDown={() => setIsRevealed(true)}
                  onTouchStart={() => setIsRevealed(true)}
                  onMouseUp={triggerVaporize}
                  onTouchEnd={triggerVaporize}
                  className="cursor-pointer flex items-center gap-2 p-2 rounded-2xl bg-rose-950/20 border border-rose-900/30 text-rose-300 hover:text-rose-200 select-none transition-all"
                >
                  <Sparkles className="w-4 h-4 animate-spin text-rose-400" />
                  <span className="text-xs font-mono">
                    Hold to reveal (Self-destructs on release)
                  </span>
                </div>
              ) : (
                message.content
              )}
            </div>

            {/* Quick Expire trigger on hover */}
            <button
              onClick={triggerVaporize}
              className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 p-1 rounded-full bg-[var(--app-surface)] border border-[var(--app-border)] text-[var(--app-text-muted)] hover:text-rose-400 hover:border-rose-900 cursor-pointer shadow-md"
              title="Vaporize message"
            >
              <Flame className="w-3 h-3" />
            </button>
          </div>

          {/* Bubbly Emoji Reactions */}
          <div
            className={`flex items-center gap-1.5 mt-1.5 px-2 flex-wrap ${
              isCurrentUser ? 'justify-end' : 'justify-start'
            }`}
          >
            {['🖤', '✨', '☕', '🔥', '💀'].map((emoji) => {
              const count = message.reactions[emoji] || 0;
              return (
                <motion.button
                  key={emoji}
                  whileTap={{ scale: 1.3 }}
                  onClick={() => onReact(message.id, emoji)}
                  className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 transition-all duration-150 ${
                    count > 0
                      ? 'bg-[var(--app-surface-secondary)] text-[var(--app-text)] border border-[var(--app-border-hover)] scale-105 shadow-sm'
                      : 'hidden group-hover:flex text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-secondary)] opacity-40 hover:opacity-100'
                  }`}
                >
                  <span>{emoji}</span>
                  {count > 0 && (
                    <span className="font-mono text-[10px] font-bold">{count}</span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
