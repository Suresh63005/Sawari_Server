const Driver = require("../models/driver.model");
// const jwt = require("jsonwebtoken");
const { driverFirebase } = require("../config/firebase-config");
const DriverCar = require("../models/driver-cars.model");
const { Op } = require("sequelize");
const Ride = require("../models/ride.model");
const Car = require("../models/cars.model");
const Earnings = require("../models/earnings.model");
const { fn, col, where: sequelizeWhere } = require("sequelize");
// const { generateToken } = require("../utils/tokenUtils");
// const { normalizePhone } = require("../utils/phoneUtils");
const jwt = require("jsonwebtoken");

const generateToken = (driverId) => {
  return jwt.sign({ id: driverId }, process.env.JWT_SECRET);
};

const normalizePhone = (phone) => {
  phone = phone.trim();
  if (!phone.startsWith("+971")) {
    phone = phone.replace(/^(\+|0)*/, "");
    phone = "+971" + phone;
  }
  return phone;
};

const verifyDriverMobile = async (phone, token, email, social_login) => {
  if (!token) throw new Error("Token is required");

  let normalizedPhone = null;
  let driver = null;

  if (social_login === "google") {
    if (!email) throw new Error("Email is required");
    console.log("wwwwwwwwwwwwwwwwwwww:", email);
    const decoded = await driverFirebase.auth()?.verifyIdToken(token);
    console.log(decoded, "ddddddddddddddddddd");
    const firebaseEmail = decoded.email;

    console.log(firebaseEmail, "eeeeeeeeeeeeeeeeeeeee");

    if (firebaseEmail !== email) {
      throw new Error("Email mismatch with token");
    }

    driver = await Driver.findOne({ where: { email: firebaseEmail } });

    if (driver) {
      // check driver status
      if (driver && driver.status === "blocked") {
        throw new Error(
          "Your account has been blocked due to multiple failed login / document upload attempts. Please contact the administrator for assistance."
        );
      }
      console.log(driver.status, "sssssssssssssssssssss");
      //// ✅ If status is active, allow login directly
      if (["active", "inactive", "rejected"].includes(driver.status)) {
        driver.last_login = new Date();
        await driver.save();

        const jwtToken = await generateToken(driver.id);

        return {
          message: "Driver verified",
          token: jwtToken,
          driver,
        };
      }
    }

    if (!driver) {
      console.log("cccccccccccccccccccccc:");
      driver = await Driver.create({
        email: firebaseEmail,
        social_login: "google",
        last_login: new Date(),
        status: "inactive",
        document_check_count: 0,
      });
    }
  } else {
    // ----------------------------
    // ✅ PHONE LOGIN
    // ----------------------------
    if (!phone) throw new Error("Phone number is required");

    normalizedPhone = await normalizePhone(phone);
    console.log(normalizedPhone, "nnnnnnnnnnnnnnnnnnnnn");
    if (!normalizedPhone) throw new Error("Invalid phone number format");

    const decoded = await driverFirebase.auth()?.verifyIdToken(token);
    // const firebasePhone = decoded.phone_number;
    const firebasePhone = decoded.phone_number?.replace("+91", "");

    // Find driver first
    driver = await Driver.findOne({ where: { phone: normalizedPhone } });
    if (driver && driver.status === "blocked") {
      throw new Error(
        "Your account has been blocked due to multiple failed login / document upload attempts. Please contact the administrator for assistance."
      );
    }

    if (firebasePhone !== normalizedPhone) {
      throw new Error("Phone number mismatch with token");
    }

    //no driver , create
    driver = await Driver.findOne({ where: { phone: normalizedPhone } });
    if (driver) {
      if (driver.status === "blocked") {
        throw new Error(
          "Your account has been blocked due to multiple failed login / document upload attempts. Please contact the administrator for assistance."
        );
      }

      // ✅ If status is active, allow login directly
      if (["active", "inactive", "rejected"].includes(driver.status)) {
        driver.last_login = new Date();
        await driver.save();
      }

      const jwtToken = generateToken(driver.id);
      return {
        message: "Driver verified",
        token: jwtToken,
        driver,
      };
    }
    if (!driver) {
      driver = await Driver.create({
        phone: normalizedPhone,

        email: email || null,
        last_login: new Date(),
        status: "inactive",
      });
    }
  }

  // Update last login
  driver.last_login = new Date();
  await driver.save();

  // Generate auth token
  const jwtToken = generateToken(driver.id);

  return { message: "Driver verified", token: jwtToken, driver };
};

const blockDriverByPhoneOrEmail = async (phone, email) => {
  let driver = null;

  if (phone) {
    const normalizedPhone = normalizePhone(phone);
    console.log("recived phoneeeeeeeeeeeeeeeeeee");
    driver = await Driver.findOne({ where: { phone: normalizedPhone } });
  } else if (email) {
    driver = await Driver.findOne({ where: { email } });
    console.log("recived emailllllllllllllllllllllllllllll");
  }

  if (!driver) {
    throw new Error("Driver not found with provided phone or email.");
  }

  driver.status = "blocked";
  await driver.save();
  console.log("updatedddddddddddddddddddddd");
  return driver;
};

const updateDriverProfile = async (driverId, data) => {
  const driver = await Driver.findByPk(driverId);
  if (!driver) return null;

  await driver.update(data);
  return driver;
};

const getDriverById = async (driverId) => {
  const driverInstance = await Driver.findByPk(driverId, {
    attributes: [
      "id",
      "first_name",
      "last_name",
      "email",
      "phone",
      "profile_pic",
      "dob",
      "experience",
      "full_address",
      "emirates_id",
      "emirates_doc_front",
      "emirates_doc_back",
      "languages",
      "license_front",
      "license_back",
      "license_verification_status",
      "emirates_verification_status",
      "is_approved",
      "one_signal_id",
      "reason",
      "availability_status",
      "wallet_balance",
      "credit_ride_count",
      "status",
      "document_check_count",
      "createdAt", // Include createdAt for Joined At
      // Add any other fields you want from the response (e.g., if needed):
      // "credit_ride_count",
      // "earning_updates",
      // "ride_count", // Original ride_count if still needed
      // "ride_request",
      // "system_alerts",
      // "verified_by",
      // "last_login",
    ],
  });

  if (!driverInstance) return null;

  console.log(
    `getDriverById: driverId=${driverId}, raw_credit_ride_count=${driverInstance.credit_ride_count}, driverInstance_fields=${JSON.stringify(Object.keys(driverInstance.toJSON()))}`
  );

  // Fetch total completed rides
  const completedRidesCount = await Ride.count({
    where: {
      driver_id: driverId,
      status: "completed",
    },
  });

  // Fetch total assigned rides
  const totalRidesCount = await Ride.count({
    where: {
      driver_id: driverId,
      status: {
        [Op.in]: ["pending", "accepted", "on-route", "completed", "cancelled"],
      },
    },
  });

  // Calculate completion rate
  const completionRate =
    totalRidesCount > 0
      ? ((completedRidesCount / totalRidesCount) * 100).toFixed(2)
      : "0.00";

  // Fetch the most recent completed ride
  const lastRide = await Ride.findOne({
    where: {
      driver_id: driverId,
      status: "completed",
    },
    order: [["dropoff_time", "DESC"]],
    attributes: ["dropoff_time"],
  });

  // Fetch total earnings for the driver
  const totalEarnings =
    (await Earnings.sum("amount", {
      where: {
        driver_id: driverId,
        status: "processed", // Only consider processed earnings
      },
    })) || 0;

  // Construct a plain object with attributes + computed fields
  const driver = {
    id: driverInstance.id,
    first_name: driverInstance.first_name,
    last_name: driverInstance.last_name,
    email: driverInstance.email,
    phone: driverInstance.phone,
    profile_pic: driverInstance.profile_pic,
    dob: driverInstance.dob,
    experience: driverInstance.experience,
    full_address: driverInstance.full_address,
    emirates_id: driverInstance.emirates_id,
    emirates_doc_front: driverInstance.emirates_doc_front,
    emirates_doc_back: driverInstance.emirates_doc_back,
    languages: driverInstance.languages,
    parsed_languages: JSON.parse(driverInstance.languages),
    license_front: driverInstance.license_front,
    license_back: driverInstance.license_back,
    license_verification_status: driverInstance.license_verification_status,
    emirates_verification_status: driverInstance.emirates_verification_status,
    is_approved: driverInstance.is_approved,
    one_signal_id: driverInstance.one_signal_id,
    reason: driverInstance.reason,
    availability_status: driverInstance.availability_status,
    wallet_balance: driverInstance.wallet_balance,
    status: driverInstance.status,
    document_check_count: driverInstance.document_check_count,
    createdAt: driverInstance.createdAt,
    // Add computed fields
    completedRidesCount,
    completionRate,
    lastRideTime: lastRide ? lastRide.dropoff_time : null,
    totalEarnings,
    // Optionally include original ride_count if still needed
    // ride_count: driverInstance.ride_count,
  };

  return driver;
};

const getStatusByDriver = async (driverId) => {
  const driver = await Driver.findByPk(driverId, {
    attributes: ["ride_request", "system_alerts", "earning_updates"],
  });
  if (!driver) throw new Error("Driver not found");
  return driver;
};

const deactivateDriver = async (driverId) => {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new Error("Driver not found");

  await driver.update({ status: "inactive" });

  return { message: "Account deactivated successfully" };
};

const approveDriver = async (driverId, verifiedBy) => {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new Error("Driver not found");
  await driver.update({
    is_approved: true,
    status: "active",
    verified_by: verifiedBy,
  });
  return { message: "Driver approved" };
};

const rejectDriver = async (driverId, reason, verifiedBy) => {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new Error("Driver not found");

  const newCount = (driver.document_check_count || 0) + 1;

  const updateData = {
    is_approved: false,
    status: "rejected", // default
    reason,
    verified_by: verifiedBy,
    document_check_count: newCount,
  };

  // Block only after 3rd rejection
  if (newCount >= 3) {
    updateData.status = "blocked";
  }

  await driver.update(updateData);

  return {
    message:
      newCount >= 3
        ? "Driver blocked due to repeated rejections"
        : "Driver rejected",
  };
};

const blockDriver = async (driverId, verifiedBy) => {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new Error("Driver not found");
  await driver.update({ status: "blocked", verified_by: verifiedBy });
  return { message: "Driver blocked" };
};

const unblockDriver = async (driverId, verifiedBy) => {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new Error("Driver not found");
  await driver.update({ status: "active", verified_by: verifiedBy });
  return { message: "Driver unblocked" };
};

const getAllDrivers = async (
  page = 1,
  limit = 10,
  search = "",
  status = ""
) => {
  const offset = (page - 1) * limit;
  const where = {};

  const safeSearch = (typeof search === "string" ? search : "").trim();
  if (safeSearch.length > 0) {
    const normalizedSearch = safeSearch.toLowerCase().replace(/\s+/g, "");

    where[Op.or] = [
      { first_name: { [Op.like]: `%${safeSearch}%` } },
      { last_name: { [Op.like]: `%${safeSearch}%` } },
      { email: { [Op.like]: `%${safeSearch}%` } },
      { phone: { [Op.like]: `%${safeSearch}%` } },
      { experience: { [Op.like]: `%${safeSearch}%` } },
      // NEW: concatenate first_name + last_name and remove spaces
      sequelizeWhere(
        fn(
          "REPLACE",
          fn("LOWER", fn("CONCAT", col("first_name"), col("last_name"))),
          " ",
          ""
        ),
        { [Op.like]: `%${normalizedSearch}%` }
      ),
    ];
  }

  if (status === "pending") {
    where.is_approved = false;
  } else if (status === "approved") {
    where.is_approved = true;
    where.status = "active";
  } else if (status === "blocked") {
    where.status = "blocked";
  } else if (status === "rejected") {
    where.status = "rejected";
  } else if (status === "inactive") {
    where.status = "inactive";
  }

  const { rows: drivers, count } = await Driver.findAndCountAll({
    where,
    attributes: [
      "id",
      "first_name",
      "last_name",
      "email",
      "phone",
      "profile_pic",
      "dob",
      "experience",
      "full_address",
      "emirates_id",
      "emirates_doc_front",
      "emirates_doc_back",
      "languages",
      "license_front",
      "license_back",
      "license_verification_status",
      "emirates_verification_status",
      "is_approved",
      "reason",
      "availability_status",
      "wallet_balance",
      "status",
      "document_check_count",
      "createdAt", // Include createdAt for Joined At
    ],
    offset,
    limit,
  });

  // Fetch additional data for each driver
  const driversWithStats = await Promise.all(
    drivers.map(async (driver) => {
      // Fetch total completed rides
      const completedRidesCount = await Ride.count({
        where: {
          driver_id: driver.id,
          status: "completed",
        },
      });

      // Fetch total assigned rides
      const totalRidesCount = await Ride.count({
        where: {
          driver_id: driver.id,
          status: {
            [Op.in]: [
              "pending",
              "accepted",
              "on-route",
              "completed",
              "cancelled",
            ],
          },
        },
      });

      // Calculate completion rate
      const completionRate =
        totalRidesCount > 0
          ? ((completedRidesCount / totalRidesCount) * 100).toFixed(2)
          : "0.00";

      // Fetch the most recent completed ride
      const lastRide = await Ride.findOne({
        where: {
          driver_id: driver.id,
          status: "completed",
        },
        order: [["dropoff_time", "DESC"]],
        attributes: ["dropoff_time"],
      });

      // Fetch total earnings for the driver
      const totalEarnings = await Earnings.sum("amount", {
        where: {
          driver_id: driver.id,
          status: "processed", // Only consider processed earnings
        },
      });

      // Add computed fields to the driver object
      driver.dataValues.completedRidesCount = completedRidesCount;
      driver.dataValues.completionRate = completionRate;
      driver.dataValues.lastRideTime = lastRide ? lastRide.dropoff_time : null;
      driver.dataValues.totalEarnings = totalEarnings || 0;

      return driver;
    })
  );

  return { drivers: driversWithStats, total: count };
};

const verifyLicense = async (driverId, verifiedBy) => {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new Error("Driver not found");

  await driver.update({
    license_verification_status: "verified",
    verified_by: verifiedBy,
    document_check_count: 0, // reset on success
  });

  return { message: "License verified" };
};

const rejectLicense = async (driverId, reason, verifiedBy) => {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new Error("Driver not found");

  await driver.update({
    license_verification_status: "rejected",
    verified_by: verifiedBy,
    reason,
    // if you still want to count how many times license rejected, keep this line:
    // document_check_count: (driver.document_check_count || 0) + 1,
  });

  return { message: "License rejected" };
};

const verifyEmirates = async (driverId, verifiedBy) => {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new Error("Driver not found");

  await driver.update({
    emirates_verification_status: "verified",
    verified_by: verifiedBy,
    document_check_count: 0, // reset on success
  });

  return { message: "Emirates ID verified" };
};

const rejectEmirates = async (driverId, reason, verifiedBy) => {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new Error("Driver not found");

  await driver.update({
    emirates_verification_status: "rejected",
    verified_by: verifiedBy,
    reason,
    // if you still want to count how many times emirates rejected, keep this line:
    // document_check_count: (driver.document_check_count || 0) + 1,
  });

  return { message: "Emirates ID rejected" };
};

const driverProfileWithCar = async (driver_id) => {
  return await Driver.findByPk(driver_id, {
    attributes: [
      "first_name",
      "last_name",
      "email",
      "phone",
      "experience",
      "wallet_balance",
      "availability_status",
      "ride_count",
    ],
    include: [
      {
        model: DriverCar,
        as: "Vehicles",
        attributes: ["car_photos", "verified_by", "license_plate"],
        include: [
          {
            model: Car,
            as: "Car",
            attributes: ["id", "brand", "model"],
          },
        ],
      },
    ],
  });
};

const updateDriverBalance = async (driver_id, balance, transaction = null) => {
  try {
    const driver = await Driver.findByPk(driver_id, { transaction });
    if (!driver) {
      return null;
    }
    await driver.update({ wallet_balance: balance }, { transaction });
    return driver;
  } catch (error) {
    console.error("Error updating driver balance:", error);
    throw new Error("Failed to update driver balance");
  }
};

const checkActiveRide = async (
  driver_id,
  status = ["pending", "accepted", "on-route"]
) => {
  try {
    const activeRides = await Ride.findAll({
      where: {
        driver_id,
        status: {
          [Op.in]: status,
        },
      },
    });
    return activeRides;
  } catch (error) {
    console.error("checkActiveRide error:", error);
    throw error;
  }
};

// Service to update onesign player ID
const updateOneSignalPlayerId = async (driver_id, player_id) => {
  const driver = await Driver.findByPk(driver_id);

  await driver.update({ one_signal_id: player_id });
  return driver;
};

// Service to delete onesignal player ID on logout
const deleteOneSignalPlayerId = async (driver_id) => {
  const driver = await Driver.findByPk(driver_id);

  await driver.update({ one_signal_id: null });
  return driver;
};

module.exports = {
  verifyDriverMobile,
  blockDriverByPhoneOrEmail,
  updateDriverProfile,
  getDriverById,
  deactivateDriver,
  approveDriver,
  rejectDriver,
  blockDriver,
  unblockDriver,
  getAllDrivers,
  verifyLicense,
  rejectLicense,
  verifyEmirates,
  rejectEmirates,
  driverProfileWithCar,
  updateDriverBalance,
  checkActiveRide,
  getStatusByDriver,
  updateOneSignalPlayerId,
  deleteOneSignalPlayerId,
};
