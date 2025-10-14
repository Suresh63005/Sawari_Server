const request = require("supertest");
const sequelize = require("../../../src/config/db");
const http = require("http");
const { Driver, Settings } = require("../../../src/models");
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");

describe("GET /api/v1/mobile/settings/get-all-settings", () => {
  let driver, token, settings, server;

  beforeAll(async () => {
    server = http.createServer(require("../../../src/app")); // Initialize server with app
    await sequelize.authenticate(); // Ensure database connection
    await sequelize.sync({ force: true }); // Reset database schema
  });

  afterAll(async () => {
    await Settings.destroy({ where: {} });
    await Driver.destroy({ where: {} });
    await sequelize.close();
    server.close();
  });

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
      otp_count: 0,
      license_verification_status: "pending",
      emirates_verification_status: "pending",
      is_approved: false,
      availability_status: "available",
      ride_request: false,
      system_alerts: false,
      earning_updates: false,
      ride_count: 0,
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

    settings = await Settings.create({
      id: uuidv4(),
      about_us: "About us content",
      terms_conditions: "Terms and conditions content",
      privacy_policy: "Privacy policy content",
      contact_email: `contact${uniqueSuffix}@example.com`,
      contact_phone: `+971555${uniqueSuffix}`,
      tax_rate: 5.0,
      min_wallet_percentage: 10.0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  afterEach(async () => {
    await Settings.destroy({ where: {} });
    await Driver.destroy({ where: {} });
  });

  it("should fetch settings successfully for a valid driver", async () => {
    const response = await request(server)
      .get("/api/v1/mobile/settings/get-all-settings")
      .set("Authorization", `Bearer ${token}`)
      .set("Accept", "application/json");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("settings fetched sucessfully!");
    expect(response.body.data).toHaveProperty("about_us", settings.about_us);
    expect(response.body.data).toHaveProperty(
      "terms_conditions",
      settings.terms_conditions
    );
    expect(response.body.data).toHaveProperty(
      "privacy_policy",
      settings.privacy_policy
    );
    expect(response.body.data).toHaveProperty(
      "contact_email",
      settings.contact_email
    );
    expect(response.body.data).toHaveProperty(
      "contact_phone",
      settings.contact_phone
    );
    expect(response.body.data).toHaveProperty("tax_rate", settings.tax_rate);
    expect(response.body.data).toHaveProperty(
      "min_wallet_percentage",
      settings.min_wallet_percentage
    );
  }, 20000);

  it("should return 404 if settings are not found", async () => {
    await Settings.destroy({ where: {} });
    const response = await request(server)
      .get("/api/v1/mobile/settings/get-all-settings")
      .set("Authorization", `Bearer ${token}`)
      .set("Accept", "application/json");

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Settings not found");
  }, 20000);

  it("should return 401 if no token is provided", async () => {
    const response = await request(server)
      .get("/api/v1/mobile/settings/get-all-settings")
      .set("Accept", "application/json");

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Unauthorized: No token provided");
  }, 20000);

  it("should return 401 if driver_id is missing in token", async () => {
    const invalidToken = jwt.sign({}, process.env.JWT_SECRET || "TEST-SECRET", {
      expiresIn: "1h",
    });

    const response = await request(server)
      .get("/api/v1/mobile/settings/get-all-settings")
      .set("Authorization", `Bearer ${invalidToken}`)
      .set("Accept", "application/json");

    expect(response.status).toBe(401);
    expect(response.body.message).toBe(
      "Invalid or blocked account - Driver not found"
    );
  }, 20000);

  it("should return 401 if driver_id is invalid", async () => {
    const invalidToken = jwt.sign(
      { id: uuidv4() },
      process.env.JWT_SECRET || "TEST-SECRET",
      { expiresIn: "1h" }
    );

    const response = await request(server)
      .get("/api/v1/mobile/settings/get-all-settings")
      .set("Authorization", `Bearer ${invalidToken}`)
      .set("Accept", "application/json");

    expect(response.status).toBe(401);
    expect(response.body.message).toBe(
      "Invalid or blocked account - Driver not found"
    );
  }, 20000);

  it("should return 500 if database query fails", async () => {
    jest.spyOn(Settings, "findOne").mockImplementation(() => {
      throw new Error("Database error");
    });

    const response = await request(server)
      .get("/api/v1/mobile/settings/get-all-settings")
      .set("Authorization", `Bearer ${token}`)
      .set("Accept", "application/json");

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Internal Server Error");

    jest.spyOn(Settings, "findOne").mockRestore();
  }, 20000);

  it("should handle missing settings attributes gracefully", async () => {
    await Settings.destroy({ where: {} });
    await Settings.create({
      id: uuidv4(),
      about_us: null,
      terms_conditions: null,
      privacy_policy: null,
      contact_email: null,
      contact_phone: null,
      tax_rate: null,
      min_wallet_percentage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await request(server)
      .get("/api/v1/mobile/settings/get-all-settings")
      .set("Authorization", `Bearer ${token}`)
      .set("Accept", "application/json");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("settings fetched sucessfully!");
    expect(response.body.data).toHaveProperty("about_us", null);
    expect(response.body.data).toHaveProperty("terms_conditions", null);
    expect(response.body.data).toHaveProperty("privacy_policy", null);
    expect(response.body.data).toHaveProperty("contact_email", null);
    expect(response.body.data).toHaveProperty("contact_phone", null);
    expect(response.body.data).toHaveProperty("tax_rate", null);
    expect(response.body.data).toHaveProperty("min_wallet_percentage", null);
  }, 20000);

  it("should return first settings record if multiple exist", async () => {
    await Settings.create({
      id: uuidv4(),
      about_us: "Second settings content",
      terms_conditions: "Second terms",
      privacy_policy: "Second policy",
      contact_email: `second${Date.now()}@example.com`,
      contact_phone: `+971555${Date.now() + 1}`,
      tax_rate: 7.0,
      min_wallet_percentage: 15.0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await request(server)
      .get("/api/v1/mobile/settings/get-all-settings")
      .set("Authorization", `Bearer ${token}`)
      .set("Accept", "application/json");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("settings fetched sucessfully!");
    expect(response.body.data).toHaveProperty("about_us", settings.about_us);
    expect(response.body.data).toHaveProperty(
      "terms_conditions",
      settings.terms_conditions
    );
    expect(response.body.data).toHaveProperty(
      "contact_email",
      settings.contact_email
    );
  }, 20000);
});
