const express = require("express");
const router = express.Router();
const {upload} = require("../../../utils/multer");
const { createTicketByUser, getTicketsByUser, ticketview } = require("../../../controllers/mobile/ticket.controller");
const middleware=require("../../../middlewares/mobile/authMiddleware");

router.post("/create", upload.array("ticket_images",3),middleware.isAuthenticated,createTicketByUser);
router.get("/",middleware.isAuthenticated,getTicketsByUser);
router.get("/:id",middleware.isAuthenticated,ticketview);


module.exports = router;