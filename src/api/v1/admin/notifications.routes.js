const router = require("express").Router();
const notificationController = require("../../../controllers/admin/notifications.controller");
const { upload, handleMulterError } = require("../../../utils/multer");
const authMiddleware = require("../../../middlewares/admin/authMiddleware");
const { endPoints } = require("../../api");

router.post(
  endPoints.notifications.sent,
  authMiddleware.authMiddleware,
  upload.single("image"),
  handleMulterError,
  notificationController.sendNotificationController
);
router.get(
  endPoints.notifications.all,
  notificationController.getAllNotificationsController
);
router.get(
  endPoints.notifications.view,
  notificationController.getSingleNotificationController
);
router.delete(
  endPoints.notifications.delete,
  authMiddleware.authMiddleware,
  notificationController.deleteNotificationController
);

module.exports = router;
