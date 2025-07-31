const DriverCar = require('../models/driver-cars.model');

const carDTO = (data) => {
  return {
    car_model: data.car_model,
    car_brand: data.car_brand,
    license_plate: data.license_plate,
    car_photos: data.car_photos || [],
    rc_doc: data.rc_doc,
    insurance_doc: data.insurance_doc,
    rc_doc_status: data.rc_doc_status || 'pending',
    insurance_doc_status: data.insurance_doc_status || 'pending',
    is_approved: data.is_approved ?? false,
    verified_by: data.verified_by || null,
    status: data.status || 'active',
  };
};

const carResponseDTO = (data) => {
  return {
    id: data.id,
    driver_id: data.driver_id,
    car_model: data.car_model,
    car_brand: data.car_brand,
    license_plate: data.license_plate,
    car_photos: data.car_photos,
    rc_doc: data.rc_doc,
    insurance_doc: data.insurance_doc,
    rc_doc_status: data.rc_doc_status,
    insurance_doc_status: data.insurance_doc_status,
    is_approved: data.is_approved,
    verified_by: data.verified_by,
    status: data.status,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
};

const upsertDriverCar = async (driverId, data) => {
  const sanitizedData = carDTO(data);
  const existing = await DriverCar.findOne({ where: { driver_id: driverId } });
  if (existing) {
    // Only update the fields provided in sanitizedData, preserving existing values
    await existing.update(sanitizedData, { fields: Object.keys(sanitizedData).filter(key => sanitizedData[key] !== undefined && sanitizedData[key] !== null) });
    return carResponseDTO(existing);
  } else {
    // Ensure all required fields are provided when creating a new record
    if (!sanitizedData.car_model || !sanitizedData.car_brand || !sanitizedData.license_plate || !sanitizedData.rc_doc || !sanitizedData.insurance_doc) {
      throw new Error('All required vehicle fields must be provided');
    }
    const created = await DriverCar.create({ ...sanitizedData, driver_id: driverId });
    return carResponseDTO(created);
  }
};

const getDriverCarByDriverId = async (driverId) => {
  return await DriverCar.findOne({ where: { driver_id: driverId } });
};

// Service for reject vehicle
const rejectDriverCar = async (carId, reason, verifiedBy) => {
  const car = await DriverCar.findByPk(carId);
  if (!car) throw new Error('Vehicle not found');
  await car.update({ is_approved: false, status: 'rejected', reason, verified_by: verifiedBy });
  return { message: 'Vehicle rejected' };
};

// Service to get all vehicles
const getAllVehicles = async () => {
  const vehicles = await DriverCar.findAll();
  return vehicles.map(vehicle => carResponseDTO(vehicle));
};

// ... (previous imports and functions remain the same)

const verifyRc = async (carId, verifiedBy) => {
  const car = await DriverCar.findByPk(carId);
  if (!car) throw new Error('Vehicle not found');
  await car.update({ rc_doc_status: 'verified', verified_by: verifiedBy });
  return { message: 'RC document verified' };
};

const rejectRc = async (carId, reason, verifiedBy) => {
  const car = await DriverCar.findByPk(carId);
  if (!car) throw new Error('Vehicle not found');
  await car.update({ rc_doc_status: 'rejected', reason, verified_by: verifiedBy });
  return { message: 'RC document rejected' };
};

const verifyInsurance = async (carId, verifiedBy) => {
  const car = await DriverCar.findByPk(carId);
  if (!car) throw new Error('Vehicle not found');
  await car.update({ insurance_doc_status: 'verified', verified_by: verifiedBy });
  return { message: 'Insurance document verified' };
};

const rejectInsurance = async (carId, reason, verifiedBy) => {
  const car = await DriverCar.findByPk(carId);
  if (!car) throw new Error('Vehicle not found');
  await car.update({ insurance_doc_status: 'rejected', reason, verified_by: verifiedBy });
  return { message: 'Insurance document rejected' };
};

module.exports = {
  upsertDriverCar,
  getDriverCarByDriverId,
  rejectDriverCar,
  getAllVehicles,
  verifyRc,
  rejectRc,
  verifyInsurance,
  rejectInsurance,
};