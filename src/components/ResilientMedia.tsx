import React, { useState } from 'react';

interface AvatarProps {
  src?: string;
  alt: string;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isOnline?: boolean;
  onClick?: () => void;
}

const SIZE_CLASSES = {
  xs: 'w-7 h-7 text-xs',
  sm: 'w-9 h-9 text-xs',
  md: 'w-11 h-11 text-sm',
  lg: 'w-16 h-16 text-lg',
  xl: 'w-24 h-24 text-2xl',
};

export const UserAvatar: React.FC<AvatarProps> = ({
  src,
  alt,
  name,
  size = 'md',
  isOnline,
  onClick,
}) => {
  const [failed, setFailed] = useState(false);
  const initials = (name || alt || 'U')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex shrink-0 select-none ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      {src && !failed ? (
        <img
          src={src}
          alt={alt}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className={`${SIZE_CLASSES[size]} rounded-full object-cover border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800`}
        />
      ) : (
        <div
          className={`${SIZE_CLASSES[size]} rounded-full flex items-center justify-center font-display font-medium bg-slate-900 text-slate-50 dark:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700`}
        >
          {initials}
        </div>
      )}
      {typeof isOnline === 'boolean' && (
        <span
          title={isOnline ? 'Online' : 'Offline'}
          className={`absolute bottom-0 right-0 block rounded-full ring-2 ring-white dark:ring-[#0B0F17] ${
            size === 'xl' || size === 'lg' ? 'w-3.5 h-3.5' : 'w-2.5 h-2.5'
          } ${isOnline ? 'bg-emerald-600' : 'bg-slate-400 dark:bg-slate-600'}`}
        />
      )}
    </div>
  );
};

interface ResilientImageProps {
  src: string;
  alt: string;
  className?: string;
  onClick?: () => void;
  aspectClass?: string;
}

export const ResilientImage: React.FC<ResilientImageProps> = ({
  src,
  alt,
  className = '',
  onClick,
  aspectClass = 'aspect-[16/10]',
}) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        onClick={onClick}
        className={`w-full ${aspectClass} bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-6 text-center rounded-xl border border-slate-200/60 dark:border-slate-800 ${
          onClick ? 'cursor-pointer' : ''
        }`}
      >
        <i className="fa-regular fa-compass text-2xl text-slate-400 mb-2" aria-hidden="true" />
        <p className="font-display text-lg text-slate-200 max-w-md">{alt || 'Editorial Visual Study'}</p>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      onClick={onClick}
      className={`${className} ${onClick ? 'cursor-pointer' : ''}`}
    />
  );
};

export function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return 'Just now';
  const now = new Date('2026-09-30T12:15:00Z');
  const currentReal = new Date();
  const ref = date > now ? currentReal : now;
  const diffSeconds = Math.max(1, Math.floor((ref.getTime() - date.getTime()) / 1000));

  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function renderRichPostContent(
  content: string,
  onHashtagClick: (tag: string) => void,
  onMentionClick: (username: string) => void
): React.ReactNode {
  const tokens = content.split(/(#[a-zA-Z0-9_]+|@[a-zA-Z0-9_]+)/g);
  return tokens.map((token, idx) => {
    if (token.startsWith('#') && token.length > 1) {
      const tag = token.slice(1);
      return (
        <button
          key={idx}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onHashtagClick(tag);
          }}
          className="text-blue-700 dark:text-blue-400 font-medium hover:underline underline-offset-4 transition-colors inline"
        >
          {token}
        </button>
      );
    }
    if (token.startsWith('@') && token.length > 1) {
      const uname = token.slice(1);
      return (
        <button
          key={idx}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMentionClick(uname);
          }}
          className="text-slate-900 dark:text-slate-100 font-semibold hover:underline underline-offset-4 transition-colors inline"
        >
          {token}
        </button>
      );
    }
    return <React.Fragment key={idx}>{token}</React.Fragment>;
  });
}
