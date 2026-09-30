import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import JSZip from 'jszip';
import {
  createInitialSeedDatabase,
  DatabaseSchema,
  DBComment,
  DBUser,
} from './src/data/seedData';

const DB_FILE_PATH = path.resolve(process.cwd(), 'social_media_db.json');

function loadDatabase(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as DatabaseSchema;
      if (parsed && Array.isArray(parsed.users) && parsed.users.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to read DB file, seeding fresh database:', err);
  }
  const initial = createInitialSeedDatabase();
  saveDatabase(initial);
  return initial;
}

function saveDatabase(db: DatabaseSchema): void {
  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist DB file:', err);
  }
}

let db: DatabaseSchema = loadDatabase();
const activeTokens = new Map<string, number>();

function getAuthUserId(req: Request): number {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Token ') || authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace(/^(Token|Bearer)\s+/i, '').trim();
    if (activeTokens.has(token)) {
      return activeTokens.get(token)!;
    }
    const match = token.match(/^user-token-(\d+)$/);
    if (match) {
      return Number(match[1]);
    }
  }
  const headerUserId = req.headers['x-user-id'];
  if (headerUserId) {
    return Number(headerUserId);
  }
  return 1; // Default to Elena Rostova for instant demo if unauthenticated
}

function serializeUser(user: DBUser, viewerId: number) {
  const followers_count = db.follows.filter((f) => f.following_id === user.id).length;
  const following_count = db.follows.filter((f) => f.follower_id === user.id).length;
  const posts_count = db.posts.filter((p) => p.user_id === user.id).length;
  const is_following = db.follows.some(
    (f) => f.follower_id === viewerId && f.following_id === user.id
  );
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    full_name: user.full_name,
    profile_picture: user.profile_picture,
    cover_image: user.cover_image,
    bio: user.bio,
    location: user.location,
    website: user.website,
    is_online: user.is_online,
    created_at: user.created_at,
    followers_count,
    following_count,
    posts_count,
    is_following,
  };
}

function serializeComment(comment: DBComment, viewerId: number): any {
  const author = db.users.find((u) => u.id === comment.user_id) || db.users[0];
  const likes_count = db.commentLikes.filter((cl) => cl.comment_id === comment.id).length;
  const is_liked = db.commentLikes.some(
    (cl) => cl.comment_id === comment.id && cl.user_id === viewerId
  );
  const childReplies = db.comments
    .filter((c) => c.parent_comment_id === comment.id)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map((reply) => serializeComment(reply, viewerId));

  return {
    id: comment.id,
    post_id: comment.post_id,
    user: serializeUser(author, viewerId),
    parent_comment_id: comment.parent_comment_id,
    content: comment.content,
    likes_count,
    is_liked,
    replies: childReplies,
    created_at: comment.created_at,
    updated_at: comment.updated_at,
  };
}

function serializePost(postId: number, viewerId: number) {
  const post = db.posts.find((p) => p.id === postId);
  if (!post) return null;
  const author = db.users.find((u) => u.id === post.user_id) || db.users[0];
  const likes_count = db.likes.filter((l) => l.post_id === post.id).length;
  const comments_count = db.comments.filter((c) => c.post_id === post.id).length;
  const is_liked = db.likes.some((l) => l.post_id === post.id && l.user_id === viewerId);
  const is_bookmarked = db.bookmarks.some(
    (b) => b.post_id === post.id && b.user_id === viewerId
  );
  const rootComments = db.comments
    .filter((c) => c.post_id === post.id && c.parent_comment_id === null)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map((c) => serializeComment(c, viewerId));

  return {
    id: post.id,
    user: serializeUser(author, viewerId),
    content: post.content,
    image: post.image,
    images: post.images && post.images.length > 0 ? post.images : post.image ? [post.image] : [],
    location: post.location,
    hashtags: post.hashtags,
    mentions: post.mentions,
    shares_count: post.shares_count,
    likes_count,
    comments_count,
    is_liked,
    is_bookmarked,
    comments: rootComments,
    created_at: post.created_at,
    updated_at: post.updated_at,
  };
}

function extractHashtags(text: string): string[] {
  const matches = text.match(/#([a-zA-Z0-9_]+)/g) || [];
  return Array.from(new Set(matches.map((m) => m.slice(1).toLowerCase())));
}

function extractMentions(text: string): string[] {
  const matches = text.match(/@([a-zA-Z0-9_]+)/g) || [];
  return Array.from(new Set(matches.map((m) => m.slice(1).toLowerCase())));
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  // 1. Authentication APIs
  app.post('/api/register/', (req: Request, res: Response) => {
    const { full_name, username, email, password, profile_picture, bio, location, website } =
      req.body || {};

    if (!username || !email || !password || !full_name) {
      res.status(400).json({ error: 'Full name, username, email, and password are required.' });
      return;
    }
    if (String(password).length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters long.' });
      return;
    }
    const cleanUsername = String(username).trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const cleanEmail = String(email).trim().toLowerCase();

    if (db.users.some((u) => u.username.toLowerCase() === cleanUsername)) {
      res.status(400).json({ error: 'Username is already taken. Please choose another.' });
      return;
    }
    if (db.users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      res.status(400).json({ error: 'An account with this email already exists.' });
      return;
    }

    const initials = String(full_name)
      .split(' ')
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'AU';

    const defaultAvatarSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160"><rect width="160" height="160" rx="80" fill="#1E293B"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#F8F7F4" font-family="Georgia, serif" font-size="54">${initials}</text></svg>`;

    const newUser: DBUser = {
      id: Math.max(0, ...db.users.map((u) => u.id)) + 1,
      username: cleanUsername,
      email: cleanEmail,
      passwordHash: String(password),
      full_name: String(full_name).trim(),
      profile_picture:
        profile_picture || `data:image/svg+xml;utf8,${encodeURIComponent(defaultAvatarSvg)}`,
      cover_image: '/src/assets/images/cover_profile_banner_1790770507160.jpg',
      bio: bio || 'Creator & member on Aether Social.',
      location: location || 'Global Atelier',
      website: website || '',
      is_online: true,
      created_at: new Date().toISOString(),
    };

    db.users.push(newUser);
    saveDatabase(db);

    const token = `user-token-${newUser.id}`;
    activeTokens.set(token, newUser.id);

    res.status(201).json({
      token,
      user: serializeUser(newUser, newUser.id),
    });
  });

  app.post('/api/login/', (req: Request, res: Response) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
      res.status(400).json({ error: 'Please enter both username/email and password.' });
      return;
    }
    const identifier = String(username).trim().toLowerCase();
    const user = db.users.find(
      (u) => u.username.toLowerCase() === identifier || u.email.toLowerCase() === identifier
    );
    if (!user) {
      res.status(404).json({ error: 'User not found. Check your username or email.' });
      return;
    }
    if (user.passwordHash !== String(password)) {
      res.status(401).json({ error: 'Incorrect password. Try again or use a demo account.' });
      return;
    }
    user.is_online = true;
    saveDatabase(db);

    const token = `user-token-${user.id}`;
    activeTokens.set(token, user.id);

    res.json({
      token,
      user: serializeUser(user, user.id),
    });
  });

  app.post('/api/logout/', (req: Request, res: Response) => {
    const viewerId = getAuthUserId(req);
    const user = db.users.find((u) => u.id === viewerId);
    if (user) {
      user.is_online = false;
      saveDatabase(db);
    }
    res.json({ message: 'Logged out successfully.' });
  });

  app.post('/api/forgot-password/', (req: Request, res: Response) => {
    const { email, new_password } = req.body || {};
    if (!email) {
      res.status(400).json({ error: 'Please provide your registered email address.' });
      return;
    }
    const user = db.users.find((u) => u.email.toLowerCase() === String(email).trim().toLowerCase());
    if (!user) {
      res.status(404).json({ error: 'No account found matching that email address.' });
      return;
    }
    if (new_password && String(new_password).length >= 8) {
      user.passwordHash = String(new_password);
      saveDatabase(db);
      res.json({ message: 'Password updated! You can now sign in with your new password.' });
      return;
    }
    res.json({
      message: `Password recovery verified for @${user.username}.`,
    });
  });

  // 2. Users & Profile APIs
  app.get('/api/users/', (req: Request, res: Response) => {
    const viewerId = getAuthUserId(req);
    res.json(db.users.map((u) => serializeUser(u, viewerId)));
  });

  app.get('/api/users/:id/', (req: Request, res: Response) => {
    const viewerId = getAuthUserId(req);
    const targetId = Number(req.params.id);
    const user = db.users.find((u) => u.id === targetId);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    const followers = db.follows
      .filter((f) => f.following_id === targetId)
      .map((f) => db.users.find((u) => u.id === f.follower_id))
      .filter(Boolean)
      .map((u) => serializeUser(u!, viewerId));

    const following = db.follows
      .filter((f) => f.follower_id === targetId)
      .map((f) => db.users.find((u) => u.id === f.following_id))
      .filter(Boolean)
      .map((u) => serializeUser(u!, viewerId));

    res.json({
      ...serializeUser(user, viewerId),
      followers,
      following,
    });
  });

  app.put('/api/profile/', (req: Request, res: Response) => {
    const viewerId = getAuthUserId(req);
    const user = db.users.find((u) => u.id === viewerId);
    if (!user) {
      res.status(404).json({ error: 'Authenticated user not found.' });
      return;
    }
    const { full_name, bio, location, website, profile_picture, cover_image } = req.body || {};
    if (typeof full_name === 'string' && full_name.trim()) user.full_name = full_name.trim();
    if (typeof bio === 'string') user.bio = bio.trim();
    if (typeof location === 'string') user.location = location.trim();
    if (typeof website === 'string') user.website = website.trim();
    if (typeof profile_picture === 'string' && profile_picture.trim()) {
      user.profile_picture = profile_picture.trim();
    }
    if (typeof cover_image === 'string' && cover_image.trim()) {
      user.cover_image = cover_image.trim();
    }
    saveDatabase(db);
    res.json(serializeUser(user, viewerId));
  });

  // 3. Posts Feed & CRUD APIs
  app.get('/api/posts/', (req: Request, res: Response) => {
    const viewerId = getAuthUserId(req);
    const filter = String(req.query.filter || 'all');
    const userId = req.query.user_id ? Number(req.query.user_id) : null;
    const hashtag = req.query.hashtag ? String(req.query.hashtag).toLowerCase() : null;

    let postsList = [...db.posts].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    if (userId) {
      if (filter === 'liked') {
        const likedIds = new Set(
          db.likes.filter((l) => l.user_id === userId).map((l) => l.post_id)
        );
        postsList = postsList.filter((p) => likedIds.has(p.id));
      } else if (filter === 'media') {
        postsList = postsList.filter(
          (p) => p.user_id === userId && (p.image || (p.images && p.images.length > 0))
        );
      } else {
        postsList = postsList.filter((p) => p.user_id === userId);
      }
    } else if (filter === 'following') {
      const followingIds = new Set(
        db.follows.filter((f) => f.follower_id === viewerId).map((f) => f.following_id)
      );
      followingIds.add(viewerId);
      postsList = postsList.filter((p) => followingIds.has(p.user_id));
    } else if (filter === 'popular') {
      postsList.sort((a, b) => {
        const aLikes = db.likes.filter((l) => l.post_id === a.id).length;
        const bLikes = db.likes.filter((l) => l.post_id === b.id).length;
        return bLikes - aLikes;
      });
    } else if (filter === 'bookmarked') {
      const bookmarkedIds = new Set(
        db.bookmarks.filter((b) => b.user_id === viewerId).map((b) => b.post_id)
      );
      postsList = postsList.filter((p) => bookmarkedIds.has(p.id));
    }

    if (hashtag) {
      postsList = postsList.filter((p) =>
        p.hashtags.map((h) => h.toLowerCase()).includes(hashtag)
      );
    }

    res.json(postsList.map((p) => serializePost(p.id, viewerId)).filter(Boolean));
  });

  app.post('/api/posts/', (req: Request, res: Response) => {
    const viewerId = getAuthUserId(req);
    const { content = '', images = [], image = '', location = '' } = req.body || {};
    const trimmed = String(content).trim();
    const mediaList: string[] = Array.isArray(images) && images.length > 0
      ? images.filter(Boolean)
      : image
      ? [String(image)]
      : [];

    if (!trimmed && mediaList.length === 0) {
      res.status(400).json({ error: 'Post cannot be empty. Write something or attach an image.' });
      return;
    }

    const hashtags = extractHashtags(trimmed);
    const mentions = extractMentions(trimmed);
    const now = new Date().toISOString();

    const newPost = {
      id: Math.max(0, ...db.posts.map((p) => p.id)) + 1,
      user_id: viewerId,
      content: trimmed,
      image: mediaList[0] || '',
      images: mediaList,
      location: String(location).trim(),
      hashtags,
      mentions,
      shares_count: 0,
      created_at: now,
      updated_at: now,
    };

    db.posts.unshift(newPost);

    // Trigger mention notifications
    for (const uname of mentions) {
      const targetUser = db.users.find((u) => u.username.toLowerCase() === uname);
      if (targetUser && targetUser.id !== viewerId) {
        db.notifications.unshift({
          id: Math.max(0, ...db.notifications.map((n) => n.id)) + 1,
          recipient_id: targetUser.id,
          sender_id: viewerId,
          notification_type: 'mention',
          post_id: newPost.id,
          comment_id: null,
          is_read: false,
          created_at: now,
        });
      }
    }

    saveDatabase(db);
    res.status(201).json(serializePost(newPost.id, viewerId));
  });

  app.put('/api/posts/:id/', (req: Request, res: Response) => {
    const viewerId = getAuthUserId(req);
    const postId = Number(req.params.id);
    const post = db.posts.find((p) => p.id === postId);
    if (!post) {
      res.status(404).json({ error: 'Post not found.' });
      return;
    }
    if (post.user_id !== viewerId) {
      res.status(403).json({ error: 'Unauthorized action: You can only edit your own posts.' });
      return;
    }
    const { content, location, images } = req.body || {};
    const nextContent = typeof content === 'string' ? content.trim() : post.content;
    const nextImages = Array.isArray(images) ? images : post.images;

    if (!nextContent && (!nextImages || nextImages.length === 0)) {
      res.status(400).json({ error: 'Post cannot be empty.' });
      return;
    }

    post.content = nextContent;
    post.location = typeof location === 'string' ? location.trim() : post.location;
    post.images = nextImages;
    post.image = nextImages[0] || '';
    post.hashtags = extractHashtags(nextContent);
    post.mentions = extractMentions(nextContent);
    post.updated_at = new Date().toISOString();

    saveDatabase(db);
    res.json(serializePost(post.id, viewerId));
  });

  app.delete('/api/posts/:id/', (req: Request, res: Response) => {
    const viewerId = getAuthUserId(req);
    const postId = Number(req.params.id);
    const postIndex = db.posts.findIndex((p) => p.id === postId);
    if (postIndex === -1) {
      res.status(404).json({ error: 'Post not found.' });
      return;
    }
    if (db.posts[postIndex].user_id !== viewerId) {
      res.status(403).json({ error: 'Unauthorized action: You can only delete your own posts.' });
      return;
    }
    db.posts.splice(postIndex, 1);
    db.comments = db.comments.filter((c) => c.post_id !== postId);
    db.likes = db.likes.filter((l) => l.post_id !== postId);
    db.bookmarks = db.bookmarks.filter((b) => b.post_id !== postId);
    saveDatabase(db);
    res.json({ message: 'Post deleted.' });
  });

  // 4. Like & Share System
  app.post('/api/posts/:id/like/', (req: Request, res: Response) => {
    const viewerId = getAuthUserId(req);
    const postId = Number(req.params.id);
    const post = db.posts.find((p) => p.id === postId);
    if (!post) {
      res.status(404).json({ error: 'Post not found.' });
      return;
    }

    const existingIdx = db.likes.findIndex(
      (l) => l.post_id === postId && l.user_id === viewerId
    );
    let liked = false;
    if (existingIdx >= 0) {
      db.likes.splice(existingIdx, 1);
      liked = false;
    } else {
      db.likes.push({
        id: Math.max(0, ...db.likes.map((l) => l.id)) + 1,
        user_id: viewerId,
        post_id: postId,
        created_at: new Date().toISOString(),
      });
      liked = true;
      if (post.user_id !== viewerId) {
        db.notifications.unshift({
          id: Math.max(0, ...db.notifications.map((n) => n.id)) + 1,
          recipient_id: post.user_id,
          sender_id: viewerId,
          notification_type: 'like',
          post_id: postId,
          comment_id: null,
          is_read: false,
          created_at: new Date().toISOString(),
        });
      }
    }

    saveDatabase(db);
    const likes_count = db.likes.filter((l) => l.post_id === postId).length;
    res.json({ is_liked: liked, likes_count });
  });

  app.post('/api/posts/:id/share/', (req: Request, res: Response) => {
    const postId = Number(req.params.id);
    const post = db.posts.find((p) => p.id === postId);
    if (!post) {
      res.status(404).json({ error: 'Post not found.' });
      return;
    }
    post.shares_count += 1;
    saveDatabase(db);
    res.json({ shares_count: post.shares_count });
  });

  // 5. Nested Comments System
  app.post('/api/posts/:id/comment/', (req: Request, res: Response) => {
    const viewerId = getAuthUserId(req);
    const postId = Number(req.params.id);
    const post = db.posts.find((p) => p.id === postId);
    if (!post) {
      res.status(404).json({ error: 'Post not found.' });
      return;
    }
    const { content = '', parent_comment_id = null } = req.body || {};
    const trimmed = String(content).trim();
    if (!trimmed) {
      res.status(400).json({ error: 'Comment cannot be empty.' });
      return;
    }

    const now = new Date().toISOString();
    const newComment: DBComment = {
      id: Math.max(0, ...db.comments.map((c) => c.id)) + 1,
      post_id: postId,
      user_id: viewerId,
      parent_comment_id: parent_comment_id ? Number(parent_comment_id) : null,
      content: trimmed,
      created_at: now,
      updated_at: now,
    };

    db.comments.push(newComment);

    if (newComment.parent_comment_id) {
      const parentComment = db.comments.find((c) => c.id === newComment.parent_comment_id);
      if (parentComment && parentComment.user_id !== viewerId) {
        db.notifications.unshift({
          id: Math.max(0, ...db.notifications.map((n) => n.id)) + 1,
          recipient_id: parentComment.user_id,
          sender_id: viewerId,
          notification_type: 'reply',
          post_id: postId,
          comment_id: newComment.id,
          is_read: false,
          created_at: now,
        });
      }
    } else if (post.user_id !== viewerId) {
      db.notifications.unshift({
        id: Math.max(0, ...db.notifications.map((n) => n.id)) + 1,
        recipient_id: post.user_id,
        sender_id: viewerId,
        notification_type: 'comment',
        post_id: postId,
        comment_id: newComment.id,
        is_read: false,
        created_at: now,
      });
    }

    // Also notify any @mentions inside the comment
    const mentions = extractMentions(trimmed);
    for (const uname of mentions) {
      const mentioned = db.users.find((u) => u.username.toLowerCase() === uname);
      if (mentioned && mentioned.id !== viewerId) {
        db.notifications.unshift({
          id: Math.max(0, ...db.notifications.map((n) => n.id)) + 1,
          recipient_id: mentioned.id,
          sender_id: viewerId,
          notification_type: 'mention',
          post_id: postId,
          comment_id: newComment.id,
          is_read: false,
          created_at: now,
        });
      }
    }

    saveDatabase(db);
    res.status(201).json(serializePost(postId, viewerId));
  });

  app.put('/api/comments/:id/', (req: Request, res: Response) => {
    const viewerId = getAuthUserId(req);
    const commentId = Number(req.params.id);
    const comment = db.comments.find((c) => c.id === commentId);
    if (!comment) {
      res.status(404).json({ error: 'Comment not found.' });
      return;
    }
    if (comment.user_id !== viewerId) {
      res.status(403).json({ error: 'Unauthorized: You can only edit your own comments.' });
      return;
    }
    const trimmed = String(req.body?.content || '').trim();
    if (!trimmed) {
      res.status(400).json({ error: 'Comment content cannot be empty.' });
      return;
    }
    comment.content = trimmed;
    comment.updated_at = new Date().toISOString();
    saveDatabase(db);
    res.json(serializePost(comment.post_id, viewerId));
  });

  app.delete('/api/comments/:id/', (req: Request, res: Response) => {
    const viewerId = getAuthUserId(req);
    const commentId = Number(req.params.id);
    const comment = db.comments.find((c) => c.id === commentId);
    if (!comment) {
      res.status(404).json({ error: 'Comment not found.' });
      return;
    }
    if (comment.user_id !== viewerId) {
      res.status(403).json({ error: 'Unauthorized: You can only delete your own comments.' });
      return;
    }
    const postId = comment.post_id;
    // Remove comment and any nested replies
    const idsToDelete = new Set<number>([commentId]);
    let added = true;
    while (added) {
      added = false;
      for (const c of db.comments) {
        if (c.parent_comment_id && idsToDelete.has(c.parent_comment_id) && !idsToDelete.has(c.id)) {
          idsToDelete.add(c.id);
          added = true;
        }
      }
    }
    db.comments = db.comments.filter((c) => !idsToDelete.has(c.id));
    db.commentLikes = db.commentLikes.filter((cl) => !idsToDelete.has(cl.comment_id));
    saveDatabase(db);
    res.json(serializePost(postId, viewerId));
  });

  app.post('/api/comments/:id/like/', (req: Request, res: Response) => {
    const viewerId = getAuthUserId(req);
    const commentId = Number(req.params.id);
    const comment = db.comments.find((c) => c.id === commentId);
    if (!comment) {
      res.status(404).json({ error: 'Comment not found.' });
      return;
    }
    const existingIdx = db.commentLikes.findIndex(
      (cl) => cl.comment_id === commentId && cl.user_id === viewerId
    );
    if (existingIdx >= 0) {
      db.commentLikes.splice(existingIdx, 1);
    } else {
      db.commentLikes.push({
        id: Math.max(0, ...db.commentLikes.map((cl) => cl.id)) + 1,
        user_id: viewerId,
        comment_id: commentId,
      });
    }
    saveDatabase(db);
    res.json(serializePost(comment.post_id, viewerId));
  });

  // 6. Follow / Unfollow System
  app.post('/api/users/:id/follow/', (req: Request, res: Response) => {
    const viewerId = getAuthUserId(req);
    const targetId = Number(req.params.id);
    if (viewerId === targetId) {
      res.status(400).json({ error: 'You cannot follow yourself.' });
      return;
    }
    const targetUser = db.users.find((u) => u.id === targetId);
    if (!targetUser) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    const exists = db.follows.some(
      (f) => f.follower_id === viewerId && f.following_id === targetId
    );
    if (!exists) {
      const now = new Date().toISOString();
      db.follows.push({
        id: Math.max(0, ...db.follows.map((f) => f.id)) + 1,
        follower_id: viewerId,
        following_id: targetId,
        created_at: now,
      });
      db.notifications.unshift({
        id: Math.max(0, ...db.notifications.map((n) => n.id)) + 1,
        recipient_id: targetId,
        sender_id: viewerId,
        notification_type: 'follow',
        post_id: null,
        comment_id: null,
        is_read: false,
        created_at: now,
      });
      saveDatabase(db);
    }
    res.json(serializeUser(targetUser, viewerId));
  });

  app.post('/api/users/:id/unfollow/', (req: Request, res: Response) => {
    const viewerId = getAuthUserId(req);
    const targetId = Number(req.params.id);
    const targetUser = db.users.find((u) => u.id === targetId);
    if (!targetUser) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    db.follows = db.follows.filter(
      (f) => !(f.follower_id === viewerId && f.following_id === targetId)
    );
    saveDatabase(db);
    res.json(serializeUser(targetUser, viewerId));
  });

  // 7. Notifications System
  app.get('/api/notifications/', (req: Request, res: Response) => {
    const viewerId = getAuthUserId(req);
    const items = db.notifications
      .filter((n) => n.recipient_id === viewerId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map((n) => {
        const sender = db.users.find((u) => u.id === n.sender_id) || db.users[0];
        const post = n.post_id ? db.posts.find((p) => p.id === n.post_id) : null;
        return {
          id: n.id,
          recipient_id: n.recipient_id,
          sender: serializeUser(sender, viewerId),
          notification_type: n.notification_type,
          post_id: n.post_id,
          post_preview: post ? post.content.slice(0, 70) : '',
          comment_id: n.comment_id,
          is_read: n.is_read,
          created_at: n.created_at,
        };
      });
    res.json(items);
  });

  app.post('/api/notifications/mark-read/', (req: Request, res: Response) => {
    const viewerId = getAuthUserId(req);
    const { id } = req.body || {};
    const notif = db.notifications.find((n) => n.id === Number(id) && n.recipient_id === viewerId);
    if (notif) {
      notif.is_read = true;
      saveDatabase(db);
    }
    res.json({ success: true });
  });

  app.post('/api/notifications/mark-all-read/', (req: Request, res: Response) => {
    const viewerId = getAuthUserId(req);
    db.notifications.forEach((n) => {
      if (n.recipient_id === viewerId) n.is_read = true;
    });
    saveDatabase(db);
    res.json({ success: true });
  });

  // 8. Bookmarks System
  app.get('/api/bookmarks/', (req: Request, res: Response) => {
    const viewerId = getAuthUserId(req);
    const bookmarkedPostIds = db.bookmarks
      .filter((b) => b.user_id === viewerId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map((b) => b.post_id);

    const savedPosts = bookmarkedPostIds
      .map((pid) => serializePost(pid, viewerId))
      .filter(Boolean);
    res.json(savedPosts);
  });

  app.post('/api/bookmarks/', (req: Request, res: Response) => {
    const viewerId = getAuthUserId(req);
    const postId = Number(req.body?.post_id);
    const existingIdx = db.bookmarks.findIndex(
      (b) => b.user_id === viewerId && b.post_id === postId
    );
    let is_bookmarked = false;
    if (existingIdx >= 0) {
      db.bookmarks.splice(existingIdx, 1);
      is_bookmarked = false;
    } else {
      db.bookmarks.push({
        id: Math.max(0, ...db.bookmarks.map((b) => b.id)) + 1,
        user_id: viewerId,
        post_id: postId,
        created_at: new Date().toISOString(),
      });
      is_bookmarked = true;
    }
    saveDatabase(db);
    res.json({ is_bookmarked, post_id: postId });
  });

  // 9. Messaging System
  app.get('/api/messages/', (req: Request, res: Response) => {
    const viewerId = getAuthUserId(req);
    const partnerId = req.query.user_id ? Number(req.query.user_id) : null;

    if (partnerId) {
      db.messages.forEach((m) => {
        if (m.sender_id === partnerId && m.receiver_id === viewerId) {
          m.is_read = true;
        }
      });
      saveDatabase(db);
      const thread = db.messages
        .filter(
          (m) =>
            (m.sender_id === viewerId && m.receiver_id === partnerId) ||
            (m.sender_id === partnerId && m.receiver_id === viewerId)
        )
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      res.json(thread);
      return;
    }

    res.json(
      db.messages.filter((m) => m.sender_id === viewerId || m.receiver_id === viewerId)
    );
  });

  app.post('/api/messages/', (req: Request, res: Response) => {
    const viewerId = getAuthUserId(req);
    const { receiver_id, content = '', attachment = '' } = req.body || {};
    const targetId = Number(receiver_id);
    const trimmed = String(content).trim();
    if (!trimmed && !attachment) {
      res.status(400).json({ error: 'Message cannot be empty.' });
      return;
    }
    const newMsg = {
      id: Math.max(0, ...db.messages.map((m) => m.id)) + 1,
      sender_id: viewerId,
      receiver_id: targetId,
      content: trimmed,
      attachment: String(attachment),
      is_read: false,
      created_at: new Date().toISOString(),
    };
    db.messages.push(newMsg);
    saveDatabase(db);
    res.status(201).json(newMsg);
  });

  // 10. Stories System
  app.get('/api/stories/', (req: Request, res: Response) => {
    const viewerId = getAuthUserId(req);
    const enriched = db.stories.map((s) => {
      const author = db.users.find((u) => u.id === s.user_id) || db.users[0];
      return {
        ...s,
        user: serializeUser(author, viewerId),
        is_viewed: s.viewed_by.includes(viewerId),
      };
    });
    res.json(enriched);
  });

  app.post('/api/stories/', (req: Request, res: Response) => {
    const viewerId = getAuthUserId(req);
    const { media, caption = '' } = req.body || {};
    if (!media) {
      res.status(400).json({ error: 'Please select or upload an image for your story.' });
      return;
    }
    const now = new Date();
    const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const newStory = {
      id: Math.max(0, ...db.stories.map((s) => s.id)) + 1,
      user_id: viewerId,
      media: String(media),
      caption: String(caption).trim(),
      created_at: now.toISOString(),
      expires_at: expires.toISOString(),
      viewed_by: [viewerId],
    };
    db.stories.unshift(newStory);
    saveDatabase(db);
    const author = db.users.find((u) => u.id === viewerId) || db.users[0];
    res.status(201).json({
      ...newStory,
      user: serializeUser(author, viewerId),
      is_viewed: true,
    });
  });

  app.post('/api/stories/:id/view/', (req: Request, res: Response) => {
    const viewerId = getAuthUserId(req);
    const story = db.stories.find((s) => s.id === Number(req.params.id));
    if (story && !story.viewed_by.includes(viewerId)) {
      story.viewed_by.push(viewerId);
      saveDatabase(db);
    }
    res.json({ success: true });
  });

  // 11. Real-Time Search & Trending Hashtags API
  app.get('/api/search/', (req: Request, res: Response) => {
    const viewerId = getAuthUserId(req);
    const q = String(req.query.q || '').trim().toLowerCase();

    // Calculate trending hashtags across all posts
    const tagCounts = new Map<string, number>();
    db.posts.forEach((p) => {
      p.hashtags.forEach((tag) => {
        const clean = tag.toLowerCase();
        tagCounts.set(clean, (tagCounts.get(clean) || 0) + 1);
      });
    });
    const trendingHashtags = Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);

    if (!q) {
      res.json({
        users: db.users.slice(0, 5).map((u) => serializeUser(u, viewerId)),
        posts: [],
        hashtags: trendingHashtags.slice(0, 8),
      });
      return;
    }

    const cleanQ = q.replace(/^[@#]/, '');
    const matchingUsers = db.users
      .filter(
        (u) =>
          u.username.toLowerCase().includes(cleanQ) ||
          u.full_name.toLowerCase().includes(cleanQ) ||
          u.bio.toLowerCase().includes(cleanQ) ||
          u.location.toLowerCase().includes(cleanQ)
      )
      .map((u) => serializeUser(u, viewerId));

    const matchingPosts = db.posts
      .filter(
        (p) =>
          p.content.toLowerCase().includes(cleanQ) ||
          p.location.toLowerCase().includes(cleanQ) ||
          p.hashtags.some((h) => h.toLowerCase().includes(cleanQ))
      )
      .map((p) => serializePost(p.id, viewerId))
      .filter(Boolean);

    const matchingTags = trendingHashtags.filter((t) => t.tag.includes(cleanQ));

    res.json({
      users: matchingUsers,
      posts: matchingPosts,
      hashtags: matchingTags,
    });
  });

  const ALL_PROJECT_FILE_PATHS = [
    'social_media/README.md',
    'social_media/requirements.txt',
    'social_media/backend/manage.py',
    'social_media/backend/social_media/settings.py',
    'social_media/backend/social_media/urls.py',
    'social_media/backend/social_media/wsgi.py',
    'social_media/backend/api/models.py',
    'social_media/backend/api/serializers.py',
    'social_media/backend/api/views.py',
    'social_media/backend/api/urls.py',
    'social_media/backend/api/management/commands/seed_data.py',
    'social_media/frontend/index.html',
    'social_media/frontend/login.html',
    'social_media/frontend/register.html',
    'social_media/frontend/profile.html',
    'social_media/frontend/explore.html',
    'social_media/frontend/notifications.html',
    'social_media/frontend/messages.html',
    'social_media/frontend/settings.html',
    'social_media/frontend/js/app.js',
    'social_media/frontend/css/style.css',
    'package.json',
    'tsconfig.json',
    'vite.config.ts',
    'index.html',
    'metadata.json',
    'server.ts',
    'src/main.tsx',
    'src/index.css',
    'src/types.ts',
    'src/App.tsx',
    'src/api/client.ts',
    'src/data/seedData.ts',
    'src/components/ResilientMedia.tsx',
    'src/components/PostCard.tsx',
    'src/components/Modals.tsx',
    'src/components/AuthPortal.tsx',
    'src/components/MessagesView.tsx',
    'src/components/ArchitectureView.tsx',
  ];

  // 12. Django + DRF + Full-Stack Project Source Code Explorer Endpoint
  app.get('/api/project-files/', (_req: Request, res: Response) => {
    const result: Record<string, string> = {};
    for (const relPath of ALL_PROJECT_FILE_PATHS) {
      const absPath = path.resolve(process.cwd(), relPath);
      if (fs.existsSync(absPath)) {
        result[relPath] = fs.readFileSync(absPath, 'utf-8');
      }
    }
    res.json(result);
  });

  // 13. Download Full Project as .ZIP Archive using JSZip
  app.get('/api/download-zip/', async (_req: Request, res: Response) => {
    try {
      const zip = new JSZip();
      for (const relPath of ALL_PROJECT_FILE_PATHS) {
        const absPath = path.resolve(process.cwd(), relPath);
        if (fs.existsSync(absPath)) {
          const content = fs.readFileSync(absPath);
          zip.file(relPath, content);
        }
      }
      const zipBuffer = await zip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="aether_social_media_project.zip"'
      );
      res.setHeader('Content-Length', String(zipBuffer.length));
      res.end(zipBuffer);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to build ZIP archive' });
    }
  });

  // Mount Vite or Static Dist
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Aether Social Platform running on http://localhost:${PORT}`);
  });
}

startServer();
