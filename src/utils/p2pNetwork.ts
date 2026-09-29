import { initializeApp } from 'firebase/app';
import { 
  getDatabase, 
  ref, 
  onChildAdded, 
  onChildChanged,
  onChildRemoved,
  set, 
  onValue,
  remove,
  onDisconnect
} from 'firebase/database';
import type { ChatMessage } from '../types';

// TODO: Replace with your Firebase config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "API_KEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "PROJECT_ID.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "PROJECT_ID",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "PROJECT_ID.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "SENDER_ID",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

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
  private myPeerId: string = Math.random().toString(36).substring(2, 10);
  
  private onMessageCallbacks: ((msg: ChatMessage) => void)[] = [];
  private onReactionCallbacks: ((msgId: string, emoji: string, username: string) => void)[] = [];
  private onVaporizeCallbacks: ((msgId: string) => void)[] = [];
  private onPeerCountCallbacks: ((count: number) => void)[] = [];
  
  private onHistorySyncCallbacks: ((msgs: ChatMessage[]) => void)[] = [];
  private onModActionCallbacks: ((action: string, target: string, reason?: string) => void)[] = [];
  private onConfessionCallbacks: ((confession: any) => void)[] = [];
  private onConfessionVoteCallbacks: ((id: string, type: 'up' | 'down') => void)[] = [];
  private onDirectMessageCallbacks: ((msg: any) => void)[] = [];
  private onPeerListUpdateCallbacks: ((peers: {peerId: string, username: string}[]) => void)[] = [];

  private currentUsername: string = '';
  private initialized = false;

  public init(username: string, _getMessages: () => ChatMessage[] = () => []) {
    if (this.initialized) return;
    this.currentUsername = username;
    this.initialized = true;

    // Presence (Peer Counting)
    const myPresenceRef = ref(db, `presence/${this.myPeerId}`);
    set(myPresenceRef, { username: this.currentUsername, online: true });
    onDisconnect(myPresenceRef).remove();

    const presenceRef = ref(db, 'presence');
    onValue(presenceRef, (snapshot) => {
      const data = snapshot.val();
      const count = data ? Object.keys(data).length : 0;
      this.onPeerCountCallbacks.forEach(cb => cb(count));
      
      const peers: {peerId: string, username: string}[] = [];
      if (data) {
        Object.entries(data).forEach(([key, val]: [string, any]) => {
          if (val && val.username) {
            peers.push({ peerId: key, username: val.username });
          }
        });
      }
      this.onPeerListUpdateCallbacks.forEach(cb => cb(peers));
    });

    // Chat Messages
    const messagesRef = ref(db, 'messages');
    
    onChildAdded(messagesRef, (snapshot) => {
      const msg = snapshot.val() as ChatMessage;
      if (msg) {
        this.onMessageCallbacks.forEach(cb => cb(msg));
      }
    });

    onChildRemoved(messagesRef, (snapshot) => {
      const msg = snapshot.val() as ChatMessage;
      if (msg) {
        this.onVaporizeCallbacks.forEach(cb => cb(msg.id));
      }
    });

    // Reactions (Listen to changes on existing messages)
    onChildChanged(messagesRef, (snapshot) => {
       const msg = snapshot.val() as ChatMessage;
       if (msg && msg.reactions) {
         Object.entries(msg.reactions).forEach(([emoji, users]) => {
           if (Array.isArray(users)) {
             users.forEach(u => {
               this.onReactionCallbacks.forEach(cb => cb(msg.id, emoji, u));
             });
           }
         });
       }
    });
  }

  public broadcastMessage(message: ChatMessage) {
    const messagesRef = ref(db, `messages/${message.id}`);
    set(messagesRef, message);
  }

  public broadcastReaction(messageId: string, emoji: string) {
    const msgRef = ref(db, `messages/${messageId}/reactions/${emoji}`);
    onValue(msgRef, (snapshot) => {
      const users = snapshot.val() || [];
      if (!users.includes(this.currentUsername)) {
        set(msgRef, [...users, this.currentUsername]);
      }
    }, { onlyOnce: true });
  }

  public broadcastVaporize(messageId: string) {
    const msgRef = ref(db, `messages/${messageId}`);
    remove(msgRef);
  }

  public getConnectedPeers() {
    return [];
  }

  public destroy() {
    const myPresenceRef = ref(db, `presence/${this.myPeerId}`);
    remove(myPresenceRef);
  }

  // --- Callbacks ---
  public onNewMessage(callback: (msg: ChatMessage) => void) { this.onMessageCallbacks.push(callback); }
  public onReaction(callback: (msgId: string, emoji: string, username: string) => void) { this.onReactionCallbacks.push(callback); }
  public onVaporize(callback: (msgId: string) => void) { this.onVaporizeCallbacks.push(callback); }
  public onPeerCount(callback: (count: number) => void) { this.onPeerCountCallbacks.push(callback); }

  // --- Stubs for other unused features to satisfy TS ---
  public sendDirectMessage(_id: string, _recipient: string, _content: string, _time: string) {}
  public sendModAction(_action: 'BAN' | 'KICK' | 'MUTE', _targetUsername: string, _reason?: string) {}
  public broadcastConfession(_confession: any) {}
  public broadcastConfessionVote(_confessionId: string, _voteType: 'up' | 'down') {}
  
  public onHistorySync(callback: (msgs: ChatMessage[]) => void) { this.onHistorySyncCallbacks.push(callback); }
  public onModAction(callback: (action: string, target: string, reason?: string) => void) { this.onModActionCallbacks.push(callback); }
  public onConfession(callback: (confession: any) => void) { this.onConfessionCallbacks.push(callback); }
  public onConfessionVote(callback: (id: string, type: 'up' | 'down') => void) { this.onConfessionVoteCallbacks.push(callback); }
  public onDirectMessage(callback: (msg: any) => void) { this.onDirectMessageCallbacks.push(callback); }
  public onPeerListUpdate(callback: (peers: {peerId: string, username: string}[]) => void) { this.onPeerListUpdateCallbacks.push(callback); }
}

export const p2pNetwork = new P2PNetwork();
