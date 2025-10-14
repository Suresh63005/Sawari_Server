const express = require("express");
const router = express.Router();
const rideController = require("../../../controllers/admin/ride.controller");
const { endPoints } = require("../../api");

router.get(endPoints.ride.getAllRides, rideController.getAllRides);
router.get(endPoints.ride.getRideById, rideController.getRideById);
router.post(endPoints.ride.createRide, rideController.createRide);
router.put(endPoints.ride.updateRide, rideController.updateRide);
router.get(
  endPoints.ride.getAvailableCarsAndPrices,
  rideController.getAvailableCarsAndPrices
);

module.exports = router;
