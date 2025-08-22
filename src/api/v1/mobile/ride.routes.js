const express = require('express');
const router = express.Router()
const rideController = require('../../../controllers/mobile/ride.controller');
const authMiddleware = require('../../../middlewares/mobile/authMiddleware');

router.post("/upsert",authMiddleware.isAuthenticated,rideController.upsertRide);
router.get("/get-all",authMiddleware.isAuthenticated,rideController.getAllRides);
router.get("/:rideId",authMiddleware.isAuthenticated,rideController.getRideById);
router.get("/get-by-status/:status",authMiddleware.isAuthenticated,rideController.getRidesByStatus);

module.exports = router;
