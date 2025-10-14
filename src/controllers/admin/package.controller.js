const packageService = require("../../services/package.service");

// Controller for upsert (create/update)
const upsertPackage = async (req, res) => {
  try {
    const result = await packageService.upsertPackage(req.body);
    res.status(200).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Controller to get all packages
const getAllPackages = async (req, res) => {
  try {
    const {
      search = "",
      limit = 10,
      page = 1,
      sortBy = "createdAt",
      sortOrder = "DESC",
      status = "active",
    } = req.query;

    const result = await packageService.getAllPackages({
      search,
      limit,
      page,
      sortBy,
      sortOrder,
      status,
    });

    res
      .status(200)
      .json({ message: "Packages retrieved successfully", result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getActivePackagesController = async (req, res) => {
  try {
    const result = await packageService.getActivePackages();
    res.json(result);
  } catch (error) {
    console.error("Error in getActivePackagesController:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
// Controller to get a package by ID
const getPackageById = async (req, res) => {
  try {
    const pkg = await packageService.getPackageById(req.params.id);
    res
      .status(200)
      .json({ message: "Package retrieved successfully", data: pkg });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

// Controller to delete a package by ID
const deletePackageById = async (req, res) => {
  try {
    const result = await packageService.deletePackageById(req.params.id);
    res
      .status(200)
      .json({ message: "Package deleted successfully", data: result });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
};

// Controller to toggle package status
const togglePackageStatus = async (req, res) => {
  try {
    const result = await packageService.togglePackageStatus(req.params.id);
    res.status(200).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

module.exports = {
  upsertPackage,
  getAllPackages,
  getPackageById,
  deletePackageById,
  togglePackageStatus,
  getActivePackagesController,
};
