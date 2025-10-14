const router = require("express").Router();
const middleware = require("../../../middlewares/mobile/authMiddleware");
const {
  getNotifications,
} = require("../../../controllers/mobile/notification.controller");
const { endPoints } = require("../../api");

router.get(
  endPoints["mob-notifications"].getNotifications,
  middleware.isAuthenticated,
  getNotifications
);

module.exports = router;
