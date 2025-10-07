const {
  getAllPayments,
  getPaymentById,
  exportAllPayments,
  exportPaymentById,
} = require("../../services/paymentreports.service");

const getAllPaymentsController = async (req, res) => {
  try {
    const { search = "", status = "", page = 1, limit = 10 } = req.query;
    const data = await getAllPayments(search, status, parseInt(page), parseInt(limit));
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
    console.log(error, "error in getAllPaymentsController");
  }
};

const getPaymentByIdController = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const payment = await getPaymentById(paymentId);
    res.status(200).json({ success: true, data: payment });
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
    console.log(error, "error in getPaymentByIdController");
  }
};


const exportAllPaymentsController = async (req, res) => {
  try {
    const { search = "", status = "" } = req.query;
    const buffer = await exportAllPayments(search, status);
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=All_Payment_Reports.xlsx"
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
    console.log(error, "error in exportAllPaymentsController");
  }
};

const exportPaymentByIdController = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const buffer = await exportPaymentById(paymentId);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Payment_Report_${paymentId}.xlsx`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.send(buffer);
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
    console.log(error, "error in exportPaymentByIdController");
  }
};

module.exports = {
  getAllPaymentsController,
  getPaymentByIdController,
  exportAllPaymentsController,
  exportPaymentByIdController,
};