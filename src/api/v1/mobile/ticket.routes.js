const router = require("express").Router();
const { upload } = require("../../../utils/multer");
const {
  createTicketByUser,
  getTicketsByUser,
  ticketview,
} = require("../../../controllers/mobile/ticket.controller");
const middleware = require("../../../middlewares/mobile/authMiddleware");
const { endPoints } = require("../../api");

router.post(
  endPoints["mob-ticket"].getAllSettings,
  upload.array("ticket_images", 3),
  middleware.isAuthenticated,
  createTicketByUser
);
router.get(
  endPoints["mob-ticket"].getTicketsByUser,
  middleware.isAuthenticated,
  getTicketsByUser
);
router.get(
  endPoints["mob-ticket"].ticketview,
  middleware.isAuthenticated,
  ticketview
);

module.exports = router;
