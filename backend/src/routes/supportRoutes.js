const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/tickets', authMiddleware, supportController.createTicket);
router.get('/tickets', authMiddleware, supportController.getUserTickets);
router.get('/tickets/:ticketId/messages', authMiddleware, supportController.getTicketMessages);
router.post('/tickets/:ticketId/messages', authMiddleware, supportController.sendTicketMessage);

module.exports = router;
