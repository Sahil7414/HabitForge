import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  searchUsers,
  getSuggestedFriends,
  sendFriendRequest,
  respondToFriendRequest,
  cancelFriendRequest,
  getFriendsList,
  getPendingRequests,
  removeFriend,
  getWeeklyLeaderboard,
} from '../controllers/socialController.js';

const router = express.Router();

router.use(protect);

router.get('/users/search', searchUsers);
router.get('/friends/suggested', getSuggestedFriends);
router.get('/friends', getFriendsList);
router.get('/friends/requests', getPendingRequests);
router.post('/friends/request/:receiverId', sendFriendRequest);
router.put('/friends/request/:requestId/respond', respondToFriendRequest);
router.delete('/friends/request/:requestId', cancelFriendRequest);
router.delete('/friends/:friendId', removeFriend);
router.get('/leaderboard', getWeeklyLeaderboard);

export default router;
