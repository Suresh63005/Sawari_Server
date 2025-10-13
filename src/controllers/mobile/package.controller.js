const CarService = require("../../services/car.service");
const PackageService = require("../../services/package.service");
const SubPackageService = require("../../services/subPackage.service");
const PackagePriceService = require("../../services/packageprice.service");

// controller to get all packages
const getAllPackages = async (req, res) => {
  const {
    search,
    limit,
    page = 1,
    sortBy = "createdAt",
    sortOrder = "DESC",
  } = req.query;

  try {
    const packages = await PackageService.getAllPackages({
      search,
      limit,
      page,
      sortBy,
      sortOrder,
    });
    if (packages.total === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No packages found" });
    }
    return res.status(200).json({
      success: true,
      message: "Packages fetched successfully",
      data: {
        total: packages.total,
        page: packages.page,
        limit: packages.limit,
        data: packages.data,
      },
    });
  } catch (error) {
    console.error("Error in getAllPackages:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// controller to get sub-packages by package id
const getSubPackagesByPackageId = async (req, res) => {
  const { package_id } = req.params;
  if (!package_id) {
    return res
      .status(400)
      .json({ success: false, message: "Package ID is required" });
  }

  try {
    const subPackages =
      await SubPackageService.getSubPackagesByPackageId(package_id);
    if (!subPackages || !subPackages.data || subPackages.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No sub-packages found for this package",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Sub-packages fetched successfully",
      data: subPackages,
    });
  } catch (error) {
    console.error("Error in getSubPackagesByPackageId:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// controller to get all cars
const getAllCarsBySubPackageId = async (req, res) => {
  try {
    const { sub_package_id } = req.params;
    if (!sub_package_id) {
      return res
        .status(400)
        .json({ success: false, message: "Sub-Package ID is required" });
    }

    const cars = await CarService.getCarsBySubPackageId(sub_package_id);

    if (!cars || cars.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No cars found with this sub-package",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Cars fetched successfully",
      data: cars,
    });
  } catch (error) {
    console.error("Error in getAllCars:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Fetch Price by package_id, sub_package_id, car_id
const getPrice = async (req, res) => {
  const { package_id, sub_package_id, car_id } = req.params;

  try {
    // Call the service to get the price
    const price = await PackagePriceService.getPrice(
      package_id,
      sub_package_id,
      car_id
    );

    // If no error is thrown, return the data
    return res.status(200).json({
      success: true,
      message: "Price fetched successfully",
      data: price,
    });
  } catch (error) {
    console.error("Error in getPrice:", error);

    // Handle specific errors or generic ones
    if (error.message === "Missing required parameters") {
      return res.status(400).json({ success: false, message: error.message });
    }

    if (error.message === "Price not found") {
      return res.status(404).json({ success: false, message: error.message });
    }

    // Handle any unexpected errors (server errors)
    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred",
      error: error.message,
    });
  }
};

// Fetch all cars
const getAllCars = async (req, res) => {
  try {
    const cars = await CarService.getAllCars(req.query);
    return res.status(200).json({
      success: true,
      message: "Cars fetched successfully",
      data: cars,
    });
  } catch (error) {
    console.error("Error in getAllCars:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllPackages,
  getSubPackagesByPackageId,
  getAllCarsBySubPackageId,
  getPrice,
  getAllCars,
};
