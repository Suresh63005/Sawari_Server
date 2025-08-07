const express = require('express');
const router = express.Router();
const rideController = require('../../../controllers/admin/ride.controller');

// Define routes
router.get('/all', rideController.getAllRides);
router.get('/:id', rideController.getRideById);
router.post('/', rideController.createRide);
router.put('/:id', rideController.updateRide);
router.get('/available-cars/:package_id/:sub_package_id', rideController.getAvailableCarsAndPrices);

module.exports = router;