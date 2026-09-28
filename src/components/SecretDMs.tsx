import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, UserPlus, Lock } from 'lucide-react';
import MagneticButton from './MagneticButton';

interface DirectMessage {
  id: string;
  sender: 'Me' | string;
  content: string;
  time: string;
}

export default function SecretDMs() {
  const [contacts, setContacts] = useState<string[]>(['bilal_ait', 'sarah_premed', 'hamza_cs']);
  const [selectedPeer, setSelectedPeer] = useState<string>('bilal_ait');
  const [inputText, setInputText] = useState('');
  const [newPeerInput, setNewPeerInput] = useState('');
  const [showAddPeer, setShowAddPeer] = useState(false);

  const [dmHistory, setDmHistory] = useState<Record<string, DirectMessage[]>>({
    bilal_ait: [
      { id: '1', sender: 'bilal_ait', content: 'Are you in the lab right now?', time: '12:45' },
      { id: '2', sender: 'Me', content: 'Heading there after physics class.', time: '12:48' },
    ],
    sarah_premed: [
      { id: '3', sender: 'sarah_premed', content: 'Did sir announce the test schedule?', time: '11:15' },
    ],
    hamza_cs: [
      { id: '4', sender: 'hamza_cs', content: 'Check the new past papers link.', time: '10:02' },
    ],
  });

  const currentMessages = dmHistory[selectedPeer] || [];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg: DirectMessage = {
      id: 'dm_' + Date.now(),
      sender: 'Me',
      content: inputText.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setDmHistory((prev) => ({
      ...prev,
      [selectedPeer]: [...(prev[selectedPeer] || []), newMsg],
    }));
    setInputText('');
  };

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newPeerInput.trim().toLowerCase();
    if (!clean) return;
    if (!contacts.includes(clean)) {
      setContacts([...contacts, clean]);
    }
    setSelectedPeer(clean);
    setNewPeerInput('');
    setShowAddPeer(false);
  };

  return (
    <div className="flex flex-col md:flex-row h-full gap-6">
      {/* Contacts List */}
      <div className="md:w-56 border-b md:border-b-0 md:border-r border-[var(--app-border)] pb-4 md:pb-0 md:pr-4 flex flex-col flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5 font-display text-lg italic text-[var(--app-text)]">
            <Lock className="w-3.5 h-3.5 text-[var(--app-accent)]" />
            <span>Direct DMs</span>
          </div>
          <button
            onClick={() => setShowAddPeer(!showAddPeer)}
            className="p-1 rounded hover:bg-[var(--app-surface-secondary)] text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-colors"
            title="Add contact"
          >
            <UserPlus className="w-3.5 h-3.5" />
          </button>
        </div>

        {showAddPeer && (
          <form onSubmit={handleAddContact} className="mb-4">
            <input
              type="text"
              value={newPeerInput}
              onChange={(e) => setNewPeerInput(e.target.value)}
              placeholder="Username..."
              className="w-full luxury-input px-2.5 py-1.5 text-xs font-mono mb-2"
              autoFocus
            />
            <button
              type="submit"
              className="w-full text-[10px] font-mono tracking-widest uppercase py-1 rounded bg-[var(--app-button-bg)] text-[var(--app-button-text)]"
            >
              Add Peer
            </button>
          </form>
        )}

        <div className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-y-auto">
          {contacts.map((contact) => (
            <button
              key={contact}
              onClick={() => setSelectedPeer(contact)}
              className={`text-left px-3 py-2 rounded-lg font-body text-xs tracking-wider uppercase transition-all whitespace-nowrap ${
                selectedPeer === contact
                  ? 'bg-[var(--app-surface)] text-[var(--app-text)] border border-[var(--app-border)] font-semibold shadow-sm'
                  : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
              }`}
            >
              @{contact}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col luxury-card p-4 md:p-6 h-full overflow-hidden">
        {/* DM Header */}
        <div className="flex justify-between items-center pb-3 border-b border-[var(--app-border)] mb-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-body text-xs text-[var(--app-text-muted)]">Encrypted with</span>
            <span className="font-mono text-sm font-semibold text-[var(--app-text)]">@{selectedPeer}</span>
          </div>
          <span className="font-mono text-[10px] text-[var(--app-text-muted)] uppercase tracking-wider">
            Peer Direct
          </span>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-2 pb-3" style={{ scrollbarWidth: 'thin' }}>
          <AnimatePresence>
            {currentMessages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex flex-col ${msg.sender === 'Me' ? 'items-end' : 'items-start'} mb-1`}
              >
                <div
                  className={`max-w-[75%] p-3.5 font-body text-sm md:text-base leading-relaxed ${
                    msg.sender === 'Me'
                      ? 'rounded-3xl rounded-br-sm bg-[var(--app-surface-secondary)] text-[var(--app-text)] border border-[var(--app-border-hover)] shadow-sm'
                      : 'rounded-3xl rounded-bl-sm bg-[var(--app-surface)] text-[var(--app-text)] border border-[var(--app-border)] shadow-sm'
                  }`}
                >
                  {msg.content}
                </div>
                <span className="font-mono text-[9px] text-[var(--app-text-muted)] mt-1 px-2">
                  {msg.time}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* DM Bubbly Input Bar */}
        <form
          onSubmit={handleSendMessage}
          className="pt-2 flex gap-2 items-center flex-shrink-0"
        >
          <div className="flex-1 flex items-center p-1.5 rounded-full bg-[var(--app-surface)] border border-[var(--app-border)] focus-within:border-[var(--app-border-hover)] shadow-sm">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Direct message to @${selectedPeer}...`}
              className="flex-1 bg-transparent px-4 py-1.5 text-sm font-body outline-none text-[var(--app-text)] placeholder:text-[var(--app-text-muted)]"
            />
            <MagneticButton
              type="submit"
              disabled={!inputText.trim()}
              className="px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider bg-[var(--app-button-bg)] text-[var(--app-button-text)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <span>Send</span>
              <Send className="w-3 h-3" />
            </MagneticButton>
          </div>
        </form>
      </div>
    </div>
  );
}
