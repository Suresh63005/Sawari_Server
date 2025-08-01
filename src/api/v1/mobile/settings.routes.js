const router=require("express").Router();
const settingController = require("../../../controllers/mobile/settings.controller")
const middleware=require("../../../middlewares/mobile/authMiddleware")

router.get("/get-all-settings",middleware.isAuthenticated,settingController.getAllSettings)
module.exports=router