import { useEffect, useState, useCallback } from 'react';

import { useTranslation } from 'react-i18next';

import { Bell, X, Check, CheckCheck, Info, AlertTriangle, Package } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';

import { getUserNotifications, markNotificationRead } from '../../firebase/admin';



const typeIcons = {

  info: Info,

  success: Check,

  warning: AlertTriangle,

  order_update: Package,

  general: Bell,

};



export default function UserNotificationBell({ onUpdate }) {

  const { t, i18n } = useTranslation();

  const { user } = useAuth();

  const lang = i18n.language;

  const [open, setOpen] = useState(false);

  const [notifications, setNotifications] = useState([]);



  const load = useCallback(async () => {

    if (!user) return;

    try {

      const data = await getUserNotifications(user.uid);

      setNotifications(data);

      onUpdate?.(data.filter((n) => !n.read).length);

    } catch {

      setNotifications([]);

    }

  }, [user, onUpdate]);



  useEffect(() => {

    load();

    // Notifications are refreshed on this visible component; a 30-second
    // whole-list query is too expensive when several user tabs are open.
    const id = setInterval(load, 10 * 60 * 1000);

    return () => clearInterval(id);

  }, [load]);



  const unread = notifications.filter((n) => !n.read).length;



  const handleRead = async (id) => {

    await markNotificationRead(id);

    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));

    onUpdate?.(Math.max(0, unread - 1));

  };



  const handleReadAll = async () => {

    const unreadItems = notifications.filter((n) => !n.read);

    await Promise.all(unreadItems.map((n) => markNotificationRead(n.id)));

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

    onUpdate?.(0);

  };



  if (!user) return null;



  return (

    <div className="relative">

      <button type="button" onClick={() => setOpen(!open)}

        className="relative p-2.5 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/30 transition-all hover:scale-110 shadow-lg">

        <Bell className="w-5 h-5 text-white" />

        {unread > 0 && (

          <span className="absolute -top-1 -end-1 min-w-[20px] h-5 px-1 bg-gradient-to-r from-red-500 to-rose-600 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg animate-pulse">

            {unread > 9 ? '9+' : unread}

          </span>

        )}

      </button>



      {open && (

        <>

          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div className="absolute end-0 top-full mt-2 w-[min(100vw-2rem,22rem)] notification-glass rounded-2xl z-50 overflow-hidden animate-modal-in">

            <div className="flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-primary-600 via-primary-500 to-emerald-600 text-white">

              <div className="flex items-center gap-2">

                <Bell className="w-4 h-4" />

                <h3 className="font-bold text-sm">{t('userNotifications.title')}</h3>

                {unread > 0 && <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{unread}</span>}

              </div>

              <div className="flex items-center gap-1">

                {unread > 0 && (

                  <button type="button" onClick={handleReadAll} className="p-1.5 rounded-lg hover:bg-white/20" title={t('userNotifications.markAllRead')}>

                    <CheckCheck className="w-4 h-4" />

                  </button>

                )}

                <button type="button" onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/20">

                  <X className="w-4 h-4" />

                </button>

              </div>

            </div>

            <ul className="max-h-80 overflow-y-auto divide-y divide-gray-100/80 dark:divide-white/5">

              {notifications.length === 0 ? (

                <li className="p-10 text-center">

                  <Bell className="w-10 h-10 text-gray-300 mx-auto mb-3" />

                  <p className="text-gray-500 text-sm">{t('userNotifications.empty')}</p>

                </li>

              ) : notifications.map((n) => {

                const Icon = typeIcons[n.type] || Bell;

                return (

                  <li key={n.id}

                    className={`px-4 py-3.5 hover:bg-primary-500/5 transition-all ${!n.read ? 'bg-gradient-to-r from-primary-50/80 to-transparent dark:from-primary-900/20 border-s-2 border-primary-500' : ''}`}>

                    <div className="flex items-start gap-3">

                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${!n.read ? 'bg-gradient-to-br from-primary-500 to-emerald-500 text-white shadow-md' : 'bg-gray-100 dark:bg-dark-700 text-gray-500'}`}>

                        <Icon className="w-4 h-4" />

                      </div>

                      <div className="flex-1 min-w-0">

                        <p className="font-bold text-sm text-dark-800 dark:text-white">{lang === 'ar' ? n.titleAr || n.title : n.title}</p>

                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{lang === 'ar' ? n.messageAr || n.message : n.message}</p>

                      </div>

                      {!n.read && (

                        <button type="button" onClick={() => handleRead(n.id)}

                          className="p-1.5 rounded-lg bg-primary-100 dark:bg-primary-900/40 text-primary-600 hover:scale-110 transition-transform flex-shrink-0">

                          <Check className="w-4 h-4" />

                        </button>

                      )}

                    </div>

                  </li>

                );

              })}

            </ul>

          </div>

        </>

      )}

    </div>

  );

}


