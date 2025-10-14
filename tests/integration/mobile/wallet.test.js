const request = require("supertest");
const app = require("../../../src/app");
const { Driver, WalletReports } = require("../../../src/models");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const sequelize = require("../../../src/config/db");
const crypto = require("crypto");

// Mock Razorpay
jest.mock("razorpay", () => {
  return jest.fn().mockImplementation(() => ({
    orders: {
      create: jest.fn().mockImplementation((options) => ({
        id: `order_${Date.now()}`,
        amount: options.amount,
        currency: options.currency,
        receipt: options.receipt,
        status: "created",
      })),
    },
  }));
});

describe("Wallet API", () => {
  let driver, token;

  beforeAll(async () => {
    await sequelize.sync({ force: true, logging: console.log });
    const tables = await sequelize.query(
      "SELECT name FROM sqlite_master WHERE type='table';"
    );
    console.log("Tables in database:", tables[0]);
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    try {
      await sequelize.query("DELETE FROM WalletReports;", { silent: true });
      await sequelize.query("DELETE FROM Drivers;", { silent: true });
      await sequelize.query(
        "DELETE FROM sqlite_sequence WHERE name IN ('Driver', 'WalletReport');",
        { silent: true }
      );
    } catch (error) {
      console.error("BeforeEach cleanup error:", error);
    }

    const uniqueSuffix = Date.now();
    driver = await Driver.create({
      id: uuidv4(),
      first_name: "John",
      last_name: "Doe",
      email: `john${uniqueSuffix}@example.com`,
      phone: `+971912345678${uniqueSuffix}`,
      status: "active",
      wallet_balance: 100,
      ride_count: 0,
      availability_status: "online",
      password: "testpassword",
      social_login: "google",
      last_login: new Date(),
      is_active: true,
      is_verified: true,
      document_check_count: 0,
      credit_ride_count: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    token = jwt.sign(
      { id: driver.id },
      process.env.JWT_SECRET || "TEST-SECRET",
      { expiresIn: "1h" }
    );
  });

  afterEach(async () => {
    try {
      await sequelize.query("DELETE FROM WalletReports;", { silent: true });
      await sequelize.query("DELETE FROM Drivers;", { silent: true });
      await sequelize.query(
        "DELETE FROM sqlite_sequence WHERE name IN ('Driver', 'WalletReport');",
        { silent: true }
      );
    } catch (error) {
      console.error("AfterEach cleanup error:", error);
    }
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe("POST /api/v1/mobile/wallet/add-money", () => {
    it("should create a Razorpay order successfully", async () => {
      const data = { amount: 500 };
      const response = await request(app)
        .post("/api/v1/mobile/wallet/add-money")
        .set("Authorization", `Bearer ${token}`)
        .set("Accept", "application/json")
        .send(data);

      console.log(
        "Add money response:",
        JSON.stringify(response.body, null, 2)
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Razorpay order created");
      expect(response.body.data).toMatchObject({
        id: expect.any(String),
        amount: 50000, // Razorpay expects paise
        currency: "INR",
        receipt: expect.any(String),
        status: "created",
      });
      expect(response.body.generated_signature).toBeDefined();
    });

    it("should return 401 if no token is provided", async () => {
      const data = { amount: 500 };
      const response = await request(app)
        .post("/api/v1/mobile/wallet/add-money")
        .set("Accept", "application/json")
        .send(data);

      console.log("No token response:", JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Unauthorized: No token provided");
    });

    it("should return 401 if invalid token", async () => {
      const invalidToken = jwt.sign({}, "invalid-secret");
      const data = { amount: 500 };
      const response = await request(app)
        .post("/api/v1/mobile/wallet/add-money")
        .set("Authorization", `Bearer ${invalidToken}`)
        .set("Accept", "application/json")
        .send(data);

      console.log(
        "Invalid token response:",
        JSON.stringify(response.body, null, 2)
      );

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Unauthorized: Invalid token");
    });

    it("should return 400 if amount is missing", async () => {
      const response = await request(app)
        .post("/api/v1/mobile/wallet/add-money")
        .set("Authorization", `Bearer ${token}`)
        .set("Accept", "application/json")
        .send({});

      console.log(
        "Missing amount response:",
        JSON.stringify(response.body, null, 2)
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Invalid amount");
    });

    it("should return 400 if amount is negative", async () => {
      const data = { amount: -100 };
      const response = await request(app)
        .post("/api/v1/mobile/wallet/add-money")
        .set("Authorization", `Bearer ${token}`)
        .set("Accept", "application/json")
        .send(data);

      console.log(
        "Negative amount response:",
        JSON.stringify(response.body, null, 2)
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Invalid amount");
    });

    // tests/integration/mobile/wallet.test.js, line ~174
    it("should handle edge case: Razorpay order creation failure", async () => {
      const data = { amount: 500 };
      jest.mock("razorpay", () => ({
        orders: {
          create: jest.fn().mockRejectedValue(new Error("Razorpay error")),
        },
      }));

      const response = await request(app)
        .post("/api/v1/mobile/wallet/add-money")
        .set("Authorization", `Bearer ${token}`)
        .set("Accept", "application/json")
        .send(data);

      console.log(
        "Razorpay failure response:",
        JSON.stringify(response.body, null, 2)
      );

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Razorpay order creation failed");
    });
  });

  describe("POST /api/v1/mobile/wallet/verify-payment", () => {
    let orderId, paymentId, amount, signature;

    beforeEach(() => {
      orderId = `order_${Date.now()}`;
      paymentId = `pay_${Date.now()}`;
      amount = 500;
      signature = crypto
        .createHmac("sha256", process.env.KEY_SECRET || "TEST-SECRET")
        .update(`${orderId}|${paymentId}`)
        .digest("hex");
    });

    // tests/integration/mobile/wallet.test.js, line ~209
    it("should verify payment and update wallet successfully", async () => {
      const data = {
        order_id: orderId,
        payment_id: paymentId,
        signature,
        amount,
      };
      const response = await request(app)
        .post("/api/v1/mobile/wallet/verify-payment")
        .set("Authorization", `Bearer ${token}`)
        .set("Accept", "application/json")
        .send(data);

      console.log(
        "Verify payment response:",
        JSON.stringify(response.body, null, 2)
      );

      const updatedDriver = await Driver.findByPk(driver.id);
      const walletReport = await WalletReports.findOne({
        where: { driver_id: driver.id },
      });
      console.log(
        "Wallet report:",
        walletReport ? walletReport.toJSON() : null
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Payment verified and wallet updated");
      expect(updatedDriver).not.toBeNull();
      expect(updatedDriver.wallet_balance).toBe(600); // 100 + 500
      expect(walletReport).not.toBeNull();
      if (walletReport) {
        expect(walletReport).toMatchObject({
          driver_id: driver.id,
          transaction_type: "credit",
          amount: "500.00",
          balance_after: "600.00",
          description: `Wallet top-up via Razorpay. Order: ${orderId}`,
          status: "completed",
        });
      }
    });

    // tests/integration/mobile/wallet.test.js, line ~235
    it("should return 401 if no token is provided", async () => {
      const data = {
        order_id: orderId,
        payment_id: paymentId,
        signature,
        amount,
      };
      const response = await request(app)
        .post("/api/v1/mobile/wallet/verify-payment")
        .set("Accept", "application/json")
        .send(data);

      console.log("No token response:", JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Unauthorized: No token provided"); // Updated
    });

    // tests/integration/mobile/wallet.test.js, line ~134
    it("should return 401 if invalid token", async () => {
      const invalidToken = jwt.sign({}, "invalid-secret");
      const data = {
        order_id: orderId,
        payment_id: paymentId,
        signature,
        amount,
      };
      const response = await request(app)
        .post("/api/v1/mobile/wallet/verify-payment")
        .set("Authorization", `Bearer ${invalidToken}`)
        .set("Accept", "application/json")
        .send(data);

      console.log(
        "Invalid token response:",
        JSON.stringify(response.body, null, 2)
      );

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Unauthorized: Invalid token");
    });

    it("should return 400 if required fields are missing", async () => {
      const data = { order_id: orderId, payment_id: paymentId }; // Missing signature, amount
      const response = await request(app)
        .post("/api/v1/mobile/wallet/verify-payment")
        .set("Authorization", `Bearer ${token}`)
        .set("Accept", "application/json")
        .send(data);

      console.log(
        "Missing fields response:",
        JSON.stringify(response.body, null, 2)
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Missing required fields");
    });

    it("should return 401 if invalid signature", async () => {
      const data = {
        order_id: orderId,
        payment_id: paymentId,
        signature: "invalid",
        amount,
      };
      const response = await request(app)
        .post("/api/v1/mobile/wallet/verify-payment")
        .set("Authorization", `Bearer ${token}`)
        .set("Accept", "application/json")
        .send(data);

      console.log(
        "Invalid signature response:",
        JSON.stringify(response.body, null, 2)
      );

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Invalid signature");
    });

    // tests/integration/mobile/wallet.test.js, line ~289
    it("should handle edge case: driver not found", async () => {
      jest
        .spyOn(require("../../../src/services/driver.service"), "getDriverById")
        .mockResolvedValueOnce(null);
      try {
        await sequelize.query("DELETE FROM Drivers WHERE id = :id", {
          replacements: { id: driver.id },
          silent: true,
        });
        await sequelize.query(
          "DELETE FROM sqlite_sequence WHERE name = 'Driver'",
          { silent: true }
        );
      } catch (error) {
        console.warn(
          "Skipping driver deletion due to missing table:",
          error.message
        );
      }
      const data = {
        order_id: orderId,
        payment_id: paymentId,
        signature,
        amount,
      };
      const response = await request(app)
        .post("/api/v1/mobile/wallet/verify-payment")
        .set("Authorization", `Bearer ${token}`)
        .set("Accept", "application/json")
        .send(data);

      console.log(
        "Driver not found response:",
        JSON.stringify(response.body, null, 2)
      );

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Internal server error");
      expect(response.body.error).toBe("Failed to update driver balance");
    });

    // tests/integration/mobile/wallet.test.js, line ~306
    it("should handle edge case: database transaction failure", async () => {
      jest
        .spyOn(Driver, "findByPk")
        .mockRejectedValueOnce(new Error("Database error"));
      const data = {
        order_id: orderId,
        payment_id: paymentId,
        signature,
        amount,
      };
      const response = await request(app)
        .post("/api/v1/mobile/wallet/verify-payment")
        .set("Authorization", `Bearer ${token}`)
        .set("Accept", "application/json")
        .send(data);

      console.log(
        "Transaction failure response:",
        JSON.stringify(response.body, null, 2)
      );

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Internal server error");
      expect(response.body.error).toBe("Failed to update driver balance");
    });
  });
});
