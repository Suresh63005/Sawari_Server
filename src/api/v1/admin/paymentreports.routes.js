const router = require("express").Router();
const {
  getAllPaymentsController,
  getPaymentByIdController,
  exportAllPaymentsController,
  exportPaymentByIdController,
} = require("../../../controllers/admin/paymentreports.controller");
const { endPoints } = require("../../api");

router.get(endPoints.paymentreports.getAllPayments, getAllPaymentsController);
router.get(
  endPoints.paymentreports.exportAllPayments,
  exportAllPaymentsController
);
router.get(
  endPoints.paymentreports.exportPaymentById,
  exportPaymentByIdController
);
router.get(endPoints.paymentreports.getPaymentById, getPaymentByIdController);

module.exports = router;
