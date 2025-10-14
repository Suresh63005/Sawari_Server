const router = require("express").Router();
const packageController = require("../../../controllers/mobile/package.controller");
const authMiddleware = require("../../../middlewares/mobile/authMiddleware");
const { endPoints } = require("../../api");

router.get(
  endPoints["mob-package"].getAllPackages,
  authMiddleware.isAuthenticated,
  packageController.getAllPackages
);
router.get(
  endPoints["mob-package"].getAllCarsBySubPackageId,
  authMiddleware.isAuthenticated,
  packageController.getAllCarsBySubPackageId
);
router.get(
  endPoints["mob-package"].getSubPackagesByPackageId,
  authMiddleware.isAuthenticated,
  packageController.getSubPackagesByPackageId
);
router.get(
  endPoints["mob-package"].getPrice,
  authMiddleware.isAuthenticated,
  packageController.getPrice
);
router.get(
  endPoints["mob-package"].getAllCars,
  authMiddleware.isAuthenticated,
  packageController.getAllCars
);

module.exports = router;
