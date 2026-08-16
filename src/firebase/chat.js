import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  getDocs,
  serverTimestamp,
  limit,
} from 'firebase/firestore';
import { db } from './db';

const GUEST_KEY = 'bashayer_chat_guest_id';

export function getGuestId() {
  let id = localStorage.getItem(GUEST_KEY);
  if (!id) {
    id = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem(GUEST_KEY, id);
  }
  return id;
}

export function getConversationId(userId) {
  return userId || getGuestId();
}

export async function sendChatMessage({ conversationId, senderId, senderName, senderRole, message }) {
  const ref = await addDoc(collection(db, 'chatMessages'), {
    conversationId,
    senderId,
    senderName: senderName || 'Guest',
    senderRole,
    message: message.trim(),
    read: senderRole === 'admin',
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export function subscribeToConversation(conversationId, callback) {
  const q = query(
    collection(db, 'chatMessages'),
    where('conversationId', '==', conversationId),
    orderBy('createdAt', 'asc'),
    limit(100),
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }, async () => {
    try {
      const fallbackQ = query(
        collection(db, 'chatMessages'),
        where('conversationId', '==', conversationId),
        limit(100),
      );
      const snap = await getDocs(fallbackQ);
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      items.sort((a, b) => {
        const aT = a.createdAt?.toMillis?.() ?? 0;
        const bT = b.createdAt?.toMillis?.() ?? 0;
        return aT - bT;
      });
      callback(items.slice(-100));
    } catch {
      callback([]);
    }
  });
}

const ADMIN_CONVERSATION_WINDOW = 40;

export async function getAllConversations() {
  const snap = await getDocs(query(
    collection(db, 'chatMessages'),
    orderBy('createdAt', 'desc'),
    limit(ADMIN_CONVERSATION_WINDOW),
  ));
  const map = {};
  for (const d of snap.docs) {
    const data = d.data();
    const cid = data.conversationId;
    if (!map[cid]) {
      map[cid] = {
        conversationId: cid,
        senderName: data.senderName,
        senderRole: data.senderRole,
        lastMessage: data.message,
        lastAt: data.createdAt,
        unread: 0,
      };
    }
    if (data.senderRole !== 'admin' && !data.read) {
      map[cid].unread += 1;
    }
  }
  return Object.values(map).sort((a, b) => {
    const aT = a.lastAt?.toMillis?.() ?? 0;
    const bT = b.lastAt?.toMillis?.() ?? 0;
    return bT - aT;
  });
}

export function subscribeToAllConversations(callback) {
  // The inbox is loaded only on the Chat page. A bounded window avoids
  // re-reading the complete chat history whenever the listener reconnects.
  const q = query(
    collection(db, 'chatMessages'),
    orderBy('createdAt', 'desc'),
    limit(ADMIN_CONVERSATION_WINDOW),
  );
  return onSnapshot(q, (snap) => {
    const map = {};
    for (const d of snap.docs) {
      const data = d.data();
      const cid = data.conversationId;
      if (!map[cid]) {
        map[cid] = {
          conversationId: cid,
          senderName: data.senderName,
          senderRole: data.senderRole,
          lastMessage: data.message,
          lastAt: data.createdAt,
          unread: 0,
        };
      }
      if (data.senderRole !== 'admin' && !data.read) {
        map[cid].unread += 1;
      }
    }
    callback(Object.values(map).sort((a, b) => {
      const aT = a.lastAt?.toMillis?.() ?? 0;
      const bT = b.lastAt?.toMillis?.() ?? 0;
      return bT - aT;
    }));
  }, () => callback([]));
}

export async function markConversationRead(conversationId) {
  const q = query(
    collection(db, 'chatMessages'),
    where('conversationId', '==', conversationId),
    where('read', '==', false),
    limit(50),
  );
  const snap = await getDocs(q);
  await Promise.all(
    snap.docs
      .filter((d) => d.data().senderRole !== 'admin')
      .map((d) => updateDoc(doc(db, 'chatMessages', d.id), { read: true })),
  );
}

export async function getUnreadChatCount() {
  const q = query(
    collection(db, 'chatMessages'),
    where('read', '==', false),
    limit(200),
  );
  const snap = await getDocs(q);
  return snap.docs.filter((d) => d.data().senderRole !== 'admin').length;
}
