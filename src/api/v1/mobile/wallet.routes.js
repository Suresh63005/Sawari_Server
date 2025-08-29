const router=require("express").Router();
const walletController = require("../../../controllers/mobile/wallet.controller")
const middleware=require("../../../middlewares/mobile/authMiddleware")

router.post("/add-money",middleware.isAuthenticated,walletController.addMoneyToWallet)
router.post("/verify-payment",middleware.isAuthenticated,walletController.verifyPayment)
router.get("/wallet-history",middleware.isAuthenticated,walletController.walletHistory)
router.get("/wallet-balance",middleware.isAuthenticated,walletController.myWalletBalance)

module.exports=router