const router = require("express").Router();
const {
  getOpenTicketsHandler,
  resolveTicketHandler,
  createTicketHandler,
  updateTicketStatusHandler,
} = require("../../../controllers/admin/ticket.controller");
const { endPoints } = require("../../api");

router.get(endPoints.ticket.getOpenTicketsHandler, getOpenTicketsHandler);
router.post(endPoints.ticket.resolveTicketHandler, resolveTicketHandler);
router.post(endPoints.ticket.createTicketHandler, createTicketHandler);
router.put(
  endPoints.ticket.updateTicketStatusHandler,
  updateTicketStatusHandler
);

module.exports = router;
