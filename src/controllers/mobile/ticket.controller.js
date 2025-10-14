const { isValidPriority } = require("../../helper/common");
const {
  createTicket,
  getTickets,
  getTicketsById,
} = require("../../services/ticket.service");

const createTicketByUser = async (req, res) => {
  const driver_id = req.driver?.id;
  if (!driver_id) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  const { title, description, priority } = req.body;
  if (!title || !description) {
    return res
      .status(400)
      .json({ sucess: false, message: "Title, description, are required" });
  }

  const normalizedPriority = priority?.toLowerCase(priority);
  if (!isValidPriority(normalizedPriority)) {
    return res.status(400).json({
      success: false,
      message:
        "Invalid priority. priority must be 'low' or 'medium' or 'high' or 'urgent' ",
    });
  }
  const files = req.files;

  try {
    const ticket = await createTicket({
      title,
      description,
      priority: normalizedPriority,
      raised_by: driver_id,
      files,
    });

    // res.status(201).json(ticket);
    res.status(201).json({
      success: true,
      message: "Ticket created successfull",
      data: ticket,
    });
  } catch (error) {
    console.error("Create Ticket Controller Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

const getTicketsByUser = async (req, res) => {
  const driver_id = req.driver?.id;
  if (!driver_id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const tickets = await getTickets({ driver_id });
    // res.status(200).json(tickets);
    res.status(200).json({
      success: true,
      message: "Ticket fetched sucessfully",
      data: tickets,
    });
  } catch (error) {
    console.error("Get Tickets Controller Error:", error);
    res.status(500).json({ message: error.message });
  }
};

const ticketview = async (req, res) => {
  const driver_id = req.driver?.id;
  if (!driver_id) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  const id = req.params.id;
  console.log(id, "this is id", driver_id, "this is raised by");
  if (!id) {
    return res
      .status(400)
      .json({ success: false, message: "Ticket ID is required." });
  }

  try {
    const tickets = await getTicketsById({ driver_id, id });
    // res.status(200).json(tickets);
    res.status(200).json({
      success: true,
      message: "Ticket reviewed sucessfully",
      data: tickets,
    });
  } catch (error) {
    console.error("Get Tickets Controller Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

module.exports = {
  createTicketByUser,
  getTicketsByUser,
  ticketview,
};
