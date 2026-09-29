import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, KeyRound, User } from 'lucide-react';
import MagneticButton from './MagneticButton';
import { verifyAdmin } from '../utils/p2pNetwork';

interface IdentityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (username: string, avatarSeed: string, pin: string) => void;
  currentUsername: string;
  currentAvatar: string;
  hasExistingAccount: boolean;
}

export default function IdentityModal({
  isOpen,
  onClose,
  onSave,
  currentUsername,
  currentAvatar,
  hasExistingAccount,
}: IdentityModalProps) {
  const [username, setUsername] = useState(currentUsername === 'Guest' ? '' : currentUsername);
  const [avatarSeed, setAvatarSeed] = useState(currentAvatar);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim().length < 3) {
      setError('Pseudonym must be at least 3 characters');
      return;
    }
    if (pin.trim().length < 4) {
      setError('Passcode must be at least 4 digits');
      return;
    }
    
    if (!verifyAdmin(username.trim(), pin.trim())) {
      setError('Incorrect passcode for this reserved alias.');
      return;
    }
    
    setError('');
    onSave(username.trim(), avatarSeed, pin.trim());
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
        >
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="luxury-card max-w-md w-full p-6 md:p-8"
          >
            <div className="flex items-center gap-2 mb-2 text-[var(--app-accent)]">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-[10px] font-mono tracking-widest uppercase">
                {hasExistingAccount ? 'Device Account Profile' : 'One Account Per Device'}
              </span>
            </div>
            
            <h2 className="font-display text-2xl md:text-3xl italic text-[var(--app-text)] mb-2">
              {hasExistingAccount ? 'Identity Verified' : 'Register College Alias'}
            </h2>
            <p className="font-body text-xs text-[var(--app-text-muted)] tracking-wide mb-6">
              Bound locally to this hardware. Messages expire after 8 hours.
            </p>

            {error && (
              <div className="mb-4 p-2.5 rounded bg-rose-950/40 border border-rose-800 text-rose-300 text-xs font-mono">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="flex items-center gap-1.5 font-body text-[11px] tracking-widest uppercase text-[var(--app-text-muted)] mb-2">
                  <User className="w-3.5 h-3.5" />
                  Pseudonym
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full luxury-input px-4 py-2.5 text-base font-display"
                  placeholder="e.g. nocturnal_iqbal"
                  minLength={3}
                  maxLength={20}
                  required
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 font-body text-[11px] tracking-widest uppercase text-[var(--app-text-muted)] mb-2">
                  <KeyRound className="w-3.5 h-3.5" />
                  Passcode / PIN (Lock)
                </label>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full luxury-input px-4 py-2.5 text-base font-mono tracking-widest"
                  placeholder="••••"
                  minLength={4}
                  maxLength={12}
                  required
                />
              </div>

              <div>
                <label className="block font-body text-[11px] tracking-widest uppercase text-[var(--app-text-muted)] mb-2">
                  Visual Identity
                </label>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full overflow-hidden border border-[var(--app-border)] bg-[var(--app-surface-secondary)]">
                      <img
                        src={`https://api.dicebear.com/7.x/${avatarSeed.split(':')[0] || 'notionists'}/svg?seed=${avatarSeed.split(':')[1] || avatarSeed}&backgroundColor=transparent`}
                        alt="avatar preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex flex-col gap-2 flex-1">
                      <select 
                        className="luxury-input px-3 py-1.5 text-xs font-body w-full"
                        value={avatarSeed.split(':')[0] || 'notionists'}
                        onChange={(e) => setAvatarSeed(`${e.target.value}:${avatarSeed.split(':')[1] || avatarSeed}`)}
                      >
                        <option value="notionists">Notionists</option>
                        <option value="bottts">Bottts</option>
                        <option value="micah">Micah</option>
                        <option value="adventurer">Adventurer</option>
                        <option value="lorelei">Lorelei</option>
                        <option value="fun-emoji">Fun Emoji</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => setAvatarSeed(`${avatarSeed.split(':')[0] || 'notionists'}:${Math.random().toString(36).substring(7)}`)}
                        className="font-body text-xs tracking-widest uppercase text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-colors px-3 py-1.5 rounded border border-[var(--app-border)] hover:border-[var(--app-border-hover)] w-full text-center"
                      >
                        Shuffle Seed
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[var(--app-border)]">
                {hasExistingAccount && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="font-body text-xs tracking-widest uppercase text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-colors px-4 py-2"
                  >
                    Dismiss
                  </button>
                )}
                <MagneticButton type="submit" className="luxury-button px-6 py-2.5">
                  Save Identity
                </MagneticButton>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
