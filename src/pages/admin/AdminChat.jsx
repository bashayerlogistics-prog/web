import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageCircle, Send, User } from 'lucide-react';
import {
  subscribeToAllConversations,
  subscribeToConversation,
  sendChatMessage,
  markConversationRead,
} from '../../firebase/chat';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import GlassCard from '../../components/ui/GlassCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function AdminChat() {
  const { t } = useTranslation();
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    const unsub = subscribeToAllConversations((list) => {
      setConversations(list);
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!selected) { setMessages([]); return undefined; }
    markConversationRead(selected);
    const unsub = subscribeToConversation(selected, setMessages);
    return unsub;
  }, [selected]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || !selected) return;
    setSending(true);
    try {
      await sendChatMessage({
        conversationId: selected,
        senderId: 'admin',
        senderName: 'Admin',
        senderRole: 'admin',
        message: text,
      });
      setInput('');
    } catch { /* silent */ } finally {
      setSending(false);
    }
  }, [input, selected]);

  const totalUnread = conversations.reduce((s, c) => s + (c.unread || 0), 0);
  const activeConv = conversations.find((c) => c.conversationId === selected);

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title={t('admin.chat.title')}
        subtitle={t('admin.chat.subtitle', { count: totalUnread })}
      />

      {loading ? (
        <LoadingSpinner text={t('common.loading')} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-[28rem]">
          <GlassCard className="lg:col-span-1 !p-0 overflow-hidden flex flex-col max-h-[32rem]">
            <div className="px-4 py-3 border-b border-brand/10 font-bold text-sm text-brand flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              {t('admin.chat.conversations')} ({conversations.length})
            </div>
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-10">{t('admin.chat.noMessages')}</p>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.conversationId}
                    type="button"
                    onClick={() => setSelected(conv.conversationId)}
                    className={`w-full text-start px-4 py-3 border-b border-gray-100 dark:border-brand/10 hover:bg-brand/5 transition-colors ${
                      selected === conv.conversationId ? 'bg-brand/10' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-brand" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-dark-800 dark:text-white truncate">
                            {conv.senderName || t('chat.guest')}
                          </p>
                          <p className="text-xs text-gray-400 truncate">{conv.lastMessage}</p>
                        </div>
                      </div>
                      {conv.unread > 0 && (
                        <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">
                          {conv.unread}
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </GlassCard>

          <GlassCard className="lg:col-span-2 !p-0 overflow-hidden flex flex-col max-h-[32rem]">
            {!selected ? (
              <div className="flex-1 flex items-center justify-center text-gray-400 text-sm p-8">
                {t('admin.chat.selectConversation')}
              </div>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-brand/10 font-bold text-sm text-brand">
                  {activeConv?.senderName || t('chat.guest')}
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[16rem]">
                  {messages.map((msg) => {
                    const isAdmin = msg.senderRole === 'admin';
                    return (
                      <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                          isAdmin
                            ? 'bg-brand text-white rounded-br-sm'
                            : 'bg-gray-100 dark:bg-dark-700 text-dark-800 dark:text-white rounded-bl-sm'
                        }`}>
                          <p className="break-words">{msg.message}</p>
                          {msg.createdAt && (
                            <p className={`text-[10px] mt-1 ${isAdmin ? 'text-white/70' : 'text-gray-400'}`}>
                              {msg.createdAt.toDate?.().toLocaleTimeString?.() ?? ''}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
                <form onSubmit={handleSend} className="flex items-center gap-2 p-3 border-t border-brand/10">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={t('admin.chat.replyPlaceholder')}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-brand/20 bg-white dark:admin-input text-sm outline-none focus:ring-2 focus:ring-brand/40"
                  />
                  <button
                    type="submit"
                    disabled={sending || !input.trim()}
                    className="p-2.5 rounded-xl bg-brand text-white hover:bg-brand-dark disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </>
            )}
          </GlassCard>
        </div>
      )}
    </div>
  );
}
