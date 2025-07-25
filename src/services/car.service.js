const { Op } = require("sequelize");
const Car = require("../models/cars.model");
const { deleteFromS3 } = require("../config/fileUpload.aws");

const carDTO = (data) => {
  return {
    brand: data.brand,
    model: data.model,
    image_url: data.image_url || null, // Preserve existing image_url if provided
    status: data.status || "active",
  };
};

const carResponseDTO = (car) => {
  return {
    id: car.id,
    brand: car.brand,
    model: car.model,
    image_url: car.image_url,
    status: car.status,
    createdAt: car.createdAt,
    updatedAt: car.updatedAt,
  };
};

// Service to create or update a car
const upsertCar = async (data) => {
  const dto = carDTO(data);

  if (data.id) {
    // ID provided = Update flow
    const existingCar = await Car.findByPk(data.id);
    if (!existingCar) {
      throw new Error("Car not found with the given ID");
    }

    // Check if another car with the same brand and model exists
    const duplicateCar = await Car.findOne({
      where: {
        model: data.model,
        id: { [Op.ne]: data.id },
      },
    });
    if (duplicateCar) {
      throw new Error("Another car with the same model already exists");
    }

    // Preserve existing image_url if no new image_url is provided
    if (!data.image_url && existingCar.image_url) {
      dto.image_url = existingCar.image_url;
    }

    // Perform the update
    await existingCar.update(dto);
    return {
      message: "Car updated successfully",
      data: carResponseDTO(existingCar),
    };
  } else {
    // Create flow
    const existingByModel = await Car.findOne({ where: { model: data.model } });
    if (existingByModel) {
      throw new Error("Car with the same model already exists");
    }

    const newCar = await Car.create(dto);
    return {
      message: "Car created successfully",
      data: carResponseDTO(newCar),
    };
  }
};

// Service to get all cars with optional filters, pagination, searching, and sorting
const getAllCars = async ({ search, limit = 10, page = 1, sortBy = 'createdAt', sortOrder = 'DESC', status }) => {
  const where = {};
  const offset = (parseInt(page) - 1) * parseInt(limit);

  // Search by brand or model
  if (search) {
    console.log('search value:', search);
    where[Op.or] = [
      { brand: { [Op.like]: `%${search}%` } },
      { model: { [Op.like]: `%${search}%` } },
    ];
  }

  // Filter by status
  if (status) {
    where.status = status;
  }
  console.log('WHERE clause:', JSON.stringify(where, null, 2));

  const { rows, count } = await Car.findAndCountAll({
    where,
    order: [[sortBy, sortOrder.toUpperCase()]],
    limit: parseInt(limit),
    offset: offset,
  });

  return {
    total: count,
    page: parseInt(page),
    limit: parseInt(limit),
    data: rows.map(car => carResponseDTO(car)),
  };
};

// Service to get a car by ID
const getCarById = async (id) => {
  const car = await Car.findByPk(id);
  if (!car) throw new Error("Car not found with the given ID");
  return carResponseDTO(car);
};

// Service to delete a car by ID
const deleteCarById = async (id) => {
  const car = await Car.findByPk(id);
  if (!car) throw new Error("Car not found with the given ID");

  // Delete image from S3
  if (car.image_url) {
    await deleteFromS3(car.image_url);
  }

  await car.destroy();
  return {
    message: "Car deleted successfully",
    data: carResponseDTO(car),
  };
};

// Service to toggle car status
const toggleCarStatus = async (id) => {
  const car = await Car.findByPk(id);
  if (!car) throw new Error("Car not found with the given ID");

  const newStatus = car.status === 'active' ? 'inactive' : 'active';
  await car.update({ status: newStatus });

  return {
    message: `Car status updated to ${newStatus}`,
    data: carResponseDTO(car),
  };
};

module.exports = {
  upsertCar,
  getAllCars,
  getCarById,
  deleteCarById,
  toggleCarStatus,
};