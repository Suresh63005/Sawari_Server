const { Op } = require("sequelize");
const PackagePrice = require("../models/packageprice.model");
const SubPackage = require("../models/sub-package.model");
const Package = require("../models/package.model");
const Car = require("../models/cars.model");

// Response DTO for PackagePrice
const packagePriceResponseDTO = (pp) => ({
  id: pp.id,
  package_id: pp.package_id,
  package_name: pp.Package ? pp.Package.name : null,
  sub_package_id: pp.sub_package_id,
  sub_package_name: pp.SubPackage ? pp.SubPackage.name : null,
  car_id: pp.car_id,
  car_name: pp.Car ? pp.Car.model : null,
  base_fare: parseFloat(pp.base_fare),
  description: pp.description,
  status: pp.status,
  createdAt: pp.createdAt,
  updatedAt: pp.updatedAt,
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
    if (!existingPackagePrice)
      throw new Error("Package Price not found with the given ID");

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
      if (duplicate)
        throw new Error(
          "A package price with the same package, sub-package, and car already exists"
        );
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
    if (exists)
      throw new Error(
        "A package price with the same package, sub-package, and car already exists"
      );

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
}) => {
  const where = {};
  const offset = (parseInt(page) - 1) * parseInt(limit);

  if (search) {
    where[Op.or] = [
      { "$Package.name$": { [Op.like]: `%${search}%` } }, //package name
      { "$SubPackage.name$": { [Op.like]: `%${search}%` } }, //sub package name
      { "$Car.model$": { [Op.like]: `%${search}%` } }, //car model
      { description: { [Op.like]: `%${search}%` } },
    ];
  }

  const { rows, count } = await PackagePrice.findAndCountAll({
    where,
    order: [[sortBy, sortOrder.toUpperCase()]],
    limit: parseInt(limit),
    offset,
    include: [
      { model: Package, as: "Package", attributes: ["id", "name"] },
      { model: SubPackage, as: "SubPackage", attributes: ["id", "name"] },
      { model: Car, as: "Car", attributes: ["id", "model"] },
    ],
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
    where: {
      package_id: package_id,
      status: true, // only active (true) sub-packages
    },
  });

  return {
    data: subPackages.map(subPackageResponseDTO),
  };
};

// Fetch Price by package_id, sub_package_id, car_id
const getPrice = async (package_id, sub_package_id, car_id) => {
  // Validate parameters (optional depending on how strict you want your service to be)
  if (!package_id || !sub_package_id || !car_id) {
    throw new Error("Missing required parameters");
  }

  // Fetch the price from the database
  const price = await PackagePrice.findOne({
    where: {
      package_id,
      sub_package_id,
      car_id,
    },
  });

  // If no price is found, throw an error
  if (!price) {
    throw new Error("Price not found");
  }

  // Return the transformed price data
  return packagePriceResponseDTO(price);
};

module.exports = {
  upsertPackagePrice,
  getAllPackagePrices,
  getPackagePriceById,
  deletePackagePriceById,
  getPrice,
  togglePackagePriceStatus,
  getSubPackagesByPackageId,
};
