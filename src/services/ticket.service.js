const { uploadToS3 } = require("../config/fileUpload.aws");
const Ticket = require("../models/ticket.model");
const Driver = require("../models/driver.model");
const { Op } = require("sequelize");

const getOpenTickets = async (filters = {}) => {
  try {
    const { status, search, page = 1, limit = 5 } = filters;
    const whereClause = {};

    if (status && status !== "All") {
      whereClause.status = status;
    }

    if (search) {
      whereClause.title = { [Op.like]: `%${search}%` };
    }

    const offset = (page - 1) * limit;
    const { count, rows } = await Ticket.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Driver,
          attributes: ["first_name", "last_name", "phone"],
          as: "driver",
        },
      ],
      order: [["createdAt", "DESC"]],
      offset,
      limit: Number(limit),
    });

    // Format the response to include driver details
    const formattedRows = rows.map((ticket) => {
      let images = [];
      if (ticket.images) {
        try {
          const cleaned = ticket.images.startsWith('"')
            ? JSON.parse(ticket.images)
            : ticket.images;
          images = Array.isArray(cleaned) ? cleaned : JSON.parse(cleaned);
        } catch (e) {
          console.error(
            "❌ Error parsing images for ticket",
            ticket.id,
            e.message
          );
        }
      }
      return {
        ...ticket.get({ plain: true }),
        images,
        driver_name: ticket.driver
          ? `${ticket.driver.first_name || ""} ${ticket.driver.last_name || ""}`.trim()
          : "Unknown",
        driver_phone: ticket.driver ? ticket.driver.phone || "N/A" : "N/A",
      };
    });

    return {
      data: formattedRows,
      total: count,
    };
  } catch (error) {
    throw new Error("Error fetching tickets: " + error.message);
  }
};

const resolveTicket = async (id) => {
  try {
    const ticket = await Ticket.findByPk(id);
    if (!ticket) {
      throw new Error("Ticket not found");
    }
    if (ticket.status !== "open") {
      throw new Error("Ticket is not open");
    }
    ticket.status = "resolved";
    ticket.resolved_at = new Date();
    await ticket.save();
    return ticket;
  } catch (error) {
    throw new Error("Error resolving ticket: " + error.message);
  }
};

const createTicket = async (ticketData) => {
  const { title, description, priority, raised_by, files } = ticketData;
  const transaction = await Ticket.sequelize.transaction();

  try {
    // Generate ticket_number
    const ticketCount = await Ticket.count({ transaction });
    const ticketNumber = String(ticketCount + 1).padStart(6, "0");

    let uploadedUrls = [];
    if (files && files.length > 0) {
      uploadedUrls = await uploadToS3(files, "ticket-images");
    }

    const ticket = await Ticket.create(
      {
        ticket_number: ticketNumber,
        title,
        description,
        priority,
        raised_by,
        images: uploadedUrls.length > 0 ? JSON.stringify(uploadedUrls) : null,
      },
      { transaction }
    );

    await transaction.commit();
    return ticket;
  } catch (error) {
    await transaction.rollback();
    console.error("Create ticket error details:", error);
    throw new Error("Error creating ticket: " + error.message);
  }
};

const updateTicketStatus = async (id, status) => {
  try {
    const ticket = await Ticket.findByPk(id);
    if (!ticket) {
      throw new Error("Ticket not found");
    }
    if (!["open", "in_progress", "resolved", "closed"].includes(status)) {
      throw new Error("Invalid status");
    }
    ticket.status = status;
    if (status === "resolved") {
      ticket.resolved_at = new Date();
    } else if (status === "closed" && ticket.resolved_at === null) {
      throw new Error("Ticket must be resolved before closing");
    }
    await ticket.save();
    return ticket;
  } catch (error) {
    throw new Error("Error updating ticket status: " + error.message);
  }
};

const getTickets = async (filters = {}) => {
  try {
    const { driver_id } = filters;
    const whereClause = {};

    if (driver_id) {
      whereClause.raised_by = driver_id;
    }

    const tickets = await Ticket.findAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
      raw: true,
    });

    // ✅ Force parse images
    const formattedTickets = tickets.map((ticket) => {
      let images = [];
      if (ticket.images) {
        try {
          // First remove extra escaping if it"s double-stringified
          const cleaned = ticket.images.startsWith('"')
            ? JSON.parse(ticket.images)
            : ticket.images;
          images = Array.isArray(cleaned) ? cleaned : JSON.parse(cleaned);
        } catch (e) {
          console.error(
            "❌ Error parsing images for ticket",
            ticket.id,
            e.message
          );
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
  const { driver_id, id } = data;

  try {
    const ticket = await Ticket.findOne({
      where: { id, raised_by: driver_id },
      raw: true,
    });

    if (!ticket) {
      return null;
    }

    let images = [];
    if (ticket.images) {
      try {
        // Remove extra escaping if it"s double-stringified
        const cleaned = ticket.images.startsWith('"')
          ? JSON.parse(ticket.images)
          : ticket.images;
        images = Array.isArray(cleaned) ? cleaned : JSON.parse(cleaned);
      } catch (e) {
        console.error(
          "❌ Error parsing images for ticket",
          ticket.id,
          e.message
        );
      }
    }

    return { ...ticket, images };
  } catch (error) {
    throw new Error("Error fetching ticket: " + error.message);
  }
};

module.exports = {
  getOpenTickets,
  resolveTicket,
  createTicket,
  updateTicketStatus,
  getTickets,
  getTicketsById,
};
