const router=require("express").Router();
const homeController=require("../../../controllers/mobile/home.controller")
const middleware=require("../../../middlewares/mobile/authMiddleware")

router.get("/dashboard", middleware.isAuthenticated, homeController.getAllHomeData);
router.post("/accept-ride", middleware.isAuthenticated, homeController.acceptRide);
router.patch("/toggle-status", middleware.isAuthenticated, homeController.toggleDriverStatus);

module.exports=router