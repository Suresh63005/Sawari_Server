const express = require("express");
const router = express.Router();
const {
  getAllDriversController,
  getDriverByIdController,
  exportAllDriversController,
  exportDriverByIdController,
} = require("../../../controllers/admin/driverreports.controller");

// Static routes first
router.get("/all", getAllDriversController);
router.get("/export-all", exportAllDriversController);

// Dynamic routes last (specific prefix before general)
router.get("/export/:driverId", exportDriverByIdController);
router.get("/:driverId", getDriverByIdController);

module.exports = router;