const router = require("express").Router();
const notificationController = require("../../../controllers/admin/notifications.controller");
const {upload,handleMulterError} = require("../../../utils/multer");
const authMiddleware = require("../../../middlewares/admin/authMiddleware");

router.post("/sent",authMiddleware.authMiddleware,upload.single("image"),handleMulterError,notificationController.sendNotificationController);
router.get("/all",notificationController.getAllNotificationsController);
router.get("/view/:id",notificationController.getSingleNotificationController);
router.delete("/delete/:id",authMiddleware.authMiddleware,notificationController.deleteNotificationController);

module.exports = router;