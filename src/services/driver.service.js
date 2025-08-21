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
  if (!phone.startsWith('+91')) {
    phone = phone.replace(/^(\+|0)*/, '');
    phone = '+91' + phone;
  }
  return phone;
};

const verifyDriverMobile = async (phone) => {
  if (!phone) throw new Error('Phone number is required');

  const normalizedPhone = normalizePhone(phone);

  const firebaseUsers = await driverFirebase.auth().listUsers();
  const firebaseUser = firebaseUsers.users.find(
    (user) => user.phoneNumber === normalizedPhone
  );

  if (!firebaseUser) throw new Error('Phone number not registered in Firebase');

  const result = await sequelize.transaction(async (t) => {
    let driver = await Driver.findOne({
      where: { phone: normalizedPhone },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!driver) {
      driver = await Driver.create(
        {
          first_name: '',
          last_name: '',
          phone: normalizedPhone,
          dob: new Date(),
          experience: 0,
          languages: [],
          license_front: '',
          license_back: '',
          status: 'inactive',
        },
        { transaction: t }
      );
    }

    const token = generateToken(driver.id);
    return { message: 'Driver verified', token, driver };
  });

  return result;
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
  const driver = await Driver.findByPk(driverId, { attributes: ["first_name", "last_name", "email", "phone", "profile_pic", "dob", "experience", "emirates_id", "emirates_doc_front", "emirates_doc_back", "languages", "license_front", "license_back", "license_verification_status", "emirates_verification_status", "is_approved", "availability_status", "wallet_balance", "status"] });
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
  await driver.update({ is_approved: false, reason, verified_by: verifiedBy });
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

  if (search) {
    const searchTerm = `%${search.replace(/\*/g, '%')}%`; // Replace * with % for SQL LIKE
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
