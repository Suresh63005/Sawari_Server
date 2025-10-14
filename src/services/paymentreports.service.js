const PaymentReports = require("../models/payment-report.model");
const Driver = require("../models/driver.model");
const Ride = require("../models/ride.model");
const { Op } = require("sequelize");
const ExcelJS = require("exceljs");

const getAllPayments = async (
  search = "",
  status = "",
  page = 1,
  limit = 10
) => {
  const offset = (page - 1) * limit;
  const where = {};

  if (search) {
    where[Op.or] = [
      { transaction_id: { [Op.like]: `%${search}%` } },
      { notes: { [Op.like]: `%${search}%` } },
    ];
  }

  if (status && status !== "all") {
    where.status = status;
  }

  try {
    const { count, rows } = await PaymentReports.findAndCountAll({
      where,
      include: [
        {
          model: Driver,
          as: "Driver",
          attributes: ["first_name", "last_name", "email", "phone"],
        },
        {
          model: Ride,
          as: "Ride",
          attributes: ["customer_name", "ride_date", "status", "Total"],
        },
      ],
      limit,
      offset,
    });

    return {
      payments: rows,
      counts: {
        totalPayments: count,
        pending: await PaymentReports.count({ where: { status: "pending" } }),
        completed: await PaymentReports.count({
          where: { status: "completed" },
        }),
        failed: await PaymentReports.count({ where: { status: "failed" } }),
        totalAmount: (await PaymentReports.sum("amount")) || 0,
        totalCommission: (await PaymentReports.sum("commission")) || 0,
      },
    };
  } catch (error) {
    console.log(error, "error in getAllPayments");
    throw new Error("Failed to fetch payments: " + error.message);
  }
};

const getPaymentById = async (paymentId) => {
  try {
    const payment = await PaymentReports.findByPk(paymentId, {
      include: [
        {
          model: Driver,
          as: "driver",
          attributes: ["first_name", "last_name", "email", "phone"],
        },
        {
          model: Ride,
          as: "ride",
          attributes: ["customer_name", "ride_date", "status", "Total"],
        },
      ],
    });
    if (!payment) {
      throw new Error("Payment not found");
    }
    return payment;
  } catch (error) {
    console.log(error, "error in getPaymentById");
    throw new Error("Failed to fetch payment: " + error.message);
  }
};

const exportAllPayments = async (search = "", status = "") => {
  const where = {};

  if (search) {
    where[Op.or] = [
      { transaction_id: { [Op.like]: `%${search}%` } },
      { notes: { [Op.like]: `%${search}%` } },
    ];
  }

  if (status && status !== "all") {
    where.status = status;
  }

  try {
    const payments = await PaymentReports.findAll({
      where,
      include: [
        {
          model: Driver,
          as: "driver",
          attributes: ["first_name", "last_name"],
        },
        {
          model: Ride,
          as: "ride",
          attributes: ["customer_name", "ride_date"],
        },
      ],
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Payments");

    worksheet.columns = [
      { header: "Payment ID", key: "id", width: 36 },
      { header: "Driver Name", key: "driver_name", width: 20 },
      { header: "Driver Email", key: "driver_email", width: 25 },
      { header: "Driver Phone", key: "driver_phone", width: 15 },
      { header: "Customer Name", key: "customer_name", width: 20 },
      { header: "Ride Date", key: "ride_date", width: 20 },
      { header: "Amount", key: "amount", width: 15 },
      { header: "Commission", key: "commission", width: 15 },
      { header: "Payment Method", key: "payment_method", width: 15 },
      { header: "Transaction ID", key: "transaction_id", width: 25 },
      { header: "Payment Date", key: "payment_date", width: 20 },
      { header: "Status", key: "status", width: 15 },
      { header: "Notes", key: "notes", width: 30 },
    ];

    payments.forEach((payment) => {
      worksheet.addRow({
        id: payment.id,
        driver_name: payment.driver
          ? `${payment.driver.first_name} ${payment.driver.last_name}`
          : "-",
        driver_email: payment.driver ? payment.driver.email : "-",
        driver_phone: payment.driver ? payment.driver.phone : "-",
        customer_name: payment.ride ? payment.ride.customer_name : "-",
        ride_date:
          payment.ride && payment.ride.ride_date
            ? new Date(payment.ride.ride_date).toLocaleString()
            : "-",
        amount: payment.amount || 0,
        commission: payment.commission || 0,
        payment_method: payment.payment_method || "-",
        transaction_id: payment.transaction_id || "-",
        payment_date: payment.payment_date
          ? new Date(payment.payment_date).toLocaleString()
          : "-",
        status: payment.status || "-",
        notes: payment.notes || "-",
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  } catch (error) {
    console.log(error, "error in exportAllPayments");
    throw new Error("Failed to export payments: " + error.message);
  }
};

const exportPaymentById = async (paymentId) => {
  try {
    const payment = await getPaymentById(paymentId);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Payment");

    worksheet.columns = [
      { header: "Payment ID", key: "id", width: 36 },
      { header: "Driver Name", key: "driver_name", width: 20 },
      { header: "Driver Email", key: "driver_email", width: 25 },
      { header: "Driver Phone", key: "driver_phone", width: 15 },
      { header: "Customer Name", key: "customer_name", width: 20 },
      { header: "Ride Date", key: "ride_date", width: 20 },
      { header: "Amount", key: "amount", width: 15 },
      { header: "Commission", key: "commission", width: 15 },
      { header: "Payment Method", key: "payment_method", width: 15 },
      { header: "Transaction ID", key: "transaction_id", width: 25 },
      { header: "Payment Date", key: "payment_date", width: 20 },
      { header: "Status", key: "status", width: 15 },
      { header: "Notes", key: "notes", width: 30 },
    ];

    worksheet.addRow({
      id: payment.id,
      driver_name: payment.driver
        ? `${payment.driver.first_name} ${payment.driver.last_name}`
        : "-",
      driver_email: payment.driver ? payment.driver.email : "-",
      driver_phone: payment.driver ? payment.driver.phone : "-",
      customer_name: payment.ride ? payment.ride.customer_name : "-",
      ride_date:
        payment.ride && payment.ride.ride_date
          ? new Date(payment.ride.ride_date).toLocaleString()
          : "-",
      amount: payment.amount || 0,
      commission: payment.commission || 0,
      payment_method: payment.payment_method || "-",
      transaction_id: payment.transaction_id || "-",
      payment_date: payment.payment_date
        ? new Date(payment.payment_date).toLocaleString()
        : "-",
      status: payment.status || "-",
      notes: payment.notes || "-",
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  } catch (error) {
    console.log(error, "error in exportPaymentById");
    throw new Error("Failed to export payment: " + error.message);
  }
};

module.exports = {
  getAllPayments,
  getPaymentById,
  exportAllPayments,
  exportPaymentById,
};
