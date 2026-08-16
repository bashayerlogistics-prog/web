import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageCircle, X, Send, Minimize2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  getConversationId,
  sendChatMessage,
  subscribeToConversation,
} from '../../firebase/chat';

const INPUT_CLASS =
  'w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-dark-500 bg-white dark:bg-dark-700 text-sm text-dark-800 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand/50 transition-colors disabled:opacity-50';

const QUICK_REPLY_KEYS = ['quickBook', 'quickPricing', 'quickTrack'];

export default function LiveChatWidget() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [guestName, setGuestName] = useState('');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const conversationId = getConversationId(user?.uid);
  const senderName = user?.displayName || user?.email || guestName || t('chat.guest');
  const canSend = Boolean(user || guestName.trim());
  const showGuestName = !user && !guestName.trim();

  useEffect(() => {
    if (!open) return undefined;
    const unsub = subscribeToConversation(conversationId, setMessages);
    return unsub;
  }, [open, conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open && canSend) {
      inputRef.current?.focus();
    }
  }, [open, canSend]);

  const sendMessage = useCallback(async (text) => {
    const trimmed = text.trim();
    if (!trimmed || !canSend) return;

    setSending(true);
    try {
      await sendChatMessage({
        conversationId,
        senderId: user?.uid || conversationId,
        senderName,
        senderRole: user ? 'user' : 'guest',
        message: trimmed,
      });
      setInput('');
    } catch {
      /* silent */
    } finally {
      setSending(false);
    }
  }, [canSend, conversationId, senderName, user]);

  const handleSend = useCallback(async (e) => {
    e.preventDefault();
    await sendMessage(input);
  }, [input, sendMessage]);

  const handleQuickReply = useCallback((key) => {
    sendMessage(t(`chat.${key}`));
  }, [sendMessage, t]);

  return (
    <>
      {open && (
        <div
          className="live-chat-panel fixed end-4 z-[60] flex w-[min(calc(100vw-2rem),22rem)] flex-col overflow-hidden rounded-2xl border border-primary-500/15 bg-white shadow-2xl dark:border-dark-600 dark:bg-dark-900 animate-fade-in"
          style={{ maxHeight: 'min(72vh, 32rem)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between bg-gradient-to-r from-brand to-brand-dark px-4 py-3 text-white">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative flex-shrink-0">
                <MessageCircle className="h-5 w-5" />
                <span className="absolute -bottom-0.5 -end-0.5 h-2.5 w-2.5 rounded-full border-2 border-brand bg-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold leading-tight">{t('chat.title')}</p>
                <p className="text-[10px] font-medium text-white/75">{t('chat.online')}</p>
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 transition-colors hover:bg-white/20"
                aria-label="Minimize"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 transition-colors hover:bg-white/20"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-2.5 overflow-y-auto bg-gray-50 p-3 dark:bg-dark-800/60 min-h-[10rem] max-h-[20rem]">
            {messages.length === 0 && (
              <div className="flex justify-start">
                <div className="max-w-[88%] rounded-2xl rounded-bl-sm border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm dark:border-dark-600 dark:bg-dark-700 dark:text-white">
                  <p className="mb-1 text-[10px] font-bold text-gold">{t('chat.support')}</p>
                  <p className="break-words leading-relaxed">{t('chat.welcome')}</p>
                </div>
              </div>
            )}
            {messages.map((msg) => {
              const isMine = msg.senderRole !== 'admin';
              return (
                <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm ${
                      isMine
                        ? 'rounded-br-sm bg-brand text-white'
                        : 'rounded-bl-sm border border-gray-200 bg-white text-dark-800 dark:border-dark-600 dark:bg-dark-700 dark:text-white'
                    }`}
                  >
                    {!isMine && (
                      <p className="mb-0.5 text-[10px] font-bold text-gold">{t('chat.support')}</p>
                    )}
                    <p className="break-words leading-relaxed">{msg.message}</p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Quick replies */}
          {messages.length === 0 && canSend && (
            <div className="flex flex-wrap gap-1.5 border-t border-gray-100 bg-white px-3 py-2 dark:border-dark-700 dark:bg-dark-900">
              {QUICK_REPLY_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleQuickReply(key)}
                  disabled={sending}
                  className="rounded-full border border-brand/20 bg-brand/5 px-2.5 py-1 text-[11px] font-semibold text-brand transition-colors hover:bg-brand/10 disabled:opacity-50 dark:border-brand/30 dark:bg-brand/15 dark:text-gold-light dark:hover:bg-brand/25"
                >
                  {t(`chat.${key}`)}
                </button>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-gray-200 bg-white p-3 dark:border-dark-600 dark:bg-dark-900">
            {showGuestName ? (
              <div className="space-y-2">
                <label htmlFor="chat-guest-name" className="block text-xs font-semibold text-gray-500 dark:text-gray-400">
                  {t('chat.nameLabel')}
                </label>
                <input
                  id="chat-guest-name"
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && guestName.trim()) {
                      e.preventDefault();
                      inputRef.current?.focus();
                    }
                  }}
                  placeholder={t('chat.enterName')}
                  className={INPUT_CLASS}
                  autoFocus
                />
              </div>
            ) : (
              <>
                {!user && guestName.trim() && (
                  <p className="mb-2 truncate text-[11px] font-medium text-gray-500 dark:text-gray-400">
                    {t('chat.chattingAs', { name: guestName.trim() })}
                  </p>
                )}
                <form onSubmit={handleSend} className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={t('chat.placeholder')}
                    disabled={!canSend}
                    className={INPUT_CLASS}
                  />
                  <button
                    type="submit"
                    disabled={sending || !input.trim() || !canSend}
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand text-white transition-colors hover:bg-brand-dark disabled:opacity-40"
                    aria-label="Send"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] end-4 z-[55] flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-dark text-white shadow-xl transition-transform hover:scale-105 lg:bottom-6 lg:h-14 lg:w-14"
        aria-label={t('chat.title')}
        aria-expanded={open}
      >
        {open ? (
          <X className="h-5 w-5 md:h-6 md:w-6" />
        ) : (
          <MessageCircle className="h-5 w-5 md:h-6 md:w-6" />
        )}
      </button>
    </>
  );
}
