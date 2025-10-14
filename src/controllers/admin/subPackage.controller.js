const subPackageService = require("../../services/subPackage.service");

// Create or Update
const upsertSubPackage = async (req, res) => {
  try {
    const result = await subPackageService.upsertSubPackage(req.body);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get All
const getAllSubPackages = async (req, res) => {
  try {
    const result = await subPackageService.getAllSubPackages(req.query);
    res
      .status(200)
      .json({ message: "Sub-Packages retrieved successfully", result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getActiveSubPackagesController = async (req, res) => {
  try {
    const result = await subPackageService.getActiveSubPackages();
    res.json(result);
  } catch (error) {
    console.error("Error in getActiveSubPackagesController:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
// Get by ID
const getSubPackageById = async (req, res) => {
  try {
    const result = await subPackageService.getSubPackageById(req.params.id);
    res
      .status(200)
      .json({ message: "Sub-Package retrieved successfully", data: result });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

// Delete by ID
const deleteSubPackageById = async (req, res) => {
  try {
    const result = await subPackageService.deleteSubPackageById(req.params.id);
    res
      .status(200)
      .json({ message: "Sub-Package deleted successfully", data: result });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

// Toggle sub-package status
const toggleSubPackageStatus = async (req, res) => {
  try {
    const result = await subPackageService.toggleSubPackageStatus(
      req.params.id
    );
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
const getSubPackagesByPackageId = async (req, res) => {
  try {
    console.log("getSubPackagesByPackageId query:", req.query);
    const { package_id } = req.query;
    if (!package_id) {
      return res
        .status(400)
        .json({ error: "Missing required query parameter: package_id" });
    }
    const result =
      await subPackageService.getSubPackagesByPackageId(package_id);
    res.status(200).json(result);
  } catch (error) {
    console.error("getSubPackagesByPackageId error:", error.message);
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  upsertSubPackage,
  getAllSubPackages,
  getSubPackageById,
  getSubPackagesByPackageId,
  deleteSubPackageById,
  toggleSubPackageStatus,
  getActiveSubPackagesController,
};
