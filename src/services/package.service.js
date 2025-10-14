const { Op } = require("sequelize");
const Package = require("../models/package.model");

// Data transform object for creating a package
const packageDTO = (data) => {
  return {
    name: data.name,
    description: data.description,
    status: data.status || "active",
  };
};

const packageResponseDTO = (pkg) => {
  return {
    id: pkg.id,
    name: pkg.name,
    description: pkg.description,
    status: pkg.status,
    createdAt: pkg.createdAt,
    updatedAt: pkg.updatedAt,
  };
};

// Service to create or update a package
const upsertPackage = async (data) => {
  const dto = packageDTO(data);

  if (data.id) {
    // ID provided – Update flow
    const existingPackage = await Package.findByPk(data.id);
    if (!existingPackage) {
      throw new Error("Package not found with the given ID");
    }

    // Check if another package with the same name exists
    const duplicatePackage = await Package.findOne({
      where: {
        name: data.name,
        id: { [Op.ne]: data.id }, // Not the same package
      },
    });
    if (duplicatePackage) {
      throw new Error("Another package with the same name already exists");
    }

    // Perform the update
    await existingPackage.update(dto);
    return {
      message: "Package updated successfully",
      data: packageResponseDTO(existingPackage),
    };
  } else {
    // Create flow
    const existingByName = await Package.findOne({
      where: { name: data.name },
    });
    if (existingByName) {
      throw new Error("Package with the same name already exists");
    }

    const newPackage = await Package.create(dto);
    return {
      message: "Package created successfully",
      data: packageResponseDTO(newPackage),
    };
  }
};

// Service to get all packages with filtering, search, pagination, sorting
const getAllPackages = async ({
  search,
  limit = 10,
  page = 1,
  sortBy = "createdAt",
  sortOrder = "DESC",
}) => {
  const where = {};

  // Search by name or description
  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { description: { [Op.like]: `%${search}%` } },
    ];
  }

  // Optional status filter
  // if (status) {
  //   where.status = status;
  // }

  const offset = (page - 1) * limit;

  const { rows, count } = await Package.findAndCountAll({
    where,
    order: [[sortBy, sortOrder.toUpperCase()]],
    limit: parseInt(limit),
    offset: parseInt(offset),
  });

  return {
    total: count,
    page: parseInt(page),
    limit: parseInt(limit),
    data: rows.map((pkg) => packageResponseDTO(pkg)),
  };
};

const getActivePackages = async () => {
  const packages = await Package.findAll({
    where: { status: "active" }, // filter only active
    order: [["createdAt", "DESC"]],
  });

  return packages.map((pkg) => packageResponseDTO(pkg));
};
// Service to get a package by ID
const getPackageById = async (id) => {
  const pkg = await Package.findByPk(id);
  if (!pkg) throw new Error("Package not found");
  return packageResponseDTO(pkg);
};

// Service to delete a package by ID
const deletePackageById = async (id) => {
  const pkg = await Package.findByPk(id);
  if (!pkg) throw new Error("Package not found");

  await pkg.destroy();
  return { message: "Package deleted successfully" };
};

// Service to toggle package status
const togglePackageStatus = async (id) => {
  const pkg = await Package.findByPk(id);
  if (!pkg) throw new Error("Package not found");

  const newStatus = pkg.status === "active" ? "inactive" : "active";
  await pkg.update({ status: newStatus });

  return {
    message: `Package status updated to ${newStatus}`,
    data: packageResponseDTO(pkg),
  };
};

module.exports = {
  upsertPackage,
  getAllPackages,
  getPackageById,
  deletePackageById,
  togglePackageStatus,
  getActivePackages,
};
