// backend/routes/ticketRoutes.js

const express = require("express");
const router = express.Router();
const { getOpenTicketsHandler, resolveTicketHandler, createTicketHandler, updateTicketStatusHandler } = require("../../../controllers/admin/ticket.controller");

// GET all open tickets with filters
router.get("/", getOpenTicketsHandler);

// POST to resolve a ticket
router.post("/:id/resolve", resolveTicketHandler);

// POST to create a new ticket
router.post("/create", createTicketHandler);

// PUT to update ticket status
router.put("/:id/status", updateTicketStatusHandler);

module.exports = router;