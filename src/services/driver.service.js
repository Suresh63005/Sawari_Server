const Driver = require('../models/driver.model');
const jwt = require('jsonwebtoken');
const { driverFirebase } = require('../config/firebase-config');
const { sequelize } = require('../models');
const DriverCar = require('../models/driver-cars.model');

// Create token
const generateToken = (driverId) => {
  return jwt.sign({ id: driverId }, process.env.JWT_SECRET);
};

const normalizePhone = (phone) => {
  phone = phone.trim();
  if (!phone.startsWith('+91')) {
    // Remove any leading 0 or + if they exist before adding +91
    phone = phone.replace(/^(\+|0)*/, '');
    phone = '+91' + phone;
  }
  return phone;
};

// Service for verify mobile
const verifyDriverMobile = async (phone) => {
  if (!phone) throw new Error('Phone number is required');

  const normalizedPhone = normalizePhone(phone);

  // ✅ Check with Firebase (phone must match normalized format)
  const firebaseUsers = await driverFirebase.auth().listUsers();
  const firebaseUser = firebaseUsers.users.find(
    (user) => user.phoneNumber === normalizedPhone
  );

  if (!firebaseUser) throw new Error('Phone number not registered in Firebase');

  // ✅ Transaction to safely create or fetch driver
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

// Service for update the driver profile
const updateDriverProfile = async (driverId, data) => {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new Error('Driver not found');

  // Disallow phone/email update here if needed
  await driver.update(data);

  return {
    message: 'Profile updated successfully',
    driver,
  };
};

// Service to fetch driver
const getDriverById = async (driverId) => {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new Error('Driver not found');
  return driver;
};

// Service for deactivate driver account
const deactivateDriver = async (driverId) => {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new Error('Driver not found');

  await driver.update({ status: 'inactive' });

  return { message: 'Account deactivated successfully' };
};

// Service for approve driver
const approveDriver = async (driverId, verifiedBy) => {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new Error('Driver not found');
  await driver.update({ is_approved: true, status: 'active', verified_by: verifiedBy });
  return { message: 'Driver approved' };
};

// Service for reject driver
const rejectDriver = async (driverId, reason, verifiedBy) => {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new Error('Driver not found');
  await driver.update({ is_approved: false, reason, verified_by: verifiedBy });
  return { message: 'Driver rejected' };
};

// Service for block driver
const blockDriver = async (driverId, verifiedBy) => {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new Error('Driver not found');
  await driver.update({ status: 'blocked', verified_by: verifiedBy });
  return { message: 'Driver blocked' };
};

// Service for unblock driver
const unblockDriver = async (driverId, verifiedBy) => {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new Error('Driver not found');
  await driver.update({ status: 'active', verified_by: verifiedBy });
  return { message: 'Driver unblocked' };
};

// Service to get all drivers
const getAllDrivers = async () => {
  const drivers = await Driver.findAll({ attributes: { exclude: ['password'] } });
  return drivers;
};

// ... (previous imports and functions remain the same)

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

const driverProfileWithCar=async(driver_id)=>{
  return await Driver.findByPk(driver_id,{
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
  driverProfileWithCar
};
  

