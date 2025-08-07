const { Op } = require("sequelize");
const PackagePrice = require("../models/packageprice.model");
const SubPackage = require("../models/sub-package.model");

// Response DTO for PackagePrice
const packagePriceResponseDTO = (packagePrice) => ({
  id: packagePrice.id,
  package_id: packagePrice.package_id,
  sub_package_id: packagePrice.sub_package_id,
  car_id: packagePrice.car_id,
  base_fare: parseFloat(packagePrice.base_fare), // Convert to number
  description: packagePrice.description,
  status: packagePrice.status,
  createdAt: packagePrice.createdAt,
  updatedAt: packagePrice.updatedAt,
});

// Response DTO for SubPackage
const subPackageResponseDTO = (subpackage) => ({
  id: subpackage.id,
  name: subpackage.name,
  package_id: subpackage.package_id,
  description: subpackage.description,
  status: subpackage.status,
  createdAt: subpackage.createdAt,
  updatedAt: subpackage.updatedAt,
});

// Create or update a package price
const upsertPackagePrice = async (data) => {
  const dto = {
    package_id: data.package_id,
    sub_package_id: data.sub_package_id,
    car_id: data.car_id,
    base_fare: parseFloat(data.base_fare), // Ensure base_fare is a number
    description: data.description,
    status: data.status !== undefined ? data.status : true,
  };

  if (data.id) {
    // Update flow
    const existingPackagePrice = await PackagePrice.findByPk(data.id);
    if (!existingPackagePrice) throw new Error("Package Price not found with the given ID");

    // Check for duplicate combination, excluding the current package price
    if (
      data.package_id !== existingPackagePrice.package_id ||
      data.sub_package_id !== existingPackagePrice.sub_package_id ||
      data.car_id !== existingPackagePrice.car_id
    ) {
      const duplicate = await PackagePrice.findOne({
        where: {
          package_id: data.package_id,
          sub_package_id: data.sub_package_id,
          car_id: data.car_id,
          id: { [Op.ne]: data.id },
        },
      });
      if (duplicate) throw new Error("A package price with the same package, sub-package, and car already exists");
    }

    await existingPackagePrice.update(dto);
    return {
      message: "Package Price updated successfully.",
      data: packagePriceResponseDTO(existingPackagePrice),
    };
  } else {
    // Create flow
    const exists = await PackagePrice.findOne({
      where: {
        package_id: data.package_id,
        sub_package_id: data.sub_package_id,
        car_id: data.car_id,
      },
    });
    if (exists) throw new Error("A package price with the same package, sub-package, and car already exists");

    const created = await PackagePrice.create(dto);
    return {
      message: "Package Price created successfully.",
      data: packagePriceResponseDTO(created),
    };
  }
};

// Get all package prices with optional filters
const getAllPackagePrices = async ({
  search,
  limit = 10,
  page = 1,
  sortBy = "createdAt",
  sortOrder = "DESC",
  status,
}) => {
  const where = {};
  const offset = (parseInt(page) - 1) * parseInt(limit);

  if (search) {
    where[Op.or] = [
      { package_id: { [Op.like]: `%${search}%` } },
      { sub_package_id: { [Op.like]: `%${search}%` } },
      { car_id: { [Op.like]: `%${search}%` } },
    ];
  }

  if (status !== undefined) {
    where.status = status === "true" ? true : false;
  }

  const { rows, count } = await PackagePrice.findAndCountAll({
    where,
    order: [[sortBy, sortOrder.toUpperCase()]],
    limit: parseInt(limit),
    offset,
  });

  return {
    total: count,
    page: parseInt(page),
    limit: parseInt(limit),
    data: rows.map(packagePriceResponseDTO),
  };
};

// Get by ID
const getPackagePriceById = async (id) => {
  const pp = await PackagePrice.findByPk(id);
  if (!pp) throw new Error("Package Price not found with the given ID");
  return packagePriceResponseDTO(pp);
};

// Delete by ID
const deletePackagePriceById = async (id) => {
  const pp = await PackagePrice.findByPk(id);
  if (!pp) throw new Error("Package Price not found with the given ID");
  await pp.destroy();
  return {
    message: "Package Price deleted successfully",
    data: packagePriceResponseDTO(pp),
  };
};

// Toggle package price status
const togglePackagePriceStatus = async (id) => {
  const pp = await PackagePrice.findByPk(id);
  if (!pp) throw new Error("Package Price not found with the given ID");

  const newStatus = !pp.status;
  await pp.update({ status: newStatus });

  return {
    message: `Package Price status updated to ${newStatus ? "active" : "inactive"}`,
    data: packagePriceResponseDTO(pp),
  };
};

// Get sub-packages by package_id
const getSubPackagesByPackageId = async (package_id) => {
  if (!package_id) {
    return { data: [] };
  }

  const subPackages = await SubPackage.findAll({
    where: { package_id: package_id },
  });

  return {
    data: subPackages.map(subPackageResponseDTO),
  };
};

module.exports = {
  upsertPackagePrice,
  getAllPackagePrices,
  getPackagePriceById,
  deletePackagePriceById,
  togglePackagePriceStatus,
  getSubPackagesByPackageId,
};