const router=require("express").Router();
const EarningController = require("../../../controllers/admin/earning.controller");

router.get("/get-all-earnings-history",EarningController.earningsHistory);
router.get("/single-download/:id",EarningController.Download),
router.get("/download-all",EarningController.Download);

module.exports=router;