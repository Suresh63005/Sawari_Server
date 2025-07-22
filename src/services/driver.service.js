const Driver = require('../models/driver.model');
const jwt = require('jsonwebtoken');
const {driverFirebase}=require('../config/firebase-config');
const { sequelize } = require('../models');

/// Create token
const generateToken = (driverId)=>{
    return jwt.sign({id:driverId},process.env.JWT_SECRET)
}
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
  if (!phone) throw new Error("Phone number is required");

  const normalizedPhone = normalizePhone(phone);

  // ✅ Check with Firebase (phone must match normalized format)
  const firebaseUsers = await driverFirebase.auth().listUsers();
  const firebaseUser = firebaseUsers.users.find(
    (user) => user.phoneNumber === normalizedPhone
  );

  if (!firebaseUser) throw new Error("Phone number not registered in Firebase");

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
          first_name: "",
          last_name: "",
          phone: normalizedPhone,
          dob: new Date(),
          experience: 0,
          languages: [],
          license_front: "",
          license_back: "",
          status: "inactive",
        },
        { transaction: t }
      );
    }

    const token = generateToken(driver.id);
    return { message: "Driver verified", token, driver };
  });

  return result;
};


// Service for update the driver profile
const updateDriverProfile = async(driverId,data)=>{
    const driver = await Driver.findByPk(driverId);
    if(!driver) throw new Error("Driver not found");

    // Disallow phone/email update here if needed
    await driver.update(data);

    return {
        message:"Profile updated successfully",
        driver
    }
}

// Service to fetch driver
const getDriverById = async(driverId)=>{
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new Error("Driver not found");
  return driver;
}

// Service for Deactivate driver account
const deactivateDriver = async(driverId)=>{
    const driver = await Driver.findByPk(driverId);
    if(!driver) throw new Error("Driver not found");

    await driver.update({status:"inactive"})

    return {message:"Account deactivated successfully"}
}

module.exports = {
    verifyDriverMobile,
    updateDriverProfile,
    getDriverById,
    deactivateDriver,
}