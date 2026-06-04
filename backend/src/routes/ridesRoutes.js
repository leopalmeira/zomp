const express = require('express');
const router = express.Router();
const ridesController = require('../controllers/ridesController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/request', authMiddleware, ridesController.requestRide);
router.get('/pending', authMiddleware, ridesController.getPendingRides);
router.get('/', authMiddleware, ridesController.getHistory);
router.post('/:id/accept', authMiddleware, ridesController.acceptRide);
router.post('/:id/reject', authMiddleware, ridesController.rejectRide);
router.post('/:id/complete', authMiddleware, ridesController.completeRide);
router.put('/:id/cancel', authMiddleware, ridesController.cancelRide);

module.exports = router;
