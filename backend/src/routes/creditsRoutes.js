const express = require('express');
const router = express.Router();
const creditsController = require('../controllers/creditsController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/', authMiddleware, creditsController.getCredits);
router.post('/purchase', authMiddleware, creditsController.purchaseCredits);

module.exports = router;
