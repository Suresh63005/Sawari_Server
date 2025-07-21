const express = require('express');
const router = express.Router();
const subPackageController = require('../../../controllers/admin/subPackage.controller');

router.post("/upsert",subPackageController.upsertSubPackage);
router.get("/all",subPackageController.getAllSubPackages);
router.get("/:id",subPackageController.getSubPackageById);
router.delete("/:id",subPackageController.deleteSubPackageById);

module.exports = router;