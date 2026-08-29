import { Notification } from '../models/Notification.js';
import { isMongoConnected, inMemoryDB } from '../config/inMemoryStore.js';

// @desc    Get user notifications
// @route   GET /api/notifications
export const getNotifications = async (req, res) => {
  try {
    const userIdStr = (req.user._id || req.user.id).toString();

    if (isMongoConnected()) {
      const notifications = await Notification.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .limit(30);

      const unreadCount = await Notification.countDocuments({
        userId: req.user._id,
        read: false,
      });

      return res.json({
        notifications,
        unreadCount,
      });
    } else {
      // Standalone mode notifications
      const userNotifs = inMemoryDB.notifications.filter((n) => n.userId === userIdStr);
      const unreadCount = userNotifs.filter((n) => !n.read).length;

      return res.json({
        notifications: userNotifs,
        unreadCount,
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark a notification as read
// @route   PUT /api/notifications/:id/read
export const markAsRead = async (req, res) => {
  try {
    const notifId = req.params.id;
    const userIdStr = (req.user._id || req.user.id).toString();

    if (isMongoConnected()) {
      const notif = await Notification.findOne({
        _id: notifId,
        userId: req.user._id,
      });

      if (!notif) {
        return res.status(404).json({ message: 'Notification not found' });
      }

      notif.read = true;
      await notif.save();
      return res.json({ message: 'Notification marked as read' });
    } else {
      const target = inMemoryDB.notifications.find(
        (n) => (n._id === notifId || n.id === notifId) && n.userId === userIdStr
      );
      if (target) {
        target.read = true;
      }
      return res.json({ message: 'Notification marked as read' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
export const markAllAsRead = async (req, res) => {
  try {
    const userIdStr = (req.user._id || req.user.id).toString();

    if (isMongoConnected()) {
      await Notification.updateMany({ userId: req.user._id, read: false }, { read: true });
      return res.json({ message: 'All notifications marked as read' });
    } else {
      inMemoryDB.notifications.forEach((n) => {
        if (n.userId === userIdStr) {
          n.read = false; // reset/read
          n.read = true;
        }
      });
      return res.json({ message: 'All notifications marked as read' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
