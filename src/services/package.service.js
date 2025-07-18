const { Op } = require('sequelize');
const Package = require('../models/package.model');

// Data transfor object for creating a package
const packageDTO = (data) => {
    return {
        name: data.name,
        description: data.description,
        status: data.status || 'active'
    };
}

const packageResponseDTO = (package)=>{
    return {
        id: package.id,
        name: package.name,
        description: package.description,
        status: package.status,
        createdAt: package.createdAt,
        updatedAt: package.updatedAt
    };
}

// Service to create a new package
const upsertPackage = async (data) => {
  const dto = packageDTO(data);

  if (data.id) {
    // ID provided – Update flow
    const existingPackage = await Package.findByPk(data.id);
    if (!existingPackage) {
      throw new Error('Package not found with the given ID');
    }

    // Check if another package with the same name exists
    const duplicatePackage = await Package.findOne({
      where: {
        name: data.name,
        id: { [Op.ne]: data.id }, // Not the same package
      },
    });
    if (duplicatePackage) {
      throw new Error('Another package with the same name already exists');
    }

    // Perform the update
    await existingPackage.update(dto);
    return {
      message: 'Package updated successfully',
      data: packageResponseDTO(existingPackage),
    };
  } else {
    // Create flow
    const existingByName = await Package.findOne({ where: { name: data.name } });
    if (existingByName) {
      throw new Error('Package with the same name already exists');
    }

    const newPackage = await Package.create(dto);
    return {
      message: 'Package created successfully',
      data: packageResponseDTO(newPackage),
    };
  }
};


// Updated service to get all packages with filtering, search, pagination, sorting
const getAllPackages = async ({ search, limit = 10, page = 1, sortBy = 'createdAt', sortOrder = 'DESC', status }) => {
  const where = {};

  // Search by name or description
  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { description: { [Op.like]: `%${search}%` } },
    ];
  }

  // Optional status filter
  if (status) {
    where.status = status;
  }

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
    data: rows.map(pkg => packageResponseDTO(pkg)),
  };
};


// Service to get a package by Id
const getPackageById = async(id)=>{
    const pkg = await Package.findByPk(id);
    if(!pkg) throw new Error('Package not found');
    return packageResponseDTO(pkg);
}

// Service to delete a package by Id
const deletePackageById = async(id)=>{
    const pkg = await Package.findByPk(id);
    if(!pkg) throw new Error('Package not found');

    await pkg.destroy();
    return {message:'Package deleted successfully'}
}

module.exports = {
    upsertPackage,
    getAllPackages,
    getPackageById,
    deletePackageById
}