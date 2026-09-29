import Peer, { type DataConnection } from 'peerjs';
import type { ChatMessage } from '../types';

export type NetworkEventType = { _eventId?: string } & (
  | { type: 'NEW_MESSAGE'; message: ChatMessage }
  | { type: 'REACTION'; messageId: string; emoji: string }
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
  if (!admin) return true; // Not an admin name, allowed
  return admin.pin === pin;
};

class P2PNetwork {
  private peer: Peer | null = null;
  private connections: Map<string, DataConnection> = new Map(); // peerId -> connection
  private peerUsernames: Map<string, string> = new Map(); // peerId -> username
  
  private onMessageCallbacks: ((msg: ChatMessage) => void)[] = [];
  private onReactionCallbacks: ((msgId: string, emoji: string) => void)[] = [];
  private onVaporizeCallbacks: ((msgId: string) => void)[] = [];
  private onHistorySyncCallbacks: ((msgs: ChatMessage[]) => void)[] = [];
  private onPeerCountCallbacks: ((count: number) => void)[] = [];
  private onDirectMessageCallbacks: ((msg: any) => void)[] = [];
  private onModActionCallbacks: ((action: string, target: string, reason?: string) => void)[] = [];
  private onPeerListUpdateCallbacks: ((peers: {peerId: string, username: string}[]) => void)[] = [];
  private onConfessionCallbacks: ((confession: any) => void)[] = [];
  private onConfessionVoteCallbacks: ((id: string, type: 'up' | 'down') => void)[] = [];
  
  private seenEventIds: Set<string> = new Set();
  
  private currentUsername: string = '';
  private getLatestMessages: () => ChatMessage[] = () => [];

  public init(username: string, getMessages: () => ChatMessage[]) {
    this.currentUsername = username;
    this.getLatestMessages = getMessages;

    if (this.peer) {
      this.peer.destroy();
      this.connections.clear();
      this.peerUsernames.clear();
    }

    const sanitizedUser = username.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 15);
    const randomSuffix = Math.random().toString(36).substring(2, 6);

    let hubAttempt = 1;
    const tryInit = () => {
      if (this.peer) {
        this.peer.destroy();
      }

      const isHub = hubAttempt <= 5;
      const peerId = isHub 
        ? `pgc-ait-global-hub-${hubAttempt}`
        : `pgc-ait-global-${sanitizedUser}-${randomSuffix}`;

      try {
        this.peer = new Peer(peerId, { debug: 0 });

        this.peer.on('open', () => {
          this.discoverAndConnectToPeers();
        });

        this.peer.on('connection', (conn) => {
          this.setupConnection(conn);
        });

        this.peer.on('error', (err: any) => {
          if (err.type === 'unavailable-id' && isHub) {
            hubAttempt++;
            tryInit();
          } else if (err.type !== 'peer-unavailable') {
            console.debug('[P2P] Network event:', err.type);
          }
        });
      } catch (e) {
        console.error('[P2P] Initialization failed:', e);
      }
    };

    tryInit();
  }

  private setupConnection(conn: DataConnection) {
    conn.on('open', () => {
      this.connections.set(conn.peer, conn);
      this.notifyPeerCount();

      conn.send({
        type: 'PEER_JOINED',
        username: this.currentUsername,
        peerId: this.peer?.id || '',
      });

      conn.send({ type: 'REQUEST_HISTORY' });
    });

    conn.on('data', (data: unknown) => {
      const event = data as NetworkEventType;
      if (!event || !event.type) return;

      if (event._eventId) {
        if (this.seenEventIds.has(event._eventId)) return;
        this.seenEventIds.add(event._eventId);
        // Relay to other connected peers
        this.connections.forEach((c, peerId) => {
          if (peerId !== conn.peer && c.open) {
            c.send(event);
          }
        });
      }

      if (event.type === 'PEER_JOINED') {
        this.peerUsernames.set(event.peerId, event.username);
        this.notifyPeerList();
      } else if (event.type === 'NEW_MESSAGE') {
        this.onMessageCallbacks.forEach((cb) => cb(event.message));
      } else if (event.type === 'REACTION') {
        this.onReactionCallbacks.forEach((cb) => cb(event.messageId, event.emoji));
      } else if (event.type === 'VAPORIZE') {
        this.onVaporizeCallbacks.forEach((cb) => cb(event.messageId));
      } else if (event.type === 'REQUEST_HISTORY') {
        const msgs = this.getLatestMessages();
        conn.send({ type: 'SYNC_HISTORY', messages: msgs });
      } else if (event.type === 'SYNC_HISTORY') {
        this.onHistorySyncCallbacks.forEach((cb) => cb(event.messages));
      } else if (event.type === 'DIRECT_MESSAGE') {
        // If I am the recipient, the sender, OR the Supreme Admin, process the DM
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
    });

    conn.on('close', () => {
      this.connections.delete(conn.peer);
      this.peerUsernames.delete(conn.peer);
      this.notifyPeerCount();
      this.notifyPeerList();
    });

    conn.on('error', () => {
      this.connections.delete(conn.peer);
      this.peerUsernames.delete(conn.peer);
      this.notifyPeerCount();
      this.notifyPeerList();
    });
  }

  private discoverAndConnectToPeers() {
    const seedIds = [1, 2, 3, 4, 5].map(
      (idx) => `pgc-ait-global-hub-${idx}`
    );

    seedIds.forEach((seedId) => {
      if (this.peer && seedId !== this.peer.id && !this.connections.has(seedId)) {
        try {
          const conn = this.peer.connect(seedId, { reliable: true });
          this.setupConnection(conn);
        } catch {}
      }
    });
  }

  private notifyPeerCount() {
    const count = this.connections.size + 1;
    this.onPeerCountCallbacks.forEach((cb) => cb(count));
  }

  private notifyPeerList() {
    const peers = Array.from(this.peerUsernames.entries()).map(([peerId, username]) => ({ peerId, username }));
    this.onPeerListUpdateCallbacks.forEach(cb => cb(peers));
  }

  public getConnectedPeers() {
    return Array.from(this.peerUsernames.entries()).map(([peerId, username]) => ({ peerId, username }));
  }

  private broadcast(payload: NetworkEventType) {
    if (!payload._eventId) {
      payload._eventId = Math.random().toString(36).substring(2) + Date.now().toString(36);
    }
    this.seenEventIds.add(payload._eventId);
    this.connections.forEach((conn) => { if (conn.open) conn.send(payload); });
  }

  public broadcastMessage(message: ChatMessage) {
    this.broadcast({ type: 'NEW_MESSAGE', message });
  }

  public broadcastReaction(messageId: string, emoji: string) {
    this.broadcast({ type: 'REACTION', messageId, emoji });
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
  public onReaction(callback: (msgId: string, emoji: string) => void) { this.onReactionCallbacks.push(callback); }
  public onVaporize(callback: (msgId: string) => void) { this.onVaporizeCallbacks.push(callback); }
  public onHistorySync(callback: (msgs: ChatMessage[]) => void) { this.onHistorySyncCallbacks.push(callback); }
  public onPeerCount(callback: (count: number) => void) { this.onPeerCountCallbacks.push(callback); }
  public onDirectMessage(callback: (msg: any) => void) { this.onDirectMessageCallbacks.push(callback); }
  public onModAction(callback: (action: string, target: string, reason?: string) => void) { this.onModActionCallbacks.push(callback); }
  public onPeerListUpdate(callback: (peers: {peerId: string, username: string}[]) => void) { this.onPeerListUpdateCallbacks.push(callback); }
  public onConfession(callback: (confession: any) => void) { this.onConfessionCallbacks.push(callback); }
  public onConfessionVote(callback: (id: string, type: 'up' | 'down') => void) { this.onConfessionVoteCallbacks.push(callback); }

  public destroy() {
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.connections.clear();
    this.peerUsernames.clear();
  }
}

export const p2pNetwork = new P2PNetwork();
