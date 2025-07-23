const { Op } = require("sequelize");
const Ride = require("../models/ride.model")
const Earnings = require("../models/earnings.model")
const Driver = require("../models/driver.model")
const DriverCar = require("../models/driver-cars.model")

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
        include: [
            {
                model: DriverCar,
                as: "Vehicles",
                attributes: ["car_model", "car_brand", "car_photos", "verified_by", "license_plate"]
            }
        ]
    });

    const acceptedRides = await Ride.findAll({
        where: {
            driver_id: driver_id,
            status: {
                [Op.in]: ["completed", "accepted"]
            },

        },
        attributes: ["customer_name", "email", "phone", "pickup_address", "pickup_location", "drop_location", "scheduled_time", "ride_type", "pickup_time", "dropoff_time"],
        limit: 10,
        order: [["scheduled_time", "ASC"]]
    })

    const availableRides = await Ride.findAll({
        where: {
            status: "pending",
            driver_id: null,
            // scheduled_time: {
            //     [Op.gte]: new Date() // only future rides
            // },
        },
        attributes: ["customer_name", "email", "phone", "pickup_address", "pickup_location", "drop_location", "scheduled_time", "ride_type", "pickup_time", "dropoff_time"],
        limit: 10,
        order: [["scheduled_time", "ASC"]]
    });

    return {
        todayRideCount: todayRides.length,
        todayEarnings: todayEarnings || 0,
        driverProfile,
        acceptedRides,
        availableRides,
    }
}

const acceptRide = async (ride_id, driver_id) => {
    const ride = await Ride.findOne({
        where: {
            id: ride_id,
            status: "pending",
            driver_id: {
                [Op.or]: [null, ""], // handles both null and empty string
            }
        }
    });

    if (!ride) {
        throw new Error("Ride is not available or already accepted.");
    }

    ride.driver_id = driver_id;
    ride.status = "accepted";
    await ride.save();

    return ride;
};

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

const RideDetails = async (driver_id, ride_id) => {
    console.log(driver_id, ride_id, "hhhhhhhhhhhhhhhhhhhhhhhhh")
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
};

const statusRide = async (driver_id, ride_id, status) => {
    if (!["on-route", "cancelled"].includes(status)) {
        throw new Error("Invalid status. Allowed values: 'on-route', 'cancelled'");
    }
    const ride = await Ride.findOne({
        where: {
            id: ride_id,
            [Op.or]: [
                { driver_id: driver_id },
                { initiated_by_driver_id: driver_id }]
        },
    });

    if (ride.status !== "accepted") {
        throw new Error("Ride must be in 'accepted' status to start or cancel");
    }

    ride.status = status;
    await ride.save();
}

const getCompletedOrCancelledAndAcceptedRides = async (driver_id, status) => {
    if (!["accepted", "completed", "cancelled"].includes(status)) {
        throw new Error("Invalid status. Allowed values: 'accepted', 'cancelled','completed");
    }
    const rides = await Ride.findAll({
        where: {
            [Op.or]: [
                { driver_id: driver_id },
                { initiated_by_driver_id: driver_id }],
            status: status
        },
        order: [["updatedAt", "DESC"]]
    });

    return rides;
};

const upsertRide = async (rideData) => {
    const {
        id,
        driver_id,
        customer_name,
        phone,
        email,
        car_model,
        pickup_time,
        pickup_address,
        pickup_location,
        drop_location,
        ride_type
    } = rideData;

    if (id) {

        const ride = await Ride.findByPk(id);
        if (!ride) {
            throw new Error("Ride not found");
        }

        await ride.update({
            initiated_by_driver_id: driver_id,
            customer_name,
            phone,
            email,
            car_model,
            pickup_time,
            pickup_address,
            pickup_location,
            drop_location,
            ride_type
        });

        return ride;
    } else {

        const newRide = await Ride.create({
            initiated_by_driver_id: driver_id,
            customer_name,
            phone,
            email,
            car_model,
            pickup_time,
            pickup_address,
            pickup_location,
            drop_location,
            ride_type
        });

        return newRide;
    }
};

const getDriverEarningsHistory = async (driver_id, sortMonth = null) => {
    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const endOfToday = new Date(today.setHours(23, 59, 59, 999));

    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0)

    const endOfWeek = new Date();
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999)

    const startOfMonth = new Date();
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);

    let monthFilteredEarnings = [];
    if (sortMonth) {
        const [year, month] = sortMonth.split("-");
        const start = new Date(year, parseInt(month) - 1, 1, 0, 0, 0);
        const end = new Date(year, parseInt(month), 0, 23, 59, 59);

        monthFilteredEarnings = await Earnings.findAll({
            where: {
                driver_id: driver_id,
                createdAt: {
                    [Op.between]: [start, end]
                },
                status: "processed"
            },
            include:[
                {
                    model:Ride,
                    as:"Ride",
                }
            ],
            order: [['createdAt', 'DESC']]

        })
    }

    const todayEarnings = await Earnings.sum("amount", {
        where: {
            driver_id: driver_id,
            createdAt: {
                [Op.between]: [startOfToday, endOfToday]
            },
            status: "processed"
        }
    })

    const weekEarnings  = await Earnings.sum("amount",{
        where: {
            driver_id: driver_id,
            createdAt: {
                [Op.between]: [startOfWeek, endOfWeek]
            },
            status: "processed"
        }
    })

    const monthEarnings = await Earnings.sum("amount", {
        where: {
            driver_id: driver_id,
            createdAt: {
                [Op.between]: [startOfMonth, endOfMonth]
            },
            status: "processed"
        }
    })

    return {
        todayEarnings: todayEarnings || 0,
        weekEarnings: weekEarnings || 0,
        monthEarnings: monthEarnings || 0,
        sortedMonth: sortMonth || null,
        sortedMonthEarnings: monthFilteredEarnings
    }
}

module.exports = {
    DashboardServiceData,
    acceptRide,
    DriverStatus,
    RideDetails,
    statusRide,
    getCompletedOrCancelledAndAcceptedRides,
    upsertRide,
    getDriverEarningsHistory
}