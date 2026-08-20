const { pool } = require('../config/db');

exports.createTicket = async (req, res) => {
  try {
    const { category = 'OUTROS', subject, message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'A mensagem do suporte é obrigatória.' });
    }

    const { rows: userRows } = await pool.query('SELECT name, email, role FROM "User" WHERE id = $1', [req.user.id]);
    const user = userRows[0] || { name: 'Usuário', email: 'suporte@zomp.com', role: req.user.role };

    const resolvedSubject = subject || `Atendimento [${category}] - ${new Date().toLocaleDateString('pt-BR')}`;

    // Cria o chamado
    const { rows: ticketRows } = await pool.query(`
      INSERT INTO "SupportTicket" ("userId", "userRole", "userName", "userEmail", "category", "subject", "message", "status")
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'OPEN')
      RETURNING *
    `, [req.user.id, user.role, user.name, user.email, category, resolvedSubject, message.trim()]);

    const ticket = ticketRows[0];

    // Registra a mensagem inicial do usuário
    await pool.query(`
      INSERT INTO "SupportMessage" ("ticketId", "senderRole", "senderName", "text")
      VALUES ($1, 'USER', $2, $3)
    `, [ticket.id, user.name, message.trim()]);

    // Resposta automática de triagem imediata da Zomp
    const botReply = `Olá ${user.name.split(' ')[0]}! Protocolo de atendimento gerado: #${ticket.id.substring(0, 8).toUpperCase()}. Nossa equipe de Suporte Zomp recebeu sua solicitação sobre "${category}" e está analisando. Você pode enviar novas mensagens por este chat a qualquer momento!`;
    await pool.query(`
      INSERT INTO "SupportMessage" ("ticketId", "senderRole", "senderName", "text")
      VALUES ($1, 'SUPPORT', 'Suporte Oficial Zomp', $2)
    `, [ticket.id, botReply]);

    res.status(201).json({
      ticket,
      initialReply: botReply
    });
  } catch (err) {
    console.error('Erro ao abrir chamado de suporte:', err.message);
    res.status(500).json({ error: 'Erro ao abrir chamado de suporte' });
  }
};

exports.getUserTickets = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM "SupportTicket"
      WHERE "userId" = $1
      ORDER BY "createdAt" DESC
    `, [req.user.id]);
    res.json(rows);
  } catch (err) {
    console.error('Erro ao buscar tickets:', err.message);
    res.status(500).json({ error: 'Erro ao buscar chamados de suporte' });
  }
};

exports.getTicketMessages = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { rows } = await pool.query(`
      SELECT * FROM "SupportMessage"
      WHERE "ticketId" = $1
      ORDER BY "createdAt" ASC
    `, [ticketId]);
    res.json(rows);
  } catch (err) {
    console.error('Erro ao buscar mensagens do suporte:', err.message);
    res.status(500).json({ error: 'Erro ao buscar mensagens do chamado' });
  }
};

exports.sendTicketMessage = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Mensagem não pode ser vazia' });
    }

    const { rows: userRows } = await pool.query('SELECT name, role FROM "User" WHERE id = $1', [req.user.id]);
    const sender = userRows[0] || { name: 'Usuário', role: req.user.role };

    const { rows } = await pool.query(`
      INSERT INTO "SupportMessage" ("ticketId", "senderRole", "senderName", "text")
      VALUES ($1, 'USER', $2, $3)
      RETURNING *
    `, [ticketId, sender.name, text.trim()]);

    // Atualiza o updatedAt do ticket
    await pool.query('UPDATE "SupportTicket" SET "updatedAt" = NOW() WHERE id = $1', [ticketId]);

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Erro ao enviar mensagem de suporte:', err.message);
    res.status(500).json({ error: 'Erro ao enviar mensagem de suporte' });
  }
};
