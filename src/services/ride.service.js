const { Op } = require("sequelize");
const Ride = require("../models/ride.model");

const rideDTO = (data) => {
  return {
    admin_id: data.admin_id,
    initiated_by_driver_id: data.initiated_by_driver_id,
    customer_name: data.customer_name,
    email: data.email,
    phone: data.phone,
    pickup_address: data.pickup_address,
    pickup_location: data.pickup_location,
    drop_location: data.drop_location,
    car_model: data.car_model,
    scheduled_time: data.scheduled_time,
    driver_id: data.driver_id,
    status: data.status,
    ride_type: data.ride_type,
    notes: data.notes,
    estimated_cost: data.estimated_cost,
    actual_cost: data.actual_cost,
    payment_status: data.payment_status,
    pickup_time: data.pickup_time,
    dropoff_time: data.dropoff_time,
  };
};

const rideResponseDTO = (ride)=>{
    return{
        id:ride.id,
        admin_id: ride.admin_id,
        initiated_by_driver_id: ride.initiated_by_driver_id,
        customer_name: ride.customer_name,
        email: ride.email,
        phone: ride.phone,
        pickup_address: ride.pickup_address,
        pickup_location: ride.pickup_location,
        drop_location: ride.drop_location,
        car_model: ride.car_model,
        scheduled_time: ride.scheduled_time,
        driver_id: ride.driver_id,
        status: ride.status,
        ride_type: ride.ride_type,
        notes: ride.notes,
        estimated_cost: ride.estimated_cost,
        actual_cost: ride.actual_cost,
        payment_status: ride.payment_status,
        pickup_time: ride.pickup_time,
        dropoff_time: ride.dropoff_time,
    }
}

/**
 * Create or update a ride based on the presence of an ID
 * @param {Object} data - Ride payload (can include id for update)
 * @returns {Object} - The created or updated ride
 */
const upsertRide = async (data) => {
  if (data.id) {
    // Check if ride with this ID exists
    const existingRide = await Ride.findByPk(data.id);
    if (!existingRide) {
      throw new Error("Ride not found for update.");
    }

    // Update and return updated ride
    await existingRide.update(data);
    return existingRide;
  } else {
    // Create new ride
    const newRide = await Ride.create(data);
    return newRide;
  }
};

/**
 * Get all rides with search, filter, pagination, and sorting
 * @param {Object} options - Filters and pagination
 */
const getAllRides = async ({search,limit = 10,page = 1,sortBy = 'createdAt',sortOrder = 'DESC',status,}) => {
  const where = {};
  const offset = (parseInt(page) - 1) * parseInt(limit);

  // Search by customer name, phone, or email
  if (search) {
    where[Op.or] = [
      { customer_name: { [Op.like]: `%${search}%` } },
      { phone: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
    ];
  }

  // Filter by status
  if (status) {
    where.status = status;
  }

  console.log("WHERE clause for getAllRides:", JSON.stringify(where, null, 2));

  const { rows, count } = await Ride.findAndCountAll({
    where,
    order: [[sortBy, sortOrder.toUpperCase()]],
    limit: parseInt(limit),
    offset: offset,
  });

  return {
    total: count,
    page: parseInt(page),
    limit: parseInt(limit),
    data: rows.map(ride => rideResponseDTO(ride)),
  };
};

/**
 * Get a single ride by ID
 * @param {string} rideId - UUID of the ride
 * @returns {Object|null} Ride object or null
 */

const getRideById = async (rideId) => {
  const ride = await Ride.findByPk(rideId);
  if (!ride) throw new Error("RIde not found with the given ID");;
  return rideResponseDTO(ride);
};

module.exports = {
    upsertRide,
    getAllRides,
    getRideById
}