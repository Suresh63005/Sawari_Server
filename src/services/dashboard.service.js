const { Op } = require('sequelize');
const Ride = require('../models/ride.model');
const Driver = require('../models/driver.model');
const Car = require('../models/cars.model');
const DriverCar = require('../models/driver-cars.model');

const calculateTrend = (current, previous) => {
  if (previous === 0) return current > 0 ? '+100%' : '0%';
  const change = ((current - previous) / previous) * 100;
  return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
};

const getDashboardStats = async () => {
  const now = new Date();
  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  // Current stats
  const totalRides = await Ride.count({
    where: { createdAt: { [Op.gte]: startOfCurrentMonth }, deletedAt: null },
  });

  const activeRides = await Ride.count({
    where: { status: { [Op.in]: ['on-route', 'accepted'] }, deletedAt: null },
  });

  const completedRides = await Ride.count({
    where: {
      status: 'completed',
      createdAt: { [Op.gte]: startOfCurrentMonth },
      deletedAt: null,
    },
  });

  const revenue = await Ride.sum('Total', {
    where: {
      status: 'completed',
      createdAt: { [Op.gte]: startOfCurrentMonth },
      deletedAt: null,
    },
  }) || 0;

  const drivers = await Driver.count({
    where: { status: 'active', is_approved: true, deletedAt: null },
  });

  const vehicles = await DriverCar.count({
    where: { status: 'active', is_approved: true, deletedAt: null },
  });

  // Previous month stats
  const previousTotalRides = await Ride.count({
    where: {
      createdAt: { [Op.gte]: startOfPreviousMonth, [Op.lte]: endOfPreviousMonth },
      deletedAt: null,
    },
  });

  const previousActiveRides = await Ride.count({
    where: {
      status: { [Op.in]: ['on-route', 'accepted'] },
      createdAt: { [Op.gte]: startOfPreviousMonth, [Op.lte]: endOfPreviousMonth },
      deletedAt: null,
    },
  });

  const previousCompletedRides = await Ride.count({
    where: {
      status: 'completed',
      createdAt: { [Op.gte]: startOfPreviousMonth, [Op.lte]: endOfPreviousMonth },
      deletedAt: null,
    },
  });

  const previousRevenue = await Ride.sum('Total', {
    where: {
      status: 'completed',
      createdAt: { [Op.gte]: startOfPreviousMonth, [Op.lte]: endOfPreviousMonth },
      deletedAt: null,
    },
  }) || 0;

  const previousDrivers = await Driver.count({
    where: {
      status: 'active',
      is_approved: true,
      createdAt: { [Op.lte]: endOfPreviousMonth },
      deletedAt: null,
    },
  });

  const previousVehicles = await DriverCar.count({
    where: {
      status: 'active',
      is_approved: true,
      createdAt: { [Op.lte]: endOfPreviousMonth },
      deletedAt: null,
    },
  });

  return {
    totalRides: {
      value: totalRides,
      trend: calculateTrend(totalRides, previousTotalRides),
      description: 'vs last month',
    },
    activeRides: {
      value: activeRides,
      trend: calculateTrend(activeRides, previousActiveRides),
      description: 'currently ongoing',
    },
    completedRides: {
      value: completedRides,
      trend: calculateTrend(completedRides, previousCompletedRides),
      description: 'vs last month',
    },
    revenue: {
      value: revenue,
      trend: calculateTrend(revenue, previousRevenue),
      description: 'vs last month',
    },
    drivers: {
      value: drivers,
      trend: calculateTrend(drivers, previousDrivers),
      description: 'approved drivers',
    },
    vehicles: {
      value: vehicles,
      trend: calculateTrend(vehicles, previousVehicles),
      description: 'approved vehicles',
    },
  };
};

const getRecentActivity = async () => {
  try {
    const activities = await Ride.findAll({
      where: { deletedAt: null },
      order: [['createdAt', 'DESC']],
      limit: 5,
      attributes: ['id', 'pickup_location', 'drop_location', 'status', 'createdAt'],
      include: [
        {
          model: Driver,
          as:"AssignedDriver",
          attributes: ['first_name', 'last_name'],
          required: false,
          where: { deletedAt: null },
        },
        {
          model: Car,
          as:"Car",
          attributes: ['model'],
          required: false,
          where: { deletedAt: null },
        },
      ],
    });

    return activities.map((ride, index) => {
      try {
        return {
          id: index + 1,
          action: `Ride ${ride.status || 'unknown'}`,
          user: ride.Driver
            ? `${ride.Driver.first_name || 'Unknown'} ${ride.Driver.last_name || ''} - ${ride.Cars?.car_model || 'Unknown'}`
            : `${ride.pickup_location || 'Unknown'} → ${ride.drop_location || 'Unknown'}`,
          time: ride.createdAt ? new Date(ride.createdAt).toLocaleString() : 'Unknown',
          type: 'ride',
        };
      } catch (error) {
        console.error(`Error processing ride ID ${ride.id || 'unknown'}:`, {
          message: error.message,
          stack: error.stack,
          name: error.name,
        });
        return {
          id: index + 1,
          action: `Ride ${ride.status || 'unknown'}`,
          user: `${ride.pickup_location || 'Unknown'} → ${ride.drop_location || 'Unknown'}`,
          time: ride.createdAt ? new Date(ride.createdAt).toLocaleString() : 'Unknown',
          type: 'ride',
        };
      }
    });
  } catch (error) {
    console.error('Error fetching recent activity:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    throw new Error(`Failed to fetch recent activity: ${error.message}`);
  }
};

const getPendingApprovals = async () => {
  try {
    const pendingDrivers = await Driver.findAll({
      where: { is_approved: false, status: 'inactive', deletedAt: null },
      attributes: ['id', 'first_name', 'last_name'],
    });

    const pendingVehicles = await DriverCar.findAll({
  where: { 
    is_approved: false,
    status: "inactive",
    deletedAt: null
  },
  attributes: ["id", "license_plate"],   // only DriverCar columns here
  include: [
    {
      model: Car,
      as: "Car",                         // must match alias
      attributes: ["id", "brand", "model", "image_url"], // Car columns here
    },
  ],
});


    return [
      ...pendingDrivers.map((driver) => ({
        id: driver.id,
        type: 'Driver',
        name: `${driver.first_name} ${driver.last_name}`,
        status: 'pending',
        priority: 'high',
        permission: 'drivers',
      })),
      ...pendingVehicles.map((vehicle) => ({
        id: vehicle.id,
        type: 'Vehicle',
        name: `${vehicle.model} - ${vehicle.license_plate}`,
        status: 'pending',
        priority: 'medium',
        permission: 'vehicles',
      })),
    ];
  } catch (error) {
    console.error('Error fetching pending approvals:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    console.log("Error details:", error);
    throw new Error(`Failed to fetch pending approvals: ${error.message}`);
  }
};

module.exports = {
  getDashboardStats,
  getRecentActivity,
  getPendingApprovals,
};