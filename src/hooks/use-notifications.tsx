"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "@/actions/notifications";
import type { Notification } from "@/lib/validators";

export function useNotifications(recipientDocId: string | null) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!recipientDocId) return;

    const q = query(
      collection(db, "notifications"),
      where("recipientDocId", "==", recipientDocId),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() }) as Notification
      );
      setNotifications(notifs);
      setUnreadCount(notifs.filter((n) => !n.read).length);
    });

    return unsubscribe;
  }, [recipientDocId]);

  async function markAsRead(notificationId: string) {
    await markNotificationReadAction({ notificationId });
  }

  async function markAllAsRead() {
    if (!recipientDocId) return;
    await markAllNotificationsReadAction({ recipientDocId });
  }

  return { notifications, unreadCount, markAsRead, markAllAsRead };
}
