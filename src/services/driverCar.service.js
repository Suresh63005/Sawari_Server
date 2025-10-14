const { uploadToS3 } = require("../config/fileUpload.aws");
const DriverCar = require("../models/driver-cars.model");
const Driver = require("../models/driver.model");
const Car = require("../models/cars.model");
const { Op } = require("sequelize");
const Admin = require("../models/admin.model");
const carDTO = (data) => {
  return {
    car_id: data.car_id,
    color: data.color || null,
    license_plate: data.license_plate,
    car_photos: Array.isArray(data.car_photos) ? data.car_photos : [],
    rc_doc: data.rc_doc,
    rc_doc_back: data.rc_doc_back,
    insurance_doc: data.insurance_doc,
    rc_doc_status: data.rc_doc_status || "pending",
    insurance_doc_status: data.insurance_doc_status || "pending",
    is_approved: data.is_approved ?? false,
    verified_by: data.verified_by || null,
    status: data.status || "active",
  };
};

const parseCarPhotos = (photos) => {
  if (!photos) return [];
  if (Array.isArray(photos)) return photos;
  try {
    return JSON.parse(photos);
  } catch (e) {
    console.error("Error parsing car_photos:", e);
    return [];
  }
};

const carResponseDTO = async (data) => {
  const carDetails = await Car.findByPk(data.car_id);

  let carPhotos = [];
  try {
    carPhotos = Array.isArray(data.car_photos)
      ? data.car_photos
      : JSON.parse(data.car_photos || "[]");
  } catch (e) {
    carPhotos = [];
    console.error("Error parsing car_photos:", e);
  }

  let verifiedByInfo = null;
  if (data.verified_by) {
    const admin = await Admin.findByPk(data.verified_by);
    if (admin) {
      verifiedByInfo = {
        id: admin.id,
        name: admin.first_name + " " + admin.last_name,
        role: admin.role,
      };
    }
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
    verified_by: verifiedByInfo, // <-- now includes name & role
    status: data.status,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
};

const getVehiclesByDriver = async (driverId) => {
  if (!driverId) throw new Error("Driver ID is required");

  try {
    const vehicles = await DriverCar.findAll({
      where: { driver_id: driverId },
      include: [
        {
          model: Car,
          as: "Car",
          attributes: ["brand", "model"],
        },
        {
          model: Admin,
          as: "VerifierAdmin",
          attributes: ["id", "first_name", "last_name", "role"],
          required: false,
        },
      ],
    });

    return vehicles.map((v) => ({
      id: v.id,
      driver_id: v.driver_id,
      car_id: v.car_id,
      car_brand: v.Car?.brand || null,
      car_model: v.Car?.model || null,
      license_plate: v.license_plate,
      car_photos: parseCarPhotos(v.car_photos),
      rc_doc: v.rc_doc,
      rc_doc_back: v.rc_doc_back,
      insurance_doc: v.insurance_doc,
      rc_doc_status: v.rc_doc_status,
      insurance_doc_status: v.insurance_doc_status,
      is_approved: v.is_approved ?? false,
      verified_by: v.VerifierAdmin
        ? {
            id: v.VerifierAdmin.id,
            name: `${v.VerifierAdmin.first_name} ${v.VerifierAdmin.last_name}`,
            role: v.VerifierAdmin.role,
          }
        : null,
      status: v.status || "active",
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
    }));
  } catch (error) {
    console.error(
      "Error in getVehiclesByDriver for driverId:",
      driverId,
      error
    );
    throw new Error("Failed to fetch vehicles for driver: " + error.message);
  }
};

const upsertDriverCar = async (driverId, data) => {
  const sanitizedData = carDTO(data);
  const existing = await DriverCar.findOne({ where: { driver_id: driverId } });
  if (existing) {
    // Only update the fields provided in sanitizedData, preserving existing values
    if (sanitizedData.car_id) {
      const car = await Car.findByPk(sanitizedData.car_id);
      if (!car) throw new Error("Invalid car_id");
    }
    await existing.update(sanitizedData, {
      fields: Object.keys(sanitizedData).filter(
        (key) => sanitizedData[key] !== undefined && sanitizedData[key] !== null
      ),
    });
    return await carResponseDTO(existing);
  } else {
    // Ensure all required fields are provided when creating a new record
    if (
      !sanitizedData.car_id ||
      !sanitizedData.license_plate ||
      !sanitizedData.rc_doc ||
      !sanitizedData.rc_doc_back ||
      !sanitizedData.insurance_doc
    ) {
      throw new Error("All required vehicle fields must be provided");
    }
    const car = await Car.findByPk(sanitizedData.car_id);
    if (!car) throw new Error("Invalid car_id");

    // Ensure car_photos is an array
    if (sanitizedData.car_photos && !Array.isArray(sanitizedData.car_photos)) {
      try {
        sanitizedData.car_photos = JSON.parse(sanitizedData.car_photos);
      } catch (e) {
        sanitizedData.car_photos = [];
        console.log(e);
      }
    }
    const created = await DriverCar.create({
      ...sanitizedData,
      driver_id: driverId,
    });
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
      attributes: {
        exclude: [
          "createdAt",
          "updatedAt",
          "deletedAt",
          "verified_by",
          "wallet_balance",
          "completedRidesCount",
          "completionRate",
          "lastRideTime",
        ],
      },
      include: [
        {
          model: Car,
          as: "Car",
          attributes: ["id", "brand", "model"],
        },
      ],
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
  if (!car) throw new Error("Vehicle not found");
  await car.update({
    is_approved: false,
    status: "rejected",
    reason,
    verified_by: verifiedBy,
  });
  return { message: "Vehicle rejected" };
};

// Service to get all vehicles
const getAllVehicles = async ({
  page = 1,
  limit = 5,
  search = "",
  status = "all",
}) => {
  const offset = (page - 1) * limit;
  const where = {};

  // Add search filter
  if (search) {
    where[Op.or] = [
      { "$Car.brand$": { [Op.iLike]: `%${search}%` } },
      { "$Car.model$": { [Op.iLike]: `%${search}%` } },
      { license_plate: { [Op.iLike]: `%${search}%` } },
    ];
  }

  // Add status filter
  if (status !== "all") {
    if (status === "pending") {
      where.is_approved = false;
    } else if (status === "approved") {
      where.is_approved = true;
      where.status = "active";
    } else if (status === "rejected") {
      where.status = "rejected";
    }
  }

  const { rows, count } = await DriverCar.findAndCountAll({
    where,
    include: [
      {
        model: Car,
        as: "Car",
        attributes: ["brand", "model"],
      },
      {
        model: Admin,
        as: "VerifierAdmin", // Alias for clarity
        attributes: ["id", "first_name", "last_name", "role"],
        required: false,
      },
      {
        model: Driver,
        as: "Driver", // Alias for clarity
        attributes: ["id", "first_name", "last_name"],
        required: false,
      },
    ],
    limit,
    offset,
  });

  return {
    data: await Promise.all(
      rows.map(async (vehicle) => await carResponseDTO(vehicle))
    ),
    total: count,
  };
};

// ... (previous imports and functions remain the same)

const verifyRc = async (carId, verifiedBy) => {
  const car = await DriverCar.findByPk(carId);
  if (!car) throw new Error("Vehicle not found");
  await car.update({ rc_doc_status: "verified", verified_by: verifiedBy });
  return { message: "RC document verified" };
};

const rejectRc = async (carId, reason, verifiedBy) => {
  const car = await DriverCar.findByPk(carId);
  if (!car) throw new Error("Vehicle not found");
  await car.update({
    rc_doc_status: "rejected",
    reason,
    verified_by: verifiedBy,
  });
  return { message: "RC document rejected" };
};

const verifyInsurance = async (carId, verifiedBy) => {
  const car = await DriverCar.findByPk(carId);
  if (!car) throw new Error("Vehicle not found");
  await car.update({
    insurance_doc_status: "verified",
    verified_by: verifiedBy,
  });
  return { message: "Insurance document verified" };
};

const rejectInsurance = async (carId, reason, verifiedBy) => {
  const car = await DriverCar.findByPk(carId);
  if (!car) throw new Error("Vehicle not found");
  await car.update({
    insurance_doc_status: "rejected",
    reason,
    verified_by: verifiedBy,
  });
  return { message: "Insurance document rejected" };
};

const updateDriverCar = async (driver_id, data, files) => {
  const vehicle = await getDriverCarByDriverId(driver_id, data.id);

  if (!vehicle) {
    throw new Error("Vehicle not found"); // This will be caught in the controller as 404
  }

  vehicle.car_id = data.car_id || vehicle.car_id;
  vehicle.color = data.color || vehicle.color;
  vehicle.license_plate = data.license_plate || vehicle.license_plate;

  if (data.car_id) {
    const car = await Car.findByPk(data.car_id);
    if (!car) throw new Error("Invalid car_id"); // This will be caught in the controller as 400
  }

  if (files && files.length > 0) {
    try {
      // Assuming uploadToS3 is defined somewhere
      const uploadedUrls = await uploadToS3(files, "driver-cars");
      vehicle.car_photos = JSON.stringify(uploadedUrls);
    } catch (error) {
      console.error("S3 upload failed:", error);
      throw new Error("Image upload failed"); // This will be caught in the controller as 422
    }
  }

  await vehicle.save();
  return vehicle;
};

const updateDriverDocuments = async ({ driver, driverCar, files }) => {
  if (!driver) {
    throw new Error("Driver not found");
  }
  if (!driverCar) {
    throw new Error("Vehicle not found");
  }

  try {
    const s3Uploads = {};
    const validTypes = ["image/jpeg", "image/png", "application/pdf"];
    const maxSize = 4 * 1024 * 1024; // 4MB

    for (const field of ["rc_doc", "insurance_doc", "license_front"]) {
      if (files[field]) {
        const file = files[field][0];
        if (!validTypes.includes(file.mimetype)) {
          throw new Error(`Invalid file type for ${field}`);
        }
        if (file.size > maxSize) {
          throw new Error(`File too large for ${field}`);
        }
        s3Uploads[field] = await uploadToS3(
          file,
          field === "license_front" ? "drivers" : "driver-cars"
        );
      }
    }

    if (s3Uploads.rc_doc) driverCar.rc_doc = s3Uploads.rc_doc;
    if (s3Uploads.insurance_doc)
      driverCar.insurance_doc = s3Uploads.insurance_doc;
    if (s3Uploads.license_front) driver.license_front = s3Uploads.license_front;

    await Promise.all([driverCar.save(), driver.save()]);

    return { driver, driverCar };
  } catch (error) {
    console.error("Error in updateDriverDocuments:", error);
    throw error; // Propagate error to controller
  }
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
  updateDriverCar,
  updateDriverDocuments,
  getVehiclesByDriver,
};
