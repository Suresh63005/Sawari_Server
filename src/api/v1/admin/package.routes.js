const router = require("express").Router();
const packageController = require("../../../controllers/admin/package.controller");

router.post("/upsert", packageController.upsertPackage);
router.get("/", packageController.getAllPackages);
router.get("/active", packageController.getActivePackagesController);
router.get("/:id", packageController.getPackageById);
router.delete("/:id", packageController.deletePackageById);
router.patch("/:id/status", packageController.togglePackageStatus);

module.exports = router;