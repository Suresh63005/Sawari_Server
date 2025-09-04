const CarService = require("../../services/car.service");
const PackageService = require("../../services/package.service");
const SubPackageService = require("../../services/subPackage.service");
const PackagePriceService = require("../../services/packageprice.service");


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
        if(!subPackages ||!subPackages.data || subPackages.data.length===0){
            return res.status(404).json({message:"No sub-packages found for this package"})
        }
        return res.status(200).json({message:"Sub-packages fetched successfully",data:subPackages})
    } catch (error) {
        console.error("Error in getSubPackagesByPackageId:", error);
        return res.status(500).json({message:error.message})
    }
};

// controller to get all cars
const getAllCarsBySubPackageId = async (req, res) => {
  try {
    const {sub_package_id } = req.params;
    if(!sub_package_id){
      return res.status(400).json({message:"Sub-Package ID is required"})
    }

    const cars = await CarService.getCarsBySubPackageId(sub_package_id);

    if (!cars || cars.length === 0) {
      return res.status(404).json({ message: "No cars found with this sub-package" });
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

// Fetch Price by package_id, sub_package_id, car_id
const getPrice = async (req, res) => {
  const { package_id, sub_package_id, car_id } = req.params;

  try {
    const price = await PackagePriceService.getPrice(package_id, sub_package_id, car_id);
    return res.status(200).json({ message: "Price fetched successfully", data: price });
  } catch (error) {
    console.error("Error in getPrice:", error);
    return res.status(500).json({ message: error.message });
  }
};

// Fetch all cars
const getAllCars = async (req, res) => {
  try {
    const cars = await CarService.getAllCars(req.query);
    return res.status(200).json({ message: "Cars fetched successfully", data: cars });
  } catch (error) {
    console.error("Error in getAllCars:", error);
    return res.status(500).json({ message: error.message });
  }
};

module.exports={
    getAllPackages,
    getSubPackagesByPackageId,
    getAllCarsBySubPackageId,
    getPrice,   
    getAllCars
};
