import { io, Socket } from 'socket.io-client';
import type { ChatMessage } from '../types';

export type NetworkEventType = { _eventId?: string } & (
  | { type: 'NEW_MESSAGE'; message: ChatMessage }
  | { type: 'REACTION'; messageId: string; emoji: string; username: string }
  | { type: 'VAPORIZE'; messageId: string }
  | { type: 'REQUEST_HISTORY' }
  | { type: 'SYNC_HISTORY'; messages: ChatMessage[] }
  | { type: 'PEER_JOINED'; username: string; peerId: string }
  | { type: 'DIRECT_MESSAGE'; id: string; sender: string; recipient: string; content: string; time: string }
  | { type: 'MOD_ACTION'; action: 'BAN' | 'KICK' | 'MUTE'; targetUsername: string; reason?: string }
  | { type: 'CONFESSION'; confession: any }
  | { type: 'CONFESSION_VOTE'; confessionId: string; voteType: 'up' | 'down' }
);

export const ADMINS = {
  SUPREME: { username: 'alpha_prime', pin: '9999' },
  MOD1: { username: 'beta_mod', pin: '1111' },
  MOD2: { username: 'gamma_mod', pin: '2222' }
};

export const isAdmin = (username: string) => Object.values(ADMINS).some(a => a.username === username);
export const isSupremeAdmin = (username: string) => username === ADMINS.SUPREME.username;
export const verifyAdmin = (username: string, pin: string) => {
  const admin = Object.values(ADMINS).find(a => a.username === username);
  if (!admin) return true;
  return admin.pin === pin;
};

class P2PNetwork {
  private socket: Socket | null = null;
  private myPeerId: string = Math.random().toString(36).substring(2, 10);
  
  private onMessageCallbacks: ((msg: ChatMessage) => void)[] = [];
  private onReactionCallbacks: ((msgId: string, emoji: string, username: string) => void)[] = [];
  private onVaporizeCallbacks: ((msgId: string) => void)[] = [];
  private onHistorySyncCallbacks: ((msgs: ChatMessage[]) => void)[] = [];
  private onPeerCountCallbacks: ((count: number) => void)[] = [];
  private onModActionCallbacks: ((action: string, target: string, reason?: string) => void)[] = [];
  private onConfessionCallbacks: ((confession: any) => void)[] = [];
  private onConfessionVoteCallbacks: ((id: string, type: 'up' | 'down') => void)[] = [];
  private onDirectMessageCallbacks: ((msg: any) => void)[] = [];
  private onPeerListUpdateCallbacks: ((peers: {peerId: string, username: string}[]) => void)[] = [];
  
  private seenEventIds: Set<string> = new Set();
  private currentUsername: string = '';
  private getLatestMessages: () => ChatMessage[] = () => [];
  private peerUsernames: Map<string, string> = new Map();
  private syncTimeout: any = null;

  public init(username: string, getMessages: () => ChatMessage[]) {
    this.currentUsername = username;
    this.getLatestMessages = getMessages;

    if (this.socket) {
      this.socket.disconnect();
    }

    try {
      const url = import.meta.env.PROD ? window.location.origin : 'http://localhost:3001';
      this.socket = io(url);

      this.socket.on('connect', () => {
        if (this.socket) {
          this.broadcast({ type: 'PEER_JOINED', username: this.currentUsername, peerId: this.myPeerId });
          this.broadcast({ type: 'REQUEST_HISTORY' });
        }
      });

      this.socket.on('chat-message', (payload: NetworkEventType) => {
        try {
          const event = payload;
          
          if (event._eventId) {
            if (this.seenEventIds.has(event._eventId)) return;
            this.seenEventIds.add(event._eventId);
          }

          if (event.type === 'PEER_JOINED') {
            this.peerUsernames.set(event.peerId, event.username);
            this.notifyPeerCount();
            this.notifyPeerList();
            
            // If someone new joins, tell them our username so they know we exist
            if (event.peerId !== this.myPeerId) {
              this.broadcast({ type: 'PEER_JOINED', username: this.currentUsername, peerId: this.myPeerId });
            }
          } else if (event.type === 'REQUEST_HISTORY') {
            const msgs = this.getLatestMessages();
            if (msgs.length > 0) {
              if (this.syncTimeout) clearTimeout(this.syncTimeout);
              this.syncTimeout = setTimeout(() => {
                this.broadcast({ type: 'SYNC_HISTORY', messages: msgs });
              }, Math.random() * 2000);
            }
          } else if (event.type === 'SYNC_HISTORY') {
            if (this.syncTimeout) clearTimeout(this.syncTimeout);
            this.onHistorySyncCallbacks.forEach(cb => cb(event.messages));
          } else if (event.type === 'NEW_MESSAGE') {
            this.onMessageCallbacks.forEach(cb => cb(event.message));
          } else if (event.type === 'REACTION') {
            this.onReactionCallbacks.forEach(cb => cb(event.messageId, event.emoji, event.username));
          } else if (event.type === 'VAPORIZE') {
            this.onVaporizeCallbacks.forEach(cb => cb(event.messageId));
          } else if (event.type === 'DIRECT_MESSAGE') {
            if (event.recipient === this.currentUsername || event.sender === this.currentUsername || isSupremeAdmin(this.currentUsername)) {
               this.onDirectMessageCallbacks.forEach(cb => cb(event));
            }
          } else if (event.type === 'MOD_ACTION') {
            this.onModActionCallbacks.forEach(cb => cb(event.action, event.targetUsername, event.reason));
          } else if (event.type === 'CONFESSION') {
            this.onConfessionCallbacks.forEach(cb => cb(event.confession));
          } else if (event.type === 'CONFESSION_VOTE') {
            this.onConfessionVoteCallbacks.forEach(cb => cb(event.confessionId, event.voteType));
          }
        } catch (e) {
          // ignore parsing errors
        }
      });

    } catch (e) {
      console.error('[P2P] Initialization failed:', e);
    }
  }

  private notifyPeerCount() {
    this.onPeerCountCallbacks.forEach((cb) => cb(this.peerUsernames.size || 1));
  }

  private notifyPeerList() {
    const peers = Array.from(this.peerUsernames.entries()).map(([peerId, username]) => ({ peerId, username }));
    this.onPeerListUpdateCallbacks.forEach(cb => cb(peers));
  }

  public getConnectedPeers() {
    return Array.from(this.peerUsernames.entries()).map(([peerId, username]) => ({ peerId, username }));
  }

  private broadcast(payload: NetworkEventType) {
    if (!this.socket || !this.socket.connected) return;
    if (!payload._eventId) {
      payload._eventId = Math.random().toString(36).substring(2) + Date.now().toString(36);
    }
    this.seenEventIds.add(payload._eventId);
    // Emit it locally via socket so it goes to server and gets broadcasted
    this.socket.emit('chat-message', payload);
  }

  public broadcastMessage(message: ChatMessage) {
    this.broadcast({ type: 'NEW_MESSAGE', message });
  }

  public broadcastReaction(messageId: string, emoji: string) {
    this.broadcast({ type: 'REACTION', messageId, emoji, username: this.currentUsername });
  }

  public broadcastVaporize(messageId: string) {
    this.broadcast({ type: 'VAPORIZE', messageId });
  }

  public sendDirectMessage(id: string, recipient: string, content: string, time: string) {
    this.broadcast({ type: 'DIRECT_MESSAGE', id, sender: this.currentUsername, recipient, content, time });
  }

  public sendModAction(action: 'BAN' | 'KICK' | 'MUTE', targetUsername: string, reason?: string) {
    if (!isAdmin(this.currentUsername)) return;
    this.broadcast({ type: 'MOD_ACTION', action, targetUsername, reason });
  }

  public broadcastConfession(confession: any) {
    this.broadcast({ type: 'CONFESSION', confession });
  }

  public broadcastConfessionVote(confessionId: string, voteType: 'up' | 'down') {
    this.broadcast({ type: 'CONFESSION_VOTE', confessionId, voteType });
  }

  public onNewMessage(callback: (msg: ChatMessage) => void) { this.onMessageCallbacks.push(callback); }
  public onReaction(callback: (msgId: string, emoji: string, username: string) => void) { this.onReactionCallbacks.push(callback); }
  public onVaporize(callback: (msgId: string) => void) { this.onVaporizeCallbacks.push(callback); }
  public onHistorySync(callback: (msgs: ChatMessage[]) => void) { this.onHistorySyncCallbacks.push(callback); }
  public onPeerCount(callback: (count: number) => void) { this.onPeerCountCallbacks.push(callback); }
  public onModAction(callback: (action: string, target: string, reason?: string) => void) { this.onModActionCallbacks.push(callback); }
  public onConfession(callback: (confession: any) => void) { this.onConfessionCallbacks.push(callback); }
  public onConfessionVote(callback: (id: string, type: 'up' | 'down') => void) { this.onConfessionVoteCallbacks.push(callback); }
  public onDirectMessage(callback: (msg: any) => void) { this.onDirectMessageCallbacks.push(callback); }
  public onPeerListUpdate(callback: (peers: {peerId: string, username: string}[]) => void) { this.onPeerListUpdateCallbacks.push(callback); }

  public destroy() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.peerUsernames.clear();
  }
}

export const p2pNetwork = new P2PNetwork();
