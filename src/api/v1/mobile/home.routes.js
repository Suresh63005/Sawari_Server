const router = require("express").Router();
const homeController = require("../../../controllers/mobile/home.controller");
const middleware = require("../../../middlewares/mobile/authMiddleware");
// const { validateRequest } = require("../../../middlewares/validateRequest");
// const { startRideSchema } = require("../../../validators/mobile/home");
const { endPoints } = require("../../api");

router.get(
  endPoints.home.getAllHomeData,
  middleware.isAuthenticated,
  homeController.getAllHomeData
);
router.post(
  endPoints.home.acceptRide,
  middleware.isAuthenticated,
  homeController.acceptRide
);
router.patch(
  endPoints.home.toggleDriverStatus,
  middleware.isAuthenticated,
  homeController.toggleDriverStatus
);
router.get(
  endPoints.home.getRideDetails,
  middleware.isAuthenticated,
  homeController.getRideDetails
);
router.put(
  endPoints.home.updateRideStatus,
  middleware.isAuthenticated,
  homeController.updateRideStatus
);
router.get(
  endPoints.home.getRidesByStatus,
  middleware.isAuthenticated,
  homeController.getRidesByStatus
);
router.post(
  endPoints.home.upsertRide,
  middleware.isAuthenticated,
  homeController.upsertRide
); // test not write yet
router.put(
  endPoints.home.releaseDriverFromRide,
  middleware.isAuthenticated,
  homeController.releaseDriverFromRide
);
router.put(
  endPoints.home.startRide,
  middleware.isAuthenticated,
  homeController.startRide
);
router.put(
  endPoints.home.endRide,
  middleware.isAuthenticated,
  homeController.endRide
);
router.put(
  endPoints.home.cancelRide,
  middleware.isAuthenticated,
  homeController.cancelRideController
);
router.get(
  endPoints.home.getMyRides,
  middleware.isAuthenticated,
  homeController.getMyRides
);
router.get(
  endPoints.home.earningsHistory,
  middleware.isAuthenticated,
  homeController.earningsHistory
); // http://localhost:4445/api/v1/mobile/home/earnings-history?month=2025-07

module.exports = router;
