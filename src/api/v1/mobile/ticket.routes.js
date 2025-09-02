const express = require('express');
const router = express.Router();
const {upload} = require('../../../utils/multer');
const { createTicketByUser, getTicketsByUser } = require('../../../controllers/mobile/ticket.controller');
const middleware=require("../../../middlewares/mobile/authMiddleware")

router.post('/create', upload.array("ticket_images",3),middleware.isAuthenticated,createTicketByUser);
router.get('/',middleware.isAuthenticated,getTicketsByUser);


module.exports = router;