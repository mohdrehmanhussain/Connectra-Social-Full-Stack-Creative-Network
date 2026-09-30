import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { MessageItem, UserProfile } from '../types';
import { handleFileToDataUrl, PRESET_MEDIA_GALLERY } from './Modals';
import { formatRelativeTime, ResilientImage, UserAvatar } from './ResilientMedia';

interface MessagesViewProps {
  currentUser: UserProfile;
  allUsers: UserProfile[];
  allMessages: MessageItem[];
  onRefreshMessages: () => Promise<void>;
  onSelectProfile: (userId: number) => void;
  onToast: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
}

const QUICK_EMOJIS = ['✨', '🏛️', '📷', '🌿', '🎛️', '🔥', '👏', '🙌', '💡', '☕', '📐', '🎶'];

export const MessagesView: React.FC<MessagesViewProps> = ({
  currentUser,
  allUsers,
  allMessages,
  onRefreshMessages,
  onSelectProfile,
  onToast,
}) => {
  const partners = allUsers.filter((u) => u.id !== currentUser.id);
  const [selectedPartnerId, setSelectedPartnerId] = useState<number>(partners[0]?.id || 2);
  const [searchQuery, setSearchQuery] = useState('');
  const [draftText, setDraftText] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showPresetImages, setShowPresetImages] = useState(false);
  const [sending, setSending] = useState(false);

  const selectedPartner =
    partners.find((p) => p.id === selectedPartnerId) || partners[0];

  useEffect(() => {
    if (selectedPartnerId) {
      apiClient.getMessages(selectedPartnerId).then(() => {
        onRefreshMessages();
      }).catch(() => {});
    }
  }, [selectedPartnerId]);

  const filteredPartners = partners.filter(
    (p) =>
      p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const conversationMessages = allMessages
    .filter(
      (m) =>
        (m.sender_id === currentUser.id && m.receiver_id === selectedPartner?.id) ||
        (m.sender_id === selectedPartner?.id && m.receiver_id === currentUser.id)
    )
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const getUnreadCountForPartner = (partnerId: number) =>
    allMessages.filter(
      (m) => m.sender_id === partnerId && m.receiver_id === currentUser.id && !m.is_read
    ).length;

  const getLastMessageForPartner = (partnerId: number) => {
    const thread = allMessages.filter(
      (m) =>
        (m.sender_id === currentUser.id && m.receiver_id === partnerId) ||
        (m.sender_id === partnerId && m.receiver_id === currentUser.id)
    );
    return thread[thread.length - 1];
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartner) return;
    if (!draftText.trim() && !attachmentUrl) {
      onToast('error', 'Empty message', 'Write a message or attach an image.');
      return;
    }
    setSending(true);
    try {
      await apiClient.sendMessage(selectedPartner.id, draftText.trim(), attachmentUrl);
      setDraftText('');
      setAttachmentUrl('');
      setShowEmojiPicker(false);
      setShowPresetImages(false);
      await onRefreshMessages();
    } catch (err: any) {
      onToast('error', 'Message failed', err.message);
    } finally {
      setSending(false);
    }
  };

  const handleFileAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await handleFileToDataUrl(file);
      setAttachmentUrl(dataUrl);
    } catch (err: any) {
      onToast('error', 'Invalid file', err.message);
    }
  };

  return (
    <div className="bg-white dark:bg-[#131822] border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[640px]">
      {/* Left Conversations List */}
      <div className="md:col-span-4 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 flex flex-col">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Direct Messages
          </h2>
          <div className="mt-2.5 relative">
            <i
              className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-[#0D1119] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>

        <div className="overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-800/60 max-h-[260px] md:max-h-[560px]">
          {filteredPartners.map((partner) => {
            const unread = getUnreadCountForPartner(partner.id);
            const lastMsg = getLastMessageForPartner(partner.id);
            const isSelected = selectedPartner?.id === partner.id;

            return (
              <button
                key={partner.id}
                type="button"
                onClick={() => setSelectedPartnerId(partner.id)}
                className={`w-full p-3.5 text-left flex items-center justify-between gap-2.5 transition-colors ${
                  isSelected
                    ? 'bg-slate-100/90 dark:bg-slate-800/60'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <UserAvatar
                    src={partner.profile_picture}
                    alt={partner.full_name}
                    name={partner.full_name}
                    size="sm"
                    isOnline={partner.is_online}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {partner.full_name}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {lastMsg
                        ? lastMsg.content || 'Sent an image attachment'
                        : `@${partner.username} · Start chat`}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end shrink-0 gap-1">
                  {lastMsg && (
                    <span className="text-[10px] text-slate-400 tabular-nums">
                      {formatRelativeTime(lastMsg.created_at)}
                    </span>
                  )}
                  {unread > 0 && (
                    <span className="w-5 h-5 rounded-full bg-blue-700 text-white text-[10px] font-mono-tabular flex items-center justify-center">
                      {unread}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Chat Thread */}
      <div className="md:col-span-8 flex flex-col justify-between bg-slate-50/40 dark:bg-[#0D1119]/50">
        {selectedPartner ? (
          <>
            {/* Thread Header */}
            <div className="p-4 bg-white dark:bg-[#131822] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div
                onClick={() => onSelectProfile(selectedPartner.id)}
                className="flex items-center gap-3 cursor-pointer"
              >
                <UserAvatar
                  src={selectedPartner.profile_picture}
                  alt={selectedPartner.full_name}
                  name={selectedPartner.full_name}
                  size="sm"
                  isOnline={selectedPartner.is_online}
                />
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 hover:underline">
                    {selectedPartner.full_name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    @{selectedPartner.username} ·{' '}
                    {selectedPartner.is_online ? 'Online now' : 'Offline'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onSelectProfile(selectedPartner.id)}
                className="px-3 py-1.5 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
              >
                View Profile
              </button>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-3.5 max-h-[420px]">
              {conversationMessages.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    No messages with {selectedPartner.full_name} yet
                  </p>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">
                    Send a message, studio note, or image attachment below to start the conversation.
                  </p>
                </div>
              ) : (
                conversationMessages.map((msg) => {
                  const isMine = msg.sender_id === currentUser.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${
                          isMine
                            ? 'bg-slate-900 text-white dark:bg-blue-700 dark:text-white'
                            : 'bg-white dark:bg-[#181F2C] text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-800'
                        }`}
                      >
                        {msg.content && <p className="leading-relaxed">{msg.content}</p>}
                        {msg.attachment && (
                          <div className="mt-2 rounded-xl overflow-hidden border border-white/10">
                            <ResilientImage
                              src={msg.attachment}
                              alt="Message attachment"
                              className="w-full max-h-52 object-cover"
                            />
                          </div>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 mt-1 px-1 tabular-nums">
                        {formatRelativeTime(msg.created_at)}
                        {isMine && (msg.is_read ? ' · Read' : ' · Sent')}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Composer Footer */}
            <div className="p-3.5 bg-white dark:bg-[#131822] border-t border-slate-200 dark:border-slate-800">
              {attachmentUrl && (
                <div className="mb-2.5 relative inline-block">
                  <img
                    src={attachmentUrl}
                    alt="Attachment preview"
                    referrerPolicy="no-referrer"
                    className="h-20 w-32 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                  />
                  <button
                    type="button"
                    onClick={() => setAttachmentUrl('')}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] flex items-center justify-center"
                  >
                    <i className="fa-solid fa-xmark" aria-hidden="true" />
                  </button>
                </div>
              )}

              {showEmojiPicker && (
                <div className="mb-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-1.5 flex-wrap">
                  {QUICK_EMOJIS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setDraftText((prev) => prev + em)}
                      className="w-8 h-8 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center text-base"
                    >
                      {em}
                    </button>
                  ))}
                </div>
              )}

              {showPresetImages && (
                <div className="mb-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 grid grid-cols-5 gap-2">
                  {PRESET_MEDIA_GALLERY.slice(0, 5).map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setAttachmentUrl(item.url);
                        setShowPresetImages(false);
                      }}
                      className="h-12 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 hover:border-blue-600"
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
              )}

              <form onSubmit={handleSend} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEmojiPicker(!showEmojiPicker);
                    setShowPresetImages(false);
                  }}
                  aria-label="Insert emoji"
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <i className="fa-regular fa-face-smile" aria-hidden="true" />
                </button>

                <label
                  title="Upload image attachment"
                  className="cursor-pointer w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <i className="fa-regular fa-image" aria-hidden="true" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileAttachment}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setShowPresetImages(!showPresetImages);
                    setShowEmojiPicker(false);
                  }}
                  title="Attach studio preset photo"
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <i className="fa-solid fa-film text-xs" aria-hidden="true" />
                </button>

                <input
                  type="text"
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                  placeholder={`Message @${selectedPartner.username}...`}
                  className="flex-1 px-3.5 py-2 text-sm rounded-xl bg-slate-50 dark:bg-[#0D1119] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
                />

                <button
                  type="submit"
                  disabled={sending || (!draftText.trim() && !attachmentUrl)}
                  className="px-4 py-2 text-xs font-medium bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-xl hover:opacity-90 disabled:opacity-40 whitespace-nowrap"
                >
                  Send
                </button>
              </form>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};
