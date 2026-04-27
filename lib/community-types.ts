export interface CommunityPost {
  id: string;
  username: string;
  content: string;
  timestamp: string;
  likes: string[];
  imageUrl?: string;
  addictionType?: "phone" | "vape" | "goon" | "other" | "all";
  comments: Array<{
    id: string;
    username: string;
    content: string;
    timestamp: string;
  }>;
}

export interface CommunityMessage {
  id: string;
  from: string;
  to: string;
  content: string;
  timestamp: string;
  read: boolean;
}
