/*
 * @name Notification Bell Component
 * @file /docman/frontend/src/components/NotificationBell.jsx
 * @component NotificationBell
 * @description Notification bell component with dropdown for displaying user notifications
 * @author Richard Bakos
 * @version 2.1.9
 * @license UNLICENSED
 */

import { useState, useEffect } from "react";
import { Bell, X, Check } from "lucide-react";
import api from "../lib/axios";
import { useTheme } from "../context/ThemeContext";

/**
 * Component for displaying notifications in a dropdown bell icon
 * @returns {JSX.Element} The notification bell component
 */
const NotificationBell = () => {
  const { currentTheme } = useTheme();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  /**
   * Fetch notifications and unread count
   */
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get("/notifications");
      setNotifications(response.data);
      
      // Count unread notifications
      const unread = response.data.filter(notification => !notification.isRead).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch unread count only
   */
  const fetchUnreadCount = async () => {
    try {
      const response = await api.get("/notifications/unread-count");
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  };

  /**
   * Mark notification as read
   * @param {string} notificationId - ID of the notification to mark as read
   */
  const markAsRead = async (notificationId) => {
    try {
      await api.patch(`/notifications/${notificationId}/read`);
      setNotifications(notifications.map(notification => 
        notification._id === notificationId 
          ? { ...notification, isRead: true, readAt: new Date() } 
          : notification
      ));
      setUnreadCount(unreadCount - 1);
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = async () => {
    try {
      await api.patch("/notifications/read-all");
      setNotifications(notifications.map(notification => ({
        ...notification,
        isRead: true,
        readAt: new Date()
      })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  /**
   * Delete notification
   * @param {string} notificationId - ID of the notification to delete
   */
  const deleteNotification = async (notificationId) => {
    try {
      await api.delete(`/notifications/${notificationId}`);
      setNotifications(notifications.filter(notification => notification._id !== notificationId));
      // Update unread count if the deleted notification was unread
      const deletedNotification = notifications.find(n => n._id === notificationId);
      if (deletedNotification && !deletedNotification.isRead) {
        setUnreadCount(unreadCount - 1);
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  /**
   * Format date for display
   * @param {string} dateString - Date string to format
   * @returns {string} Formatted date string
   */
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return "Just now";
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  /**
   * Get notification icon based on type
   * @param {string} type - Notification type
   * @returns {string} Emoji icon for the notification type
   */
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'team_invitation':
        return '👥';
      case 'team_invitation_accepted':
        return '✅';
      case 'team_invitation_declined':
        return '❌';
      case 'document_assigned':
        return '📄';
      case 'document_review_due':
        return '⏰';
      case 'document_review_completed':
        return '✅';
      case 'document_updated':
        return '✏️';
      case 'message':
        return '💬';
      default:
        return '🔔';
    }
  };

  /**
   * Get notification color based on type
   * @param {string} type - Notification type
   * @returns {string} CSS classes for the notification color
   */
  const getNotificationColor = (type) => {
    switch (type) {
      case 'team_invitation':
        return 'bg-blue-100 border-blue-500';
      case 'team_invitation_accepted':
        return 'bg-green-100 border-green-500';
      case 'team_invitation_declined':
        return 'bg-red-100 border-red-500';
      case 'document_assigned':
        return 'bg-purple-100 border-purple-500';
      case 'document_review_due':
        return 'bg-yellow-100 border-yellow-500';
      case 'document_review_completed':
        return 'bg-green-100 border-green-500';
      case 'document_updated':
        return 'bg-blue-100 border-blue-500';
      case 'message':
        return 'bg-gray-100 border-gray-500';
      default:
        return 'bg-gray-100 border-gray-500';
    }
  };

  /**
   * Effect to fetch notifications when component mounts
   */
  useEffect(() => {
    fetchNotifications();
    
    // Set up interval to periodically check for new notifications
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative">
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            fetchNotifications();
          }
        }}
        className="relative p-2 rounded-full hover:bg-base-200 transition-colors"
      >
        <Bell size={20} className="text-base-content" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className={`absolute right-0 mt-2 w-80 ${currentTheme === 'retro-gaming' ? 'font-mono' : ''} rounded-lg shadow-lg z-50 border ${currentTheme === 'retro-gaming' ? 'border-green-500 bg-black' : 'border-base-300 bg-base-100'}`}>
          <div className={`p-4 border-b ${currentTheme === 'retro-gaming' ? 'border-green-500' : 'border-base-300'}`}>
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Notifications</h3>
              <div className="flex gap-2">
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllAsRead}
                    className="text-xs text-blue-500 hover:text-blue-700"
                  >
                    Mark all as read
                  </button>
                )}
                <button 
                  onClick={() => setIsOpen(false)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-500 mt-1">
                You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center">
                <div className="loading loading-spinner loading-sm"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <div 
                  key={notification._id} 
                  className={`p-3 border-b ${currentTheme === 'retro-gaming' ? 'border-green-500' : 'border-base-200'} ${notification.isRead ? '' : 'bg-blue-50'} ${currentTheme === 'retro-gaming' && !notification.isRead ? 'bg-green-900' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${getNotificationColor(notification.type)}`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between">
                        <h4 className="font-medium text-sm truncate">
                          {notification.title}
                        </h4>
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {formatDate(notification.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm mt-1 text-gray-700">
                        {notification.message}
                      </p>
                      {notification.relatedDoc && (
                        <p className="text-xs text-gray-500 mt-1">
                          Document: {notification.relatedDoc.title}
                        </p>
                      )}
                      {notification.relatedTeam && (
                        <p className="text-xs text-gray-500 mt-1">
                          Team: {notification.relatedTeam.name}
                        </p>
                      )}
                      <div className="flex gap-2 mt-2">
                        {!notification.isRead && (
                          <button
                            onClick={() => markAsRead(notification._id)}
                            className="text-xs text-blue-500 hover:text-blue-700"
                          >
                            Mark as read
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(notification._id)}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;