const packageService = require('../../services/package.service');

// Controller for upsert (create/update)
const upsertPackage = async (req, res) => {
  try {
    const result = await packageService.upsertPackage(req.body);
    res.status(200).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const getAllPackages = async (req, res) => {
  try {
    const {
      search = '',
      limit = 10,
      page = 1,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      status = 'active',
    } = req.query;

    const result = await packageService.getAllPackages({
      search,
      limit,
      page,
      sortBy,
      sortOrder,
      status,
    });

    res.status(200).json({message:"Packages retrieved successfully",result});
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};


// Controller to get a package by Id
const getPackageById = async(req,res)=>{
    try {
        const package =  await packageService.getPackageById(req.params.id)
        res.status(201).json({message:'Package retrieved successfully',package});
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

// Controller to delete a package by Id
const deletePackageById = async(req,res)=>{
    try {
    const result = await packageService.deletePackageById(req.params.id);
    res.status(200).json({message:'Package Deleted successfully',result});
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
}

module.exports = {
    upsertPackage,
    getAllPackages,
    getPackageById,
    deletePackageById
}