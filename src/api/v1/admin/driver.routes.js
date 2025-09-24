const express = require("express");
const router = express.Router();
const driverController = require("../../../controllers/admin/driver.controller");
const {authMiddleware} = require("../../../middlewares/admin/authMiddleware");

router.get("/", authMiddleware, driverController.getAllDrivers);
router.get("/:id", authMiddleware, driverController.getDriverById);
router.post("/:id/approve", authMiddleware, driverController.approveDriver);
router.post("/:id/reject", authMiddleware, driverController.rejectDriver);
router.post("/:id/block", authMiddleware, driverController.blockDriver);
router.post("/:id/unblock", authMiddleware, driverController.unblockDriver);
router.post("/:id/verify-license", authMiddleware, driverController.verifyLicense);
router.post("/:id/reject-license", authMiddleware, driverController.rejectLicense);
router.post("/:id/verify-emirates", authMiddleware, driverController.verifyEmirates);
router.post("/:id/reject-emirates", authMiddleware, driverController.rejectEmirates);

module.exports = router;