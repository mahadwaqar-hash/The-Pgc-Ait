import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Flame, Clock, Smile } from 'lucide-react';

interface ChatInputBarProps {
  onSendMessage: (content: string, isBurnOnRead: boolean) => void;
  activeRoom: string;
}

const QUICK_EMOJIS = ['🖤', '✨', '☕', '🔥', '💀', '🤫', '👀', '💯'];

export default function ChatInputBar({ onSendMessage, activeRoom }: ChatInputBarProps) {
  const [text, setText] = useState('');
  const [isBurnOnRead, setIsBurnOnRead] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [activeRoom]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSendMessage(text.trim(), isBurnOnRead);
    setText('');
    setIsBurnOnRead(false);
    setShowEmojiPicker(false);
    // Timeout helps iOS Safari keep focus after DOM updates
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  };

  const handleEmojiSelect = (emoji: string) => {
    setText((prev) => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  return (
    <div className="w-full relative">
      {/* Bubbly Emoji Picker Popup */}
      <AnimatePresence>
        {showEmojiPicker && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 10 }}
            transition={{ type: 'spring', stiffness: 500, damping: 28 }}
            className="absolute bottom-full mb-3 left-4 p-2 rounded-2xl bg-[var(--app-surface)] border border-[var(--app-border)] shadow-2xl flex gap-1.5 z-30 backdrop-blur-xl"
          >
            {QUICK_EMOJIS.map((emoji) => (
              <motion.button
                key={emoji}
                type="button"
                whileHover={{ scale: 1.25 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleEmojiSelect(emoji)}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--app-surface-secondary)] transition-colors text-lg"
              >
                {emoji}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pill-Shaped Bubbly Chat Bar */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 p-1.5 md:p-2 rounded-full bg-[var(--app-surface)] border border-[var(--app-border)] shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-xl transition-all duration-300 focus-within:border-[var(--app-border-hover)] focus-within:shadow-[0_8px_30px_rgb(0,0,0,0.2)]"
      >
        {/* Burn On Read Bubbly Pill */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          onClick={() => setIsBurnOnRead(!isBurnOnRead)}
          title={isBurnOnRead ? "Burn on read: ACTIVE" : "Burn on read: INACTIVE"}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-mono uppercase tracking-wider transition-all duration-300 ${
            isBurnOnRead
              ? 'bg-rose-950/60 text-rose-300 border border-rose-800 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
              : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-secondary)]'
          }`}
        >
          <Flame className={`w-3.5 h-3.5 ${isBurnOnRead ? 'animate-bounce text-rose-400' : ''}`} />
          <span className="hidden sm:inline font-semibold">{isBurnOnRead ? 'Burn' : 'Burn'}</span>
        </motion.button>

        {/* Emoji trigger */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="p-2 rounded-full text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-secondary)] transition-colors"
          title="Reactions"
        >
          <Smile className="w-4 h-4" />
        </motion.button>

        {/* Chat Text Input */}
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Message #${activeRoom.toLowerCase()}...`}
          className="flex-1 bg-transparent text-[var(--app-text)] placeholder:text-[var(--app-text-muted)] text-sm md:text-base outline-none px-3 font-body"
        />

        {/* 8-Hour Badge */}
        <div className="hidden lg:flex items-center gap-1 text-[11px] font-mono text-[var(--app-text-muted)] px-3 py-1.5 rounded-full bg-[var(--app-surface-secondary)] border border-[var(--app-border)] select-none">
          <Clock className="w-3 h-3 text-[var(--app-accent)]" />
          <span>8h</span>
        </div>

        {/* Bubbly Spring Send Button */}
        <motion.button
          type="submit"
          whileHover={text.trim() ? { scale: 1.05 } : {}}
          whileTap={text.trim() ? { scale: 0.92 } : {}}
          disabled={!text.trim()}
          className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold tracking-wider uppercase transition-all duration-300 ${
            text.trim()
              ? 'bg-[var(--app-button-bg)] text-[var(--app-button-text)] shadow-md cursor-pointer'
              : 'bg-[var(--app-surface-secondary)] text-[var(--app-text-muted)] opacity-40 cursor-not-allowed'
          }`}
        >
          <span className="hidden sm:inline">Send</span>
          <Send className="w-3.5 h-3.5" />
        </motion.button>
      </form>
    </div>
  );
}
