const router = require("express").Router();
const {
  getAllRidesController,
  getRideByIdController,
  exportAllRidesController,
  exportRideByIdController,
} = require("../../../controllers/admin/ridesreports.controller");
const { endPoints } = require("../../api");

router.get(endPoints.ridesreports.getAllRides, getAllRidesController);
router.get(endPoints.ridesreports.exportAllRides, exportAllRidesController);
router.get(endPoints.ridesreports.exportRideById, exportRideByIdController);
router.get(endPoints.ridesreports.getRideById, getRideByIdController);

module.exports = router;
