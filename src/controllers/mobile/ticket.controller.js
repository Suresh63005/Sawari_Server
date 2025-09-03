const { createTicket, getTickets, getTicketsById } = require("../../services/ticket.service");

const createTicketByUser = async (req, res) => {
  try {
    const raised_by = req.driver?.id;
    if (!raised_by) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const { title, description, priority } = req.body;
    const files = req.files;

    if (!title || !description ) {
      return res.status(400).json({ message: 'Title, description,  are required' });
    }

    const ticket = await createTicket({ title, description, priority, raised_by, files });

    res.status(201).json(ticket);
  } catch (error) {
    console.error("Create Ticket Controller Error:", error);
    res.status(500).json({ message: error.message });
  }
};

const getTicketsByUser = async (req, res) => {
  try {
    const raised_by = req.driver?.id;
    if (!raised_by) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const tickets = await getTickets({ raised_by });
    res.status(200).json(tickets);
  } catch (error) {
    console.error("Get Tickets Controller Error:", error);
    res.status(500).json({ message: error.message });
  }
};

const ticketview = async (req, res) => {
  try {
    const raised_by = req.driver?.id;
    if (!raised_by) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const id = req.params.id;
    console.log(id,"this is id" ,raised_by, "this is raised by");
    const tickets = await getTicketsById({ raised_by, id });
    res.status(200).json(tickets);
  } catch (error) {
    console.error("Get Tickets Controller Error:", error);
    res.status(500).json({ message: error.message });
  }
};





module.exports = {
  createTicketByUser,
  getTicketsByUser,
  ticketview
};