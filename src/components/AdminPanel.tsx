import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShieldAlert, Ban, VolumeX, Eye, Activity, Users } from 'lucide-react';
import { p2pNetwork, isSupremeAdmin, isAdmin } from '../utils/p2pNetwork';

import type { ChatMessage } from '../types';

interface AdminPanelProps {
  username: string;
  messages: ChatMessage[];
}

export function AdminPanel({ username, messages }: AdminPanelProps) {
  const [peers, setPeers] = useState<{peerId: string, username: string}[]>([]);
  const [dms, setDms] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'surveillance' | 'groups'>('users');

  const supreme = isSupremeAdmin(username);

  useEffect(() => {
    // Initial fetch
    setPeers(p2pNetwork.getConnectedPeers());

    // Subscriptions
    p2pNetwork.onPeerListUpdate((updatedPeers) => {
      setPeers(updatedPeers);
    });

    if (supreme) {
      p2pNetwork.onDirectMessage((msg) => {
        setDms(prev => [{...msg, _receivedAt: new Date().toLocaleTimeString()}, ...prev]);
      });
    }
  }, [supreme]);

  const handleAction = (action: 'BAN' | 'KICK' | 'MUTE', target: string) => {
    if (!isAdmin(username)) return;
    p2pNetwork.sendModAction(action, target, `Enforced by ${username}`);
  };

  if (!isAdmin(username)) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="h-full flex flex-col bg-app-bg text-app-text p-6 max-w-4xl mx-auto w-full"
    >
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-red-500/10 text-red-500 rounded-2xl">
          {supreme ? <ShieldAlert size={28} /> : <Shield size={28} />}
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Admin Control Center</h2>
          <p className="text-sm opacity-60">
            {supreme ? 'Supreme Access Granted: Full Surveillance Active' : 'Moderator Access Granted'}
          </p>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl transition-all font-medium ${
            activeTab === 'users' ? 'bg-app-primary text-white shadow-lg shadow-app-primary/20' : 'bg-white/5 hover:bg-white/10'
          }`}
        >
          Active Network
        </button>
        {supreme && (
          <>
            <button
              onClick={() => setActiveTab('groups')}
              className={`px-4 py-2 rounded-xl transition-all font-medium flex items-center gap-2 ${
                activeTab === 'groups' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              <Users size={16} /> Group Surveillance
            </button>
            <button
              onClick={() => setActiveTab('surveillance')}
              className={`px-4 py-2 rounded-xl transition-all font-medium flex items-center gap-2 ${
                activeTab === 'surveillance' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              <Eye size={16} /> DM Surveillance
            </button>
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-4">
        <AnimatePresence mode="popLayout">
          {activeTab === 'users' && (
            <motion.div
              key="users"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2 text-sm font-medium opacity-50 mb-2">
                <Activity size={14} /> {peers.length} active connections
              </div>
              
              {peers.length === 0 ? (
                <div className="p-8 text-center bg-white/5 rounded-3xl border border-white/5 opacity-50">
                  No other peers detected in the mesh.
                </div>
              ) : peers.map((peer) => (
                <motion.div
                  layout
                  key={peer.peerId}
                  className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10"
                >
                  <div>
                    <div className="font-bold text-lg">{peer.username}</div>
                    <div className="text-xs opacity-40 font-mono">{peer.peerId}</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction('MUTE', peer.username)}
                      className="p-2 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 rounded-xl transition-colors"
                      title="Mute User"
                    >
                      <VolumeX size={18} />
                    </button>
                    <button
                      onClick={() => handleAction('KICK', peer.username)}
                      className="p-2 bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 rounded-xl transition-colors"
                      title="Kick User"
                    >
                      <Shield size={18} />
                    </button>
                    <button
                      onClick={() => handleAction('BAN', peer.username)}
                      className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl transition-colors"
                      title="Ban User"
                    >
                      <Ban size={18} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {activeTab === 'surveillance' && supreme && (
            <motion.div
              key="surveillance"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              <div className="p-4 bg-red-500/10 text-red-500 rounded-2xl border border-red-500/20 mb-4 text-sm">
                <strong>Notice:</strong> You are intercepting all private direct messages transmitted across the peer mesh.
              </div>

              {dms.length === 0 ? (
                <div className="p-8 text-center bg-white/5 rounded-3xl border border-white/5 opacity-50">
                  No encrypted direct messages intercepted yet.
                </div>
              ) : dms.map((dm, idx) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={idx}
                  className="p-4 bg-white/5 rounded-2xl border border-white/10"
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-xs font-medium">
                      <span className="text-app-primary">{dm.sender}</span>
                      <span className="opacity-50 mx-2">→</span>
                      <span className="text-app-primary">{dm.recipient}</span>
                    </div>
                    <div className="text-xs opacity-40">{dm._receivedAt}</div>
                  </div>
                  <div className="text-sm opacity-90">{dm.content}</div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {activeTab === 'groups' && supreme && (
            <motion.div
              key="groups"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              <div className="p-4 bg-orange-500/10 text-orange-500 rounded-2xl border border-orange-500/20 mb-4 text-sm">
                <strong>Notice:</strong> You are intercepting all private Group communications across the network.
              </div>

              {messages.filter(m => m.room !== 'Lounge').length === 0 ? (
                <div className="p-8 text-center bg-white/5 rounded-3xl border border-white/5 opacity-50">
                  No active group communications.
                </div>
              ) : messages.filter(m => m.room !== 'Lounge').map((msg) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={msg.id}
                  className="p-4 bg-white/5 rounded-2xl border border-white/10"
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-xs font-medium text-app-primary">
                      {msg.sender} <span className="opacity-50 mx-1">in</span> #{msg.room.toLowerCase()}
                    </div>
                    <div className="text-xs opacity-40">{new Date(msg.createdAt).toLocaleTimeString()}</div>
                  </div>
                  <div className="text-sm opacity-90">{msg.content}</div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
