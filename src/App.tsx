import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  apiClient,
  clearAuthSession,
  getStoredUserId,
  setAuthSession,
} from './api/client';
import { ArchitectureView } from './components/ArchitectureView';
import { AuthPortal } from './components/AuthPortal';
import { MessagesView } from './components/MessagesView';
import {
  ConfirmDialogModal,
  CreateStoryModal,
  EditPostModal,
  EditProfileModal,
  FollowListModal,
  handleFileToDataUrl,
  PRESET_MEDIA_GALLERY,
  StoryViewerModal,
} from './components/Modals';
import { PostCard } from './components/PostCard';
import {
  formatRelativeTime,
  ResilientImage,
  UserAvatar,
} from './components/ResilientMedia';
import {
  ActiveView,
  MessageItem,
  NotificationItem,
  PostItem,
  SearchResults,
  StoryItem,
  ToastMessage,
  UserProfile,
} from './types';
import { downloadCompleteProjectZip } from './utils/zipBuilder';

export default function App() {
  // Theme state (persisted in localStorage)
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('aether_theme') === 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('aether_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('aether_theme', 'light');
    }
  }, [darkMode]);

  // Auth & Current User state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('aether_logged_out') !== 'true';
  });
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

  // Navigation & View state
  const [activeView, setActiveView] = useState<ActiveView>('home');
  const [selectedProfileId, setSelectedProfileId] = useState<number>(1);
  const [profileDetail, setProfileDetail] = useState<UserProfile | null>(null);
  const [profileTab, setProfileTab] = useState<'posts' | 'media' | 'liked'>('posts');

  // Feed & Posts state
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [feedFilter, setFeedFilter] = useState<'all' | 'following' | 'popular'>('all');
  const [activeHashtag, setActiveHashtag] = useState<string | null>(null);
  const [visiblePostCount, setVisiblePostCount] = useState<number>(8);
  const [loadingPosts, setLoadingPosts] = useState<boolean>(true);

  // Post Composer state
  const [composerText, setComposerText] = useState('');
  const [composerLocation, setComposerLocation] = useState('');
  const [composerImages, setComposerImages] = useState<string[]>([]);
  const [showStudioPicker, setShowStudioPicker] = useState(false);
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [publishingPost, setPublishingPost] = useState(false);

  // Stories, Notifications, Messages, Bookmarks
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [bookmarkedPosts, setBookmarkedPosts] = useState<PostItem[]>([]);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResults>({
    users: [],
    posts: [],
    hashtags: [],
  });
  const [searchFocused, setSearchFocused] = useState(false);

  // Modals state
  const [storyViewerIndex, setStoryViewerIndex] = useState<number | null>(null);
  const [showCreateStoryModal, setShowCreateStoryModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editingPost, setEditingPost] = useState<PostItem | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<number | null>(null);
  const [followModalState, setFollowModalState] = useState<{
    title: string;
    users: UserProfile[];
  } | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{
    src: string;
    caption: string;
  } | null>(null);

  // Toast Notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback(
    (type: 'success' | 'error' | 'info', title: string, description?: string) => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, type, title, description }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3600);
    },
    []
  );

  // Load core data from backend
  const fetchCoreData = useCallback(async () => {
    try {
      const userId = getStoredUserId();
      const [usersData, storiesData, notifsData, msgsData, bookmarksData, searchInit] =
        await Promise.all([
          apiClient.getUsers(),
          apiClient.getStories(),
          apiClient.getNotifications(),
          apiClient.getMessages(),
          apiClient.getBookmarks(),
          apiClient.search(''),
        ]);

      setAllUsers(usersData);
      const me = usersData.find((u) => u.id === userId) || usersData[0];
      if (me) {
        setCurrentUser(me);
      }
      setStories(storiesData);
      setNotifications(notifsData);
      setMessages(msgsData);
      setBookmarkedPosts(bookmarksData);
      setSearchResults(searchInit);
    } catch (err: any) {
      console.error('Error loading initial data:', err);
    }
  }, []);

  const fetchPosts = useCallback(async () => {
    setLoadingPosts(true);
    try {
      const data = await apiClient.getPosts({
        filter: feedFilter,
        hashtag: activeHashtag || undefined,
      });
      setPosts(data);
    } catch (err: any) {
      addToast('error', 'Failed to load feed', err.message);
    } finally {
      setLoadingPosts(false);
    }
  }, [feedFilter, activeHashtag, addToast]);

  useEffect(() => {
    fetchCoreData();
  }, [fetchCoreData]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchPosts();
    }
  }, [isAuthenticated, fetchPosts]);

  // Load profile detail when viewing a profile
  const loadProfileDetail = useCallback(async (uid: number) => {
    try {
      const detail = await apiClient.getUserDetail(uid);
      setProfileDetail(detail);
    } catch (err: any) {
      addToast('error', 'User not found', err.message);
    }
  }, [addToast]);

  useEffect(() => {
    if (activeView === 'profile' && selectedProfileId) {
      loadProfileDetail(selectedProfileId);
    }
  }, [activeView, selectedProfileId, loadProfileDetail]);

  // Live real-time search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      apiClient
        .search(searchQuery)
        .then((res) => setSearchResults(res))
        .catch(() => {});
    }, 140);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Auth Handlers
  const handleLogin = async (username: string, password: string) => {
    try {
      const res = await apiClient.login(username, password);
      setAuthSession(res.token, res.user.id);
      localStorage.removeItem('aether_logged_out');
      setCurrentUser(res.user);
      setSelectedProfileId(res.user.id);
      setIsAuthenticated(true);
      await fetchCoreData();
      await fetchPosts();
      addToast('success', `Welcome back, ${res.user.full_name}`, `Signed in as @${res.user.username}`);
    } catch (err: any) {
      addToast('error', 'Sign in failed', err.message);
      throw err;
    }
  };

  const handleRegister = async (payload: {
    full_name: string;
    username: string;
    email: string;
    password: string;
    profile_picture?: string;
    bio?: string;
    location?: string;
    website?: string;
  }) => {
    try {
      const res = await apiClient.register(payload);
      setAuthSession(res.token, res.user.id);
      localStorage.removeItem('aether_logged_out');
      setCurrentUser(res.user);
      setSelectedProfileId(res.user.id);
      setIsAuthenticated(true);
      await fetchCoreData();
      await fetchPosts();
      addToast('success', 'Account created!', `Welcome to Connectra, @${res.user.username}`);
    } catch (err: any) {
      addToast('error', 'Registration failed', err.message);
      throw err;
    }
  };

  const handleForgotPassword = async (email: string, newPassword?: string) => {
    try {
      const res = await apiClient.forgotPassword(email, newPassword);
      addToast('success', 'Password Recovery', res.message);
    } catch (err: any) {
      addToast('error', 'Recovery failed', err.message);
      throw err;
    }
  };

  const handleLogout = async () => {
    try {
      await apiClient.logout();
    } catch {}
    clearAuthSession();
    localStorage.setItem('aether_logged_out', 'true');
    setIsAuthenticated(false);
    addToast('info', 'Signed out', 'You have logged out of your session.');
  };

  // Switch active user quickly for college demo
  const handleSwitchDemoUser = async (user: UserProfile) => {
    setAuthSession(`user-token-${user.id}`, user.id);
    localStorage.removeItem('aether_logged_out');
    setCurrentUser(user);
    await fetchCoreData();
    await fetchPosts();
    if (activeView === 'profile') {
      loadProfileDetail(selectedProfileId);
    }
    addToast('info', `Switched account`, `Now browsing as ${user.full_name} (@${user.username})`);
  };

  // Navigation helper to open a user's profile
  const openUserProfile = (userId: number) => {
    setSelectedProfileId(userId);
    setProfileTab('posts');
    setActiveView('profile');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openMentionProfile = (username: string) => {
    const found = allUsers.find((u) => u.username.toLowerCase() === username.toLowerCase());
    if (found) {
      openUserProfile(found.id);
    } else {
      addToast('error', 'User not found', `No user registered with @${username}`);
    }
  };

  const handleHashtagFilter = (tag: string) => {
    setActiveHashtag(tag.toLowerCase());
    setActiveView('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Create Post handler
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composerText.trim() && composerImages.length === 0) {
      addToast('error', 'Empty post', 'Write something or upload at least one image before posting.');
      return;
    }
    setPublishingPost(true);
    try {
      const created = await apiClient.createPost({
        content: composerText.trim(),
        images: composerImages,
        location: composerLocation.trim(),
      });
      setPosts((prev) => [created, ...prev]);
      setComposerText('');
      setComposerLocation('');
      setComposerImages([]);
      setShowStudioPicker(false);
      setShowLocationInput(false);
      await fetchCoreData();
      addToast('success', 'Post published', 'Your dispatch is live on the feed.');
    } catch (err: any) {
      addToast('error', 'Failed to publish post', err.message);
    } finally {
      setPublishingPost(false);
    }
  };

  const handleComposerImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = Array.from(e.target.files || []);
    if (files.length === 0) return;
    try {
      const urls = await Promise.all(files.map((f) => handleFileToDataUrl(f)));
      setComposerImages((prev) => [...prev, ...urls]);
    } catch (err: any) {
      addToast('error', 'Invalid image', err.message);
    }
  };

  // Post Interactions
  const handleToggleLike = async (postId: number) => {
    try {
      const res = await apiClient.togglePostLike(postId);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, is_liked: res.is_liked, likes_count: res.likes_count } : p
        )
      );
      setBookmarkedPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, is_liked: res.is_liked, likes_count: res.likes_count } : p
        )
      );
    } catch (err: any) {
      addToast('error', 'Action failed', err.message);
    }
  };

  const handleToggleBookmark = async (postId: number) => {
    try {
      const res = await apiClient.toggleBookmark(postId);
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, is_bookmarked: res.is_bookmarked } : p))
      );
      const updatedBookmarks = await apiClient.getBookmarks();
      setBookmarkedPosts(updatedBookmarks);
      addToast(
        'info',
        res.is_bookmarked ? 'Saved to Bookmarks' : 'Removed from Bookmarks'
      );
    } catch (err: any) {
      addToast('error', 'Bookmark failed', err.message);
    }
  };

  const handleSharePost = async (postId: number) => {
    try {
      const res = await apiClient.sharePost(postId);
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, shares_count: res.shares_count } : p))
      );
      navigator.clipboard?.writeText(`${window.location.origin}/?post=${postId}`);
      addToast('success', 'Link copied to clipboard', 'Post share counter updated.');
    } catch (err: any) {
      addToast('error', 'Share failed', err.message);
    }
  };

  const handleUpdatePost = async (
    postId: number,
    payload: { content: string; location: string; images: string[] }
  ) => {
    try {
      const updated = await apiClient.updatePost(postId, payload);
      setPosts((prev) => prev.map((p) => (p.id === postId ? updated : p)));
      setBookmarkedPosts((prev) => prev.map((p) => (p.id === postId ? updated : p)));
      addToast('success', 'Post updated');
    } catch (err: any) {
      addToast('error', 'Update failed', err.message);
    }
  };

  const handleConfirmDeletePost = async () => {
    if (!deletingPostId) return;
    try {
      await apiClient.deletePost(deletingPostId);
      setPosts((prev) => prev.filter((p) => p.id !== deletingPostId));
      setBookmarkedPosts((prev) => prev.filter((p) => p.id !== deletingPostId));
      setDeletingPostId(null);
      await fetchCoreData();
      addToast('info', 'Post deleted');
    } catch (err: any) {
      addToast('error', 'Delete failed', err.message);
    }
  };

  // Comment handlers
  const handleAddComment = async (
    postId: number,
    content: string,
    parentCommentId: number | null
  ) => {
    try {
      const updatedPost = await apiClient.addComment(postId, content, parentCommentId);
      setPosts((prev) => prev.map((p) => (p.id === postId ? updatedPost : p)));
      setBookmarkedPosts((prev) => prev.map((p) => (p.id === postId ? updatedPost : p)));
    } catch (err: any) {
      addToast('error', 'Comment failed', err.message);
    }
  };

  const handleEditComment = async (commentId: number, content: string) => {
    try {
      const updatedPost = await apiClient.editComment(commentId, content);
      setPosts((prev) => prev.map((p) => (p.id === updatedPost.id ? updatedPost : p)));
      addToast('success', 'Comment updated');
    } catch (err: any) {
      addToast('error', 'Failed to edit comment', err.message);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      const updatedPost = await apiClient.deleteComment(commentId);
      setPosts((prev) => prev.map((p) => (p.id === updatedPost.id ? updatedPost : p)));
      addToast('info', 'Comment deleted');
    } catch (err: any) {
      addToast('error', 'Failed to delete comment', err.message);
    }
  };

  const handleToggleCommentLike = async (commentId: number) => {
    try {
      const updatedPost = await apiClient.toggleCommentLike(commentId);
      setPosts((prev) => prev.map((p) => (p.id === updatedPost.id ? updatedPost : p)));
    } catch (err: any) {
      addToast('error', 'Action failed', err.message);
    }
  };

  // Follow / Unfollow handler
  const handleToggleFollow = async (targetUser: UserProfile) => {
    if (!currentUser) return;
    if (targetUser.id === currentUser.id) {
      addToast('error', 'Invalid action', 'You cannot follow yourself.');
      return;
    }
    try {
      const updatedTarget = targetUser.is_following
        ? await apiClient.unfollowUser(targetUser.id)
        : await apiClient.followUser(targetUser.id);

      setAllUsers((prev) => prev.map((u) => (u.id === updatedTarget.id ? updatedTarget : u)));
      if (profileDetail && profileDetail.id === updatedTarget.id) {
        loadProfileDetail(updatedTarget.id);
      }
      await fetchCoreData();
      addToast(
        'success',
        updatedTarget.is_following
          ? `Following ${updatedTarget.full_name}`
          : `Unfollowed ${updatedTarget.full_name}`
      );
    } catch (err: any) {
      addToast('error', 'Follow action failed', err.message);
    }
  };

  // Profile Update
  const handleSaveProfile = async (payload: Partial<UserProfile>) => {
    try {
      const updated = await apiClient.updateProfile(payload);
      setCurrentUser(updated);
      setAllUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      if (profileDetail && profileDetail.id === updated.id) {
        loadProfileDetail(updated.id);
      }
      await fetchPosts();
      addToast('success', 'Profile updated', 'Your changes have been saved.');
    } catch (err: any) {
      addToast('error', 'Profile update failed', err.message);
    }
  };

  // Story creation
  const handleCreateStory = async (media: string, caption: string) => {
    try {
      const created = await apiClient.createStory(media, caption);
      setStories((prev) => [created, ...prev]);
      addToast('success', 'Story published', 'Visible for the next 24 hours.');
    } catch (err: any) {
      addToast('error', 'Failed to publish story', err.message);
    }
  };

  // Derived Counts & Lists
  const unreadNotifCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  const unreadMessageCount = useMemo(() => {
    if (!currentUser) return 0;
    return messages.filter((m) => m.receiver_id === currentUser.id && !m.is_read).length;
  }, [messages, currentUser]);

  const suggestedUsers = useMemo(() => {
    if (!currentUser) return [];
    return allUsers.filter((u) => u.id !== currentUser.id && !u.is_following).slice(0, 4);
  }, [allUsers, currentUser]);

  const onlineUsers = useMemo(() => {
    if (!currentUser) return [];
    return allUsers.filter((u) => u.id !== currentUser.id && u.is_online);
  }, [allUsers, currentUser]);

  const popularPostsSidebar = useMemo(() => {
    return [...posts].sort((a, b) => b.likes_count - a.likes_count).slice(0, 3);
  }, [posts]);

  const profileFilteredPosts = useMemo(() => {
    if (!profileDetail) return [];
    if (profileTab === 'media') {
      return posts.filter(
        (p) =>
          p.user.id === profileDetail.id &&
          (p.image || (p.images && p.images.length > 0))
      );
    }
    if (profileTab === 'liked') {
      // Posts liked by this user or bookmarked
      return posts.filter((p) => p.is_liked || p.user.id === profileDetail.id).slice(0, 6);
    }
    return posts.filter((p) => p.user.id === profileDetail.id);
  }, [posts, profileDetail, profileTab]);

  // If unauthenticated, render AuthPortal
  if (!isAuthenticated || !currentUser) {
    return (
      <>
        <AuthPortal
          demoUsers={allUsers}
          onLogin={handleLogin}
          onRegister={handleRegister}
          onForgotPassword={handleForgotPassword}
          onToast={addToast}
        />
        {/* Toast Stack */}
        <div className="fixed bottom-5 right-5 z-50 space-y-2 max-w-sm w-full pointer-events-none px-4">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="pointer-events-auto p-3.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-lg border border-slate-700/50 flex items-start gap-2.5 text-xs"
            >
              <i
                className={`fa-solid ${
                  t.type === 'error'
                    ? 'fa-circle-exclamation text-rose-400'
                    : 'fa-circle-check text-emerald-400'
                } mt-0.5`}
                aria-hidden="true"
              />
              <div>
                <p className="font-semibold">{t.title}</p>
                {t.description && <p className="opacity-80 mt-0.5">{t.description}</p>}
              </div>
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100">
      {/* Top Bar Contract: Strict 3-Zone Header */}
      <header className="sticky top-0 z-30 h-14 bg-white/90 dark:bg-[#131822]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#home"
          onClick={(e) => {
            e.preventDefault();
            setActiveHashtag(null);
            setActiveView('home');
          }}
          className="font-display text-2xl tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap"
        >
          Connectra
        </a>

        {/* Zone 2: 5 clean text navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-slate-600 dark:text-slate-400">
          <button
            type="button"
            onClick={() => {
              setActiveHashtag(null);
              setActiveView('home');
            }}
            className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap py-1 ${
              activeView === 'home'
                ? 'text-slate-900 dark:text-white underline underline-offset-8 decoration-2 decoration-blue-600'
                : ''
            }`}
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => setActiveView('explore')}
            className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap py-1 ${
              activeView === 'explore'
                ? 'text-slate-900 dark:text-white underline underline-offset-8 decoration-2 decoration-blue-600'
                : ''
            }`}
          >
            Explore
          </button>
          <button
            type="button"
            onClick={() => setActiveView('notifications')}
            className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap py-1 ${
              activeView === 'notifications'
                ? 'text-slate-900 dark:text-white underline underline-offset-8 decoration-2 decoration-blue-600'
                : ''
            }`}
          >
            Notifications {unreadNotifCount > 0 ? `(${unreadNotifCount})` : ''}
          </button>
          <button
            type="button"
            onClick={() => setActiveView('messages')}
            className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap py-1 ${
              activeView === 'messages'
                ? 'text-slate-900 dark:text-white underline underline-offset-8 decoration-2 decoration-blue-600'
                : ''
            }`}
          >
            Messages {unreadMessageCount > 0 ? `(${unreadMessageCount})` : ''}
          </button>
          <button
            type="button"
            onClick={() => setActiveView('architecture')}
            className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap py-1 ${
              activeView === 'architecture'
                ? 'text-slate-900 dark:text-white underline underline-offset-8 decoration-2 decoration-blue-600'
                : ''
            }`}
          >
            Django Code
          </button>
        </nav>

        {/* Zone 3: 2 primary actions */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={async () => {
              try {
                const { fileCount, byteSize } = await downloadCompleteProjectZip();
                const kb = Math.max(1, Math.round(byteSize / 1024));
                addToast(
                  'success',
                  `Downloaded ${fileCount} files (${kb} KB)`,
                  'connectra_social_media_project.zip saved to your computer.'
                );
              } catch (err: any) {
                addToast('error', 'ZIP download failed', err.message);
              }
            }}
            className="px-3.5 py-1.5 text-xs font-medium bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap inline-flex items-center gap-1.5 cursor-pointer"
          >
            <i className="fa-solid fa-file-zipper text-[11px]" aria-hidden="true" />
            <span>Download .ZIP</span>
          </button>
          <button
            type="button"
            onClick={() => setDarkMode(!darkMode)}
            aria-label="Toggle color theme"
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            {darkMode ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>
      </header>

      {/* Main 3-Column Responsive Workspace */}
      <div className="max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-6 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 pb-24 lg:pb-10">
        {/* LEFT SIDEBAR (Desktop & Tablet) */}
        <aside className="hidden lg:block lg:col-span-3 space-y-5">
          <div className="sticky top-20 space-y-5">
            {/* Primary Navigation Card */}
            <div className="bg-white dark:bg-[#131822] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 space-y-1">
              {[
                { id: 'home', label: 'Home', icon: 'fa-house' },
                { id: 'explore', label: 'Explore', icon: 'fa-compass' },
                {
                  id: 'notifications',
                  label: 'Notifications',
                  icon: 'fa-bell',
                  badge: unreadNotifCount,
                },
                {
                  id: 'messages',
                  label: 'Messages',
                  icon: 'fa-envelope',
                  badge: unreadMessageCount,
                },
                {
                  id: 'bookmarks',
                  label: 'Bookmarks',
                  icon: 'fa-bookmark',
                  badge: bookmarkedPosts.length,
                },
                { id: 'profile', label: 'Profile', icon: 'fa-user' },
                { id: 'settings', label: 'Settings', icon: 'fa-sliders' },
                {
                  id: 'architecture',
                  label: 'Django & DRF Code',
                  icon: 'fa-code',
                },
              ].map((item) => {
                const isActive =
                  activeView === item.id &&
                  (item.id !== 'profile' || selectedProfileId === currentUser.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (item.id === 'profile') {
                        openUserProfile(currentUser.id);
                      } else {
                        if (item.id === 'home') setActiveHashtag(null);
                        setActiveView(item.id as ActiveView);
                      }
                    }}
                    className={`w-full px-3.5 py-2.5 rounded-xl flex items-center justify-between text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-slate-900 text-white dark:bg-blue-700 dark:text-white'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <i className={`fa-solid ${item.icon} w-4 text-center`} aria-hidden="true" />
                      <span>{item.label}</span>
                    </span>
                    {typeof item.badge === 'number' && item.badge > 0 && (
                      <span
                        className={`text-xs font-mono-tabular ${
                          isActive ? 'text-white/90' : 'text-blue-700 dark:text-blue-400 font-semibold'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}

              <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full px-3.5 py-2.5 rounded-xl flex items-center gap-3 text-xs sm:text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors whitespace-nowrap"
                >
                  <i className="fa-solid fa-arrow-right-from-bracket w-4 text-center" aria-hidden="true" />
                  <span>Logout</span>
                </button>
              </div>
            </div>

            {/* Authenticated User Mini Card */}
            <div className="bg-white dark:bg-[#131822] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4">
              <div
                onClick={() => openUserProfile(currentUser.id)}
                className="flex items-center gap-3 cursor-pointer"
              >
                <UserAvatar
                  src={currentUser.profile_picture}
                  alt={currentUser.full_name}
                  name={currentUser.full_name}
                  size="md"
                  isOnline={true}
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {currentUser.full_name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    @{currentUser.username}
                  </p>
                </div>
              </div>

              <div className="mt-3.5 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                <span>
                  <strong className="text-slate-900 dark:text-slate-100">
                    {currentUser.posts_count}
                  </strong>{' '}
                  Posts
                </span>
                <span>·</span>
                <span>
                  <strong className="text-slate-900 dark:text-slate-100">
                    {currentUser.followers_count}
                  </strong>{' '}
                  Followers
                </span>
                <span>·</span>
                <span>
                  <strong className="text-slate-900 dark:text-slate-100">
                    {currentUser.following_count}
                  </strong>{' '}
                  Following
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* CENTER WORKSPACE */}
        <main
          className={`${
            activeView === 'messages' || activeView === 'architecture'
              ? 'lg:col-span-9'
              : 'lg:col-span-6'
          } space-y-5 min-w-0`}
        >
          {/* VIEW 1: HOME FEED */}
          {activeView === 'home' && (
            <>
              {/* Stories Row */}
              <section
                aria-label="Stories"
                className="bg-white dark:bg-[#131822] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    24-Hour Studio Stories
                  </h2>
                  <button
                    type="button"
                    onClick={() => setShowCreateStoryModal(true)}
                    className="text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline whitespace-nowrap"
                  >
                    + Add Story
                  </button>
                </div>

                <div className="flex items-center gap-4 overflow-x-auto pb-1">
                  {/* Add Story Trigger */}
                  <button
                    type="button"
                    onClick={() => setShowCreateStoryModal(true)}
                    className="flex flex-col items-center gap-1.5 shrink-0 group"
                  >
                    <div className="w-16 h-16 rounded-full p-0.5 border-2 border-dashed border-slate-300 dark:border-slate-700 group-hover:border-blue-600 flex items-center justify-center relative">
                      <UserAvatar
                        src={currentUser.profile_picture}
                        alt={currentUser.full_name}
                        name={currentUser.full_name}
                        size="md"
                      />
                      <span className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-blue-700 text-white text-[10px] flex items-center justify-center ring-2 ring-white dark:ring-[#131822]">
                        <i className="fa-solid fa-plus" aria-hidden="true" />
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate max-w-[68px]">
                      Your Story
                    </span>
                  </button>

                  {stories.map((story, idx) => (
                    <button
                      key={story.id}
                      type="button"
                      onClick={() => setStoryViewerIndex(idx)}
                      className="flex flex-col items-center gap-1.5 shrink-0 group"
                    >
                      <div
                        className={`w-16 h-16 rounded-full p-0.5 transition-transform group-hover:scale-105 ${
                          story.is_viewed
                            ? 'border-2 border-slate-300 dark:border-slate-700'
                            : 'border-2 border-blue-600 dark:border-blue-400'
                        } flex items-center justify-center`}
                      >
                        <UserAvatar
                          src={story.user.profile_picture}
                          alt={story.user.full_name}
                          name={story.user.full_name}
                          size="md"
                        />
                      </div>
                      <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate max-w-[72px]">
                        {story.user.full_name.split(' ')[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Create Post Composer */}
              <section
                aria-label="Create Post"
                className="bg-white dark:bg-[#131822] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5"
              >
                <form onSubmit={handleCreatePost} className="space-y-3.5">
                  <div className="flex items-start gap-3">
                    <UserAvatar
                      src={currentUser.profile_picture}
                      alt={currentUser.full_name}
                      name={currentUser.full_name}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <textarea
                        rows={3}
                        value={composerText}
                        onChange={(e) => setComposerText(e.target.value)}
                        placeholder="Share a studio dispatch, architectural note, or photograph... Use #hashtags and @mentions"
                        className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-[#0D1119] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 resize-none"
                      />
                    </div>
                  </div>

                  {/* Location Input */}
                  {showLocationInput && (
                    <div className="flex items-center gap-2 pl-14">
                      <i className="fa-solid fa-location-dot text-xs text-slate-400" aria-hidden="true" />
                      <input
                        type="text"
                        value={composerLocation}
                        onChange={(e) => setComposerLocation(e.target.value)}
                        placeholder="Add location (e.g. Zurich, Switzerland)"
                        className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-[#0D1119] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  )}

                  {/* Studio Preset Image Picker */}
                  {showStudioPicker && (
                    <div className="pl-0 sm:pl-14">
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0D1119] border border-slate-200 dark:border-slate-800">
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                          Click to attach high-resolution studio photography:
                        </p>
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                          {PRESET_MEDIA_GALLERY.slice(0, 5).map((item, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                if (!composerImages.includes(item.url)) {
                                  setComposerImages((prev) => [...prev, item.url]);
                                }
                              }}
                              className="h-16 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 hover:border-blue-600 relative group"
                            >
                              <img
                                src={item.url}
                                alt={item.label}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Image Previews with Removal */}
                  {composerImages.length > 0 && (
                    <div className="pl-0 sm:pl-14 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {composerImages.map((imgSrc, idx) => (
                        <div
                          key={idx}
                          className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 h-28 bg-slate-900"
                        >
                          <ResilientImage
                            src={imgSrc}
                            alt={`Upload preview ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setComposerImages((prev) => prev.filter((_, i) => i !== idx))
                            }
                            aria-label="Remove image"
                            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/75 text-white text-xs flex items-center justify-center hover:bg-rose-600"
                          >
                            <i className="fa-solid fa-xmark" aria-hidden="true" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Composer Action Toolbar */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                      <label className="cursor-pointer px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 whitespace-nowrap">
                        <i className="fa-regular fa-image text-blue-600 dark:text-blue-400" aria-hidden="true" />
                        <span>Upload Photos</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleComposerImageUpload}
                          className="hidden"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => setShowStudioPicker(!showStudioPicker)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <i className="fa-solid fa-camera-retro text-emerald-600" aria-hidden="true" />
                        <span>Studio Library</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowLocationInput(!showLocationInput)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <i className="fa-solid fa-location-dot text-amber-600" aria-hidden="true" />
                        <span>Location</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setComposerText((prev) => `${prev} #architecture `)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                      >
                        #Tag
                      </button>

                      <button
                        type="button"
                        onClick={() => setComposerText((prev) => `${prev} @marcus_vance `)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                      >
                        @Mention
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={publishingPost}
                      className="px-5 py-2 text-xs font-medium bg-slate-900 text-white dark:bg-blue-700 dark:text-white rounded-xl hover:opacity-90 transition-opacity whitespace-nowrap"
                    >
                      {publishingPost ? 'Publishing...' : 'Publish Post'}
                    </button>
                  </div>
                </form>
              </section>

              {/* Feed Filter Controls & Active Hashtag Banner */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-[#131822] rounded-xl border border-slate-200/60 dark:border-slate-800">
                  {[
                    { id: 'all', label: 'All Posts' },
                    { id: 'following', label: 'Following' },
                    { id: 'popular', label: 'Popular' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setFeedFilter(tab.id as any)}
                      className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                        feedFilter === tab.id
                          ? 'bg-white dark:bg-[#1E2636] text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {activeHashtag && (
                  <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-400 font-medium">
                    <span>Filtering by #{activeHashtag}</span>
                    <button
                      type="button"
                      onClick={() => setActiveHashtag(null)}
                      className="underline hover:text-slate-900 dark:hover:text-white"
                    >
                      Clear filter
                    </button>
                  </div>
                )}
              </div>

              {/* Posts Feed */}
              {loadingPosts ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="bg-white dark:bg-[#131822] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 animate-pulse space-y-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-slate-200 dark:bg-slate-800" />
                        <div className="space-y-2 flex-1">
                          <div className="h-3.5 w-36 bg-slate-200 dark:bg-slate-800 rounded" />
                          <div className="h-2.5 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
                        </div>
                      </div>
                      <div className="h-16 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                      <div className="h-52 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                    </div>
                  ))}
                </div>
              ) : posts.length === 0 ? (
                <div className="bg-white dark:bg-[#131822] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3">
                  <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    No posts match the current filter
                  </p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Try clearing the hashtag filter or switching back to All Posts to explore all 20
                    community dispatches.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setFeedFilter('all');
                      setActiveHashtag(null);
                    }}
                    className="px-4 py-2 text-xs font-medium bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-xl"
                  >
                    Reset Feed Filter
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  {posts.slice(0, visiblePostCount).map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      currentUser={currentUser}
                      onUserClick={openUserProfile}
                      onMentionClick={openMentionProfile}
                      onHashtagClick={handleHashtagFilter}
                      onToggleLike={handleToggleLike}
                      onToggleBookmark={handleToggleBookmark}
                      onSharePost={handleSharePost}
                      onEditPost={(p) => setEditingPost(p)}
                      onDeletePost={(pid) => setDeletingPostId(pid)}
                      onReportPost={(pid) =>
                        addToast(
                          'info',
                          `Report submitted for Post #${pid}`,
                          'Our trust & safety moderators will review this post.'
                        )
                      }
                      onAddComment={handleAddComment}
                      onEditComment={handleEditComment}
                      onDeleteComment={handleDeleteComment}
                      onToggleCommentLike={handleToggleCommentLike}
                      onPreviewImage={(src, caption) => setLightboxImage({ src, caption })}
                    />
                  ))}

                  {visiblePostCount < posts.length && (
                    <div className="pt-2 text-center">
                      <button
                        type="button"
                        onClick={() => setVisiblePostCount((prev) => prev + 6)}
                        className="px-6 py-2.5 text-xs font-medium bg-white dark:bg-[#131822] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        Load More Posts ({posts.length - visiblePostCount} remaining)
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* VIEW 2: EXPLORE PAGE */}
          {activeView === 'explore' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-[#131822] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5">
                <h2 className="font-display text-2xl text-slate-900 dark:text-slate-100">
                  Explore & Discover
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Search creators, architectural studies, medium-format photography, and trending
                  hashtags.
                </p>

                <div className="mt-4 relative">
                  <i
                    className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search users, posts, or #hashtags..."
                    className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-[#0D1119] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
                  />
                </div>

                {/* Trending Hashtag Filter Buttons */}
                <div className="mt-4 flex items-center gap-2 flex-wrap">
                  {searchResults.hashtags.slice(0, 8).map((item) => (
                    <button
                      key={item.tag}
                      type="button"
                      onClick={() => handleHashtagFilter(item.tag)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-900 hover:text-white dark:hover:bg-blue-700 transition-colors whitespace-nowrap"
                    >
                      #{item.tag} · <span className="tabular-nums">{item.count}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Popular Creators Directory */}
              <div className="bg-white dark:bg-[#131822] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3.5">
                  Featured Creators & Studios
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(searchQuery ? searchResults.users : allUsers.slice(0, 6)).map((u) => (
                    <div
                      key={u.id}
                      className="p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div
                        onClick={() => openUserProfile(u.id)}
                        className="flex items-center gap-3 min-w-0 cursor-pointer"
                      >
                        <UserAvatar
                          src={u.profile_picture}
                          alt={u.full_name}
                          name={u.full_name}
                          size="sm"
                          isOnline={u.is_online}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {u.full_name}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            @{u.username} · {u.location}
                          </p>
                        </div>
                      </div>
                      {u.id !== currentUser.id && (
                        <button
                          type="button"
                          onClick={() => handleToggleFollow(u)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                            u.is_following
                              ? 'border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                              : 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                          }`}
                        >
                          {u.is_following ? 'Following' : 'Follow'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Visual Media Grid */}
              <div className="bg-white dark:bg-[#131822] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3.5">
                  Trending Media & Dispatches
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(searchQuery
                    ? searchResults.posts
                    : posts.filter((p) => p.image || (p.images && p.images.length > 0))
                  ).map((post) => (
                    <div
                      key={post.id}
                      onClick={() =>
                        setLightboxImage({
                          src: post.image || post.images[0],
                          caption: `${post.user.full_name} (@${post.user.username}): ${post.content}`,
                        })
                      }
                      className="group relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 cursor-pointer bg-slate-900"
                    >
                      <ResilientImage
                        src={post.image || post.images[0]}
                        alt={post.content.slice(0, 60)}
                        className="w-full h-52 object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex flex-col justify-end p-4">
                        <p className="text-xs font-semibold text-white">
                          {post.user.full_name} · @{post.user.username}
                        </p>
                        <p className="text-[11px] text-slate-200 line-clamp-2 mt-0.5">
                          {post.content}
                        </p>
                        <div className="flex items-center gap-3 text-[11px] text-slate-300 mt-2 tabular-nums">
                          <span>{post.likes_count} likes</span>
                          <span>·</span>
                          <span>{post.comments_count} comments</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 3: NOTIFICATIONS PAGE */}
          {activeView === 'notifications' && (
            <div className="bg-white dark:bg-[#131822] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="font-display text-2xl text-slate-900 dark:text-slate-100">
                    Notifications
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Real-time activity for followers, likes, comments, replies, and @mentions.
                  </p>
                </div>
                {unreadNotifCount > 0 && (
                  <button
                    type="button"
                    onClick={async () => {
                      await apiClient.markAllNotificationsRead();
                      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
                      addToast('success', 'All notifications marked as read');
                    }}
                    className="px-3.5 py-1.5 text-xs font-medium bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-lg whitespace-nowrap"
                  >
                    Mark All as Read
                  </button>
                )}
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800/70 mt-2">
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-12">
                    You have no notifications yet.
                  </p>
                ) : (
                  notifications.map((notif) => {
                    const actionLabel =
                      notif.notification_type === 'follow'
                        ? 'started following you'
                        : notif.notification_type === 'like'
                        ? 'liked your post'
                        : notif.notification_type === 'comment'
                        ? 'commented on your post'
                        : notif.notification_type === 'reply'
                        ? 'replied to your comment'
                        : 'mentioned you in a dispatch';

                    return (
                      <div
                        key={notif.id}
                        className={`py-4 px-3 rounded-xl transition-colors flex items-start justify-between gap-3 ${
                          !notif.is_read
                            ? 'bg-blue-50/50 dark:bg-blue-950/20'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <UserAvatar
                            src={notif.sender.profile_picture}
                            alt={notif.sender.full_name}
                            name={notif.sender.full_name}
                            size="sm"
                            onClick={() => openUserProfile(notif.sender.id)}
                          />
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                              <button
                                type="button"
                                onClick={() => openUserProfile(notif.sender.id)}
                                className="font-semibold hover:underline"
                              >
                                {notif.sender.full_name}
                              </button>{' '}
                              <span>{actionLabel}</span>
                            </p>
                            {notif.post_preview && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic truncate max-w-md">
                                “{notif.post_preview}...”
                              </p>
                            )}
                            <p className="text-[11px] text-slate-400 mt-1 tabular-nums">
                              {formatRelativeTime(notif.created_at)}
                              {!notif.is_read ? ' · Unread' : ' · Read'}
                            </p>
                          </div>
                        </div>

                        {!notif.is_read && (
                          <button
                            type="button"
                            onClick={async () => {
                              await apiClient.markNotificationRead(notif.id);
                              setNotifications((prev) =>
                                prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
                              );
                            }}
                            className="px-3 py-1 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 whitespace-nowrap"
                          >
                            Mark read
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* VIEW 4: MESSAGES PAGE */}
          {activeView === 'messages' && (
            <MessagesView
              currentUser={currentUser}
              allUsers={allUsers}
              allMessages={messages}
              onRefreshMessages={fetchCoreData}
              onSelectProfile={openUserProfile}
              onToast={addToast}
            />
          )}

          {/* VIEW 5: BOOKMARKS / SAVED POSTS PAGE */}
          {activeView === 'bookmarks' && (
            <div className="space-y-5">
              <div className="bg-white dark:bg-[#131822] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5">
                <h2 className="font-display text-2xl text-slate-900 dark:text-slate-100">
                  Saved Posts
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Your private archive of bookmarked architectural studies, photography, and notes.
                </p>
              </div>

              {bookmarkedPosts.length === 0 ? (
                <div className="bg-white dark:bg-[#131822] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3">
                  <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    No saved posts yet
                  </p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Click the Save icon on any post in your Home feed or Explore page to bookmark it
                    here for quick reference.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveView('home')}
                    className="px-4 py-2 text-xs font-medium bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-xl"
                  >
                    Browse Feed
                  </button>
                </div>
              ) : (
                bookmarkedPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    currentUser={currentUser}
                    onUserClick={openUserProfile}
                    onMentionClick={openMentionProfile}
                    onHashtagClick={handleHashtagFilter}
                    onToggleLike={handleToggleLike}
                    onToggleBookmark={handleToggleBookmark}
                    onSharePost={handleSharePost}
                    onEditPost={(p) => setEditingPost(p)}
                    onDeletePost={(pid) => setDeletingPostId(pid)}
                    onReportPost={(pid) =>
                      addToast('info', `Reported Post #${pid}`, 'Thank you for your feedback.')
                    }
                    onAddComment={handleAddComment}
                    onEditComment={handleEditComment}
                    onDeleteComment={handleDeleteComment}
                    onToggleCommentLike={handleToggleCommentLike}
                    onPreviewImage={(src, caption) => setLightboxImage({ src, caption })}
                  />
                ))
              )}
            </div>
          )}

          {/* VIEW 6: USER PROFILE PAGE */}
          {activeView === 'profile' && profileDetail && (
            <div className="space-y-5">
              <div className="bg-white dark:bg-[#131822] border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden">
                {/* Cover Banner */}
                <div className="h-44 sm:h-56 bg-slate-900 relative overflow-hidden">
                  <ResilientImage
                    src={profileDetail.cover_image}
                    alt={`${profileDetail.full_name} cover`}
                    className="w-full h-full object-cover"
                    aspectClass="h-full"
                  />
                </div>

                {/* Profile Header Body */}
                <div className="p-5 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-14 sm:-mt-16 mb-4 relative z-10">
                    <div className="p-1 rounded-full bg-white dark:bg-[#131822] inline-block">
                      <UserAvatar
                        src={profileDetail.profile_picture}
                        alt={profileDetail.full_name}
                        name={profileDetail.full_name}
                        size="xl"
                        isOnline={profileDetail.is_online}
                      />
                    </div>

                    <div className="flex items-center gap-2.5">
                      {profileDetail.id === currentUser.id ? (
                        <button
                          type="button"
                          onClick={() => setShowEditProfileModal(true)}
                          className="px-4 py-2 text-xs font-medium bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-xl hover:opacity-90 transition-opacity whitespace-nowrap"
                        >
                          Edit Profile
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleToggleFollow(profileDetail)}
                            className={`px-5 py-2 text-xs font-medium rounded-xl transition-colors whitespace-nowrap ${
                              profileDetail.is_following
                                ? 'border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                                : 'bg-blue-700 text-white hover:bg-blue-800'
                            }`}
                          >
                            {profileDetail.is_following ? 'Following' : 'Follow'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveView('messages')}
                            className="px-4 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                          >
                            Message
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {profileDetail.full_name}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                      @{profileDetail.username}
                    </p>
                  </div>

                  {profileDetail.bio && (
                    <p className="mt-3 text-sm text-slate-800 dark:text-slate-200 leading-relaxed max-w-2xl">
                      {profileDetail.bio}
                    </p>
                  )}

                  {/* Clean Unboxed Metadata Line */}
                  <div className="mt-3.5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                    {profileDetail.location && <span>{profileDetail.location}</span>}
                    {profileDetail.website && (
                      <>
                        <span aria-hidden="true">·</span>
                        <a
                          href={profileDetail.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-700 dark:text-blue-400 hover:underline truncate max-w-[240px]"
                        >
                          {profileDetail.website.replace(/^https?:\/\//, '')}
                        </a>
                      </>
                    )}
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">
                      Joined{' '}
                      {new Date(profileDetail.created_at).toLocaleDateString('en-US', {
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  {/* Stats Row */}
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-6 text-xs sm:text-sm tabular-nums">
                    <div>
                      <strong className="font-semibold text-slate-900 dark:text-slate-100">
                        {profileDetail.posts_count}
                      </strong>{' '}
                      <span className="text-slate-500">Posts</span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setFollowModalState({
                          title: `Followers of ${profileDetail.full_name}`,
                          users: profileDetail.followers || [],
                        })
                      }
                      className="hover:underline"
                    >
                      <strong className="font-semibold text-slate-900 dark:text-slate-100">
                        {profileDetail.followers_count}
                      </strong>{' '}
                      <span className="text-slate-500">Followers</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFollowModalState({
                          title: `Followed by ${profileDetail.full_name}`,
                          users: profileDetail.following || [],
                        })
                      }
                      className="hover:underline"
                    >
                      <strong className="font-semibold text-slate-900 dark:text-slate-100">
                        {profileDetail.following_count}
                      </strong>{' '}
                      <span className="text-slate-500">Following</span>
                    </button>
                  </div>

                  {/* Profile Section Tabs: Posts / Media / Liked Posts */}
                  <div className="mt-5 flex items-center gap-1 p-1 bg-slate-100 dark:bg-[#0D1119] rounded-xl">
                    {[
                      { id: 'posts', label: 'Posts' },
                      { id: 'media', label: 'Media' },
                      { id: 'liked', label: 'Liked Posts' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setProfileTab(t.id as any)}
                        className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                          profileTab === t.id
                            ? 'bg-white dark:bg-[#181F2C] text-slate-900 dark:text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Profile Posts List */}
              {profileFilteredPosts.length === 0 ? (
                <div className="bg-white dark:bg-[#131822] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-10 text-center">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    No posts in this section yet.
                  </p>
                </div>
              ) : (
                profileFilteredPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    currentUser={currentUser}
                    onUserClick={openUserProfile}
                    onMentionClick={openMentionProfile}
                    onHashtagClick={handleHashtagFilter}
                    onToggleLike={handleToggleLike}
                    onToggleBookmark={handleToggleBookmark}
                    onSharePost={handleSharePost}
                    onEditPost={(p) => setEditingPost(p)}
                    onDeletePost={(pid) => setDeletingPostId(pid)}
                    onReportPost={(pid) =>
                      addToast('info', `Reported Post #${pid}`, 'Moderator review queued.')
                    }
                    onAddComment={handleAddComment}
                    onEditComment={handleEditComment}
                    onDeleteComment={handleDeleteComment}
                    onToggleCommentLike={handleToggleCommentLike}
                    onPreviewImage={(src, caption) => setLightboxImage({ src, caption })}
                  />
                ))
              )}
            </div>
          )}

          {/* VIEW 7: SETTINGS PAGE */}
          {activeView === 'settings' && (
            <div className="bg-white dark:bg-[#131822] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 space-y-6">
              <div>
                <h2 className="font-display text-2xl text-slate-900 dark:text-slate-100">
                  Account & Platform Settings
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Manage appearance, profile details, session security, and demo creator profiles.
                </p>
              </div>

              {/* Appearance */}
              <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Appearance & Theme
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Switch between Light Mode and Dark Mode (persisted in localStorage).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDarkMode(!darkMode)}
                  className="px-4 py-2 text-xs font-medium bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-xl whitespace-nowrap"
                >
                  {darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                </button>
              </div>

              {/* Edit Profile Trigger */}
              <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Profile Information & Media
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Update your avatar, cover banner, bio, location, and website link.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEditProfileModal(true)}
                  className="px-4 py-2 text-xs font-medium border border-slate-300 dark:border-slate-700 rounded-xl whitespace-nowrap"
                >
                  Edit Profile
                </button>
              </div>

              {/* Switch Demo User */}
              <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Instant Account Switcher (10 Seeded Users)
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Test multi-user interactions (follows, notifications, messages, likes) across
                    all 10 seeded creator accounts with one click:
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {allUsers.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleSwitchDemoUser(u)}
                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-colors ${
                        u.id === currentUser.id
                          ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <UserAvatar
                          src={u.profile_picture}
                          alt={u.full_name}
                          name={u.full_name}
                          size="xs"
                          isOnline={u.is_online}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {u.full_name}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">@{u.username}</p>
                        </div>
                      </div>
                      {u.id === currentUser.id && (
                        <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-400">
                          Active
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 8: DJANGO + DRF SOURCE CODE & ARCHITECTURE */}
          {activeView === 'architecture' && <ArchitectureView onToast={addToast} />}
        </main>

        {/* RIGHT SIDEBAR (Shown on Home, Explore, Notifications, Bookmarks, Profile, Settings) */}
        {activeView !== 'messages' && activeView !== 'architecture' && (
          <aside className="hidden lg:block lg:col-span-3 space-y-5">
            <div className="sticky top-20 space-y-5">
              {/* Real-Time Search Box with Suggestions */}
              <div className="relative">
                <div className="relative">
                  <i
                    className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search users, posts, #tags..."
                    className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl bg-white dark:bg-[#131822] border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
                  />
                </div>

                {/* Live Search Suggestions Dropdown */}
                {searchFocused && searchQuery.trim() !== '' && (
                  <div className="absolute left-0 right-0 mt-1.5 z-40 bg-white dark:bg-[#181F2C] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-3 space-y-3 max-h-96 overflow-y-auto">
                    {searchResults.users.length > 0 && (
                      <div>
                        <p className="text-[11px] font-semibold text-slate-400 px-2 mb-1">
                          Creators
                        </p>
                        {searchResults.users.slice(0, 4).map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => openUserProfile(u.id)}
                            className="w-full p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 text-left"
                          >
                            <UserAvatar
                              src={u.profile_picture}
                              alt={u.full_name}
                              name={u.full_name}
                              size="xs"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                                {u.full_name}
                              </p>
                              <p className="text-[10px] text-slate-500 truncate">@{u.username}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {searchResults.hashtags.length > 0 && (
                      <div>
                        <p className="text-[11px] font-semibold text-slate-400 px-2 mb-1">
                          Hashtags
                        </p>
                        <div className="flex flex-wrap gap-1.5 px-2">
                          {searchResults.hashtags.slice(0, 5).map((h) => (
                            <button
                              key={h.tag}
                              type="button"
                              onClick={() => handleHashtagFilter(h.tag)}
                              className="text-xs text-blue-700 dark:text-blue-400 hover:underline"
                            >
                              #{h.tag} ({h.count})
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {searchResults.posts.length > 0 && (
                      <div>
                        <p className="text-[11px] font-semibold text-slate-400 px-2 mb-1">
                          Matching Posts
                        </p>
                        {searchResults.posts.slice(0, 3).map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setActiveView('explore');
                            }}
                            className="w-full p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-left"
                          >
                            <p className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                              {p.user.full_name}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate">{p.content}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Trending Topics */}
              <div className="bg-white dark:bg-[#131822] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4">
                <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-3">
                  Trending Topics
                </h3>
                <div className="space-y-2.5">
                  {searchResults.hashtags.slice(0, 6).map((item, idx) => (
                    <div
                      key={item.tag}
                      className="flex items-center justify-between text-xs"
                    >
                      <button
                        type="button"
                        onClick={() => handleHashtagFilter(item.tag)}
                        className="font-medium text-slate-800 dark:text-slate-200 hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
                      >
                        0{idx + 1}. #{item.tag}
                      </button>
                      <span className="text-[11px] text-slate-500 tabular-nums">
                        {item.count} posts
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Suggested Users / People to Follow */}
              <div className="bg-white dark:bg-[#131822] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4">
                <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-3">
                  Suggested Creators
                </h3>
                <div className="space-y-3">
                  {suggestedUsers.map((u) => (
                    <div key={u.id} className="flex items-center justify-between gap-2">
                      <div
                        onClick={() => openUserProfile(u.id)}
                        className="flex items-center gap-2.5 min-w-0 cursor-pointer"
                      >
                        <UserAvatar
                          src={u.profile_picture}
                          alt={u.full_name}
                          name={u.full_name}
                          size="sm"
                          isOnline={u.is_online}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate hover:underline">
                            {u.full_name}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">@{u.username}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleFollow(u)}
                        className="px-3 py-1 text-xs font-medium bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-lg hover:opacity-90 whitespace-nowrap"
                      >
                        Follow
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Popular Posts */}
              <div className="bg-white dark:bg-[#131822] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4">
                <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-3">
                  Popular Dispatches
                </h3>
                <div className="space-y-3 divide-y divide-slate-100 dark:divide-slate-800/70">
                  {popularPostsSidebar.map((p) => (
                    <div key={p.id} className="pt-2.5 first:pt-0">
                      <button
                        type="button"
                        onClick={() => openUserProfile(p.user.id)}
                        className="text-xs font-semibold text-slate-900 dark:text-slate-100 hover:underline"
                      >
                        {p.user.full_name}
                      </button>
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-0.5">
                        {p.content}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1 tabular-nums">
                        <span>{p.likes_count} likes</span>
                        <span>·</span>
                        <span>{p.comments_count} comments</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Online Users */}
              <div className="bg-white dark:bg-[#131822] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4">
                <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-3">
                  Online in Studio ({onlineUsers.length})
                </h3>
                <div className="flex items-center gap-2.5 flex-wrap">
                  {onlineUsers.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => openUserProfile(u.id)}
                      title={`${u.full_name} (@${u.username})`}
                      className="flex items-center gap-1.5 pr-2 py-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <UserAvatar
                        src={u.profile_picture}
                        alt={u.full_name}
                        name={u.full_name}
                        size="xs"
                        isOnline={true}
                      />
                      <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                        {u.full_name.split(' ')[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* MOBILE FIXED BOTTOM NAVIGATION BAR (<= 15% viewport height cap, 44x44px hitboxes) */}
      <nav
        aria-label="Mobile Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-14 bg-white/95 dark:bg-[#131822]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 grid grid-cols-5 items-center px-2"
      >
        <button
          type="button"
          onClick={() => {
            setActiveHashtag(null);
            setActiveView('home');
          }}
          className={`min-h-[44px] min-w-[44px] flex flex-col items-center justify-center ${
            activeView === 'home'
              ? 'text-blue-700 dark:text-blue-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <i className="fa-solid fa-house text-base" aria-hidden="true" />
          <span className="text-[10px] font-medium mt-0.5">Home</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveView('explore')}
          className={`min-h-[44px] min-w-[44px] flex flex-col items-center justify-center ${
            activeView === 'explore'
              ? 'text-blue-700 dark:text-blue-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <i className="fa-regular fa-compass text-base" aria-hidden="true" />
          <span className="text-[10px] font-medium mt-0.5">Explore</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveView('home');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="min-h-[44px] min-w-[44px] flex flex-col items-center justify-center text-slate-900 dark:text-white"
        >
          <span className="w-8 h-8 rounded-full bg-slate-900 text-white dark:bg-blue-600 flex items-center justify-center">
            <i className="fa-solid fa-plus text-xs" aria-hidden="true" />
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveView('notifications')}
          className={`relative min-h-[44px] min-w-[44px] flex flex-col items-center justify-center ${
            activeView === 'notifications'
              ? 'text-blue-700 dark:text-blue-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <i className="fa-regular fa-bell text-base" aria-hidden="true" />
          <span className="text-[10px] font-medium mt-0.5">Alerts</span>
          {unreadNotifCount > 0 && (
            <span className="absolute top-1.5 right-5 w-2 h-2 rounded-full bg-rose-600" />
          )}
        </button>

        <button
          type="button"
          onClick={() => openUserProfile(currentUser.id)}
          className={`min-h-[44px] min-w-[44px] flex flex-col items-center justify-center ${
            activeView === 'profile'
              ? 'text-blue-700 dark:text-blue-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <i className="fa-regular fa-user text-base" aria-hidden="true" />
          <span className="text-[10px] font-medium mt-0.5">Profile</span>
        </button>
      </nav>

      {/* MODALS */}
      {storyViewerIndex !== null && (
        <StoryViewerModal
          stories={stories}
          initialIndex={storyViewerIndex}
          onClose={() => setStoryViewerIndex(null)}
          onSelectUser={openUserProfile}
          onStoryViewed={(sid) => {
            apiClient.markStoryViewed(sid).catch(() => {});
            setStories((prev) =>
              prev.map((s) => (s.id === sid ? { ...s, is_viewed: true } : s))
            );
          }}
        />
      )}

      {showCreateStoryModal && (
        <CreateStoryModal
          onClose={() => setShowCreateStoryModal(false)}
          onSubmit={handleCreateStory}
          onError={(msg) => addToast('error', 'Story upload error', msg)}
        />
      )}

      {showEditProfileModal && (
        <EditProfileModal
          user={currentUser}
          onClose={() => setShowEditProfileModal(false)}
          onSave={handleSaveProfile}
          onError={(msg) => addToast('error', 'Profile error', msg)}
        />
      )}

      {editingPost && (
        <EditPostModal
          post={editingPost}
          onClose={() => setEditingPost(null)}
          onSave={handleUpdatePost}
        />
      )}

      {deletingPostId !== null && (
        <ConfirmDialogModal
          title="Delete Post"
          description="Are you sure you want to permanently delete this post and all of its nested comments?"
          confirmLabel="Delete Post"
          onConfirm={handleConfirmDeletePost}
          onCancel={() => setDeletingPostId(null)}
        />
      )}

      {followModalState && (
        <FollowListModal
          title={followModalState.title}
          users={followModalState.users}
          currentUserId={currentUser.id}
          onClose={() => setFollowModalState(null)}
          onSelectUser={openUserProfile}
          onToggleFollow={handleToggleFollow}
        />
      )}

      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-4xl w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl"
          >
            <div className="relative">
              <ResilientImage
                src={lightboxImage.src}
                alt={lightboxImage.caption}
                className="w-full max-h-[75vh] object-contain bg-black"
              />
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black"
              >
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </div>
            {lightboxImage.caption && (
              <div className="p-4 text-xs text-slate-300 border-t border-slate-800">
                {lightboxImage.caption}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATIONS */}
      <div className="fixed bottom-16 lg:bottom-6 right-5 z-50 space-y-2 max-w-sm w-full pointer-events-none px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto p-3.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-lg border border-slate-700/40 flex items-start justify-between gap-3 text-xs"
          >
            <div className="flex items-start gap-2.5">
              <i
                className={`fa-solid ${
                  t.type === 'error'
                    ? 'fa-circle-exclamation text-rose-400'
                    : t.type === 'info'
                    ? 'fa-circle-info text-blue-400'
                    : 'fa-circle-check text-emerald-400'
                } mt-0.5`}
                aria-hidden="true"
              />
              <div>
                <p className="font-semibold">{t.title}</p>
                {t.description && <p className="opacity-80 mt-0.5">{t.description}</p>}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="opacity-60 hover:opacity-100"
            >
              <i className="fa-solid fa-xmark" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
