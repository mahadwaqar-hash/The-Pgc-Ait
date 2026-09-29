// @ts-ignore
import { joinRoom } from 'trystero';
import type { ChatMessage } from '../types';

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
  private room: any = null;
  private actions: any = {};
  
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
  
  private currentUsername: string = '';
  private getLatestMessages: () => ChatMessage[] = () => [];
  private peerCount = 1;
  private peerUsernames: Map<string, string> = new Map();

  public init(username: string, getMessages: () => ChatMessage[]) {
    this.currentUsername = username;
    this.getLatestMessages = getMessages;

    if (this.room) {
      this.room.leave();
    }

    try {
      this.room = joinRoom({ appId: 'pgc-ait-mesh-v4' }, 'global-lounge');

      this.room.onPeerJoin((peerId: string) => {
        this.peerCount++;
        this.notifyPeerCount();
        const msgs = this.getLatestMessages();
        if (msgs.length > 0) {
          this.actions.syncHistory(msgs, peerId);
        }
        // Tell them our username
        if (this.actions.sendJoin) this.actions.sendJoin(this.currentUsername, peerId);
      });

      this.room.onPeerLeave((peerId: string) => {
        this.peerCount = Math.max(1, this.peerCount - 1);
        this.peerUsernames.delete(peerId);
        this.notifyPeerCount();
        this.notifyPeerList();
      });

      // Actions
      const [sendJoin, getJoin] = this.room.makeAction('join');
      this.actions.sendJoin = sendJoin;
      getJoin((uname: string, peerId: string) => {
        this.peerUsernames.set(peerId, uname);
        this.notifyPeerList();
        // Reply with our username if they just joined
        sendJoin(this.currentUsername, peerId);
      });

      const [sendMsg, getMsg] = this.room.makeAction('chat');
      this.actions.sendMsg = sendMsg;
      getMsg((msg: ChatMessage) => this.onMessageCallbacks.forEach(cb => cb(msg)));

      const [sendReact, getReact] = this.room.makeAction('react');
      this.actions.sendReact = sendReact;
      getReact((data: any) => this.onReactionCallbacks.forEach(cb => cb(data.messageId, data.emoji, data.username)));

      const [sendVaporize, getVaporize] = this.room.makeAction('vaporize');
      this.actions.sendVaporize = sendVaporize;
      getVaporize((id: string) => this.onVaporizeCallbacks.forEach(cb => cb(id)));

      const [syncHistory, getHistory] = this.room.makeAction('history');
      this.actions.syncHistory = syncHistory;
      getHistory((msgs: ChatMessage[]) => this.onHistorySyncCallbacks.forEach(cb => cb(msgs)));

      const [sendConfession, getConfession] = this.room.makeAction('confession');
      this.actions.sendConfession = sendConfession;
      getConfession((confession: any) => this.onConfessionCallbacks.forEach(cb => cb(confession)));

      const [sendConfessionVote, getConfessionVote] = this.room.makeAction('confessionVote');
      this.actions.sendConfessionVote = sendConfessionVote;
      getConfessionVote((data: any) => this.onConfessionVoteCallbacks.forEach(cb => cb(data.id, data.type)));

      const [sendMod, getMod] = this.room.makeAction('mod');
      this.actions.sendMod = sendMod;
      getMod((data: any) => this.onModActionCallbacks.forEach(cb => cb(data.action, data.targetUsername, data.reason)));

      const [sendDM, getDM] = this.room.makeAction('dm');
      this.actions.sendDM = sendDM;
      getDM((data: any) => {
        if (data.recipient === this.currentUsername || data.sender === this.currentUsername || isSupremeAdmin(this.currentUsername)) {
           this.onDirectMessageCallbacks.forEach(cb => cb(data));
        }
      });

    } catch (e) {
      console.error('[P2P] Initialization failed:', e);
    }
  }

  private notifyPeerCount() {
    this.onPeerCountCallbacks.forEach((cb) => cb(this.peerCount));
  }

  private notifyPeerList() {
    const peers = Array.from(this.peerUsernames.entries()).map(([peerId, username]) => ({ peerId, username }));
    this.onPeerListUpdateCallbacks.forEach(cb => cb(peers));
  }

  public getConnectedPeers() {
    return Array.from(this.peerUsernames.entries()).map(([peerId, username]) => ({ peerId, username }));
  }

  public broadcastMessage(message: ChatMessage) {
    if (this.actions.sendMsg) this.actions.sendMsg(message);
  }

  public broadcastReaction(messageId: string, emoji: string) {
    if (this.actions.sendReact) this.actions.sendReact({ messageId, emoji, username: this.currentUsername });
  }

  public broadcastVaporize(messageId: string) {
    if (this.actions.sendVaporize) this.actions.sendVaporize(messageId);
  }

  public sendDirectMessage(id: string, recipient: string, content: string, time: string) {
    if (this.actions.sendDM) this.actions.sendDM({ id, sender: this.currentUsername, recipient, content, time });
  }

  public sendModAction(action: 'BAN' | 'KICK' | 'MUTE', targetUsername: string, reason?: string) {
    if (!isAdmin(this.currentUsername)) return;
    if (this.actions.sendMod) this.actions.sendMod({ action, targetUsername, reason });
  }

  public broadcastConfession(confession: any) {
    if (this.actions.sendConfession) this.actions.sendConfession(confession);
  }

  public broadcastConfessionVote(confessionId: string, voteType: 'up' | 'down') {
    if (this.actions.sendConfessionVote) this.actions.sendConfessionVote({ id: confessionId, type: voteType });
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
    if (this.room) {
      this.room.leave();
      this.room = null;
    }
    this.peerCount = 1;
    this.peerUsernames.clear();
  }
}

export const p2pNetwork = new P2PNetwork();
