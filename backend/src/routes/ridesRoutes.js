const express = require('express');
const router = express.Router();
const ridesController = require('../controllers/ridesController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/request', authMiddleware, ridesController.requestRide);
router.post('/validate-screenshot', authMiddleware, ridesController.validateScreenshotAi);
router.get('/pending', authMiddleware, ridesController.getPendingRides);
router.get('/', authMiddleware, ridesController.getHistory);
router.get('/:id', authMiddleware, ridesController.getRideById);
router.post('/:id/accept', authMiddleware, ridesController.acceptRide);
router.post('/:id/reject', authMiddleware, ridesController.rejectRide);
router.post('/:id/complete', authMiddleware, ridesController.completeRide);
router.post('/:id/near-destination', authMiddleware, ridesController.nearDestinationRide);
router.post('/:id/discount', authMiddleware, ridesController.applyDiscount);
router.post('/:id/rate', authMiddleware, ridesController.rateRide);
router.put('/:id/cancel', authMiddleware, ridesController.cancelRide);

module.exports = router;
