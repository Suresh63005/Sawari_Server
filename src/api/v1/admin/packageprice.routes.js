const express = require("express");
const router = express.Router();
const packagePriceController = require("../../../controllers/admin/packageprice.controller");

// Create or Update Package Price
router.post("/upsert", packagePriceController.upsertPackagePrice);

// Get All Package Prices
router.get("/", packagePriceController.getAllPackagePrices);

// Get Package Price by ID
router.get("/:id", packagePriceController.getPackagePriceById);

// Delete Package Price by ID
router.delete("/:id", packagePriceController.deletePackagePriceById);

// Toggle Package Price Status
router.patch("/:id/status", packagePriceController.togglePackagePriceStatus);

// Get Sub-Packages by Package ID
router.get("/sub-packages/:package_id", packagePriceController.getSubPackagesByPackageId);

module.exports = router;