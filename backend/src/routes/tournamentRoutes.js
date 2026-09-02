const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { getTournamentData } = require('../controllers/tournamentController');

// GET /api/tournament/data — Dados completos do torneio (protegido)
router.get('/data', authMiddleware, getTournamentData);

module.exports = router;
