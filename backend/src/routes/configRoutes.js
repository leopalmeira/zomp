const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/', configController.getConfig);
router.put('/', authMiddleware, configController.updateConfig);

module.exports = router;
