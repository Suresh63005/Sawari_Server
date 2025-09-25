const router = require("express").Router();
const middleware=require("../../../middlewares/mobile/authMiddleware");
const { getNotifications } = require("../../../controllers/mobile/notification.controller");

router.get("/",middleware.isAuthenticated,getNotifications );

module.exports = router;