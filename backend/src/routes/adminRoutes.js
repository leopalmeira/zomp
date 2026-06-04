const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/users', authMiddleware, adminController.getUsers);
router.put('/users/:id/approve', authMiddleware, adminController.approveUser);
router.put('/users/:id/credits', authMiddleware, adminController.addCredits);
router.put('/users/:id/reset-stats', authMiddleware, adminController.resetStats);
router.get('/rides', authMiddleware, adminController.getRides);
router.get('/referrals', authMiddleware, adminController.getReferrals);

module.exports = router;
