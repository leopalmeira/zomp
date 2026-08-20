const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/profile', authMiddleware, userController.getProfile);
router.put('/profile', authMiddleware, userController.updateProfile);
router.get('/driver/linked-passengers', authMiddleware, userController.getLinkedPassengers);
router.post('/link-referral', authMiddleware, userController.linkReferral);
router.get('/debt', authMiddleware, userController.getUserDebt);

module.exports = router;
