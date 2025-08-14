// backend/services/ticketService.js

const Ticket = require('../models/ticket.model');
const { Op } = require("sequelize");

const getOpenTickets = async (filters = {}) => {
  try {
    const { status, search, page = 1, limit = 5 } = filters;
    const whereClause = {};

    if (status && status !== 'All') {
      whereClause.status = status;
    }

    if (search) {
      whereClause.title = { [Op.like]: `%${search}%` };
    }

    const offset = (page - 1) * limit;
    const { count, rows } = await Ticket.findAndCountAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      offset,
      limit: Number(limit),
    });

    return {
      data: rows,
      total: count,
    };
  } catch (error) {
    throw new Error('Error fetching tickets: ' + error.message);
  }
};

const resolveTicket = async (id) => {
  try {
    const ticket = await Ticket.findByPk(id);
    if (!ticket) {
      throw new Error('Ticket not found');
    }
    if (ticket.status !== 'open') {
      throw new Error('Ticket is not open');
    }
    ticket.status = 'resolved';
    ticket.resolved_at = new Date();
    await ticket.save();
    return ticket;
  } catch (error) {
    throw new Error('Error resolving ticket: ' + error.message);
  }
};

const createTicket = async (ticketData) => {
  const transaction = await Ticket.sequelize.transaction();
  try {
    const { title, description, priority, raised_by } = ticketData;
    if (!title || !priority || !raised_by) {
      throw new Error('Title, priority, and raised_by are required');
    }

    // Generate ticket_number based on the count of existing tickets
    const ticketCount = await Ticket.count({ transaction });
    const ticketNumber = String(ticketCount + 1).padStart(6, '0');

    // Create the ticket with the generated ticket_number
    const ticket = await Ticket.create(
      {
        ticket_number: ticketNumber,
        title,
        description,
        priority,
        raised_by,
      },
      { transaction }
    );

    await transaction.commit();
    return ticket;
  } catch (error) {
    await transaction.rollback();
    console.error('Create ticket error details:', error); // Debug log
    throw new Error('Error creating ticket: ' + error.message);
  }
};

const updateTicketStatus = async (id, status) => {
  try {
    const ticket = await Ticket.findByPk(id);
    if (!ticket) {
      throw new Error('Ticket not found');
    }
    if (!['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
      throw new Error('Invalid status');
    }
    ticket.status = status;
    if (status === 'resolved') {
      ticket.resolved_at = new Date();
    } else if (status === 'closed' && ticket.resolved_at === null) {
      throw new Error('Ticket must be resolved before closing');
    }
    await ticket.save();
    return ticket;
  } catch (error) {
    throw new Error('Error updating ticket status: ' + error.message);
  }
};

module.exports = { getOpenTickets, resolveTicket, createTicket, updateTicketStatus };