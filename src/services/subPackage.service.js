const { Op } = require("sequelize");
const SubPackage = require("../models/sub-package.model");

// Response DTO
const subPackageResponseDTO = (subpackage) => ({
  id: subpackage.id,
  name: subpackage.name,
  car_id: subpackage.car_id,
  package_id: subpackage.package_id,
  hours: subpackage.hours,
  days_per_month: subpackage.days_per_month,
  hours_per_day: subpackage.hours_per_day,
  base_fare: subpackage.base_fare,
  status: subpackage.status || 'active',
  createdAt: subpackage.createdAt,
  updatedAt: subpackage.updatedAt,
});

// Create or update a sub-package
const upsertSubPackage = async (data) => {
  const dto = {
    name: data.name,
    car_id: data.car_id,
    package_id: data.package_id,
    hours: data.hours,
    days_per_month: data.days_per_month,
    hours_per_day: data.hours_per_day,
    base_fare: data.base_fare,
    status: data.status || 'active',
  };

  if (data.id) {
    const existingSubPackage = await SubPackage.findByPk(data.id);
    if (!existingSubPackage) throw new Error("Sub-Package not found with the given ID");

    // Check for duplicate name (exclude current ID)
    const duplicate = await SubPackage.findOne({
      where: {
        name: data.name,
        id: { [Op.ne]: data.id },
      },
    });
    if (duplicate) throw new Error("Another sub-package with the same name already exists");

    await existingSubPackage.update(dto);
    return {
      message: "Sub-Package updated successfully.",
      data: subPackageResponseDTO(existingSubPackage),
    };
  } else {
    // Create flow
    const exists = await SubPackage.findOne({ where: { name: data.name } });
    if (exists) throw new Error("Sub-Package with same name already exists");

    const created = await SubPackage.create(dto);
    return {
      message: "Sub-Package created successfully.",
      data: subPackageResponseDTO(created),
    };
  }
};

// Get all sub-packages with optional filters
const getAllSubPackages = async ({
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
      { name: { [Op.like]: `%${search}%` } },
      { package_id: { [Op.like]: `%${search}%` } },
      { car_id: { [Op.like]: `%${search}%` } },
    ];
  }

  if (status) {
    where.status = status;
  }

  const { rows, count } = await SubPackage.findAndCountAll({
    where,
    order: [[sortBy, sortOrder.toUpperCase()]],
    limit: parseInt(limit),
    offset,
  });

  return {
    total: count,
    page: parseInt(page),
    limit: parseInt(limit),
    data: rows.map(subPackageResponseDTO),
  };
};

// Get by ID
const getSubPackageById = async (id) => {
  const sp = await SubPackage.findByPk(id);
  if (!sp) throw new Error("Sub-Package not found with the given ID");
  return subPackageResponseDTO(sp);
};

// Delete by ID
const deleteSubPackageById = async (id) => {
  const sp = await SubPackage.findByPk(id);
  if (!sp) throw new Error("Sub-Package not found with the given ID");
  await sp.destroy();
  return {
    message: "Sub-Package deleted successfully",
    data: subPackageResponseDTO(sp),
  };
};

// Toggle sub-package status
const toggleSubPackageStatus = async (id) => {
  const sp = await SubPackage.findByPk(id);
  if (!sp) throw new Error("Sub-Package not found with the given ID");

  const newStatus = sp.status === 'active' ? 'inactive' : 'active';
  await sp.update({ status: newStatus });

  return {
    message: `Sub-Package status updated to ${newStatus}`,
    data: subPackageResponseDTO(sp),
  };
};

module.exports = {
  upsertSubPackage,
  getAllSubPackages,
  getSubPackageById,
  deleteSubPackageById,
  toggleSubPackageStatus,
};