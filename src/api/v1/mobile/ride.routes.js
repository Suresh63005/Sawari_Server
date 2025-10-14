const router = require("express").Router();
const rideController = require("../../../controllers/mobile/ride.controller");
const authMiddleware = require("../../../middlewares/mobile/authMiddleware");
const { endPoints } = require("../../api");

router.post(
  endPoints["mob-ride"].upsertRide,
  authMiddleware.isAuthenticated,
  rideController.upsertRide
);
router.get(
  endPoints["mob-ride"].getAllRides,
  authMiddleware.isAuthenticated,
  rideController.getAllRides
);
router.get(
  endPoints["mob-ride"].getRideById,
  authMiddleware.isAuthenticated,
  rideController.getRideById
);
router.get(
  endPoints["mob-ride"].getRidesByStatus,
  authMiddleware.isAuthenticated,
  rideController.getRidesByStatus
);

module.exports = router;
