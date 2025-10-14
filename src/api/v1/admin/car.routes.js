const router = require("express").Router();
const carController = require("../../../controllers/admin/car.controller");
const { upload } = require("../../../utils/multer");
const { endPoints } = require("../../api");

// Routes for car operations
router.post(
  endPoints.car.upsertCar,
  upload.single("image"),
  carController.upsertCar
);
router.get(endPoints.car.getAllCars, carController.getAllCars);
router.get(
  endPoints.car.getCarsForList,
  carController.getCarsForListController
);
router.get(endPoints.car.getCarById, carController.getCarById);
router.delete(endPoints.car.deleteCarById, carController.deleteCarById);
router.patch(endPoints.car.toggleCarStatus, carController.toggleCarStatus);
router.get(
  endPoints.car.getCarsBySubPackageId,
  carController.getCarsBySubPackageId
);

module.exports = router;
