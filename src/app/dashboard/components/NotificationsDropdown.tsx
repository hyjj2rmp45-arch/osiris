'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/stores/use-auth-store';

interface Notification {
  id: string;
  type: 'trade' | 'session' | 'security' | 'system';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  actionUrl?: string;
}

const mockNotifications: Notification[] = [
  {
    id: 'notif-1',
    type: 'trade',
    title: 'Trade Executed',
    message: 'SOL → USDC: 250 SOL copied successfully',
    timestamp: Date.now() - 300000,
    read: false,
    actionUrl: '/dashboard/copy-trading',
  },
  {
    id: 'notif-2',
    type: 'session',
    title: 'Session Started',
    message: 'Algo-Trader Session 1 is now active',
    timestamp: Date.now() - 3600000,
    read: true,
  },
  {
    id: 'notif-3',
    type: 'security',
    title: 'New Login Detected',
    message: 'Login from new device: Chrome on Windows',
    timestamp: Date.now() - 86400000,
    read: false,
    actionUrl: '/dashboard/settings',
  },
  {
    id: 'notif-4',
    type: 'system',
    title: 'System Maintenance',
    message: 'Scheduled maintenance tonight at 02:00 UTC',
    timestamp: Date.now() - 172800000,
    read: true,
  },
];

const formatTime = (timestamp: number) => {
  const diff = Date.now() - timestamp;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
};

const typeIcons = {
  trade: (
    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5L12 2zm0 2.18l6.9 2.35v6.52c-3.82.96-7 4.18-7 8.57v1.68c-4.54-.62-8-4.57-8-9.57V3.53L12 3.18zM12 21.18c-2.16 0-4.07-.78-5.44-2.1L12 12.68l1.56-.52c2.64-.88 4.4-3.15 4.4-5.82V3.53L12 5.34l-6.9 2.35v6.52c0 2.88 1.9 5.47 4.54 6.32z"/>
    </svg>
  ),
  session: (
    <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
    </svg>
  ),
  security: (
    <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
    </svg>
  ),
  system: (
    <svg className="w-5 h-5 text-purple-500" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
    </svg>
  ),
};

export const NotificationsDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications] = useState<Notification[]>(mockNotifications);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotificationClick = (notification: Notification) => {
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
    setIsOpen(false);
  };

  const handleMarkAllRead = () => {
    // In real app, call API to mark all as read
    console.log('Mark all as read');
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-surface transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
      >
        <svg className="w-5 h-5 text-body" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-surface-elevated border border-border rounded-sm z-50">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="font-medium">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-primary hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                No notifications yet
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {notifications.map((notification) => (
                  <li
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 hover:bg-surface transition-colors cursor-pointer ${!notification.read ? 'bg-primary/5' : ''}`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {typeIcons[notification.type]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm ${!notification.read ? 'text-body' : 'text-muted-foreground'}`}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatTime(notification.timestamp)}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2" />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="p-3 border-t border-border">
            <Link
              href="/dashboard/alerts"
              className="block text-center text-sm text-primary hover:underline"
              onClick={() => setIsOpen(false)}
            >
              View all alerts
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};