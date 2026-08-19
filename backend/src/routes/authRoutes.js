const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/register', authController.register);
router.post('/driver-pre-register', authController.driverPreRegister);
router.post('/login', authController.login);
router.post('/google', authController.googleAuth);

module.exports = router;

