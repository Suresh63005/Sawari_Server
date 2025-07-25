const { fn, col } = require('sequelize');
const Earnings = require('../models/earnings.model');
const Ride = require('../models/ride.model');

const earningsDTO = (data) => {
  return {
    driver_id: data.driver_id,
    ride_id: data.ride_id,
    amount: parseFloat(data.amount) || 0.0,
    commission: parseFloat(data.commission) || 0.0,
    percentage: parseFloat(data.percentage) || 0.0,
    payment_method: data.payment_method || "bank_transfer",
    status: data.status || "pending",
  };
};

const earningsResponseDTO = (earnings) => {
  return {
    id: earnings.id,
    driver_id: earnings.driver_id,
    ride_id: earnings.ride_id,
    amount: parseFloat(earnings.amount),
    commission: parseFloat(earnings.commission),
    percentage: parseFloat(earnings.percentage),
    payment_method: earnings.payment_method,
    status: earnings.status,
    createdAt: earnings.createdAt,
    updatedAt: earnings.updatedAt,
  };
}

/**
 * Create an earnings record
 * @param {Object} data - Earnings data including driver_id, ride_id, amount, commission, percentage
 * @returns {Object} - Created earnings record
 */

const createEarnings = async(data)=>{
    if (!data.driver_id || !data.ride_id || !data.amount || !data.percentage || !data.commission) {
    throw new Error("Missing required fields: driver_id, ride_id, amount, percentage, commission");
  }
  const earningsData = earningsDTO(data);
  const earnings = await Earnings.create(earningsData);
  return earningsResponseDTO(earnings);
}

/**
 * Get all earnings for a driver with optional filters and pagination
 * @param {Object} options - Filters (driverId, status) and pagination (limit, page)
 * @returns {Object} - Paginated earnings list
 */

const getEarningsByDriver = async({driverId, status, limit = 10, page = 1})=>{
    const where = {driver_id:driverId}
    const offset = (parseInt(page)-1)*parseInt(limit);

    if(status){
        where.status = status;
    }

    const {rows, count}=await Earnings.findAndCountAll({
        where,
        order: [["createdAt", "DESC"]],
        limit: parseInt(limit),
        offset,
    })

    return{
        total:count,
        page:parseInt(page),
        limit:parseInt(limit),
        data:rows.map((earnings)=>earningsResponseDTO(earnings))
    }
}

/**
 * Get earnings by ride ID
 * @param {string} riderId - UUID of the ride
 * @returns {Object} - Earnings record
 */

const getEarningsByRide = async(riderId)=>{
    const earnings = await Earnings.findOne({where:{rider_id:riderId}})
    if(!earnings){
        throw new Error("Earnings not found for the given ride")
    }
    return earningsResponseDTO(earnings);
}

//mo

const monthFilteredEarnings =async(where)=>{
  return await Earnings.findAll({
    where,
    include:[
      {
        model:Ride,
        as:"Ride"
      }
    ],
    order:[['createdAt','DESC']]
  })
}

const getEarningsSum = async(where={})=>{
  const amount = await Earnings.sum("amount",where)
  return amount || 0;
}

// Get total pending payouts
const getPendingPayouts = async (where = {}) => {
  const amount = await Earnings.sum("amount", { where });
  return amount || 0;
};

/**
 * Get total commission based on condition
 * @param {Object} where
 * @returns {Number}
 */

const getTotalCommission = async (where = {}) => {
  const commission = await Earnings.sum("commission", { where });
  return commission || 0;
};



module.exports = {
    createEarnings,
    getEarningsByDriver,
    getEarningsByRide,
    monthFilteredEarnings,
    getEarningsSum,
    getPendingPayouts,
    getTotalCommission,

}
