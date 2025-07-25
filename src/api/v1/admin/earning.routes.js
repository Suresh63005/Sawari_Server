const router=require("express").Router();
const EarningController = require("../../../controllers/admin/earning.controller")

router.get("/get-all-earnings-history",EarningController.earningsHistory);
module.exports=router