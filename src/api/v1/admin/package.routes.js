const router = require("express").Router();
const packageController = require("../../../controllers/admin/package.controller");
const { endPoints } = require("../../api");

router.post(endPoints.package.upsertPackage, packageController.upsertPackage);
router.get(endPoints.package.getAllPackages, packageController.getAllPackages);
router.get(
  endPoints.package.getActivePackages,
  packageController.getActivePackagesController
);
router.get(endPoints.package.getPackageById, packageController.getPackageById);
router.delete(
  endPoints.package.deletePackageById,
  packageController.deletePackageById
);
router.patch(
  endPoints.package.togglePackageStatus,
  packageController.togglePackageStatus
);

module.exports = router;
