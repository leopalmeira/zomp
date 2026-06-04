const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/', authMiddleware, walletController.getWallet);
router.post('/withdraw', authMiddleware, walletController.withdraw);

module.exports = router;
