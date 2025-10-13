const { Op } = require("sequelize");
const SubPackage = require("../models/sub-package.model");
const Package = require("../models/package.model");

// Response DTO
const subPackageResponseDTO = (subpackage) => ({
  id: subpackage.id,
  name: subpackage.name,
  package_id: subpackage.package_id,
  description: subpackage.description,
  status: subpackage.status,
  createdAt: subpackage.createdAt,
  updatedAt: subpackage.updatedAt,
});

// Create or update a sub-package
const upsertSubPackage = async (data) => {
  const transaction = await SubPackage.sequelize.transaction();
  try {
    const dto = {
      name: data.name.trim(),
      package_id: data.package_id,
      description: data.description,
      status: data.status !== undefined ? data.status : true,
    };

    console.log("Upsert data:", data); // Log for debugging

    if (data.id && data.id.trim() !== "") {
      // Update flow
      const existingSubPackage = await SubPackage.findByPk(data.id, {
        transaction,
      });
      if (!existingSubPackage)
        throw new Error("Sub-Package not found with the given ID");

      if (
        data.name.trim().toLowerCase() !== existingSubPackage.name.toLowerCase()
      ) {
        const duplicate = await SubPackage.findOne({
          where: {
            name: { [Op.like]: data.name.trim() }, // Case-insensitive
            id: { [Op.ne]: data.id },
          },
          transaction,
        });
        if (duplicate)
          throw new Error(
            "Another sub-package with the same name already exists"
          );
      }

      await existingSubPackage.update(dto, { transaction });
      await transaction.commit();
      return {
        message: "Sub-Package updated successfully.",
        data: subPackageResponseDTO(existingSubPackage),
      };
    } else {
      // Create flow
      const exists = await SubPackage.findOne({
        where: { name: { [Op.like]: data.name.trim() } }, // Case-insensitive
        transaction,
      });
      if (exists) throw new Error("Sub-Package with same name already exists");

      const created = await SubPackage.create(dto, { transaction });
      await transaction.commit();
      return {
        message: "Sub-Package created successfully.",
        data: subPackageResponseDTO(created),
      };
    }
  } catch (error) {
    await transaction.rollback();
    throw error;
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

  // normal search (name + package_id)
  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { package_id: { [Op.like]: `%${search}%` } },
      { description: { [Op.like]: `%${search}%` } },
      { "$Package.name$": { [Op.like]: `%${search}%` } },
    ];
  }

  if (status !== undefined) {
    where.status = status === "true" ? true : false;
  }

  const { rows, count } = await SubPackage.findAndCountAll({
    where,
    include: [
      {
        model: Package,
        as: "Package", // use your actual alias
        attributes: ["id", "name"],
        required: false, // so it doesn’t filter out if no package found
      },
    ],
    order: [[sortBy, sortOrder.toUpperCase()]],
    limit: parseInt(limit),
    offset,
  });

  return {
    data: rows.map((row) => {
      const dto = subPackageResponseDTO(row);
      dto.packageName = row.package?.name || null; // attach package name
      return dto;
    }),
    total: count,
    page: parseInt(page),
    limit: parseInt(limit),
  };
};

const getActiveSubPackages = async () => {
  const subPackages = await SubPackage.findAll({
    where: { status: true }, // only active
    order: [["createdAt", "DESC"]],
  });

  return subPackages.map(subPackageResponseDTO);
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

  const newStatus = !sp.status;
  await sp.update({ status: newStatus });

  return {
    message: `Sub-Package status updated to ${newStatus ? "active" : "inactive"}`,
    data: subPackageResponseDTO(sp),
  };
};

const getSubPackagesByPackageId = async (package_id) => {
  try {
    console.log("getSubPackagesByPackageId query:", { package_id });

    // Validate package_id
    if (!package_id) {
      throw new Error("Missing required parameter: package_id");
    }

    const subPackages = await SubPackage.findAll({
      where: {
        package_id,
      },
      attributes: ["id", "name", "package_id"],
    });

    return { data: subPackages };
  } catch (error) {
    console.error("getSubPackagesByPackageId error:", error);
    throw error;
  }
};

module.exports = {
  upsertSubPackage,
  getAllSubPackages,
  getSubPackageById,
  deleteSubPackageById,
  toggleSubPackageStatus,
  getSubPackagesByPackageId,
  getActiveSubPackages,
};
