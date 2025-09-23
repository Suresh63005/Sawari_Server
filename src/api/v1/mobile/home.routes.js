const router=require("express").Router();
const homeController=require("../../../controllers/mobile/home.controller")
const middleware=require("../../../middlewares/mobile/authMiddleware")

router.get("/dashboard", middleware.isAuthenticated, homeController.getAllHomeData);
router.post("/accept-ride", middleware.isAuthenticated, homeController.acceptRide);
router.patch("/toggle-status", middleware.isAuthenticated, homeController.toggleDriverStatus);

//Get ride details
router.get("/ride/:ride_id", middleware.isAuthenticated, homeController.getRideDetails);
//Update ride status
router.put("/ride/:ride_id", middleware.isAuthenticated, homeController.updateRideStatus);
////Get rides by status
router.get("/rides", middleware.isAuthenticated, homeController.getRidesByStatus);
router.post("/upsert-ride",middleware.isAuthenticated,homeController.upsertRide);
router.put("/release/:rideId",middleware.isAuthenticated,homeController.releaseDriverFromRide);
router.put("/start-ride/:rideId",middleware.isAuthenticated,homeController.startRide);
router.put("/end-ride/:rideId",middleware.isAuthenticated,homeController.endRide);
router.put("/cancel-ride",middleware.isAuthenticated,homeController.cancelRideController)
router.get("/my-rides",middleware.isAuthenticated,homeController.getMyRides)


router.get("/earnings-history",middleware.isAuthenticated,homeController.earningsHistory) // http://localhost:4445/api/v1/mobile/home/earnings-history?month=2025-07
module.exports=router