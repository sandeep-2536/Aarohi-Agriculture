// utils/teleVetUtils.js

/**
 * Format call duration to human readable format
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration
 */
exports.formatCallDuration = (seconds) => {
  if (!seconds || seconds < 0) return '0s';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
};

/**
 * Generate unique room ID
 * @returns {string} Unique room identifier
 */
exports.generateRoomId = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `room-${timestamp}-${random}`;
};

/**
 * Check if user is authorized for call
 * @param {Object} call - VideoCall document
 * @param {string} userId - User ID to check
 * @param {string} userRole - 'farmer' or 'vet'
 * @returns {boolean}
 */
exports.isUserAuthorizedForCall = (call, userId, userRole) => {
  if (userRole === 'farmer') {
    return call.farmerId.toString() === userId.toString();
  } else if (userRole === 'vet') {
    return call.vetId.toString() === userId.toString();
  }
  return false;
};

/**
 * Get call status badge color
 * @param {string} status - Call status
 * @returns {string} Tailwind CSS classes
 */
exports.getStatusBadgeClass = (status) => {
  const statusClasses = {
    'pending': 'bg-yellow-100 text-yellow-800',
    'accepted': 'bg-blue-100 text-blue-800',
    'active': 'bg-green-100 text-green-800',
    'ended': 'bg-gray-100 text-gray-800',
    'rejected': 'bg-red-100 text-red-800'
  };
  
  return statusClasses[status] || 'bg-gray-100 text-gray-800';
};

/**
 * Validate room ID format
 * @param {string} roomId - Room ID to validate
 * @returns {boolean}
 */
exports.isValidRoomId = (roomId) => {
  if (!roomId || typeof roomId !== 'string') return false;
  return /^room-\d{13}-[a-z0-9]{9}$/.test(roomId);
};

/**
 * Get time ago string
 * @param {Date} date - Date to compare
 * @returns {string} Human readable time ago
 */
exports.timeAgo = (date) => {
  if (!date) return 'Unknown';
  
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  
  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
    second: 1
  };
  
  for (const [unit, value] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / value);
    if (interval >= 1) {
      return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
    }
  }
  
  return 'just now';
};

/**
 * Notify user via socket
 * @param {Object} io - Socket.io instance
 * @param {Object} userSocketMap - User to socket mapping
 * @param {string} userId - User ID to notify
 * @param {string} event - Event name
 * @param {Object} data - Event data
 */
exports.notifyUser = (io, userSocketMap, userId, event, data) => {
  try {
    const socketId = userSocketMap[userId.toString()];
    if (socketId) {
      io.to(socketId).emit(event, data);
      console.log(`[Notification] Sent '${event}' to user ${userId}`);
      return true;
    } else {
      console.log(`[Notification] User ${userId} not connected`);
      return false;
    }
  } catch (error) {
    console.error('[Notification] Error:', error);
    return false;
  }
};

/**
 * Clean up old ended calls (can be run as cron job)
 * @param {number} daysOld - Delete calls older than this many days
 */
exports.cleanupOldCalls = async (daysOld = 30) => {
  try {
    const VideoCall = require('../models/VideoCall');
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const result = await VideoCall.deleteMany({
      status: { $in: ['ended', 'rejected'] },
      endTime: { $lt: cutoffDate }
    });
    
    console.log(`[Cleanup] Deleted ${result.deletedCount} old call records`);
    return result.deletedCount;
  } catch (error) {
    console.error('[Cleanup] Error cleaning up old calls:', error);
    return 0;
  }
};

/**
 * Get call statistics for a vet
 * @param {string} vetId - Vet ID
 * @returns {Object} Statistics
 */
exports.getVetStats = async (vetId) => {
  try {
    const VideoCall = require('../models/VideoCall');
    
    const [total, completed, today, avgDuration] = await Promise.all([
      VideoCall.countDocuments({ vetId }),
      VideoCall.countDocuments({ vetId, status: 'ended' }),
      VideoCall.countDocuments({
        vetId,
        createdAt: { $gte: new Date().setHours(0, 0, 0, 0) }
      }),
      VideoCall.aggregate([
        { $match: { vetId, status: 'ended', duration: { $exists: true } } },
        { $group: { _id: null, avgDuration: { $avg: '$duration' } } }
      ])
    ]);
    
    return {
      total,
      completed,
      today,
      avgDuration: avgDuration[0]?.avgDuration || 0,
      completionRate: total > 0 ? ((completed / total) * 100).toFixed(1) : 0
    };
  } catch (error) {
    console.error('[Stats] Error getting vet stats:', error);
    return { total: 0, completed: 0, today: 0, avgDuration: 0, completionRate: 0 };
  }
};

/**
 * Get call statistics for a farmer
 * @param {string} farmerId - Farmer ID
 * @returns {Object} Statistics
 */
exports.getFarmerStats = async (farmerId) => {
  try {
    const VideoCall = require('../models/VideoCall');
    
    const [total, completed, pending] = await Promise.all([
      VideoCall.countDocuments({ farmerId }),
      VideoCall.countDocuments({ farmerId, status: 'ended' }),
      VideoCall.countDocuments({ farmerId, status: 'pending' })
    ]);
    
    return {
      total,
      completed,
      pending
    };
  } catch (error) {
    console.error('[Stats] Error getting farmer stats:', error);
    return { total: 0, completed: 0, pending: 0 };
  }
};

/**
 * Log call event for analytics
 * @param {string} eventType - Type of event
 * @param {Object} callData - Call data
 */
exports.logCallEvent = (eventType, callData) => {
  // This can be extended to log to a file, database, or analytics service
  console.log(`[TeleVet Event] ${eventType}:`, {
    roomId: callData.roomId,
    status: callData.status,
    timestamp: new Date().toISOString()
  });
};

/**
 * Check WebRTC browser compatibility
 * @returns {Object} Browser support info
 */
exports.checkBrowserSupport = () => {
  return {
    getUserMedia: typeof navigator !== 'undefined' && 
                   !!navigator.mediaDevices?.getUserMedia,
    RTCPeerConnection: typeof RTCPeerConnection !== 'undefined',
    webRTCSupported: typeof navigator !== 'undefined' && 
                     !!navigator.mediaDevices?.getUserMedia && 
                     typeof RTCPeerConnection !== 'undefined'
  };
};

module.exports = exports;