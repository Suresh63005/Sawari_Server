const router = require("express").Router();
const EarningController = require("../../../controllers/admin/earning.controller");
const { endPoints } = require("../../api");

router.get(
  endPoints.earning.earningsHistory,
  EarningController.earningsHistory
);
(router.get(endPoints.earning.singleDownload, EarningController.Download),
  router.get(endPoints.earning.downloadAll, EarningController.Download));

module.exports = router;
