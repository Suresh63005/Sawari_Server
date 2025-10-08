const Ride = require("../models/ride.model");

/**
 * Generates a unique ride code (e.g., RIDE123456)
 * Ensures no duplicate codes exist in the Ride table
 */
async function generateUniqueRideCode(prefix = "RIDE") {
  let codeExists = true;
  let rideCode;

  while (codeExists) {
    const random6Digits = Math.floor(100000 + Math.random() * 900000);
    rideCode = `${prefix}${random6Digits}`;

    // Check for duplicate in DB
    const existingRide = await Ride.findOne({ where: { ride_code: rideCode } });
    codeExists = !!existingRide;
  }

  return rideCode;
}

module.exports = { generateUniqueRideCode };
