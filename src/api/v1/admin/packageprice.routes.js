const router = require("express").Router();
const packagePriceController = require("../../../controllers/admin/packageprice.controller");
const { endPoints } = require("../../api");

router.post(
  endPoints.packageprice.upsertPackagePrice,
  packagePriceController.upsertPackagePrice
);
router.get(
  endPoints.packageprice.getAllPackagePrices,
  packagePriceController.getAllPackagePrices
);
router.get(
  endPoints.packageprice.getPackagePriceById,
  packagePriceController.getPackagePriceById
);
router.delete(
  endPoints.packageprice.deletePackagePriceById,
  packagePriceController.deletePackagePriceById
);
router.patch(
  endPoints.packageprice.togglePackagePriceStatus,
  packagePriceController.togglePackagePriceStatus
);
router.get(
  endPoints.packageprice.getSubPackagesByPackageId,
  packagePriceController.getSubPackagesByPackageId
);

module.exports = router;
