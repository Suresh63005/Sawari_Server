const express = require('express');
const riderController = require('../../../controllers/admin/ride.controller');
const router = express.Router();

router.get('/all', riderController.getAllRides);


module.exports = router;