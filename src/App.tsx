import { useState, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import Preloader from './components/Preloader';
import CustomCursor from './components/CustomCursor';
import NoiseOverlay from './components/NoiseOverlay';
import LenisScroller from './components/LenisScroller';
import ChatMessageItem from './components/ChatMessageItem';
import ChatInputBar from './components/ChatInputBar';
import SpottedWall from './components/SpottedWall';
import SecretDMs from './components/SecretDMs';
import PanicScreen from './components/PanicScreen';
import IdentityModal from './components/IdentityModal';
import { AdminPanel } from './components/AdminPanel';
import type { ChatMessage, Confession } from './types';
import { Lock, ShieldAlert, Volume2, VolumeX, Users, Palette, Shield } from 'lucide-react';
import { sounds } from './utils/soundEffects';
import { p2pNetwork, isAdmin } from './utils/p2pNetwork';

const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;
const STORAGE_KEY = 'pgc_messages_v2';
const ACCOUNT_KEY = 'pgc_account_v2';

export default function App() {
  const [activeTab, setActiveTab] = useState<'lounge' | 'dms' | 'wall' | 'admin' | 'groups'>('lounge');
  const [activeGroup, setActiveGroup] = useState<string>('');
  const [groupInput, setGroupInput] = useState<string>('');
  const [isPanicActive, setIsPanicActive] = useState<boolean>(false);
  const [isIdentityModalOpen, setIsIdentityModalOpen] = useState<boolean>(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(false);
  const [activeTheme, setActiveTheme] = useState<string>(() => {
    return localStorage.getItem('pgc_theme') || 'obsidian';
  });
  const [peerCount, setPeerCount] = useState<number>(1);

  // Identity state
  const [userProfile, setUserProfile] = useState<{
    username: string;
    avatarSeed: string;
    hasAccount: boolean;
  }>(() => {
    try {
      const saved = localStorage.getItem(ACCOUNT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { username: parsed.username, avatarSeed: parsed.avatarSeed, hasAccount: true };
      }
    } catch {
      // fallback
    }
    return { username: 'Guest', avatarSeed: 'default-seed', hasAccount: false };
  });

  // Messages with 8H TTL storage
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: ChatMessage[] = JSON.parse(raw);
        const now = Date.now();
        return parsed.filter((m) => now - m.createdAt < (m.durationMs || EIGHT_HOURS_MS));
      }
    } catch {
      // fallback
    }
    return [];
  });

  // Confessions Wall
  const [confessions, setConfessions] = useState<Confession[]>([
    {
      id: 'c1',
      tag: 'Observation',
      text: 'The third floor canteen tea hits completely different when it rains.',
      author: 'Anonymous',
      avatarSeed: 'anon1',
      createdAt: Date.now() - 2 * 3600 * 1000,
      expiresInHours: 8,
      upvotes: 8,
      downvotes: 0,
    },
    {
      id: 'c2',
      tag: 'Spotted',
      text: 'To whoever left their graphic calculator in lab 2, it is at the reception.',
      author: 'Anonymous',
      avatarSeed: 'anon2',
      createdAt: Date.now() - 1 * 3600 * 1000,
      expiresInHours: 8,
      upvotes: 4,
      downvotes: 1,
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync theme attribute to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', activeTheme);
    localStorage.setItem('pgc_theme', activeTheme);
  }, [activeTheme]);

  // Prompt identity modal if user has no account on first launch
  useEffect(() => {
    if (!userProfile.hasAccount) {
      setIsIdentityModalOpen(true);
    }
  }, [userProfile.hasAccount]);

  // Save messages to localStorage & purge expired
  useEffect(() => {
    try {
      const now = Date.now();
      const valid = messages.filter((m) => now - m.createdAt < (m.durationMs || EIGHT_HOURS_MS));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
    } catch {
      // storage error handling
    }
  }, [messages]);

  // Periodic purge of expired messages (every 30 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setMessages((prev) =>
        prev.filter((m) => now - m.createdAt < (m.durationMs || EIGHT_HOURS_MS))
      );
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Initialize P2P Mesh
  useEffect(() => {
    if (userProfile.username) {
      // Connect everyone to a single global mesh so admins can oversee everything
      p2pNetwork.init(userProfile.username, () => messages);

      p2pNetwork.onNewMessage((msg) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          if (isAudioEnabled) sounds.receive();
          return [...prev, msg];
        });
      });

      p2pNetwork.onReaction((msgId, emoji, username) => {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id === msgId) {
              const currentReacts = Array.isArray(m.reactions[emoji]) ? m.reactions[emoji] : [];
              const hasReacted = currentReacts.includes(username);
              return {
                ...m,
                reactions: {
                  ...m.reactions,
                  [emoji]: hasReacted
                    ? currentReacts.filter((u: string) => u !== username)
                    : [...currentReacts, username],
                },
              };
            }
            return m;
          })
        );
      });

      p2pNetwork.onVaporize((msgId) => {
        setMessages((prev) => prev.filter((m) => m.id !== msgId));
      });

      p2pNetwork.onHistorySync((synced) => {
        setMessages((prev) => {
          const map = new Map<string, ChatMessage>();
          prev.forEach((m) => map.set(m.id, m));
          synced.forEach((m) => map.set(m.id, m));
          return Array.from(map.values()).sort((a, b) => a.createdAt - b.createdAt);
        });
      });

      p2pNetwork.onPeerCount((count) => {
        setPeerCount(count);
      });

      p2pNetwork.onModAction((action, target, reason) => {
        if (target === userProfile.username) {
          if (action === 'BAN') {
            alert(`ACCESS DENIED: You have been banned. Reason: ${reason}`);
            localStorage.removeItem(ACCOUNT_KEY);
            window.location.reload();
          } else if (action === 'KICK') {
            alert(`You were kicked from the network. Reason: ${reason}`);
            window.location.reload();
          } else if (action === 'MUTE') {
            alert(`You have been muted. Reason: ${reason}`);
            sessionStorage.setItem('is_muted', 'true');
          }
        }
      });

      p2pNetwork.onConfession((confession) => {
        setConfessions(prev => {
          if (prev.some(c => c.id === confession.id)) return prev;
          return [confession, ...prev];
        });
      });

      p2pNetwork.onConfessionVote((id, type) => {
        setConfessions(prev => 
          prev.map(c => c.id === id ? {
            ...c,
            upvotes: type === 'up' ? c.upvotes + 1 : c.upvotes,
            downvotes: type === 'down' ? c.downvotes + 1 : c.downvotes,
          } : c).filter(c => c.downvotes < 5)
        );
      });
    }

    return () => {
      p2pNetwork.destroy();
    };
  }, [userProfile.username, isAudioEnabled]);

  // Auto-scroll chat on new message
  useEffect(() => {
    if (activeTab === 'lounge') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  // Panic shortcut (ESC key)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isAudioEnabled) sounds.panic();
        setIsPanicActive((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAudioEnabled]);

  const handleSendMessage = (content: string, isBurnOnRead: boolean) => {
    if (sessionStorage.getItem('is_muted') === 'true') {
      alert("You are muted and cannot send messages.");
      return;
    }
    if (isAudioEnabled) sounds.send();

    const newMsg: ChatMessage = {
      id: 'm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      sender: userProfile.username,
      avatarSeed: userProfile.avatarSeed,
      room: activeTab === 'groups' ? activeGroup : 'Lounge',
      content,
      createdAt: Date.now(),
      durationMs: EIGHT_HOURS_MS,
      isBurnOnRead,
      reactions: {},
    };

    setMessages((prev) => [...prev, newMsg]);
    p2pNetwork.broadcastMessage(newMsg);
  };

  const handleVaporize = (id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
    p2pNetwork.broadcastVaporize(id);
  };

  const handleReact = (id: string, emoji: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          const currentReacts = Array.isArray(m.reactions[emoji]) ? m.reactions[emoji] : [];
          const hasReacted = currentReacts.includes(userProfile.username);
          return {
            ...m,
            reactions: {
              ...m.reactions,
              [emoji]: hasReacted
                ? currentReacts.filter((u: string) => u !== userProfile.username)
                : [...currentReacts, userProfile.username],
            },
          };
        }
        return m;
      })
    );
    p2pNetwork.broadcastReaction(id, emoji);
  };

  const handleSaveProfile = (username: string, avatarSeed: string, pin: string) => {
    const account = { username, avatarSeed, pin, createdAt: Date.now() };
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
    setUserProfile({ username, avatarSeed, hasAccount: true });
  };

  const loungeMessages = messages.filter((m) => m.room === 'Lounge');
  const groupMessages = messages.filter((m) => m.room === activeGroup);

  return (
    <LenisScroller>
      <AnimatePresence>
        {isPanicActive && <PanicScreen onDeactivate={() => setIsPanicActive(false)} />}
      </AnimatePresence>

      <Preloader />
      <CustomCursor />
      <NoiseOverlay />

      <IdentityModal
        isOpen={isIdentityModalOpen}
        onClose={() => setIsIdentityModalOpen(false)}
        onSave={handleSaveProfile}
        currentUsername={userProfile.username}
        currentAvatar={userProfile.avatarSeed}
        hasExistingAccount={userProfile.hasAccount}
        activeTheme={activeTheme}
        setActiveTheme={setActiveTheme}
      />

      <div className="min-h-screen flex flex-col relative z-10 px-4 md:px-10 py-6 max-w-[1550px] mx-auto transition-colors duration-300">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--app-border)] pb-5 mb-6">
          <div className="flex items-baseline gap-4">
            <h1 className="font-display text-3xl md:text-5xl italic tracking-tight text-[var(--app-text)]">
              PGC
            </h1>
            <div className="flex flex-col">
              <span className="font-body text-xs tracking-[0.25em] uppercase text-[var(--app-text-muted)] font-medium">
                Allama Iqbal Town
              </span>
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-[var(--app-text-muted)] mt-0.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <Users className="w-3 h-3" />
                <span>{peerCount} peer{peerCount === 1 ? '' : 's'} mesh</span>
              </div>
            </div>
          </div>

          {/* Controls: Themes, Audio, Panic, Identity */}
          <div className="flex items-center gap-3 md:gap-5">
            {/* Theme Switcher */}
            <div className="hidden md:flex items-center gap-1.5 p-1.5 px-2 rounded-full bg-[var(--app-surface)] border border-[var(--app-border)] overflow-x-auto no-scrollbar max-w-[200px]">
              <Palette className="w-3.5 h-3.5 text-[var(--app-text-muted)] flex-shrink-0" />
              {[
                { id: 'obsidian', color: '#09090b', border: '#c5a258' },
                { id: 'alabaster', color: '#f8f6f1', border: '#927552' },
                { id: 'nordic', color: '#0d1117', border: '#79c0ff' },
                { id: 'lively', color: '#312e81', border: '#f43f5e' },
                { id: 'cyberpunk', color: '#0f0f16', border: '#fce205' },
                { id: 'midnight', color: '#060913', border: '#38bdf8' },
                { id: 'forest', color: '#08100a', border: '#4ade80' },
                { id: 'ocean', color: '#04121a', border: '#0ea5e9' },
                { id: 'cherry', color: '#1a050f', border: '#ec4899' },
                { id: 'dracula', color: '#282a36', border: '#ffb86c' },
                { id: 'monokai', color: '#2d2a2e', border: '#ffd866' },
                { id: 'matcha', color: '#f2f7ec', border: '#7a9c59' },
                { id: 'lavender', color: '#f5f3fa', border: '#8b6eb0' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTheme(t.id)}
                  style={{ backgroundColor: t.color, borderColor: activeTheme === t.id ? t.border : 'var(--app-border)' }}
                  className={`w-4 h-4 rounded-full border flex-shrink-0 transition-all ${activeTheme === t.id ? 'scale-125 mx-1 shadow-sm' : 'opacity-50 hover:opacity-100 hover:scale-110'}`}
                  title={t.id}
                />
              ))}
            </div>

            {/* Audio Toggle */}
            <button
              onClick={() => setIsAudioEnabled(!isAudioEnabled)}
              className="p-2 rounded-lg text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)] border border-transparent hover:border-[var(--app-border)] transition-colors"
              title={isAudioEnabled ? 'Mute sound' : 'Enable sound effects'}
            >
              {isAudioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Panic Mode Button */}
            <button
              onClick={() => setIsPanicActive(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--app-border)] hover:border-rose-800/80 text-[var(--app-text-muted)] hover:text-rose-400 bg-[var(--app-surface)] transition-all text-xs font-mono"
              title="Disguise as Physics Notes (ESC)"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
              <span className="hidden sm:inline">ESC</span>
            </button>

            <div className="h-4 w-[1px] bg-[var(--app-border)]" />

            {/* Profile Trigger */}
            <button
              onClick={() => setIsIdentityModalOpen(true)}
              className="flex items-center gap-2.5 group p-1 pl-2 rounded-full border border-[var(--app-border)] hover:border-[var(--app-border-hover)] bg-[var(--app-surface)] transition-all"
            >
              <span className="font-body text-xs tracking-wider uppercase text-[var(--app-text)] font-medium">
                {userProfile.username}
              </span>
              <div className="w-7 h-7 rounded-full overflow-hidden bg-[var(--app-surface-secondary)] border border-[var(--app-border)] flex-shrink-0">
                <img
                  src={`https://api.dicebear.com/7.x/${userProfile.avatarSeed?.includes(':') ? userProfile.avatarSeed.split(':')[0] : 'notionists'}/svg?seed=${userProfile.avatarSeed?.includes(':') ? userProfile.avatarSeed.split(':')[1] : userProfile.avatarSeed}&backgroundColor=transparent`}
                  alt="avatar"
                  className="w-full h-full object-cover"
                />
              </div>
            </button>
          </div>
        </header>

        {/* Main Work Area */}
        <div className="flex flex-col lg:flex-row gap-8 flex-1 h-[calc(100vh-140px)] min-h-[580px]">
          {/* Navigation Sidebar */}
          <aside className="lg:w-60 flex lg:flex-col gap-4 lg:gap-8 flex-shrink-0 overflow-x-auto no-scrollbar pb-2 lg:pb-0">
            {/* Main Tabs */}
            <div className="flex-1 lg:flex-none">
              <h3 className="hidden lg:block font-display text-lg italic text-[var(--app-text-muted)] mb-3">
                Channels
              </h3>
              <nav className="flex lg:flex-col gap-2 font-body text-xs tracking-widest uppercase whitespace-nowrap">
                <button
                  onClick={() => setActiveTab('lounge')}
                  className={`text-left px-3 py-2 rounded-lg transition-all ${
                    activeTab === 'lounge'
                      ? 'bg-[var(--app-surface)] text-[var(--app-text)] border border-[var(--app-border)] font-semibold shadow-sm'
                      : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
                  }`}
                >
                  Campus Lounge
                </button>
                <button
                  onClick={() => setActiveTab('dms')}
                  className={`text-left px-3 py-2 rounded-lg transition-all flex items-center justify-between ${
                    activeTab === 'dms'
                      ? 'bg-[var(--app-surface)] text-[var(--app-text)] border border-[var(--app-border)] font-semibold shadow-sm'
                      : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
                  }`}
                >
                  <span>Direct DMs</span>
                  <Lock className="w-3 h-3 text-[var(--app-text-muted)]" />
                </button>
                <button
                  onClick={() => setActiveTab('wall')}
                  className={`text-left px-3 py-2 rounded-lg transition-all ${
                    activeTab === 'wall'
                      ? 'bg-[var(--app-surface)] text-[var(--app-text)] border border-[var(--app-border)] font-semibold shadow-sm'
                      : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
                  }`}
                >
                  Spotted Wall
                </button>
                <button
                  onClick={() => setActiveTab('groups')}
                  className={`text-left px-3 py-2 rounded-lg transition-all flex items-center justify-between ${
                    activeTab === 'groups'
                      ? 'bg-[var(--app-surface)] text-[var(--app-text)] border border-[var(--app-border)] font-semibold shadow-sm'
                      : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
                  }`}
                >
                  <span>Groups</span>
                  <Users className="w-3 h-3 text-[var(--app-text-muted)]" />
                </button>
                {isAdmin(userProfile.username) && (
                  <button
                    onClick={() => setActiveTab('admin')}
                    className={`text-left px-3 py-2 rounded-lg transition-all flex items-center justify-between ${
                      activeTab === 'admin'
                        ? 'bg-[var(--app-surface)] text-rose-500 border border-rose-500/30 font-semibold shadow-sm'
                        : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
                    }`}
                  >
                    <span>Admin Panel</span>
                    <Shield className="w-3 h-3 text-[var(--app-text-muted)]" />
                  </button>
                )}
              </nav>
            </div>

            {/* We removed the sub-rooms from Lounge */}
          </aside>

          {/* Central Workspace */}
          <main className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Lounge View */}
            {activeTab === 'lounge' && (
              <div className="flex flex-col h-full">
                {/* Chat Top Banner */}
                <div className="flex items-center justify-between pb-3 border-b border-[var(--app-border)] mb-4 flex-shrink-0">
                  <div className="flex items-baseline gap-3">
                    <h2 className="font-display text-2xl md:text-3xl text-[var(--app-text)]">
                      #lounge
                    </h2>
                    <span className="text-[11px] font-mono text-[var(--app-text-muted)]">
                      Ephemeral P2P Stream
                    </span>
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-[var(--app-surface)] border border-[var(--app-border)] text-[var(--app-accent)]">
                    8H Auto-Delete
                  </span>
                </div>

                {/* Messages Container */}
                <div
                  className="flex-1 overflow-y-auto space-y-4 pr-2 pb-4"
                  style={{ scrollbarWidth: 'thin' }}
                >
                  {loungeMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 text-[var(--app-text-muted)]">
                      <p className="font-display text-xl italic mb-1">Lounge is quiet</p>
                      <p className="font-body text-xs">Be the first to speak. Messages burn after 8 hours.</p>
                    </div>
                  ) : (
                    <AnimatePresence>
                      {loungeMessages.map((msg) => (
                        <ChatMessageItem
                          key={msg.id}
                          message={msg}
                          isCurrentUser={msg.sender === userProfile.username}
                          currentUsername={userProfile.username}
                          onVaporize={handleVaporize}
                          onReact={handleReact}
                        />
                      ))}
                    </AnimatePresence>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* THE CHAT BAR */}
                <div className="pt-2 flex-shrink-0">
                  <ChatInputBar
                    activeRoom={'Lounge'}
                    onSendMessage={handleSendMessage}
                  />
                </div>
              </div>
            )}

            {/* Groups View */}
            {activeTab === 'groups' && (
              <div className="flex flex-col h-full">
                {!activeGroup ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-4">
                    <div className="luxury-card p-8 max-w-md w-full text-center">
                      <Users className="w-12 h-12 text-[var(--app-accent)] mx-auto mb-4" />
                      <h2 className="font-display text-2xl mb-2 text-[var(--app-text)]">Join a Group</h2>
                      <p className="text-xs text-[var(--app-text-muted)] mb-6 font-body">
                        Enter a group codename to join or create a private ephemeral channel.
                      </p>
                      <form onSubmit={(e) => { e.preventDefault(); if (groupInput.trim()) setActiveGroup(groupInput.trim()); }} className="flex gap-2">
                        <input
                          type="text"
                          value={groupInput}
                          onChange={(e) => setGroupInput(e.target.value)}
                          placeholder="e.g. physics_101"
                          className="luxury-input flex-1 px-4 py-2 font-mono text-sm"
                          required
                        />
                        <button type="submit" className="luxury-button px-6 py-2">
                          Join
                        </button>
                      </form>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Group Chat Top Banner */}
                    <div className="flex items-center justify-between pb-3 border-b border-[var(--app-border)] mb-4 flex-shrink-0">
                      <div className="flex items-baseline gap-3">
                        <h2 className="font-display text-2xl md:text-3xl text-[var(--app-text)]">
                          #{activeGroup.toLowerCase()}
                        </h2>
                        <span className="text-[11px] font-mono text-[var(--app-text-muted)]">
                          Private Group
                        </span>
                      </div>
                      <button onClick={() => setActiveGroup('')} className="text-[10px] font-mono uppercase tracking-widest px-3 py-1 rounded border border-[var(--app-border)] hover:bg-[var(--app-surface)] transition-colors">
                        Leave Group
                      </button>
                    </div>

                    {/* Messages Container */}
                    <div
                      className="flex-1 overflow-y-auto space-y-4 pr-2 pb-4"
                      style={{ scrollbarWidth: 'thin' }}
                    >
                      {groupMessages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8 text-[var(--app-text-muted)]">
                          <p className="font-display text-xl italic mb-1">Group is quiet</p>
                          <p className="font-body text-xs">Be the first to speak. Messages burn after 8 hours.</p>
                        </div>
                      ) : (
                        <AnimatePresence>
                          {groupMessages.map((msg) => (
                            <ChatMessageItem
                              key={msg.id}
                              message={msg}
                              isCurrentUser={msg.sender === userProfile.username}
                              currentUsername={userProfile.username}
                              onVaporize={handleVaporize}
                              onReact={handleReact}
                            />
                          ))}
                        </AnimatePresence>
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* THE CHAT BAR */}
                    <div className="pt-2 flex-shrink-0">
                      <ChatInputBar
                        activeRoom={activeGroup}
                        onSendMessage={handleSendMessage}
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* DMs View */}
            {activeTab === 'dms' && <SecretDMs currentUsername={userProfile.username} />}

            {/* Spotted Wall View */}
            {activeTab === 'wall' && (
              <div className="flex-1 overflow-y-auto pr-2 pb-6" style={{ scrollbarWidth: 'thin' }}>
                <SpottedWall
                  confessions={confessions}
                  onAddConfession={(text, tag, isAnon) => {
                    const newConfession = {
                      id: 'c_' + Date.now() + '_' + Math.random().toString(36).substring(2,6),
                      tag,
                      text,
                      author: isAnon ? 'Anonymous' : userProfile.username,
                      avatarSeed: isAnon ? 'anon' : userProfile.avatarSeed,
                      createdAt: Date.now(),
                      expiresInHours: 8,
                      upvotes: 1,
                      downvotes: 0,
                    };
                    setConfessions((prev) => [newConfession, ...prev]);
                    p2pNetwork.broadcastConfession(newConfession);
                  }}
                  onVote={(id, type) => {
                    setConfessions((prev) =>
                      prev
                        .map((c) =>
                          c.id === id
                            ? {
                                ...c,
                                upvotes: type === 'up' ? c.upvotes + 1 : c.upvotes,
                                downvotes: type === 'down' ? c.downvotes + 1 : c.downvotes,
                              }
                            : c
                        )
                        .filter((c) => c.downvotes < 5)
                    );
                    p2pNetwork.broadcastConfessionVote(id, type);
                  }}
                />
              </div>
            )}
            
            {/* Admin View */}
            {activeTab === 'admin' && (
              <div className="flex-1 overflow-y-auto pr-2 pb-6" style={{ scrollbarWidth: 'thin' }}>
                <AdminPanel username={userProfile.username} messages={messages} />
              </div>
            )}
          </main>
        </div>
      </div>
    </LenisScroller>
  );
}
