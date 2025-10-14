const packagePriceService = require("../../services/packageprice.service");

// Create or Update
const upsertPackagePrice = async (req, res) => {
  try {
    const result = await packagePriceService.upsertPackagePrice(req.body);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get All
const getAllPackagePrices = async (req, res) => {
  try {
    const result = await packagePriceService.getAllPackagePrices(req.query);
    res
      .status(200)
      .json({ message: "Package Prices retrieved successfully", result });
  } catch (error) {
    res.status(400).json({ error: error.message });
    console.log(error, "eeeeeeeeeeeeeeeeeeeeeeee");
  }
};

// Get by ID
const getPackagePriceById = async (req, res) => {
  try {
    const result = await packagePriceService.getPackagePriceById(req.params.id);
    res
      .status(200)
      .json({ message: "Package Price retrieved successfully", data: result });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

// Delete by ID
const deletePackagePriceById = async (req, res) => {
  try {
    const result = await packagePriceService.deletePackagePriceById(
      req.params.id
    );
    res
      .status(200)
      .json({ message: "Package Price deleted successfully", data: result });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

// Toggle package price status
const togglePackagePriceStatus = async (req, res) => {
  try {
    const result = await packagePriceService.togglePackagePriceStatus(
      req.params.id
    );
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get sub-packages by package_id
const getSubPackagesByPackageId = async (req, res) => {
  console.log(req.params.package_id, "eeeeeeeeeeeeeeeeeeeeeeee");
  try {
    const result = await packagePriceService.getSubPackagesByPackageId(
      req.params.package_id
    );
    res
      .status(200)
      .json({ message: "Sub-Packages retrieved successfully", result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  upsertPackagePrice,
  getAllPackagePrices,
  getPackagePriceById,
  deletePackagePriceById,
  togglePackagePriceStatus,
  getSubPackagesByPackageId,
};
