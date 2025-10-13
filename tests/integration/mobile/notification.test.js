const request = require("supertest");
const sequelize = require("../../../src/config/db");
const app = require("../../../src/app");
const { Driver, Notifications } = require("../../../src/models");
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");

describe("GET /api/v1/mobile/notification/notifications", () => {
  let driver, token;

  // Runs once before all tests to sync the database
  beforeAll(async () => {
    await sequelize.sync({ force: true }); // Sync the DB schema
  });

  // Runs once after all tests to close the DB connection
  afterAll(async () => {
    await sequelize.close();
  });

  // Runs before each test to create a new driver and generate JWT token
  beforeEach(async () => {
    const uniqueSuffix = Date.now();

    driver = await Driver.create({
      id: uuidv4(),
      first_name: "John",
      last_name: "Doe",
      email: `john${uniqueSuffix}@example.com`,
      phone: `+9712345678${uniqueSuffix}`,
      status: "active",
      wallet_balance: 100,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    token = jwt.sign({ id: driver.id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
  });

  // Runs after each test to clean up the data
  afterEach(async () => {
    await Notifications.destroy({ where: {} });
    await Driver.destroy({ where: {} });
  });

  it("should fetch notifications successfully for an authenticated driver", async () => {
    // Create notifications and associate them with the driver (using driverId)
    await Notifications.bulkCreate([
      {
        id: uuidv4(),
        title: "New Ride",
        message: "Ride assigned to you",
        user_id: driver.id, // Associate the notification with the driver
        createdAt: new Date("2025-07-15T10:00:00Z"),
        updatedAt: new Date("2025-07-15T10:00:00Z"),
      },
      {
        id: uuidv4(),
        title: "New payment",
        message: "Payment received",
        user_id: driver.id, // Associate the notification with the driver
        createdAt: new Date("2025-07-15T10:00:00Z"),
        updatedAt: new Date("2025-07-15T10:00:00Z"),
      },
    ]);

    const response = await request(app)
      .get("/api/v1/mobile/notification/notifications")
      .set("Authorization", `Bearer ${token}`)
      .set("Accept", "application/json");

    // Check if the response is correct
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("Notifications fetched successfully");
    expect(response.body.data).toHaveLength(2);
    expect(response.body.data[0]).toHaveProperty(
      "message",
      "Ride assigned to you"
    ); // Newest notification first
    expect(response.body.data[1]).toHaveProperty("message", "Payment received"); // Older notification second
  });

  it("should return 401 if no token is provided", async () => {
    const response = await request(app)
      .get("/api/v1/mobile/notification/notifications")
      .set("Accept", "application/json");

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Unauthorized: No token provided");
  });

  it("should return 401 if driver_id is missing in token", async () => {
    const invalidToken = jwt.sign({}, process.env.JWT_SECRET || "TEST-SECRET", {
      expiresIn: "1h",
    });

    const response = await request(app)
      .get("/api/v1/mobile/notification/notifications")
      .set("Authorization", `Bearer ${invalidToken}`)
      .set("Accept", "application/json");

    expect(response.status).toBe(401);
    expect(response.body.message).toBe(
      "Invalid or blocked account - Driver not found"
    );
  });

  it("should handle no notifications for the driver", async () => {
    const response = await request(app)
      .get("/api/v1/mobile/notification/notifications")
      .set("Authorization", `Bearer ${token}`)
      .set("Accept", "application/json");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("Notifications fetched successfully");
    expect(response.body.data).toEqual([]);
  });

  it("should return 500 if database query fails", async () => {
    jest.spyOn(Notifications, "findAll").mockImplementation(() => {
      throw new Error("Database error");
    });

    const response = await request(app)
      .get("/api/v1/mobile/notification/notifications")
      .set("Authorization", `Bearer ${token}`)
      .set("Accept", "application/json");

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Failed to fetch notifications");

    jest.spyOn(Notifications, "findAll").mockRestore();
  });

  it("should handle invalid user_id gracefully", async () => {
    // Create a token with an invalid driver ID
    const invalidDriverId = uuidv4();
    const invalidToken = jwt.sign(
      { id: invalidDriverId },
      process.env.JWT_SECRET || "TEST-SECRET",
      {
        expiresIn: "1h",
      }
    );

    const response = await request(app)
      .get("/api/v1/mobile/notification/notifications")
      .set("Authorization", `Bearer ${invalidToken}`)
      .set("Accept", "application/json");

    expect(response.status).toBe(401);
    expect(response.body.message).toBe(
      "Invalid or blocked account - Driver not found"
    );
  });
});
