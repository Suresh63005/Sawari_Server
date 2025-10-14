const router = require("express").Router();
const subPackageController = require("../../../controllers/admin/subPackage.controller");
const { endPoints } = require("../../api");

router.post(
  endPoints["sub-package"].upsertSubPackage,
  subPackageController.upsertSubPackage
);
router.get(
  endPoints["sub-package"].getAllSubPackages,
  subPackageController.getAllSubPackages
);
router.get(
  endPoints["sub-package"].getActiveSubPackages,
  subPackageController.getActiveSubPackagesController
);
router.get(
  endPoints["sub-package"].getSubPackageById,
  subPackageController.getSubPackageById
);
router.delete(
  endPoints["sub-package"].deleteSubPackageById,
  subPackageController.deleteSubPackageById
);
router.patch(
  endPoints["sub-package"].toggleSubPackageStatus,
  subPackageController.toggleSubPackageStatus
);
router.get(
  endPoints["sub-package"].getSubPackagesByPackageId,
  subPackageController.getSubPackagesByPackageId
);

module.exports = router;
