// backend/services/ticketService.js

const { uploadToS3 } = require('../config/fileUpload.aws');
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
    const { title, description, priority, raised_by, files } = ticketData;

    if (!title || !priority || !raised_by) {
      throw new Error('Title, priority, and raised_by are required');
    }

    // Generate ticket_number
    const ticketCount = await Ticket.count({ transaction });
    const ticketNumber = String(ticketCount + 1).padStart(6, '0');

    // Upload images to S3 if present
    let uploadedUrls = [];
    if (files && files.length > 0) {
      try {
        uploadedUrls = await uploadToS3(files, "ticket-images");
      } catch (err) {
        console.error("S3 upload failed:", err);
        throw new Error("Image upload failed");
      }
    }

    // Create ticket
    const ticket = await Ticket.create(
      {
        ticket_number: ticketNumber,
        title,
        description,
        priority,
        raised_by,
        images: uploadedUrls.length > 0 ? JSON.stringify(uploadedUrls) : null
      },
      { transaction }
    );

    await transaction.commit();
    return ticket;
  } catch (error) {
    await transaction.rollback();
    console.error('Create ticket error details:', error);
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


const getTickets = async (filters = {}) => {
  try {
    const { raised_by } = filters;
    const whereClause = {};

    if (raised_by) {
      whereClause.raised_by = raised_by;
    }

    const tickets = await Ticket.findAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
      raw: true,
    });

    // ✅ Force parse images
    const formattedTickets = tickets.map(ticket => {
      let images = [];
      if (ticket.images) {
        try {
          // First remove extra escaping if it's double-stringified
          const cleaned = ticket.images.startsWith('"') ? JSON.parse(ticket.images) : ticket.images;
          images = Array.isArray(cleaned) ? cleaned : JSON.parse(cleaned);
        } catch (e) {
          console.error("❌ Error parsing images for ticket", ticket.id, e.message);
        }
      }
      return { ...ticket, images };
    });

    return formattedTickets;
  } catch (error) {
    throw new Error("Error fetching tickets: " + error.message);
  }
};

const getTicketsById = async (data) => {
  const { raised_by, id } = data;

  try {
    const ticket = await Ticket.findOne({
      where: { id, raised_by },
      raw: true, // returns plain object instead of Sequelize instance
    });

    if (!ticket) {
      throw new Error("Ticket not found");
    }

    let images = [];
    if (ticket.images) {
      try {
        // Remove extra escaping if it's double-stringified
        const cleaned = ticket.images.startsWith('"')
          ? JSON.parse(ticket.images)
          : ticket.images;

        images = Array.isArray(cleaned) ? cleaned : JSON.parse(cleaned);
      } catch (e) {
        console.error("❌ Error parsing images for ticket", ticket.id, e.message);
      }
    }

    return { ...ticket, images };
  } catch (error) {
    throw new Error("Error fetching ticket: " + error.message);
  }
};




module.exports = { getOpenTickets, resolveTicket, createTicket, updateTicketStatus,getTickets,getTicketsById };