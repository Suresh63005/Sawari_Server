const { uploadToS3 } = require('../config/fileUpload.aws');
const DriverCar = require('../models/driver-cars.model');
const Car = require('../models/cars.model');
const { Op, Sequelize } = require("sequelize");

const carDTO = (data) => {
  return {
    car_id: data.car_id,
    color: data.color || null,
    license_plate: data.license_plate,
    car_photos: data.car_photos || [],
    rc_doc: data.rc_doc,
    rc_doc_back: data.rc_doc_back,
    insurance_doc: data.insurance_doc,
    rc_doc_status: data.rc_doc_status || 'pending',
    insurance_doc_status: data.insurance_doc_status || 'pending',
    is_approved: data.is_approved ?? false,
    verified_by: data.verified_by || null,
    status: data.status || 'active',
  };
};

const carResponseDTO = async (data) => {
  const carDetails = await Car.findByPk(data.car_id);

  let carPhotos = [];
  try {
    carPhotos = Array.isArray(data.car_photos) 
      ? data.car_photos 
      : JSON.parse(data.car_photos || '[]');
  } catch (e) {
    carPhotos = [];
  }

  return {
    id: data.id,
    driver_id: data.driver_id,
    car_id: data.car_id,
    car_model: carDetails ? carDetails.model : null,
    car_brand: carDetails ? carDetails.brand : null,
    color: data.color,
    license_plate: data.license_plate,
    car_photos: carPhotos,
    rc_doc: data.rc_doc,
    rc_doc_back: data.rc_doc_back,
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
    if (sanitizedData.car_id) {
      const car = await Car.findByPk(sanitizedData.car_id);
      if (!car) throw new Error('Invalid car_id');
    }
    await existing.update(sanitizedData, { fields: Object.keys(sanitizedData).filter(key => sanitizedData[key] !== undefined && sanitizedData[key] !== null) });
    return await carResponseDTO(existing);
  } else {
    // Ensure all required fields are provided when creating a new record
    if (!sanitizedData.car_id || !sanitizedData.license_plate || !sanitizedData.rc_doc || !sanitizedData.rc_doc_back || !sanitizedData.insurance_doc) {
      throw new Error('All required vehicle fields must be provided');
    }
    const car = await Car.findByPk(sanitizedData.car_id);
    if (!car) throw new Error('Invalid car_id');
    const created = await DriverCar.create({ ...sanitizedData, driver_id: driverId });
    return await carResponseDTO(created);
  }
};

const getDriverCarByDriverId = async (driver_id, car_id = null) => {
try {
    const whereClause = { driver_id };
    if (car_id) {
      whereClause.id = car_id;
    }
  
    const vehicle = await DriverCar.findOne({
      where: whereClause,
      include: [
        {
          model: Car,
          as: "Car",
          attributes: ["id", "brand", "model"]
        }
      ]
    });
  
    // if (!vehicle) {
    //   throw new Error("Vehicle not found");
    // }
  
    return vehicle || null;
} catch (error) {
  console.error("Error fetching vehicle:", error);
  throw new Error("Error fetching vehicle");
}
};


// Service for reject vehicle
const rejectDriverCar = async (carId, reason, verifiedBy) => {
  const car = await DriverCar.findByPk(carId);
  if (!car) throw new Error('Vehicle not found');
  await car.update({ is_approved: false, status: 'rejected', reason, verified_by: verifiedBy });
  return { message: 'Vehicle rejected' };
};

// Service to get all vehicles
const getAllVehicles = async ({ page = 1, limit = 5, search = '', status = 'all' }) => {
  const offset = (page - 1) * limit;
  const where = {};

  // Add search filter for car_brand, car_model, and license_plate
  if (search) {
    where[Op.or] = [
      { '$Car.brand$': { [Op.iLike]: `%${search}%` } },
      { '$Car.model$': { [Op.iLike]: `%${search}%` } },
      { license_plate: { [Op.iLike]: `%${search}%` } }
    ];
  }

  // Add status filter
  if (status !== 'all') {
    if (status === 'pending') {
      where.is_approved = false;
    } else if (status === 'approved') {
      where.is_approved = true;
      where.status = 'active';
    } else if (status === 'rejected') {
      where.status = 'rejected';
    }
  }

  const { rows, count } = await DriverCar.findAndCountAll({
    where,
    include: [{ model: Car, as: 'Car', attributes: [] }],
    limit,
    offset
  });

  console.log(rows,"yyyyyyyyyyyyyyyyyyyyyyyyyyyyy")

  return {
    data: await Promise.all(rows.map(async vehicle => await carResponseDTO(vehicle))),
    total: count
  };
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


const updateDriverCar = async(driver_id,data,files)=>{
  const vehicle = await getDriverCarByDriverId(driver_id,data.id)

  vehicle.car_id = data.car_id || vehicle.car_id;
  vehicle.color = data.color || vehicle.color;
  vehicle.license_plate  = data.license_plate || vehicle.license_plate; 

  if (data.car_id) {
    const car = await Car.findByPk(data.car_id);
    if (!car) throw new Error('Invalid car_id');
  }

  if(files && files.length > 0){
    try {
      const uploadURLS=await uploadToS3(files,"driver-cars");
      // vehicle.car_photos = JSON.stringify(uploadedUrls); 
    } catch (error) {
      console.error("S3 upload failed:", error);
      throw new Error("Image upload failed");
    }
  }

  await vehicle.save();
  return vehicle;
} 


const updateDriverDocuments=async({driver,driverCar,files})=>{
  try {
    const s3Uploads = {};
    if(files.rc_doc){
      s3Uploads.rc_doc = await uploadToS3(files.rc_doc[0],"driver-cars")
    }
    if(files.insurance_doc){
      s3Uploads.insurance_doc = await uploadToS3(files.insurance_doc[0],"driver-cars");
    }
    if(files.license_front){
      s3Uploads.license_front = await uploadToS3(files.license_front[0],"drivers")
    }

    //update driver car
    if(s3Uploads.rc_doc) driverCar.rc_doc = s3Uploads.rc_doc;
    if(s3Uploads.insurance_doc) driverCar.insurance_doc = s3Uploads.insurance_doc;

    //update driver
    if(s3Uploads.license_front) driver.license_front = s3Uploads.license_front;

    await Promise.all([driverCar.save(),driver.save()])

    return {
      driver,
      driverCar
    }
  } catch (error) {
      console.error(error)
  }
}
module.exports = {
  upsertDriverCar,
  getDriverCarByDriverId,
  rejectDriverCar,
  getAllVehicles,
  verifyRc,
  rejectRc,
  verifyInsurance,
  rejectInsurance,
  updateDriverCar,
  updateDriverDocuments
};