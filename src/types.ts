export interface ChatMessage {
  id: string;
  sender: string;
  avatarSeed: string;
  room: string;
  content: string;
  createdAt: number;
  durationMs: number;
  isBurnOnRead?: boolean;
  reactions: { [emoji: string]: string[] }; // array of usernames who reacted
}

export interface Confession {
  id: string;
  tag: string;
  text: string;
  author: string;
  avatarSeed: string;
  createdAt: number;
  expiresInHours: number;
  upvotes: number;
  downvotes: number;
}
