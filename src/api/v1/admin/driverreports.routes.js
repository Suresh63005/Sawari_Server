const router = require("express").Router();
const {
  getAllDriversController,
  getDriverByIdController,
  exportAllDriversController,
  exportDriverByIdController,
} = require("../../../controllers/admin/driverreports.controller");
const { endPoints } = require("../../api");

// Static routes first
router.get(endPoints.driverreports.all, getAllDriversController);
router.get(endPoints.driverreports.exportAll, exportAllDriversController);

// Dynamic routes last (specific prefix before general)
router.get(endPoints.driverreports.exportDriver, exportDriverByIdController);
router.get(endPoints.driverreports.getDriverById, getDriverByIdController);

module.exports = router;
