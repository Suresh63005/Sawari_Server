const { Op } = require("sequelize");
const Ride = require("../models/ride.model")
const Earnings = require("../models/earnings.model")
const Driver = require("../models/driver.model")
const DriverCar=require("../models/driver-cars.model")

const DashboardServiceData = async (driver_id) => {

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999)

    // 1. Get Today's Rides for Driver
    const todayRides = await Ride.findAll({
        where: {
            driver_id: driver_id,
            status: "completed",
            updatedAt: {
                [Op.between]: [startOfDay, endOfDay]
            }
        }
    });

    // 2. Get Today's Earnings for Driver
    const todayEarnings = await Earnings.sum("amount", {
        where: {
            driver_id: driver_id,
            createdAt: {
                [Op.between]: [startOfDay, endOfDay]
            },
            status: "processed" // Only count processed earnings
        }
    });

    // 3. Get Driver Profile (incl. vehicle data if in model)
    const driverProfile = await Driver.findByPk(driver_id, {
        attributes: ["first_name", "last_name", "email", "phone", "experience", "wallet_balance", "availability_status", "ride_count"],
        include:[
            {
                model:DriverCar,
                as:"Vehicles",
                attributes:["car_model","car_brand","car_photos","verified_by","license_plate"]
            }
        ]
    });

    const availableRides = await Ride.findAll({
        where: {
            status: "pending",
            driver_id: null,
            scheduled_time: {
                [Op.gte]: new Date() // only future rides
            },
        },
        limit: 10,
        order: [["scheduled_time", "ASC"]]
    });

    return {
        todayRideCount: todayRides.length,
        todayEarnings: todayEarnings || 0,
        driverProfile,
        availableRides,
    }
}

const acceptRide = async (ride_id, driver_id) => {
    const ride = await Ride.findByPk(ride_id);

    if (!ride || ride.status !== 'pending' || ride.driver_id) {
        return res.status(400).json({ message: "Ride is not available" });
    }

    ride.driver_id = driver_id;
    ride.status = "accepted"
    await ride.save();
    return ride;
}

const DriverStatus = async (driver_id, status) => {
    // Validate status
    if (!["active", "inactive"].includes(status)) {
        throw new Error("Invalid status. Only 'active' or 'inactive' allowed.");
    }
    // Find the driver by ID
    const driver = await Driver.findOne({ where: { id: driver_id } });

    if (!driver) {
        throw new Error("Driver not found.");
    }

    // Update the status
    driver.status = status;
    await driver.save();
    return driver;
}

module.exports = {
    DashboardServiceData,
    acceptRide,
    DriverStatus,
}