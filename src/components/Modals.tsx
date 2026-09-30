import React, { useEffect, useState } from 'react';
import { EDITORIAL_CANVASES, GENERATED_IMAGES } from '../data/seedData';
import { PostItem, StoryItem, UserProfile } from '../types';
import { formatRelativeTime, ResilientImage, UserAvatar } from './ResilientMedia';

export const PRESET_MEDIA_GALLERY = [
  { label: 'Lake Como Pavilion', url: GENERATED_IMAGES.pavilion },
  { label: 'Kreuzberg Studio Desk', url: GENERATED_IMAGES.workspace },
  { label: 'Southern Alps Ridge', url: GENERATED_IMAGES.alpine },
  { label: 'Peckham Ceramic Atelier', url: GENERATED_IMAGES.storyAtelier },
  { label: 'Travertine & Bronze Light', url: GENERATED_IMAGES.banner },
  { label: 'Harmonic Resonance Study', url: EDITORIAL_CANVASES.acoustics },
  { label: 'Stoneware Reduction Trial', url: EDITORIAL_CANVASES.ceramics },
  { label: 'Vespera Serif Specimen', url: EDITORIAL_CANVASES.typography },
  { label: 'Fayoum Botanical Archive', url: EDITORIAL_CANVASES.botany },
];

export function handleFileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Invalid image file. Please select a PNG, JPG, SVG, or WebP image.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}

// 1. Story Viewer Modal
interface StoryViewerModalProps {
  stories: StoryItem[];
  initialIndex: number;
  onClose: () => void;
  onSelectUser: (userId: number) => void;
  onStoryViewed: (storyId: number) => void;
}

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  stories,
  initialIndex,
  onClose,
  onSelectUser,
  onStoryViewed,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);

  const currentStory = stories[currentIndex];

  useEffect(() => {
    if (!currentStory) return;
    onStoryViewed(currentStory.id);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (currentIndex < stories.length - 1) {
            setCurrentIndex((idx) => idx + 1);
            return 0;
          } else {
            onClose();
            return 100;
          }
        }
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [currentIndex, currentStory?.id]);

  if (!currentStory) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-md h-[82vh] max-h-[740px] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl flex flex-col justify-between">
        {/* Progress Bars */}
        <div className="relative z-20 p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
          <div className="flex items-center gap-1.5 mb-3">
            {stories.map((st, idx) => (
              <div key={st.id} className="flex-1 h-1 bg-white/25 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-100"
                  style={{
                    width:
                      idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%',
                  }}
                />
              </div>
            ))}
          </div>

          {/* Author Info */}
          <div className="flex items-center justify-between">
            <div
              onClick={() => {
                onClose();
                onSelectUser(currentStory.user.id);
              }}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <UserAvatar
                src={currentStory.user.profile_picture}
                alt={currentStory.user.full_name}
                name={currentStory.user.full_name}
                size="sm"
              />
              <div>
                <p className="text-xs font-semibold text-white">
                  {currentStory.user.full_name}
                </p>
                <p className="text-[11px] text-slate-300 tabular-nums">
                  @{currentStory.user.username} · {formatRelativeTime(currentStory.created_at)} · 24h Story
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close stories"
              className="w-9 h-9 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/70"
            >
              <i className="fa-solid fa-xmark" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Media Background */}
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <ResilientImage
            src={currentStory.media}
            alt={currentStory.caption || 'User story'}
            className="w-full h-full object-cover"
            aspectClass="h-full"
          />
        </div>

        {/* Left/Right Navigation Controls */}
        {currentIndex > 0 && (
          <button
            type="button"
            onClick={() => setCurrentIndex(currentIndex - 1)}
            aria-label="Previous story"
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/80"
          >
            <i className="fa-solid fa-chevron-left text-xs" aria-hidden="true" />
          </button>
        )}
        {currentIndex < stories.length - 1 && (
          <button
            type="button"
            onClick={() => setCurrentIndex(currentIndex + 1)}
            aria-label="Next story"
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/80"
          >
            <i className="fa-solid fa-chevron-right text-xs" aria-hidden="true" />
          </button>
        )}

        {/* Measured Contrast Scrim for Caption */}
        <div className="relative z-20 p-5 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
          {currentStory.caption && (
            <p className="text-sm text-white leading-relaxed">{currentStory.caption}</p>
          )}
        </div>
      </div>
    </div>
  );
};

// 2. Create Story Modal
interface CreateStoryModalProps {
  onClose: () => void;
  onSubmit: (media: string, caption: string) => Promise<void>;
  onError: (msg: string) => void;
}

export const CreateStoryModal: React.FC<CreateStoryModalProps> = ({
  onClose,
  onSubmit,
  onError,
}) => {
  const [media, setMedia] = useState(GENERATED_IMAGES.storyAtelier);
  const [caption, setCaption] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await handleFileToDataUrl(file);
      setMedia(dataUrl);
    } catch (err: any) {
      onError(err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!media || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(media, caption);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white dark:bg-[#131822] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Publish 24-Hour Story
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 max-h-56 bg-slate-900">
            <ResilientImage
              src={media}
              alt="Story preview"
              className="w-full h-56 object-cover"
            />
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <label className="cursor-pointer px-3.5 py-2 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg hover:bg-slate-200 transition-colors inline-flex items-center gap-2">
              <i className="fa-regular fa-image" aria-hidden="true" />
              <span>Upload Custom Image</span>
              <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
            </label>
            <span className="text-xs text-slate-500">or choose a studio preset below:</span>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {PRESET_MEDIA_GALLERY.slice(0, 5).map((preset, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setMedia(preset.url)}
                className={`h-12 rounded-lg overflow-hidden border-2 transition-all ${
                  media === preset.url ? 'border-blue-600 scale-[1.02]' : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              >
                <img
                  src={preset.url}
                  alt={preset.label}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Story Caption
            </label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Describe what you are working on today..."
              className="w-full px-3.5 py-2 text-sm rounded-xl bg-slate-50 dark:bg-[#0D1119] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-medium bg-blue-700 text-white rounded-xl hover:bg-blue-800 transition-colors"
            >
              {submitting ? 'Publishing...' : 'Publish Story'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 3. Edit Profile Modal
interface EditProfileModalProps {
  user: UserProfile;
  onClose: () => void;
  onSave: (payload: Partial<UserProfile>) => Promise<void>;
  onError: (msg: string) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  user,
  onClose,
  onSave,
  onError,
}) => {
  const [fullName, setFullName] = useState(user.full_name);
  const [bio, setBio] = useState(user.bio);
  const [location, setLocation] = useState(user.location);
  const [website, setWebsite] = useState(user.website);
  const [profilePic, setProfilePic] = useState(user.profile_picture);
  const [coverImg, setCoverImg] = useState(user.cover_image);
  const [saving, setSaving] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await handleFileToDataUrl(file);
      setProfilePic(url);
    } catch (err: any) {
      onError(err.message);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await handleFileToDataUrl(file);
      setCoverImg(url);
    } catch (err: any) {
      onError(err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      onError('Full name is required.');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        full_name: fullName.trim(),
        bio: bio.trim(),
        location: location.trim(),
        website: website.trim(),
        profile_picture: profilePic,
        cover_image: coverImg,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-xl bg-white dark:bg-[#131822] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Edit Profile
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Cover Preview */}
          <div className="relative h-32 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900">
            <ResilientImage
              src={coverImg}
              alt="Cover banner"
              className="w-full h-full object-cover"
              aspectClass="h-full"
            />
            <label className="absolute bottom-2.5 right-2.5 cursor-pointer px-3 py-1.5 text-xs font-medium bg-black/70 text-white rounded-lg hover:bg-black/90 inline-flex items-center gap-1.5">
              <i className="fa-solid fa-camera" aria-hidden="true" />
              <span>Change Cover</span>
              <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
            </label>
          </div>

          {/* Avatar Preview */}
          <div className="flex items-center gap-4">
            <UserAvatar src={profilePic} alt={fullName} name={fullName} size="lg" />
            <div>
              <label className="cursor-pointer px-3.5 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg hover:bg-slate-200 inline-flex items-center gap-2">
                <i className="fa-regular fa-user" aria-hidden="true" />
                <span>Upload Profile Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </label>
              <p className="text-[11px] text-slate-500 mt-1">
                Supports PNG, JPG, WebP, or SVG portraits.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full px-3.5 py-2 text-sm rounded-xl bg-slate-50 dark:bg-[#0D1119] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, Country"
                className="w-full px-3.5 py-2 text-sm rounded-xl bg-slate-50 dark:bg-[#0D1119] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Website URL
            </label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://yourstudio.com"
              className="w-full px-3.5 py-2 text-sm rounded-xl bg-slate-50 dark:bg-[#0D1119] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Bio
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl bg-slate-50 dark:bg-[#0D1119] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-medium bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-xl hover:opacity-90 transition-opacity"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 4. Edit Post Modal
interface EditPostModalProps {
  post: PostItem;
  onClose: () => void;
  onSave: (postId: number, payload: { content: string; location: string; images: string[] }) => Promise<void>;
}

export const EditPostModal: React.FC<EditPostModalProps> = ({ post, onClose, onSave }) => {
  const [content, setContent] = useState(post.content);
  const [location, setLocation] = useState(post.location);
  const [images, setImages] = useState<string[]>(post.images || (post.image ? [post.image] : []));
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(post.id, { content, location, images });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white dark:bg-[#131822] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Edit Post</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Post Content (supports #hashtags and @mentions)
            </label>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-[#0D1119] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Add location..."
              className="w-full px-3.5 py-2 text-sm rounded-xl bg-slate-50 dark:bg-[#0D1119] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          {images.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {images.map((img, idx) => (
                <div key={idx} className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800">
                  <ResilientImage src={img} alt="Attached" className="w-full h-28 object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages(images.filter((_, i) => i !== idx))}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/75 text-white text-xs flex items-center justify-center"
                  >
                    <i className="fa-solid fa-xmark" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-medium bg-blue-700 text-white rounded-xl hover:bg-blue-800"
            >
              {saving ? 'Updating...' : 'Update Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 5. Confirmation Dialog Modal
interface ConfirmDialogModalProps {
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
}

export const ConfirmDialogModal: React.FC<ConfirmDialogModalProps> = ({
  title,
  description,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white dark:bg-[#131822] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
          {description}
        </p>
        <div className="flex items-center justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-medium bg-rose-600 text-white rounded-xl hover:bg-rose-700"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

// 6. Followers / Following Modal
interface FollowListModalProps {
  title: string;
  users: UserProfile[];
  currentUserId: number;
  onClose: () => void;
  onSelectUser: (userId: number) => void;
  onToggleFollow: (user: UserProfile) => Promise<void>;
}

export const FollowListModal: React.FC<FollowListModalProps> = ({
  title,
  users,
  currentUserId,
  onClose,
  onSelectUser,
  onToggleFollow,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-[#131822] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xl max-h-[75vh] flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </div>

        <div className="overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/70 mt-2">
          {users.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-8">No accounts in this list yet.</p>
          ) : (
            users.map((u) => (
              <div key={u.id} className="py-3 flex items-center justify-between gap-3">
                <div
                  onClick={() => {
                    onClose();
                    onSelectUser(u.id);
                  }}
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
                    <p className="text-[11px] text-slate-500 truncate">@{u.username}</p>
                  </div>
                </div>
                {u.id !== currentUserId && (
                  <button
                    type="button"
                    onClick={() => onToggleFollow(u)}
                    className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                      u.is_following
                        ? 'border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        : 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:opacity-90'
                    }`}
                  >
                    {u.is_following ? 'Following' : 'Follow'}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
