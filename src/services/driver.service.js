const Driver = require('../models/driver.model');
const jwt = require('jsonwebtoken');
const { driverFirebase } = require('../config/firebase-config');
const { sequelize } = require('../models');
const DriverCar = require('../models/driver-cars.model');
const { Op } = require('sequelize');

const generateToken = (driverId) => {
  return jwt.sign({ id: driverId }, process.env.JWT_SECRET);
};

const normalizePhone = (phone) => {
  phone = phone.trim();
  if (!phone.startsWith('+971')) {
    phone = phone.replace(/^(\+|0)*/, '');
    phone = '+971' + phone;
  }
  return phone;
};

const verifyDriverMobile = async (phone, token, email, social_login) => {
  if (!token) throw new Error("Token is required");

  console.log(token, "ttttttttttttttttttt")

  let normalizedPhone = null;
  let driver = null;

  if (social_login === "google") {
    // ----------------------------
    // ✅ GOOGLE LOGIN
    // ----------------------------
    if (!email) throw new Error("Email is required");

    const decoded = await driverFirebase.auth()?.verifyIdToken(token);
    const firebaseEmail = decoded.email;

    if (firebaseEmail !== email) {
      throw new Error("Email mismatch with token");
    }

    driver = await Driver.findOne({ where: email })

    if (driver) {
      // check driver status
      if (driver && driver.status === "blocked") {
        throw new Error("Your account has been blocked due to multiple failed login / document upload attempts. Please contact the administrator for assistance.");
      }

      //// ✅ If status is active, allow login directly
      if (["active", "inactive", "rejected"].includes(driver.status)) {
        driver.last_login = new Date();
        await driver.save();

        const jwtToken = generateToken(driver.id);

        return {
          message: "Driver verified",
          token: jwtToken,
          driver
        };

      }

    }

    if (!driver) {
      driver = await Driver.create({
        first_name: "",
        last_name: "",
        email,
        social_login: "google",
        dob: new Date(),
        last_login: new Date(),
        phone: "",
        experience: 0,
        languages: [],
        license_front: "",
        license_back: "",
        status: "inactive",
      });
    }
  } else {
    // ----------------------------
    // ✅ PHONE LOGIN
    // ----------------------------
    if (!phone) throw new Error("Phone number is required");

    normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) throw new Error("Invalid phone number format");

    const decoded = await driverFirebase.auth()?.verifyIdToken(token);
    // const firebasePhone = decoded.phone_number;
    const firebasePhone = decoded.phone_number?.replace("+91", "");

    console.log("yyyyyyyyyyyyyyyyyyyyyyyyy:", firebasePhone);
    console.log("xxxxxxxxxxxxxxxxxxxxxxx,", normalizedPhone);

    // Find driver first
    driver = await Driver.findOne({ where: { phone: normalizedPhone } })
    if (driver && driver.status === "blocked") {
      throw new Error("Your account has been blocked due to multiple failed login / document upload attempts. Please contact the administrator for assistance.");
    }

    if (firebasePhone !== normalizedPhone) {
      throw new Error("Phone number mismatch with token");
    }

    //no driver , create 
    driver = await Driver.findOne({ where: { phone: normalizedPhone } });
    if (driver) {
      if (driver.status === "blocked") {
        throw new Error("Your account has been blocked due to multiple failed login / document upload attempts. Please contact the administrator for assistance.");
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
        first_name: "",
        last_name: "",
        phone: normalizedPhone,
        dob: new Date(),
        email: "",
        last_login: new Date(),
        experience: 0,
        languages: [],
        license_front: "",
        license_back: "",
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
    driver = await Driver.findOne({ where: { phone: normalizedPhone } });
  } else if (email) {
    driver = await Driver.findOne({ where: { email } });
  }

  if (!driver) {
    throw new Error("Driver not found with provided phone or email.");
  }

  driver.status = "blocked";
  await driver.save();

  return driver;
};

const updateDriverProfile = async (driverId, data) => {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new Error('Driver not found');

  await driver.update(data);

  return {
    message: 'Profile updated successfully',
    driver,
  };
};

const getDriverById = async (driverId) => {
  const driver = await Driver.findByPk(driverId, { attributes: ["id","first_name", "last_name", "email", "phone", "profile_pic", "dob", "experience", "emirates_id", "emirates_doc_front", "emirates_doc_back", "languages", "license_front", "license_back", "license_verification_status", "emirates_verification_status", "is_approved", "availability_status", "wallet_balance", "status"] });
  if (!driver) throw new Error("Driver not found");
  return driver;
};

const deactivateDriver = async (driverId) => {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new Error('Driver not found');

  await driver.update({ status: 'inactive' });

  return { message: 'Account deactivated successfully' };
};

const approveDriver = async (driverId, verifiedBy) => {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new Error('Driver not found');
  await driver.update({ is_approved: true, status: 'active', verified_by: verifiedBy });
  return { message: 'Driver approved' };
};

const rejectDriver = async (driverId, reason, verifiedBy) => {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new Error('Driver not found');

  await driver.update({
    is_approved: false,
    status: 'rejected', // mark as rejected
    reason,
    verified_by: verifiedBy
  });

  return { message: 'Driver rejected' };
};


const blockDriver = async (driverId, verifiedBy) => {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new Error('Driver not found');
  await driver.update({ status: 'blocked', verified_by: verifiedBy });
  return { message: 'Driver blocked' };
};

const unblockDriver = async (driverId, verifiedBy) => {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new Error('Driver not found');
  await driver.update({ status: 'active', verified_by: verifiedBy });
  return { message: 'Driver unblocked' };
};

const getAllDrivers = async (page = 1, limit = 10, search = '', status = '') => {
  const offset = (page - 1) * limit;
  const where = {};

  const safeSearch = (typeof search === 'string' ? search : '').trim();
  if (safeSearch.length > 0) {
    const searchTerm = `%${safeSearch.replace(/\*/g, '%')}%`;
    where[Op.or] = [
      { first_name: { [Op.like]: searchTerm } },
      { last_name: { [Op.like]: searchTerm } },
      { email: { [Op.like]: searchTerm } },
      { phone: { [Op.like]: searchTerm } },
    ];
  }

  if (status === 'pending') {
    where.is_approved = false;
  } else if (status === 'approved') {
    where.is_approved = true;
    where.status = 'active';
  } else if (status === 'blocked') {
    where.status = 'blocked';
  } else if (status === 'rejected') {
    where.status = 'rejected';
  } else if (status === 'inactive') {
    where.status = 'inactive';
  }

  const { rows: drivers, count } = await Driver.findAndCountAll({
    where,
    attributes: { exclude: ['password'] },
    offset,
    limit,
  });

  return { drivers, total: count };
};


const verifyLicense = async (driverId, verifiedBy) => {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new Error('Driver not found');
  await driver.update({ license_verification_status: 'verified', verified_by: verifiedBy });
  return { message: 'License verified' };
};

const rejectLicense = async (driverId, reason, verifiedBy) => {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new Error('Driver not found');
  await driver.update({ license_verification_status: 'rejected', reason, verified_by: verifiedBy });
  return { message: 'License rejected' };
};

const verifyEmirates = async (driverId, verifiedBy) => {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new Error('Driver not found');
  await driver.update({ emirates_verification_status: 'verified', verified_by: verifiedBy });
  return { message: 'Emirates ID verified' };
};

const rejectEmirates = async (driverId, reason, verifiedBy) => {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new Error('Driver not found');
  await driver.update({ emirates_verification_status: 'rejected', reason, verified_by: verifiedBy });
  return { message: 'Emirates ID rejected' };
};

const driverProfileWithCar = async (driver_id) => {
  return await Driver.findByPk(driver_id, {
    attributes: ["first_name", "last_name", "email", "phone", "experience", "wallet_balance", "availability_status", "ride_count"],
    include: [
      {
        model: DriverCar,
        as: "Vehicles",
        attributes: ["car_model", "car_brand", "car_photos", "verified_by", "license_plate"]
      }
    ]
  })
}


const updateDriverBalance = async (driver_id, newBalance) => {
  return Driver.update(
    { wallet_balance: newBalance },
    { where: { id: driver_id } }
  );
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
  driverProfileWithCar
};
