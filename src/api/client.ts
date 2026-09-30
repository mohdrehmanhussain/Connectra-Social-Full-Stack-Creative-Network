import {
  MessageItem,
  NotificationItem,
  PostItem,
  SearchResults,
  StoryItem,
  UserProfile,
} from '../types';

const TOKEN_STORAGE_KEY = 'aether_auth_token';
const USER_ID_STORAGE_KEY = 'aether_user_id';

export function getStoredToken(): string {
  return localStorage.getItem(TOKEN_STORAGE_KEY) || '';
}

export function getStoredUserId(): number {
  const val = localStorage.getItem(USER_ID_STORAGE_KEY);
  return val ? Number(val) : 1;
}

export function setAuthSession(token: string, userId: number): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
  localStorage.setItem(USER_ID_STORAGE_KEY, String(userId));
}

export function clearAuthSession(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_ID_STORAGE_KEY);
}

async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const userId = getStoredUserId();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-user-id': String(userId),
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Token ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || data.detail || `Request failed with status ${response.status}`);
  }
  return data as T;
}

export const apiClient = {
  login: (username: string, password: string) =>
    apiFetch<{ token: string; user: UserProfile }>('/api/login/', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  register: (payload: {
    full_name: string;
    username: string;
    email: string;
    password: string;
    profile_picture?: string;
    bio?: string;
    location?: string;
    website?: string;
  }) =>
    apiFetch<{ token: string; user: UserProfile }>('/api/register/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  logout: () =>
    apiFetch<{ message: string }>('/api/logout/', {
      method: 'POST',
    }),

  forgotPassword: (email: string, new_password?: string) =>
    apiFetch<{ message: string }>('/api/forgot-password/', {
      method: 'POST',
      body: JSON.stringify({ email, new_password }),
    }),

  getUsers: () => apiFetch<UserProfile[]>('/api/users/'),

  getUserDetail: (id: number) => apiFetch<UserProfile>(`/api/users/${id}/`),

  updateProfile: (payload: Partial<UserProfile>) =>
    apiFetch<UserProfile>('/api/profile/', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  getPosts: (params?: { filter?: string; user_id?: number; hashtag?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.filter) searchParams.set('filter', params.filter);
    if (params?.user_id) searchParams.set('user_id', String(params.user_id));
    if (params?.hashtag) searchParams.set('hashtag', params.hashtag);
    const qs = searchParams.toString();
    return apiFetch<PostItem[]>(`/api/posts/${qs ? `?${qs}` : ''}`);
  },

  createPost: (payload: {
    content: string;
    images: string[];
    location?: string;
  }) =>
    apiFetch<PostItem>('/api/posts/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updatePost: (
    postId: number,
    payload: { content: string; location?: string; images?: string[] }
  ) =>
    apiFetch<PostItem>(`/api/posts/${postId}/`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deletePost: (postId: number) =>
    apiFetch<{ message: string }>(`/api/posts/${postId}/`, {
      method: 'DELETE',
    }),

  togglePostLike: (postId: number) =>
    apiFetch<{ is_liked: boolean; likes_count: number }>(`/api/posts/${postId}/like/`, {
      method: 'POST',
    }),

  sharePost: (postId: number) =>
    apiFetch<{ shares_count: number }>(`/api/posts/${postId}/share/`, {
      method: 'POST',
    }),

  addComment: (postId: number, content: string, parent_comment_id: number | null = null) =>
    apiFetch<PostItem>(`/api/posts/${postId}/comment/`, {
      method: 'POST',
      body: JSON.stringify({ content, parent_comment_id }),
    }),

  editComment: (commentId: number, content: string) =>
    apiFetch<PostItem>(`/api/comments/${commentId}/`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    }),

  deleteComment: (commentId: number) =>
    apiFetch<PostItem>(`/api/comments/${commentId}/`, {
      method: 'DELETE',
    }),

  toggleCommentLike: (commentId: number) =>
    apiFetch<PostItem>(`/api/comments/${commentId}/like/`, {
      method: 'POST',
    }),

  followUser: (userId: number) =>
    apiFetch<UserProfile>(`/api/users/${userId}/follow/`, {
      method: 'POST',
    }),

  unfollowUser: (userId: number) =>
    apiFetch<UserProfile>(`/api/users/${userId}/unfollow/`, {
      method: 'POST',
    }),

  getNotifications: () => apiFetch<NotificationItem[]>('/api/notifications/'),

  markNotificationRead: (id: number) =>
    apiFetch<{ success: boolean }>('/api/notifications/mark-read/', {
      method: 'POST',
      body: JSON.stringify({ id }),
    }),

  markAllNotificationsRead: () =>
    apiFetch<{ success: boolean }>('/api/notifications/mark-all-read/', {
      method: 'POST',
    }),

  getBookmarks: () => apiFetch<PostItem[]>('/api/bookmarks/'),

  toggleBookmark: (postId: number) =>
    apiFetch<{ is_bookmarked: boolean; post_id: number }>('/api/bookmarks/', {
      method: 'POST',
      body: JSON.stringify({ post_id: postId }),
    }),

  getMessages: (partnerId?: number) =>
    apiFetch<MessageItem[]>(
      `/api/messages/${partnerId ? `?user_id=${partnerId}` : ''}`
    ),

  sendMessage: (receiver_id: number, content: string, attachment = '') =>
    apiFetch<MessageItem>('/api/messages/', {
      method: 'POST',
      body: JSON.stringify({ receiver_id, content, attachment }),
    }),

  getStories: () => apiFetch<StoryItem[]>('/api/stories/'),

  createStory: (media: string, caption: string) =>
    apiFetch<StoryItem>('/api/stories/', {
      method: 'POST',
      body: JSON.stringify({ media, caption }),
    }),

  markStoryViewed: (storyId: number) =>
    apiFetch<{ success: boolean }>(`/api/stories/${storyId}/view/`, {
      method: 'POST',
    }),

  search: (query: string) =>
    apiFetch<SearchResults>(`/api/search/?q=${encodeURIComponent(query)}`),

  getProjectFiles: () => apiFetch<Record<string, string>>('/api/project-files/'),
};
