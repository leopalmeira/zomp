const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middlewares/authMiddleware');

// Stats & Dashboard
router.get('/stats', authMiddleware, adminController.getStats);
router.get('/operations', authMiddleware, adminController.getOperations);

// Users
router.get('/users', authMiddleware, adminController.getUsers);
router.put('/users/:id/approve', authMiddleware, adminController.approveUser);
router.put('/users/:id/credits', authMiddleware, adminController.addCredits);
router.put('/users/:id/reset-stats', authMiddleware, adminController.resetStats);

// Drivers & Passengers
router.get('/drivers', authMiddleware, adminController.getDrivers);
router.get('/passengers', authMiddleware, adminController.getPassengers);

// Rides & Referrals
router.get('/rides', authMiddleware, adminController.getRides);
router.put('/rides/:id/cancel', authMiddleware, adminController.cancelRide);
router.get('/referrals', authMiddleware, adminController.getReferrals);

// Config
router.get('/config', authMiddleware, adminController.getConfig);
router.put('/config', authMiddleware, adminController.updateConfig);

// Royalty Fund
router.get('/royalty-fund', authMiddleware, adminController.getRoyaltyFund);

// Withdrawals
router.get('/withdrawals', authMiddleware, adminController.getWithdrawals);
router.put('/withdrawals/:id', authMiddleware, adminController.handleWithdrawal);

// Support Tickets & Real-Time Chat (Admin)
const supportController = require('../controllers/supportController');
router.get('/support/tickets', authMiddleware, supportController.getAllTicketsAdmin);
router.get('/support/tickets/:ticketId/messages', authMiddleware, supportController.getTicketMessages);
router.post('/support/tickets/:ticketId/reply', authMiddleware, supportController.replyTicketAdmin);
router.put('/support/tickets/:ticketId/status', authMiddleware, supportController.updateTicketStatusAdmin);

module.exports = router;
