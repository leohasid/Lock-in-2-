import type { CommunityMessage, CommunityPost } from "@/lib/community-types";

type Store = {
  posts: CommunityPost[];
  messages: CommunityMessage[];
  usernames: Set<string>;
};

function createStore(): Store {
  return {
    posts: [],
    messages: [],
    usernames: new Set<string>(),
  };
}

// Survive hot reloads in dev; on serverless, still better than per-request empty array for warm instances
const globalStore = globalThis as unknown as { __mogifiCommunityStore?: Store };

export function getCommunityStore(): Store {
  if (!globalStore.__mogifiCommunityStore) {
    globalStore.__mogifiCommunityStore = createStore();
  }
  return globalStore.__mogifiCommunityStore;
}

function normUser(u: string) {
  return u.trim().toLowerCase();
}

export function isUsernameAvailable(username: string): boolean {
  const s = getCommunityStore();
  return !s.usernames.has(normUser(username));
}

export function registerUsername(username: string): { ok: true } | { ok: false; error: string } {
  const u = username.trim();
  if (u.length < 3) return { ok: false, error: "Username must be at least 3 characters" };
  const s = getCommunityStore();
  const key = normUser(u);
  if (s.usernames.has(key)) return { ok: false, error: "Username already taken" };
  s.usernames.add(key);
  return { ok: true };
}

export function addPost(post: CommunityPost) {
  getCommunityStore().posts.unshift(post);
}

export function toggleLikePost(postId: string, username: string): CommunityPost | null {
  const s = getCommunityStore();
  const post = s.posts.find((p) => p.id === postId);
  if (!post) return null;
  const u = normUser(username);
  if (post.likes.some((x) => normUser(x) === u)) {
    post.likes = post.likes.filter((x) => normUser(x) !== u);
  } else {
    post.likes = [...post.likes, username];
  }
  return post;
}

export function addComment(
  postId: string,
  comment: { id: string; username: string; content: string; timestamp: string }
): CommunityPost | null {
  const s = getCommunityStore();
  const post = s.posts.find((p) => p.id === postId);
  if (!post) return null;
  post.comments = [...post.comments, comment];
  return post;
}

export function addMessage(m: CommunityMessage) {
  getCommunityStore().messages.unshift(m);
}

export function markMessagesRead(from: string, to: string) {
  const s = getCommunityStore();
  s.messages = s.messages.map((msg) => {
    if (msg.from === from && msg.to === to && !msg.read) {
      return { ...msg, read: true };
    }
    return msg;
  });
}
