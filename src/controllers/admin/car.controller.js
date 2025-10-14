const carService = require("../../services/car.service");
const { deleteFromS3, uploadToS3 } = require("../../config/fileUpload.aws");

/**
 * Controller for upsert(create/update) a car
 * @param {Object} req - Request object containing car data
 * @param {Object} res - Response object to send the result
 * @returns {Object} - Response with success message and car data
 */
const upsertCar = async (req, res) => {
  try {
    let imageUrl = null;
    if (req.file) {
      imageUrl = await uploadToS3(req.file, "cars");
      req.body.image_url = imageUrl;
    } else if (req.body.id) {
      // Fetch existing car to preserve image_url if no new file is uploaded
      const existingCar = await carService.getCarById(req.body.id);
      if (existingCar) {
        req.body.image_url = existingCar.image_url;
      }
    }

    const result = await carService.upsertCar(req.body);
    // Delete the old image if updating with a new image
    if (req.body.id && req.file && req.body.image_url) {
      const oldCar = await carService.getCarById(req.body.id);
      if (
        oldCar &&
        oldCar.image_url &&
        oldCar.image_url !== req.body.image_url
      ) {
        await deleteFromS3(oldCar.image_url);
      }
    }

    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
    console.error(`Error in upsertCar: ${error.message}`);
  }
};

/**
 * Controller to get all cars
 * @param {Object} req - Request object containing query parameters
 * @param {Object} res - Response object to send the result
 * @returns {Object} - Response with cars data
 */
const getAllCars = async (req, res) => {
  try {
    const {
      search = "",
      limit = 10,
      page = 1,
      sortBy = "createdAt",
      sortOrder = "DESC",
      status,
    } = req.query;

    const result = await carService.getAllCars({
      search,
      limit,
      page,
      sortBy,
      sortOrder,
      status,
    });

    res.status(200).json({
      message: "Cars retrieved successfully",
      result,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
    console.error(`Error in getAllCars: ${error.message}`);
  }
};

/**
 * Controller to get a car by ID
 * @param {Object} req - Request object containing car ID
 * @param {Object} res - Response object to send the result
 * @returns {Object} - Response with car data
 */
const getCarById = async (req, res) => {
  try {
    const result = await carService.getCarById(req.params.id);
    res.status(200).json({
      message: "Car retrieved successfully",
      data: result,
    });
  } catch (error) {
    res.status(404).json({ error: error.message });
    console.error(`Error in getCarById: ${error.message}`);
  }
};

/**
 * Controller to delete a car by ID
 * @param {Object} req - Request object containing car ID
 * @param {Object} res - Response object to send the result
 * @returns {Object} - Response with success message
 */
const deleteCarById = async (req, res) => {
  try {
    const result = await carService.deleteCarById(req.params.id);
    res.status(200).json({
      message: "Car deleted successfully",
      data: result.data,
    });
  } catch (error) {
    res.status(404).json({ error: error.message });
    console.error(`Error in deleteCarById: ${error.message}`);
  }
};

/**
 * Controller to toggle car status
 * @param {Object} req - Request object containing car ID
 * @param {Object} res - Response object to send the result
 * @returns {Object} - Response with updated car data
 */
const toggleCarStatus = async (req, res) => {
  try {
    const result = await carService.toggleCarStatus(req.params.id);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
    console.error(`Error in toggleCarStatus: ${error.message}`);
  }
};
const getCarsBySubPackageId = async (req, res) => {
  try {
    const { sub_package_id } = req.params;
    console.log("Fetching cars for sub_package_id:", sub_package_id);
    const cars = await carService.getCarsBySubPackageId(sub_package_id);
    res.status(200).json({ result: { data: cars } });
  } catch (error) {
    console.error("getCarsBySubPackageId error:", error.message);
    res.status(400).json({ error: error.message });
  }
};

const getCarsForListController = async (req, res) => {
  try {
    const result = await carService.getCarsForList();
    res.json(result);
  } catch (error) {
    console.error("Error in getCarsForListController:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
module.exports = {
  upsertCar,
  getAllCars,
  getCarById,
  deleteCarById,
  toggleCarStatus,
  getCarsBySubPackageId,
  getCarsForListController,
};
