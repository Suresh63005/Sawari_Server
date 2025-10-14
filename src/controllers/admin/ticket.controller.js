const {
  getOpenTickets,
  resolveTicket,
  createTicket,
  updateTicketStatus,
} = require("../../services/ticket.service");

const getOpenTicketsHandler = async (req, res) => {
  try {
    const { status, search } = req.query;
    const tickets = await getOpenTickets({ status, search });
    res.status(200).json(tickets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const resolveTicketHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedTicket = await resolveTicket(id);
    res.status(200).json(updatedTicket);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const createTicketHandler = async (req, res) => {
  try {
    const { title, description, priority, raised_by } = req.body;
    if (!title || !priority || !raised_by) {
      return res
        .status(400)
        .json({ message: "Title, priority, and raised_by are required" });
    }
    const ticket = await createTicket({
      title,
      description,
      priority,
      raised_by,
    });
    res.status(201).json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateTicketStatusHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }
    const updatedTicket = await updateTicketStatus(id, status);
    res.status(200).json(updatedTicket);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  getOpenTicketsHandler,
  resolveTicketHandler,
  createTicketHandler,
  updateTicketStatusHandler,
};
