const { Op, fn, col } = require("sequelize");
const Ride = require("../models/ride.model");
const Driver = require("../models/driver.model");
const DriverCar = require("../models/driver-cars.model");
const Earnings = require("../models/earnings.model");

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
const upsertRide = async (rideData) => {
  if (rideData.id) {
    // Check if ride with this ID exists
    const existingRide = await Ride.findByPk(rideData.id);
    if (!existingRide) {
      throw new Error("Ride not found for update.");
    }

    // Update and return updated ride
    await existingRide.update(rideData);
    return existingRide;
  } else {
    // Create new ride
    const newRide = await Ride.create(rideDTO(rideData));
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

const getRideById = async (rideId,mm) => {
  const ride = await Ride.findByPk(rideId);
  if (!ride) throw new Error("RIde not found with the given ID");;
  return ride;
};

const getRidesByInitiator = async (initiatedByDriverId, { limit = 10, page = 1, sortBy = 'createdAt', sortOrder = 'DESC' } = {}) => {
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const { rows, count } = await Ride.findAndCountAll({
    where: { initiated_by_driver_id: initiatedByDriverId },
    order: [[sortBy, sortOrder.toUpperCase()]],
    limit: parseInt(limit),
    offset,
  });

  return {
    total: count,
    page: parseInt(page),
    limit: parseInt(limit),
    data: rows.map(ride => rideResponseDTO(ride)),
  };
};



const getAllRidesAdmin = async ({ search = "", status, page = 1, limit = 10 }) => {
  const whereClause = {};

  // Search logic
  if (search) {
    whereClause[Op.or] = [
      { customer_name: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
      { phone: { [Op.like]: `%${search}%` } },
    ];
  }

  // Status filter
  if (status) {
    whereClause.status = status;
  }

  const offset = (parseInt(page) - 1) * parseInt(limit);

  // Fetch rides
  const rides = await Ride.findAll({
    where: whereClause,
    include: [
      { model: Driver, 
        as: "AssignedDriver",
        attributes: ["id", "first_name","last_name",] ,
        include: [{
          model: DriverCar,
          as: "Vehicles",
          attributes: ["car_brand", "car_model",]
        }]
      }],
    offset: parseInt(offset),
    limit: parseInt(limit),
    order: [["createdAt", "DESC"]],
  });

  // Count data
  const totalRides = await Ride.count();
  const [pending, accepted, onRoute, completed, cancelled] = await Promise.all([
    Ride.count({ where: { status: "pending" } }),
    Ride.count({ where: { status: "accepted" } }),
    Ride.count({ where: { status: "on-route" } }),
    Ride.count({ where: { status: "completed" } }),
    Ride.count({ where: { status: "cancelled" } }),
  ]);

  // Total revenue
  const revenueResult = await Ride.findAll({
    attributes: [[fn("SUM", col("actual_cost")), "total_revenue"]],
    raw: true,
  });
  const totalRevenue = parseFloat(revenueResult[0].total_revenue || 0);

  return {
    rides,
    counts: {
      totalRides,
      pending,
      accepted,
      onRoute,
      completed,
      cancelled,
    },
    totalRevenue,
  };
};



const conditionalRides = async (options = {}) => {
  return Ride.findAll(options);
};


const acceptedRides=async(where={})=>{
  return await Ride.findAll({where})
}

const getRideByIdData=async(driver_id,ride_id)=>{
  const ride = await Ride.findOne({
        where: {
            id: ride_id,
            [Op.or]: [
                { driver_id: driver_id },
                { initiated_by_driver_id: driver_id }
            ]
        },
        attributes: ["customer_name", "pickup_location", "drop_location", "status", "ride_type"],
        include: [
            {
                model: Earnings,
                as: "Earnings",
                attributes: ["amount", "commission", "percentage"]
            }
        ]
    });
    if (!ride) {
        throw new Error("Ride not found");
    }
    return ride;
}

module.exports = {
    upsertRide,
    getAllRides,
    getRideById,
    getRidesByInitiator,

    getAllRidesAdmin,

    conditionalRides,
    acceptedRides,
    getRideByIdData

}