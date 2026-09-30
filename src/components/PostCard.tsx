import React, { useState } from 'react';
import { CommentItem, PostItem, UserProfile } from '../types';
import {
  formatRelativeTime,
   renderRichPostContent,
  ResilientImage,
  UserAvatar,
} from './ResilientMedia';

interface PostCardProps {
  post: PostItem;
  currentUser: UserProfile;
  onUserClick: (userId: number) => void;
  onMentionClick: (username: string) => void;
  onHashtagClick: (hashtag: string) => void;
  onToggleLike: (postId: number) => Promise<void>;
  onToggleBookmark: (postId: number) => Promise<void>;
  onSharePost: (postId: number) => Promise<void>;
  onEditPost: (post: PostItem) => void;
  onDeletePost: (postId: number) => void;
  onReportPost: (postId: number) => void;
  onAddComment: (postId: number, content: string, parentCommentId: number | null) => Promise<void>;
  onEditComment: (commentId: number, content: string) => Promise<void>;
  onDeleteComment: (commentId: number) => Promise<void>;
  onToggleCommentLike: (commentId: number) => Promise<void>;
  onPreviewImage: (src: string, caption: string) => void;
}

interface NestedCommentNodeProps {
  comment: CommentItem;
  postId: number;
  depth: number;
  currentUser: UserProfile;
  onUserClick: (userId: number) => void;
  onMentionClick: (username: string) => void;
  onHashtagClick: (hashtag: string) => void;
  onAddReply: (postId: number, content: string, parentCommentId: number) => Promise<void>;
  onEditComment: (commentId: number, content: string) => Promise<void>;
  onDeleteComment: (commentId: number) => Promise<void>;
  onToggleCommentLike: (commentId: number) => Promise<void>;
}

const NestedCommentNode: React.FC<NestedCommentNodeProps> = ({
  comment,
  postId,
  depth,
  currentUser,
  onUserClick,
  onMentionClick,
  onHashtagClick,
  onAddReply,
  onEditComment,
  onDeleteComment,
  onToggleCommentLike,
}) => {
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const [submitting, setSubmitting] = useState(false);

  const isOwner = comment.user.id === currentUser.id;

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onAddReply(postId, replyText.trim(), comment.id);
      setReplyText('');
      setIsReplying(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editText.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onEditComment(comment.id, editText.trim());
      setIsEditing(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={`${
        depth > 0
          ? 'ml-5 pl-4 border-l border-slate-200 dark:border-slate-800 mt-3'
          : 'mt-3.5 pt-3.5 border-t border-slate-100 dark:border-slate-800/70 first:border-t-0 first:pt-0'
      }`}
    >
      <div className="flex items-start gap-3">
        <UserAvatar
          src={comment.user.profile_picture}
          alt={comment.user.full_name}
          name={comment.user.full_name}
          size="xs"
          onClick={() => onUserClick(comment.user.id)}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
              <button
                type="button"
                onClick={() => onUserClick(comment.user.id)}
                className="font-semibold text-slate-900 dark:text-slate-100 hover:underline"
              >
                {comment.user.full_name}
              </button>
              <span>@{comment.user.username}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{formatRelativeTime(comment.created_at)}</span>
            </div>
          </div>

          {isEditing ? (
            <form onSubmit={handleEditSubmit} className="mt-2 space-y-2">
              <input
                type="text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full px-3 py-1.5 text-sm rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
              />
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3 py-1 text-xs font-medium bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-md whitespace-nowrap"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setEditText(comment.content);
                  }}
                  className="px-3 py-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 whitespace-nowrap"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <p className="text-sm text-slate-800 dark:text-slate-200 mt-1 leading-relaxed break-words">
              {renderRichPostContent(comment.content, onHashtagClick, onMentionClick)}
            </p>
          )}

          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400">
            <button
              type="button"
              onClick={() => onToggleCommentLike(comment.id)}
              className={`inline-flex items-center gap-1.5 transition-colors hover:text-rose-600 ${
                comment.is_liked ? 'text-rose-600 font-medium' : ''
              }`}
            >
              <i
                className={`${comment.is_liked ? 'fa-solid' : 'fa-regular'} fa-heart text-[11px]`}
                aria-hidden="true"
              />
              <span className="tabular-nums">{comment.likes_count || 'Like'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsReplying(!isReplying);
                if (!replyText) setReplyText(`@${comment.user.username} `);
              }}
              className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
            >
              Reply
            </button>

            {isOwner && !isEditing && (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteComment(comment.id)}
                  className="hover:text-rose-600 transition-colors"
                >
                  Delete
                </button>
              </>
            )}
          </div>

          {isReplying && (
            <form onSubmit={handleReplySubmit} className="mt-2.5 flex items-center gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Reply to @${comment.user.username}...`}
                className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
                autoFocus
              />
              <button
                type="submit"
                disabled={submitting || !replyText.trim()}
                className="px-3 py-1.5 text-xs font-medium bg-blue-700 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap"
              >
                Reply
              </button>
            </form>
          )}

          {comment.replies && comment.replies.length > 0 && (
            <div className="space-y-2">
              {comment.replies.map((reply) => (
                <NestedCommentNode
                  key={reply.id}
                  comment={reply}
                  postId={postId}
                  depth={depth + 1}
                  currentUser={currentUser}
                  onUserClick={onUserClick}
                  onMentionClick={onMentionClick}
                  onHashtagClick={onHashtagClick}
                  onAddReply={onAddReply}
                  onEditComment={onEditComment}
                  onDeleteComment={onDeleteComment}
                  onToggleCommentLike={onToggleCommentLike}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const PostCard: React.FC<PostCardProps> = ({
  post,
  currentUser,
  onUserClick,
  onMentionClick,
  onHashtagClick,
  onToggleLike,
  onToggleBookmark,
  onSharePost,
  onEditPost,
  onDeletePost,
  onReportPost,
  onAddComment,
  onEditComment,
  onDeleteComment,
  onToggleCommentLike,
  onPreviewImage,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(post.comments.length > 0 && post.id <= 2);
  const [commentInput, setCommentInput] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const isOwner = post.user.id === currentUser.id;
  const mediaList =
    post.images && post.images.length > 0 ? post.images : post.image ? [post.image] : [];

  const handleRootCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      await onAddComment(post.id, commentInput.trim(), null);
      setCommentInput('');
      setCommentsOpen(true);
    } finally {
      setSubmittingComment(false);
    }
  };

  return (
    <article className="bg-white dark:bg-[#131822] border border-slate-200/80 dark:border-slate-800/90 rounded-2xl p-5 sm:p-6 shadow-xs hover:scale-[1.008] hover:shadow-md hover:shadow-slate-900/5 dark:hover:shadow-black/35 hover:border-slate-300/90 dark:hover:border-slate-700/90 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <UserAvatar
            src={post.user.profile_picture}
            alt={post.user.full_name}
            name={post.user.full_name}
            size="md"
            isOnline={post.user.is_online}
            onClick={() => onUserClick(post.user.id)}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => onUserClick(post.user.id)}
                className="text-sm font-semibold text-slate-900 dark:text-slate-100 hover:underline truncate"
              >
                {post.user.full_name}
              </button>
              <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                @{post.user.username}
              </span>
            </div>
            {/* Clean unboxed metadata with typographic separators */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
              <span className="tabular-nums">{formatRelativeTime(post.created_at)}</span>
              {post.location && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="truncate max-w-[220px]">{post.location}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Three-dot dropdown menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Post options"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
          >
            <i className="fa-solid fa-ellipsis" aria-hidden="true" />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 mt-1 w-44 z-30 bg-white dark:bg-[#181F2C] border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg py-1.5 text-xs">
                {isOwner && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onEditPost(post);
                      }}
                      className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <i className="fa-regular fa-pen-to-square w-4" aria-hidden="true" />
                      <span>Edit Post</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onDeletePost(post.id);
                      }}
                      className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    >
                      <i className="fa-regular fa-trash-can w-4" aria-hidden="true" />
                      <span>Delete Post</span>
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onReportPost(post.id);
                  }}
                  className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <i className="fa-regular fa-flag w-4" aria-hidden="true" />
                  <span>Report Post</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Post Text */}
      {post.content && (
        <div className="mt-3.5 text-[15px] leading-[1.65] text-slate-800 dark:text-slate-200 whitespace-pre-line break-words max-w-[72ch]">
          {renderRichPostContent(post.content, onHashtagClick, onMentionClick)}
        </div>
      )}

      {/* Media Gallery */}
      {mediaList.length > 0 && (
        <div
          className={`mt-4 grid gap-2.5 ${
            mediaList.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'
          }`}
        >
          {mediaList.map((imgUrl, idx) => (
            <div
              key={idx}
              className="overflow-hidden rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-100 dark:bg-slate-900"
            >
              <ResilientImage
                src={imgUrl}
                alt={`Post media by ${post.user.full_name}`}
                onClick={() => onPreviewImage(imgUrl, post.content)}
                className="w-full max-h-[440px] object-cover hover:scale-[1.01] transition-transform duration-200"
              />
            </div>
          ))}
        </div>
      )}

      {/* Action Bar */}
      <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 sm:gap-3">
          {/* Like */}
          <button
            type="button"
            onClick={() => onToggleLike(post.id)}
            className={`min-h-[40px] px-3 py-1.5 rounded-lg inline-flex items-center gap-2 text-xs font-medium transition-colors whitespace-nowrap ${
              post.is_liked
                ? 'text-rose-600 bg-rose-50/80 dark:bg-rose-950/30'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <i
              className={`${post.is_liked ? 'fa-solid' : 'fa-regular'} fa-heart text-sm`}
              aria-hidden="true"
            />
            <span className="tabular-nums">{post.likes_count}</span>
          </button>

          {/* Comment */}
          <button
            type="button"
            onClick={() => setCommentsOpen(!commentsOpen)}
            className={`min-h-[40px] px-3 py-1.5 rounded-lg inline-flex items-center gap-2 text-xs font-medium transition-colors whitespace-nowrap ${
              commentsOpen
                ? 'text-blue-700 dark:text-blue-400 bg-blue-50/70 dark:bg-blue-950/30'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <i className="fa-regular fa-comment text-sm" aria-hidden="true" />
            <span className="tabular-nums">{post.comments_count}</span>
          </button>

          {/* Share */}
          <button
            type="button"
            onClick={() => onSharePost(post.id)}
            className="min-h-[40px] px-3 py-1.5 rounded-lg inline-flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors whitespace-nowrap"
          >
            <i className="fa-solid fa-share-nodes text-sm" aria-hidden="true" />
            <span className="tabular-nums">{post.shares_count}</span>
          </button>
        </div>

        {/* Bookmark */}
        <button
          type="button"
          onClick={() => onToggleBookmark(post.id)}
          aria-label={post.is_bookmarked ? 'Remove bookmark' : 'Bookmark post'}
          className={`min-h-[40px] px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
            post.is_bookmarked
              ? 'text-blue-700 dark:text-blue-400 bg-blue-50/70 dark:bg-blue-950/30'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <i
            className={`${post.is_bookmarked ? 'fa-solid' : 'fa-regular'} fa-bookmark text-sm`}
            aria-hidden="true"
          />
          <span className="hidden sm:inline">{post.is_bookmarked ? 'Saved' : 'Save'}</span>
        </button>
      </div>

      {/* Expandable Comments & Nested Replies Section */}
      {commentsOpen && (
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <form onSubmit={handleRootCommentSubmit} className="flex items-center gap-2.5">
            <UserAvatar
              src={currentUser.profile_picture}
              alt={currentUser.full_name}
              name={currentUser.full_name}
              size="xs"
            />
            <input
              type="text"
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              placeholder="Add a comment or @mention..."
              className="flex-1 px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-[#0D1119] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
            />
            <button
              type="submit"
              disabled={submittingComment || !commentInput.trim()}
              className="px-4 py-2 text-xs font-medium bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-xl hover:opacity-90 disabled:opacity-40 transition-opacity whitespace-nowrap"
            >
              Post
            </button>
          </form>

          {post.comments && post.comments.length > 0 ? (
            <div className="mt-4">
              {post.comments.map((comment) => (
                <NestedCommentNode
                  key={comment.id}
                  comment={comment}
                  postId={post.id}
                  depth={0}
                  currentUser={currentUser}
                  onUserClick={onUserClick}
                  onMentionClick={onMentionClick}
                  onHashtagClick={onHashtagClick}
                  onAddReply={(pid, text, parentId) => onAddComment(pid, text, parentId)}
                  onEditComment={onEditComment}
                  onDeleteComment={onDeleteComment}
                  onToggleCommentLike={onToggleCommentLike}
                />
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-4">
              No comments yet. Start the conversation above.
            </p>
          )}
        </div>
      )}
    </article>
  );
};
