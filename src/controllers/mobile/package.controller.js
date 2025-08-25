const CarService = require("../../services/car.service");
const PackageService = require("../../services/package.service");
const SubPackageService = require("../../services/subPackage.service");


// controller to get all packages
const getAllPackages = async(req,res)=>{

    try {
        const packages=await PackageService.getAllPackages(req.query);
        if(!packages || packages.length===0){
            return res.status(404).json({message:"No packages found"})
        }
        return res.status(200).json({message:"Packages fetched successfully",data:packages})
    } catch (error) {
        console.error("Error in getAllPackages:", error);
        return res.status(500).json({message:error.message})
    }
};

// controller to get sub-packages by package id
const getSubPackagesByPackageId=async(req,res)=>{

    const {package_id}=req.params;
    if(!package_id){
        return res.status(400).json({message:"Package ID is required"})
    }

    try {
        const subPackages=await SubPackageService.getSubPackagesByPackageId(package_id);
        if(!subPackages || subPackages.length===0){
            return res.status(404).json({message:"No sub-packages found for this package"})
        }
        return res.status(200).json({message:"Sub-packages fetched successfully",data:subPackages})
    } catch (error) {
        console.error("Error in getSubPackagesByPackageId:", error);
        return res.status(500).json({message:error.message})
    }
};

// controller to get all cars
const getAllCars = async (req, res) => {
  try {
    const { search, limit, page, sortBy, sortOrder, status } = req.query;

    const cars = await CarService.getAllCars({
      search,
      limit,
      page,
      sortBy,
      sortOrder,
      status,
    });

    if (!cars || cars.data.length === 0) {
      return res.status(404).json({ message: "No cars found" });
    }

    return res.status(200).json({
      message: "Cars fetched successfully",
      data: cars,
    });
  } catch (error) {
    console.error("Error in getAllCars:", error);
    return res.status(500).json({ message: error.message });
  }
};


module.exports={
    getAllPackages,
    getSubPackagesByPackageId,
    getAllCars
};
