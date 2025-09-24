const express = require("express");
const router = express.Router();
const vehicleController = require("../../../controllers/admin/vehicle.controller");
const {authMiddleware} = require("../../../middlewares/admin/authMiddleware");

router.get("/", authMiddleware,vehicleController.getAllVehicles);
router.post("/:id/approve", authMiddleware, vehicleController.approveVehicle);
router.post("/:id/reject", authMiddleware, vehicleController.rejectVehicle);
router.post("/:id/verify-rc", authMiddleware, vehicleController.verifyRc);
router.post("/:id/reject-rc", authMiddleware, vehicleController.rejectRc);
router.post("/:id/verify-insurance", authMiddleware, vehicleController.verifyInsurance);
router.post("/:id/reject-insurance", authMiddleware, vehicleController.rejectInsurance);

module.exports = router;