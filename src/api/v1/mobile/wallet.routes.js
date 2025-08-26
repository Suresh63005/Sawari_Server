const router=require("express").Router();
const walletController = require("../../../controllers/mobile/wallet.controller")
const middleware=require("../../../middlewares/mobile/authMiddleware")

router.post("/add-moneyyyy",middleware.isAuthenticated,walletController.addMoneyToWallet)
router.post("/verify-payment",middleware.isAuthenticated,walletController.verifyPayment)
router.get("/wallet-history",middleware.isAuthenticated,walletController.walletHistory)

module.exports=router