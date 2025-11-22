"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { ArrowLeft, Send, Heart, MessageCircle, Plus, X, Search } from "lucide-react";

interface Post {
  id: string;
  username: string;
  content: string;
  timestamp: string;
  likes: string[];
  comments: Array<{
    id: string;
    username: string;
    content: string;
    timestamp: string;
  }>;
}

interface Message {
  id: string;
  from: string;
  to: string;
  content: string;
  timestamp: string;
  read: boolean;
}

interface User {
  username: string;
  createdAt: string;
}

export default function SupportPage() {
  const [activeTab, setActiveTab] = useState<"feed" | "messages">("feed");
  const [posts, setPosts] = useState<Post[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showPostForm, setShowPostForm] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [newPostContent, setNewPostContent] = useState("");
  const [newMessageContent, setNewMessageContent] = useState("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // Load current user
    const userStr = localStorage.getItem("currentUser");
    if (userStr) {
      setCurrentUser(JSON.parse(userStr));
    }

    // Load posts
    const storedPosts = localStorage.getItem("communityPosts");
    if (storedPosts) {
      setPosts(JSON.parse(storedPosts));
    }

    // Load messages
    const storedMessages = localStorage.getItem("communityMessages");
    if (storedMessages) {
      setMessages(JSON.parse(storedMessages));
    }
  }, []);

  const savePosts = (updatedPosts: Post[]) => {
    localStorage.setItem("communityPosts", JSON.stringify(updatedPosts));
    setPosts(updatedPosts);
  };

  const saveMessages = (updatedMessages: Message[]) => {
    localStorage.setItem("communityMessages", JSON.stringify(updatedMessages));
    setMessages(updatedMessages);
  };

  const handleCreatePost = () => {
    if (!newPostContent.trim() || !currentUser) return;

    const newPost: Post = {
      id: `post-${Date.now()}`,
      username: currentUser.username,
      content: newPostContent.trim(),
      timestamp: new Date().toISOString(),
      likes: [],
      comments: [],
    };

    const updatedPosts = [newPost, ...posts];
    savePosts(updatedPosts);
    setNewPostContent("");
    setShowPostForm(false);
  };

  const handleLikePost = (postId: string) => {
    if (!currentUser) return;

    const updatedPosts = posts.map((post) => {
      if (post.id === postId) {
        const isLiked = post.likes.includes(currentUser.username);
        return {
          ...post,
          likes: isLiked
            ? post.likes.filter((u) => u !== currentUser.username)
            : [...post.likes, currentUser.username],
        };
      }
      return post;
    });

    savePosts(updatedPosts);
  };

  const handleAddComment = (postId: string, content: string) => {
    if (!content.trim() || !currentUser) return;

    const updatedPosts = posts.map((post) => {
      if (post.id === postId) {
        return {
          ...post,
          comments: [
            ...post.comments,
            {
              id: `comment-${Date.now()}`,
              username: currentUser.username,
              content: content.trim(),
              timestamp: new Date().toISOString(),
            },
          ],
        };
      }
      return post;
    });

    savePosts(updatedPosts);
  };

  const handleSendMessage = (to: string) => {
    if (!newMessageContent.trim() || !currentUser) return;

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      from: currentUser.username,
      to,
      content: newMessageContent.trim(),
      timestamp: new Date().toISOString(),
      read: false,
    };

    const updatedMessages = [newMessage, ...messages];
    saveMessages(updatedMessages);
    setNewMessageContent("");
  };

  const getConversations = () => {
    if (!currentUser) return [];
    
    const conversations = new Map<string, { user: string; lastMessage: Message; unread: number }>();
    
    messages.forEach((msg) => {
      const otherUser = msg.from === currentUser.username ? msg.to : msg.from;
      const existing = conversations.get(otherUser);
      
      if (!existing || new Date(msg.timestamp) > new Date(existing.lastMessage.timestamp)) {
        const unread = msg.to === currentUser.username && !msg.read ? 1 : 0;
        conversations.set(otherUser, {
          user: otherUser,
          lastMessage: msg,
          unread: existing ? existing.unread + unread : unread,
        });
      } else if (msg.to === currentUser.username && !msg.read) {
        const existing = conversations.get(otherUser);
        if (existing) {
          existing.unread += 1;
        }
      }
    });

    return Array.from(conversations.values()).sort(
      (a, b) => new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime()
    );
  };

  const getMessagesWithUser = (username: string) => {
    if (!currentUser) return [];
    return messages
      .filter((msg) => (msg.from === currentUser.username && msg.to === username) || (msg.from === username && msg.to === currentUser.username))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  };

  const markMessagesAsRead = (username: string) => {
    if (!currentUser) return;
    
    const updatedMessages = messages.map((msg) => {
      if (msg.from === username && msg.to === currentUser.username && !msg.read) {
        return { ...msg, read: true };
      }
      return msg;
    });

    saveMessages(updatedMessages);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const filteredPosts = posts.filter((post) =>
    post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Please complete onboarding to access the community</p>
          <Link href="/onboarding" className="text-orange-400 hover:text-orange-300">
            Go to Onboarding
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <Link href="/addictions" className="text-orange-400 hover:text-orange-300 mb-2 inline-block flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Addictions
          </Link>
          <h1 className="text-3xl font-bold text-white">💬 Support Community</h1>
          <p className="text-gray-400 mt-1">Share your journey and support others</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-800">
          <button
            onClick={() => setActiveTab("feed")}
            className={`px-4 py-2 font-semibold transition-colors ${
              activeTab === "feed"
                ? "text-orange-400 border-b-2 border-orange-400"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Feed
          </button>
          <button
            onClick={() => setActiveTab("messages")}
            className={`px-4 py-2 font-semibold transition-colors relative ${
              activeTab === "messages"
                ? "text-orange-400 border-b-2 border-orange-400"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Messages
            {getConversations().some((c) => c.unread > 0) && (
              <span className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {getConversations().reduce((sum, c) => sum + c.unread, 0)}
              </span>
            )}
          </button>
        </div>

        {/* Feed Tab */}
        {activeTab === "feed" && (
          <>
            {/* Search */}
            <div className="mb-4 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-10 pr-4 py-2 text-white focus:border-orange-500 focus:outline-none"
              />
            </div>

            {/* Create Post Button */}
            <button
              onClick={() => setShowPostForm(true)}
              className="w-full mb-6 bg-orange-500 hover:bg-orange-600 text-black px-4 py-3 rounded-lg flex items-center justify-center gap-2 font-semibold transition-colors"
            >
              <Plus className="w-5 h-5" />
              Share Your Journey
            </button>

            {/* Posts Feed */}
            <div className="space-y-4 mb-20">
              {filteredPosts.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-lg mb-2">No posts yet</p>
                  <p className="text-sm">Be the first to share your journey!</p>
                </div>
              ) : (
                filteredPosts.map((post) => (
                  <div key={post.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-white">@{post.username}</p>
                        <p className="text-xs text-gray-400">{formatTime(post.timestamp)}</p>
                      </div>
                    </div>
                    <p className="text-gray-300 mb-4 whitespace-pre-wrap">{post.content}</p>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-4 mb-3">
                      <button
                        onClick={() => handleLikePost(post.id)}
                        className={`flex items-center gap-2 ${post.likes.includes(currentUser.username) ? "text-red-400" : "text-gray-400 hover:text-red-400"}`}
                      >
                        <Heart className={`w-5 h-5 ${post.likes.includes(currentUser.username) ? "fill-current" : ""}`} />
                        <span>{post.likes.length}</span>
                      </button>
                      <div className="flex items-center gap-2 text-gray-400">
                        <MessageCircle className="w-5 h-5" />
                        <span>{post.comments.length}</span>
                      </div>
                    </div>

                    {/* Comments */}
                    {post.comments.length > 0 && (
                      <div className="border-t border-gray-800 pt-3 mt-3 space-y-2">
                        {post.comments.map((comment) => (
                          <div key={comment.id} className="text-sm">
                            <span className="font-semibold text-white">@{comment.username}</span>
                            <span className="text-gray-300 ml-2">{comment.content}</span>
                            <span className="text-gray-500 text-xs ml-2">{formatTime(comment.timestamp)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Comment */}
                    <CommentForm postId={post.id} onAddComment={handleAddComment} />
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* Messages Tab */}
        {activeTab === "messages" && (
          <>
            {!showMessages ? (
              <div className="space-y-2 mb-20">
                {getConversations().length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <p className="text-lg mb-2">No messages yet</p>
                    <p className="text-sm">Start a conversation with someone from the community!</p>
                  </div>
                ) : (
                  getConversations().map((conv) => (
                    <button
                      key={conv.user}
                      onClick={() => {
                        setSelectedUser(conv.user);
                        setShowMessages(true);
                        markMessagesAsRead(conv.user);
                      }}
                      className="w-full bg-gray-900 border border-gray-800 rounded-xl p-4 text-left hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-white">@{conv.user}</p>
                            {conv.unread > 0 && (
                              <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                                {conv.unread}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-400 mt-1 truncate">{conv.lastMessage.content}</p>
                          <p className="text-xs text-gray-500 mt-1">{formatTime(conv.lastMessage.timestamp)}</p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            ) : selectedUser ? (
              <MessageView
                user={selectedUser}
                messages={getMessagesWithUser(selectedUser)}
                onSendMessage={handleSendMessage}
                onBack={() => {
                  setShowMessages(false);
                  setSelectedUser(null);
                }}
                currentUser={currentUser.username}
                newMessageContent={newMessageContent}
                setNewMessageContent={setNewMessageContent}
              />
            ) : null}
          </>
        )}

        {/* Create Post Modal */}
        {showPostForm && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-2xl p-6 max-w-md w-full border border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Share Your Journey</h2>
                <button
                  onClick={() => {
                    setShowPostForm(false);
                    setNewPostContent("");
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="Share your progress, ask for advice, or motivate others..."
                className="w-full bg-gray-800 text-white p-4 rounded-lg border border-gray-700 focus:border-orange-500 focus:outline-none min-h-[150px] resize-none"
                maxLength={500}
              />
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-gray-400">{newPostContent.length}/500</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowPostForm(false);
                      setNewPostContent("");
                    }}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreatePost}
                    disabled={!newPostContent.trim()}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-black rounded-lg transition-colors font-semibold"
                  >
                    Post
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

function CommentForm({ postId, onAddComment }: { postId: string; onAddComment: (postId: string, content: string) => void }) {
  const [comment, setComment] = useState("");

  return (
    <div className="flex gap-2 mt-3">
      <input
        type="text"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        onKeyPress={(e) => {
          if (e.key === "Enter" && comment.trim()) {
            onAddComment(postId, comment);
            setComment("");
          }
        }}
        placeholder="Add a comment..."
        className="flex-1 bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-orange-500 focus:outline-none text-sm"
      />
      <button
        onClick={() => {
          if (comment.trim()) {
            onAddComment(postId, comment);
            setComment("");
          }
        }}
        className="bg-orange-500 hover:bg-orange-600 text-black px-4 py-2 rounded-lg transition-colors"
      >
        <Send className="w-4 h-4" />
      </button>
    </div>
  );
}

function MessageView({
  user,
  messages,
  onSendMessage,
  onBack,
  currentUser,
  newMessageContent,
  setNewMessageContent,
}: {
  user: string;
  messages: Message[];
  onSendMessage: (to: string) => void;
  onBack: () => void;
  currentUser: string;
  newMessageContent: string;
  setNewMessageContent: (content: string) => void;
}) {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] mb-20">
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-800">
        <button onClick={onBack} className="text-gray-400 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <p className="font-semibold text-white">@{user}</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.from === currentUser ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-3 ${
                msg.from === currentUser
                  ? "bg-orange-500 text-black"
                  : "bg-gray-800 text-white"
              }`}
            >
              <p className="text-sm">{msg.content}</p>
              <p className={`text-xs mt-1 ${msg.from === currentUser ? "text-black/70" : "text-gray-400"}`}>
                {formatTime(msg.timestamp)}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 border-t border-gray-800 pt-4">
        <input
          type="text"
          value={newMessageContent}
          onChange={(e) => setNewMessageContent(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === "Enter" && newMessageContent.trim()) {
              onSendMessage(user);
            }
          }}
          placeholder="Type a message..."
          className="flex-1 bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-orange-500 focus:outline-none"
        />
        <button
          onClick={() => onSendMessage(user)}
          disabled={!newMessageContent.trim()}
          className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-black px-4 py-2 rounded-lg transition-colors"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

