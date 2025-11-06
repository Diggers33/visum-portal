import { useState, useRef, TouchEvent } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Bell, 
  Package, 
  FileText, 
  GraduationCap, 
  FolderOpen, 
  AlertCircle,
  CheckCircle,
  Info,
  X,
  Check,
  Trash2,
  ChevronDown,
  RefreshCw
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

interface Notification {
  id: string;
  type: 'product' | 'documentation' | 'training' | 'marketing' | 'alert' | 'success' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  link?: string;
}

interface MobileNotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileNotificationsPanel({ isOpen, onClose }: MobileNotificationsPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'alert',
      title: 'Action Required: Complete Profile',
      message: 'Please update your shipping address and banking details to process orders',
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      read: false,
      link: '/account',
    },
    {
      id: '2',
      type: 'success',
      title: 'Order #ORD-2584 Shipped',
      message: '15x NIR-500 analyzers shipped via DHL Express. Tracking: DHL8492573829',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
      read: false,
      link: '/account',
    },
    {
      id: '3',
      type: 'info',
      title: 'Message from IRIS Team',
      message: 'Anna Schmidt: "Your pricing tier has been upgraded to Platinum. New rates active Nov 15"',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
      read: false,
      link: '/account',
    },
    {
      id: '4',
      type: 'training',
      title: 'Certification Expiring Soon',
      message: 'Your NIR Specialist certification expires in 14 days. Renew now to maintain status',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
      read: true,
      link: '/training',
    },
    {
      id: '5',
      type: 'success',
      title: 'Territory Assignment Confirmed',
      message: 'Austria and Switzerland added to your exclusive coverage area',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
      read: true,
      link: '/account',
    },
    {
      id: '6',
      type: 'alert',
      title: 'Payment Reminder',
      message: 'Invoice #INV-2025-1847 (€24,580) is due in 3 days',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
      read: true,
      link: '/account',
    },
  ]);

  const [refreshing, setRefreshing] = useState(false);
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const startY = useRef(0);

  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'product':
        return <Package className="h-6 w-6" />;
      case 'documentation':
        return <FileText className="h-6 w-6" />;
      case 'training':
        return <GraduationCap className="h-6 w-6" />;
      case 'marketing':
        return <FolderOpen className="h-6 w-6" />;
      case 'alert':
        return <AlertCircle className="h-6 w-6" />;
      case 'success':
        return <CheckCircle className="h-6 w-6" />;
      case 'info':
        return <Info className="h-6 w-6" />;
      default:
        return <Bell className="h-6 w-6" />;
    }
  };

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'product':
        return 'bg-[#00a8b5]';
      case 'documentation':
        return 'bg-blue-500';
      case 'training':
        return 'bg-purple-500';
      case 'marketing':
        return 'bg-pink-500';
      case 'alert':
        return 'bg-orange-500';
      case 'success':
        return 'bg-green-500';
      case 'info':
        return 'bg-slate-500';
      default:
        return 'bg-slate-500';
    }
  };

  const handleMarkAsRead = (id: string) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const handleMarkAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const handleDeleteNotification = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id));
    setSwipedId(null);
  };

  const handleClearAll = () => {
    setNotifications([]);
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    handleMarkAsRead(notification.id);

    // Navigate if link exists
    if (notification.link) {
      window.location.href = notification.link;
    }

    // Close panel
    onClose();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const handleTouchStart = (e: TouchEvent) => {
    startY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: TouchEvent) => {
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    
    // If pulling down at the top, trigger refresh
    if (diff > 80 && !refreshing) {
      handleRefresh();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col"
          >
            {/* Pull Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#00a8b5]/10 rounded-xl">
                    <Bell className="h-6 w-6 text-[#00a8b5]" />
                  </div>
                  <div>
                    <h2 className="text-slate-900">Notifications</h2>
                    {unreadCount > 0 && (
                      <p className="text-sm text-slate-500">{unreadCount} unread</p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-10 w-10 rounded-full"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Actions */}
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  className="w-full h-10 text-[#00a8b5] border-[#00a8b5] hover:bg-[#00a8b5]/5"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Mark all as read
                </Button>
              )}
            </div>

            {/* Notifications List */}
            <div 
              className="flex-1 overflow-y-auto"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
            >
              {/* Pull to Refresh Indicator */}
              {refreshing && (
                <div className="flex items-center justify-center py-4">
                  <RefreshCw className="h-5 w-5 text-[#00a8b5] animate-spin" />
                  <span className="ml-2 text-sm text-slate-500">Refreshing...</span>
                </div>
              )}

              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-6">
                  <div className="rounded-full bg-slate-100 p-6 mb-4">
                    <Bell className="h-12 w-12 text-slate-400" />
                  </div>
                  <h3 className="text-slate-900 mb-2">All caught up!</h3>
                  <p className="text-sm text-slate-500 text-center max-w-xs">
                    You have no notifications right now. We'll notify you when there's something new.
                  </p>
                </div>
              ) : (
                <div className="px-4 py-2 space-y-3">
                  {notifications.map((notification) => (
                    <SwipeableNotificationCard
                      key={notification.id}
                      notification={notification}
                      onRead={handleMarkAsRead}
                      onDelete={handleDeleteNotification}
                      onClick={handleNotificationClick}
                      getIcon={getNotificationIcon}
                      getColor={getNotificationColor}
                      isActive={swipedId === notification.id}
                      swipeDirection={swipeDirection}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-5 py-4 border-t border-slate-200 bg-slate-50">
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={handleClearAll}
                  className="w-full h-12 text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="h-5 w-5 mr-2" />
                  Clear all notifications
                </Button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Swipeable Notification Card Component
interface SwipeableNotificationCardProps {
  notification: Notification;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
  onClick: (notification: Notification) => void;
  getIcon: (type: Notification['type']) => JSX.Element;
  getColor: (type: Notification['type']) => string;
  isActive: boolean;
  swipeDirection: 'left' | 'right' | null;
}

function SwipeableNotificationCard({
  notification,
  onRead,
  onDelete,
  onClick,
  getIcon,
  getColor,
}: SwipeableNotificationCardProps) {
  const [swipeX, setSwipeX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);

  const handleTouchStart = (e: TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX.current;
    
    // Limit swipe distance
    if (diff > -120 && diff < 120) {
      setSwipeX(diff);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    
    // Swipe left to delete (threshold: -60px)
    if (swipeX < -60) {
      onDelete(notification.id);
    }
    // Swipe right to mark as read (threshold: 60px)
    else if (swipeX > 60 && !notification.read) {
      onRead(notification.id);
    }
    
    // Reset position
    setSwipeX(0);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Background Actions */}
      {swipeX < -20 && (
        <div className="absolute inset-0 bg-red-500 flex items-center justify-end px-6 rounded-2xl">
          <Trash2 className="h-6 w-6 text-white" />
        </div>
      )}
      {swipeX > 20 && !notification.read && (
        <div className="absolute inset-0 bg-green-500 flex items-center justify-start px-6 rounded-2xl">
          <Check className="h-6 w-6 text-white" />
        </div>
      )}

      {/* Card */}
      <motion.div
        animate={{ x: swipeX }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => !isDragging && onClick(notification)}
        className={`relative bg-white border rounded-2xl p-4 ${
          !notification.read 
            ? 'border-[#00a8b5] bg-[#00a8b5]/5' 
            : 'border-slate-200'
        }`}
      >
        {/* Unread Indicator */}
        {!notification.read && (
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#00a8b5] rounded-l-2xl" />
        )}

        <div className="flex gap-3 pl-2">
          {/* Icon */}
          <div className={`${getColor(notification.type)} text-white rounded-xl p-3 h-fit shrink-0`}>
            {getIcon(notification.type)}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h4 className={`text-slate-900 mb-1 leading-snug ${!notification.read ? 'font-semibold' : ''}`}>
              {notification.title}
            </h4>
            <p className="text-sm text-slate-600 leading-relaxed mb-2">
              {notification.message}
            </p>
            <span className="text-xs text-slate-500">
              {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 mt-4 pt-3 border-t border-slate-200">
          {!notification.read && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onRead(notification.id);
              }}
              className="flex-1 h-9 text-[#00a8b5] border-[#00a8b5]/30 hover:bg-[#00a8b5]/5"
            >
              <Check className="h-4 w-4 mr-1" />
              Mark read
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(notification.id);
            }}
            className="flex-1 h-9 text-red-600 border-red-200 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      </motion.div>

      {/* Swipe Hint */}
      {!notification.read && swipeX === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          className="absolute bottom-2 right-4 text-xs text-slate-400 pointer-events-none"
        >
          ← Swipe to interact
        </motion.div>
      )}
    </div>
  );
}
