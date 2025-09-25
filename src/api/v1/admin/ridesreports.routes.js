const router = require("express").Router();
const { getAllRidesController, getRideByIdController, exportAllRidesController, exportRideByIdController,} = require("../../../controllers/admin/ridesreports.controller");

// Static routes first
router.get("/all", getAllRidesController);
router.get("/export-all", exportAllRidesController);

// Dynamic routes last
router.get("/export/:rideId", exportRideByIdController);
router.get("/:rideId", getRideByIdController);

module.exports = router;