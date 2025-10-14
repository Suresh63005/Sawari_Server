const rideService = require("../../services/ride.service");
const earningService = require("../../services/earnings.service");

/**
 * Controller to create or update a ride entry.
 *
 * Functionality:
 * - Only allows a driver to initiate or update a ride.
 * - Normalizes phone number by prefixing +91 if not present.
 * - If ride ID is provided (indicating an update), it:
 *    - Validates ride existence.
 *    - Ensures the requesting driver owns the ride.
 *    - Prevents update if ride is already accepted or has a driver assigned.
 * - Calls the service to insert or update the ride.
 * - If ride status is "completed", it logs the earning.
 *
 * Restrictions:
 * - Ride cannot be updated if status is "accepted" or `driver_id` already exists.
 *
 * Notes:
 * - This controller can also be used to mark a ride as completed, cancelled, or update any ride-related data,
 *   as long as the authenticated driver owns the ride.
 * - Additional validation (e.g. allowed status transitions) can be implemented in the service layer if needed.
 */

const upsertRide = async (req, res) => {
  try {
    const driverId = req.driver?.id;
    if (!driverId) {
      return res
        .status(400)
        .json({ message: "Ride must be initiated by a driver." });
    }

    const data = req.body;

    // Normalize phone number
    if (data.phone && !data.phone.startsWith("+91")) {
      data.phone = `+91${data.phone}`;
    }

    // If ride ID is provided (means update), validate driver ownership
    if (data.id) {
      const existingRide = await rideService.getRideById(data.id);
      if (!existingRide) {
        return res.status(404).json({ message: "Ride not found." });
      }
      // Only allow the assigned driver to update the ride
      if (existingRide.driver_id !== driverId) {
        return res
          .status(403)
          .json({ message: "You are not authorized to update this ride." });
      }
      // Disallow update if ride is accepted or driver is already assigned
      if (existingRide.status === "accepted" || existingRide.driver_id) {
        return res.status(400).json({
          message: "Cannot update ride after it is accepted or assigned.",
        });
      }
    }

    const ride = await rideService.upsertRide({
      ...data,
      initiated_by_driver_id: driverId,
      driver_id: data.driver_id || null,
    });

    // If ride is marked as completed, record the earning
    if (ride.status === "completed") {
      await earningService.createEarnings({
        driver_id: ride.driver_id,
        ride_id: ride.id,
        amount: ride.total_amount,
        date: new Date(),
      });
    }

    return res.status(200).json({
      message: data.id
        ? "Ride updated successfully"
        : "Ride created successfully",
      ride,
    });
  } catch (error) {
    console.error("Upsert Ride Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Controller: getAllRides
 *
 * Purpose:
 * Fetches all rides created by the authenticated driver.
 *
 * Functionality:
 * - Requires authentication (driver token).
 * - Retrieves all rides where driver_id matches the logged-in driver.
 */
const getAllRides = async (req, res) => {
  try {
    const driverId = req.driver?.id;
    if (!driverId) {
      return res
        .status(401)
        .json({ message: "Unauthorized access. Driver not authenticated." });
    }

    const rides = await rideService.getAllRidesByDriver(driverId);

    return res.status(200).json({
      message: "Rides fetched successfully",
      rides,
    });
  } catch (error) {
    console.error("Get All Rides Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Controller: getRideById
 *
 * Purpose:
 * Fetches a single ride by ID, but only if it belongs to the logged-in driver.
 *
 * Functionality:
 * - Requires authentication (driver token).
 * - Ensures the ride exists and belongs to the authenticated driver.
 */
const getRideById = async (req, res) => {
  try {
    const driverId = req.driver?.id;

    if (!driverId) {
      return res
        .status(401)
        .json({ message: "Unauthorized access. Driver not authenticated." });
    }

    const rideId = req.params.id;
    const ride = await rideService.getRideById(rideId);

    if (!ride) {
      return res.status(404).json({ message: "Ride not found." });
    }

    if (ride.driver_id !== driverId) {
      return res
        .status(403)
        .json({ message: "You are not authorized to access this ride." });
    }

    return res.status(200).json({
      message: "Ride fetched successfully",
      ride,
    });
  } catch (error) {
    console.error("Get Ride By ID Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Controller: getRidesInitiatedByDriver
 *
 * Purpose:
 * Fetch rides created (initiated) by the authenticated driver.
 *
 * Functionality:
 * - Requires driver authentication.
 * - Supports pagination and sorting via query params.
 */
const getRidesInitiatedByDriver = async (req, res) => {
  try {
    const driverId = req.driver?.id;
    if (!driverId) {
      return res
        .status(401)
        .json({ message: "Unauthorized access. Driver not authenticated." });
    }

    // Optional query params for pagination & sorting
    const { limit, page, sortBy, sortOrder } = req.query;

    const rides = await rideService.getRidesByInitiator(driverId, {
      limit,
      page,
      sortBy,
      sortOrder,
    });

    return res.status(200).json({
      message: "Rides initiated by you fetched successfully",
      rides,
    });
  } catch (error) {
    console.error("Get Rides Initiated By Driver Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

const getRidesByStatus = async (req, res) => {
  console.log("getRidesByStatus called with status:", req.params.status);
  const driverId = req.driver?.id;
  if (!driverId) {
    return res
      .status(401)
      .json({ message: "Unauthorized access. Driver not authenticated." });
  }

  const status = req.params.status;
  console.log("Driver ID:", driverId, "Status:", status);
  try {
    const rides = await rideService.getRidesByStatusAndDriver(status, driverId);

    return res.status(200).json({
      message: `Rides with status "${status}" fetched successfully`,
      rides,
      count: rides.length,
    });
  } catch (error) {
    console.error("Get Rides By Status Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  upsertRide,
  getAllRides,
  getRideById,
  getRidesInitiatedByDriver,
  getRidesByStatus,
};
