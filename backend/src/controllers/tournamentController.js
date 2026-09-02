const { pool } = require('../config/db');

/**
 * TORNEIO ZOMP — Controller
 * 
 * Lógica de fases:
 *  - Dia 1 ao 15: Fase Classificatória (meta: 15 corridas/dia em 10+ dias)
 *  - Dia 16 ao 22: Torneio Principal (quem faz mais corridas vence)
 *  - Dia 23+: Aguardando próximo mês
 * 
 * Endpoints:
 *  GET /api/tournament/data  — Retorna status da fase, leaderboard Top 30 e posição do motorista
 */

// Nomes realistas para pilotos simulados
const SIMULATED_NAMES = [
  'Ricardo S.', 'Fernando M.', 'Carlos E.', 'André L.', 'Marcos V.',
  'Rafael T.', 'Lucas P.', 'Bruno C.', 'Diego R.', 'Thiago A.',
  'Gustavo H.', 'Eduardo N.', 'Rodrigo F.', 'Leandro B.', 'Felipe G.',
  'Alexandre D.', 'João P.', 'Pedro H.', 'Matheus S.', 'Vinícius R.',
  'Daniel O.', 'Fabiano L.', 'Wagner M.', 'Cristiano A.', 'Marcelo J.',
  'Roberto K.', 'Paulo C.', 'Henrique F.', 'Sérgio N.', 'Gabriel T.',
  'Renato V.', 'Júlio S.', 'Adriano P.', 'Leonardo M.', 'Caio R.'
];

function getTournamentPhase(now) {
  const day = now.getDate();
  const month = now.getMonth();
  const year = now.getFullYear();

  if (day <= 15) {
    // Fase Classificatória
    const endClassif = new Date(year, month, 15, 23, 59, 59);
    const daysLeft = Math.max(0, Math.ceil((endClassif - now) / (1000 * 60 * 60 * 24)));
    return {
      phase: 'CLASSIFICATORIA',
      phaseLabel: 'Fase Classificatória',
      phaseDescription: 'Faça no mínimo 15 corridas/dia em pelo menos 10 dos 15 dias para se classificar ao Torneio.',
      startDay: 1,
      endDay: 15,
      daysLeft,
      tournamentStartDay: 16,
      tournamentEndDay: 22
    };
  } else if (day <= 22) {
    // Torneio Principal (7 dias de disputa)
    const endTorneio = new Date(year, month, 22, 23, 59, 59);
    const daysLeft = Math.max(0, Math.ceil((endTorneio - now) / (1000 * 60 * 60 * 24)));
    return {
      phase: 'TORNEIO',
      phaseLabel: 'Torneio Zomp — AO VIVO 🔴',
      phaseDescription: 'O Torneio está acontecendo agora! Faça o máximo de corridas para subir no ranking e conquistar os prêmios.',
      startDay: 16,
      endDay: 22,
      daysLeft,
      tournamentStartDay: 16,
      tournamentEndDay: 22
    };
  } else {
    // Aguardando próximo mês
    const nextMonth = month === 11 ? new Date(year + 1, 0, 1) : new Date(year, month + 1, 1);
    const daysLeft = Math.max(0, Math.ceil((nextMonth - now) / (1000 * 60 * 60 * 24)));
    return {
      phase: 'AGUARDANDO',
      phaseLabel: 'Aguardando Próximo Torneio',
      phaseDescription: 'O torneio deste mês já foi encerrado. A próxima fase classificatória começa no dia 1º do próximo mês.',
      startDay: 23,
      endDay: new Date(year, month + 1, 0).getDate(),
      daysLeft,
      tournamentStartDay: 16,
      tournamentEndDay: 22
    };
  }
}

function generateLeaderboard(driverId, driverName, driverRidesCount) {
  // Gera um leaderboard simulado com 35 pilotos (30 aparecem + espaço para o motorista real)
  const entries = [];

  // Distribuição realista de corridas (decrescente com alguma variação)
  const baseRides = [
    142, 135, 128, 118, 112, 105, 99, 94, 88, 83,
    79, 75, 71, 67, 64, 61, 58, 55, 52, 49,
    46, 44, 42, 40, 38, 36, 34, 32, 30, 28,
    26, 24, 22, 20, 18
  ];

  for (let i = 0; i < 35; i++) {
    const variation = Math.floor(Math.random() * 5) - 2;
    entries.push({
      id: `sim-${i}`,
      name: SIMULATED_NAMES[i] || `Motorista ${i + 1}`,
      rides: Math.max(1, baseRides[i] + variation),
      isSimulated: true
    });
  }

  // Inserir o motorista real na lista
  if (driverId) {
    entries.push({
      id: driverId,
      name: driverName || 'Você',
      rides: driverRidesCount,
      isSimulated: false,
      isCurrentUser: true
    });
  }

  // Ordenar por corridas (decrescente)
  entries.sort((a, b) => b.rides - a.rides);

  // Atribuir posição
  entries.forEach((entry, idx) => {
    entry.position = idx + 1;
  });

  // Top 30 para exibição
  const top30 = entries.slice(0, 30);

  // Encontrar a posição do motorista real
  const driverEntry = entries.find(e => e.isCurrentUser);
  const driverPosition = driverEntry ? driverEntry.position : null;

  // Calcular gaps
  const pos30Entry = entries[29]; // 30º colocado
  const pos3Entry = entries[2];   // 3º colocado
  const pos1Entry = entries[0];   // 1º colocado
  const pos20Entry = entries[19]; // 20º colocado

  const gaps = {};
  if (driverEntry) {
    gaps.toTop30 = Math.max(0, (pos30Entry?.rides || 0) - driverEntry.rides + 1);
    gaps.toTop20 = Math.max(0, (pos20Entry?.rides || 0) - driverEntry.rides + 1);
    gaps.toTop3 = Math.max(0, (pos3Entry?.rides || 0) - driverEntry.rides + 1);
    gaps.toTop1 = Math.max(0, (pos1Entry?.rides || 0) - driverEntry.rides + 1);
    gaps.rides30th = pos30Entry?.rides || 0;
    gaps.rides3rd = pos3Entry?.rides || 0;
    gaps.rides1st = pos1Entry?.rides || 0;
    gaps.rides20th = pos20Entry?.rides || 0;
  }

  return { top30, driverEntry, driverPosition, gaps, totalParticipants: entries.length };
}

async function getTournamentData(req, res) {
  try {
    const userId = req.user?.id;
    const now = new Date();
    const phase = getTournamentPhase(now);

    // Buscar dados do motorista logado
    let driverName = 'Motorista';
    let driverRidesThisMonth = 0;

    if (userId) {
      try {
        const userResult = await pool.query(
          'SELECT name, "ridesCompleted" FROM "User" WHERE id = $1',
          [userId]
        );
        if (userResult.rows.length > 0) {
          driverName = userResult.rows[0].name || 'Motorista';
        }

        // Contar corridas do motorista no período atual
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        let periodEnd;
        if (phase.phase === 'CLASSIFICATORIA') {
          periodEnd = new Date(now.getFullYear(), now.getMonth(), 15, 23, 59, 59);
        } else if (phase.phase === 'TORNEIO') {
          periodEnd = new Date(now.getFullYear(), now.getMonth(), 22, 23, 59, 59);
        } else {
          periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        }

        const ridesResult = await pool.query(
          `SELECT COUNT(*) as count FROM "Ride" 
           WHERE "driverId" = $1 AND status = 'COMPLETED' 
           AND "createdAt" >= $2 AND "createdAt" <= $3`,
          [userId, startOfMonth, periodEnd]
        );
        driverRidesThisMonth = parseInt(ridesResult.rows[0]?.count || '0', 10);
      } catch (dbErr) {
        console.warn('[Tournament] Erro ao buscar dados do motorista:', dbErr.message);
      }
    }

    // Gerar leaderboard
    const leaderboard = generateLeaderboard(userId, driverName, driverRidesThisMonth);

    // Calcular dica inteligente
    let smartTip = '';
    if (leaderboard.driverEntry) {
      const pos = leaderboard.driverPosition;
      const gaps = leaderboard.gaps;

      if (pos <= 3) {
        smartTip = `🏆 Parabéns! Você está no TOP 3 (#${pos}º)! Continue assim para garantir o Carro de R$ 100 Mil!`;
      } else if (pos <= 20) {
        smartTip = `🔥 Você está em #${pos}º lugar (Faixa PIX R$ 3.000)! Faltam ${gaps.toTop3} corridas para o Top 3 e disputar o Carro de R$ 100 Mil!`;
      } else if (pos <= 30) {
        smartTip = `📱 Você está em #${pos}º lugar (Faixa Smartphone Samsung)! Faltam ${gaps.toTop20} corridas para subir para a faixa PIX R$ 3.000!`;
      } else {
        smartTip = `💪 Você está em #${pos}º lugar com ${leaderboard.driverEntry.rides} corridas. O 30º colocado tem ${gaps.rides30th} corridas. Faça mais ${gaps.toTop30} corridas para entrar na zona de premiação (Top 30)!`;
      }
    }

    // Montar resposta
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    res.json({
      success: true,
      tournament: {
        month: monthNames[now.getMonth()],
        year: now.getFullYear(),
        phase,
        leaderboard: leaderboard.top30,
        driver: {
          id: userId,
          name: driverName,
          rides: driverRidesThisMonth,
          position: leaderboard.driverPosition,
          isInTop30: leaderboard.driverPosition <= 30,
          gaps: leaderboard.gaps
        },
        smartTip,
        prizes: [
          { range: '1º ao 3º', prize: 'Carro de R$ 100.000,00', icon: '🚗', color: '#facc15' },
          { range: '4º ao 20º', prize: 'R$ 3.000,00 via PIX', icon: '💰', color: '#00E676' },
          { range: '21º ao 30º', prize: 'Smartphone Samsung', icon: '📱', color: '#38bdf8' }
        ],
        totalParticipants: leaderboard.totalParticipants
      }
    });
  } catch (err) {
    console.error('[Tournament] Erro:', err);
    res.status(500).json({ error: 'Erro ao buscar dados do torneio' });
  }
}

module.exports = { getTournamentData };
