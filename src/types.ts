export interface UserProfile {
  id: number;
  username: string;
  email: string;
  full_name: string;
  profile_picture: string;
  cover_image: string;
  bio: string;
  location: string;
  website: string;
  is_online: boolean;
  created_at: string;
  followers_count: number;
  following_count: number;
  posts_count: number;
  is_following: boolean;
  followers?: UserProfile[];
  following?: UserProfile[];
}

export interface CommentItem {
  id: number;
  post_id: number;
  user: UserProfile;
  parent_comment_id: number | null;
  content: string;
  likes_count: number;
  is_liked: boolean;
  replies: CommentItem[];
  created_at: string;
  updated_at: string;
}

export interface PostItem {
  id: number;
  user: UserProfile;
  content: string;
  image: string;
  images: string[];
  location: string;
  hashtags: string[];
  mentions: string[];
  shares_count: number;
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
  is_bookmarked: boolean;
  comments: CommentItem[];
  created_at: string;
  updated_at: string;
}

export interface NotificationItem {
  id: number;
  recipient_id: number;
  sender: UserProfile;
  notification_type: 'follow' | 'like' | 'comment' | 'reply' | 'mention';
  post_id: number | null;
  post_preview: string;
  comment_id: number | null;
  is_read: boolean;
  created_at: string;
}

export interface MessageItem {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  attachment: string;
  is_read: boolean;
  created_at: string;
}

export interface StoryItem {
  id: number;
  user_id: number;
  user: UserProfile;
  media: string;
  caption: string;
  created_at: string;
  expires_at: string;
  is_viewed: boolean;
}

export interface SearchResults {
  users: UserProfile[];
  posts: PostItem[];
  hashtags: { tag: string; count: number }[];
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  description?: string;
}

export type ActiveView =
  | 'home'
  | 'explore'
  | 'notifications'
  | 'messages'
  | 'bookmarks'
  | 'profile'
  | 'settings'
  | 'architecture';
