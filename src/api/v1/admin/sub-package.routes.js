const express = require('express');
const router = express.Router();
const subPackageController = require('../../../controllers/admin/subPackage.controller');

router.post("/upsert", subPackageController.upsertSubPackage);
router.get("/", subPackageController.getAllSubPackages);
router.get("/:id", subPackageController.getSubPackageById);
router.delete("/:id", subPackageController.deleteSubPackageById);
router.patch("/:id/status", subPackageController.toggleSubPackageStatus);

module.exports = router;