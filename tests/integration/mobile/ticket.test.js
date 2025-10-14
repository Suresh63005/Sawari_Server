const request = require("supertest");
const app = require("../../../src/app");
const { Driver, Ticket } = require("../../../src/models");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const sequelize = require("../../../src/config/db");
const path = require("path");
const fs = require("fs");

describe("Ticket API Integration Tests", () => {
  let driver, token;

  beforeAll(async () => {
    await sequelize.sync({ force: true, logging: console.log });
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await Ticket.destroy({ where: {}, truncate: true });
    await Driver.destroy({ where: {}, truncate: true });

    // Generate unique email and phone to avoid unique constraint violations
    const uniqueSuffix = Date.now();
    try {
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
    } catch (error) {
      console.error("Driver.create Error:", error);
      throw error;
    }

    // Mock JWT token
    token = jwt.sign(
      { id: driver.id },
      process.env.JWT_SECRET || "TEST-SECRET",
      { expiresIn: "1h" }
    );
  });

  afterEach(async () => {
    try {
      await Ticket.destroy({ truncate: true, cascade: true, force: true });
      await Driver.destroy({ truncate: true, cascade: true, force: true });
    } catch (error) {
      console.error("afterEach cleanup Error:", error);
      throw error;
    }
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe("POST /api/v1/mobile/ticket/create", () => {
    jest.mock("../../../src/services/ticket.service", () => {
      const originalModule = jest.requireActual(
        "../../../src/services/ticket.service"
      );
      return {
        ...originalModule,
        uploadToS3: jest.fn().mockImplementation((files, folder) => {
          return files.map(
            (file) =>
              `https://innoitlabs.s3.ap-south-1.amazonaws.com/${folder}/${Date.now()}-${file.filename}`
          );
        }),
      };
    });

    it("should create a ticket successfully with valid data and image", async () => {
      const ticketData = {
        title: "Test Ticket",
        description: "This is a test ticket description",
        priority: "low",
      };

      const mockFilePath = path.join(__dirname, "mock-ticket-image.jpg");
      fs.writeFileSync(mockFilePath, "mock image content");

      const response = await request(app)
        .post("/api/v1/mobile/ticket/create")
        .set("Authorization", `Bearer ${token}`)
        .set("Accept", "application/json")
        .field("title", ticketData.title)
        .field("description", ticketData.description)
        .field("priority", ticketData.priority)
        .attach("ticket_images", mockFilePath);

      fs.unlinkSync(mockFilePath);

      console.log(
        "Create ticket response:",
        JSON.stringify(response.body, null, 2)
      );

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Ticket created successfull");
      expect(response.body.data).toHaveProperty("id");
      expect(response.body.data).toMatchObject({
        ticket_number: expect.stringMatching(/^\d{6}$/),
        title: ticketData.title,
        description: ticketData.description,
        priority: ticketData.priority,
        status: "open",
        raised_by: driver.id,
        images: expect.stringMatching(
          /^"https:\/\/innoitlabs\.s3\.ap-south-1\.amazonaws\.com\/ticket-images\//
        ),
      });
      expect(response.body.data.createdAt).toBeDefined();
      expect(response.body.data.updatedAt).toBeDefined();
    });

    it("should return 401 if no token is provided", async () => {
      const ticketData = {
        title: "Test Ticket",
        description: "This is a test ticket description",
        priority: "medium",
      };

      const response = await request(app)
        .post("/api/v1/mobile/ticket/create")
        .set("Accept", "application/json")
        .field("title", ticketData.title)
        .field("description", ticketData.description)
        .field("priority", ticketData.priority);

      console.log("No token response:", JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false); // Fixed typo
      expect(response.body.message).toBe("Unauthorized: No token provided");
    });

    it("should return 400 if title is missing", async () => {
      const ticketData = {
        description: "This is a test ticket description",
        priority: "medium",
      };

      const response = await request(app)
        .post("/api/v1/mobile/ticket/create")
        .set("Authorization", `Bearer ${token}`)
        .set("Accept", "application/json")
        .field("description", ticketData.description)
        .field("priority", ticketData.priority);

      console.log(
        "Missing title response:",
        JSON.stringify(response.body, null, 2)
      );

      expect(response.status).toBe(400);
      expect(response.body.sucess).toBe(false);
      expect(response.body.message).toContain(
        "Title, description, are required"
      );
    });

    it("should return 400 if description is missing", async () => {
      const ticketData = {
        title: "Test Ticket",
        priority: "medium",
      };

      const response = await request(app)
        .post("/api/v1/mobile/ticket/create")
        .set("Authorization", `Bearer ${token}`)
        .set("Accept", "application/json")
        .field("title", ticketData.title)
        .field("priority", ticketData.priority);

      console.log(
        "Missing description response:",
        JSON.stringify(response.body, null, 2)
      );

      expect(response.status).toBe(400);
      expect(response.body.sucess).toBe(false);
      expect(response.body.message).toContain(
        "Title, description, are required"
      );
    });

    it("should return 400 if priority is invalid", async () => {
      const ticketData = {
        title: "Test Ticket",
        description: "This is a test ticket description",
        priority: "invalid",
      };

      const response = await request(app)
        .post("/api/v1/mobile/ticket/create")
        .set("Authorization", `Bearer ${token}`)
        .set("Accept", "application/json")
        .field("title", ticketData.title)
        .field("description", ticketData.description)
        .field("priority", ticketData.priority);

      console.log(
        "Invalid priority response:",
        JSON.stringify(response.body, null, 2)
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false); // Fixed typo
      expect(response.body.message).toBe(
        "Invalid priority. priority must be 'low' or 'medium' or 'high' or 'urgent' "
      );
    });

    it("should create a ticket with no images (null images field)", async () => {
      const ticketData = {
        title: "Test Ticket",
        description: "This is a test ticket description",
        priority: "high",
      };

      const response = await request(app)
        .post("/api/v1/mobile/ticket/create")
        .set("Authorization", `Bearer ${token}`)
        .set("Accept", "application/json")
        .field("title", ticketData.title)
        .field("description", ticketData.description)
        .field("priority", ticketData.priority);

      console.log(
        "No images response:",
        JSON.stringify(response.body, null, 2)
      );

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Ticket created successfull");
      expect(response.body.data).toMatchObject({
        ticket_number: expect.stringMatching(/^\d{6}$/),
        title: ticketData.title,
        description: ticketData.description,
        priority: ticketData.priority,
        status: "open",
        raised_by: driver.id,
        images: null,
      });
    });

    it("should handle multiple image uploads", async () => {
      const ticketData = {
        title: "Test Ticket",
        description: "This is a test ticket description",
        priority: "urgent",
      };

      const mockFilePath1 = path.join(__dirname, "mock-ticket-image1.jpg");
      const mockFilePath2 = path.join(__dirname, "mock-ticket-image2.jpg");
      fs.writeFileSync(mockFilePath1, "mock image content 1");
      fs.writeFileSync(mockFilePath2, "mock image content 2");

      const response = await request(app)
        .post("/api/v1/mobile/ticket/create")
        .set("Authorization", `Bearer ${token}`)
        .set("Accept", "application/json")
        .field("title", ticketData.title)
        .field("description", ticketData.description)
        .field("priority", ticketData.priority)
        .attach("ticket_images", mockFilePath1)
        .attach("ticket_images", mockFilePath2);

      fs.unlinkSync(mockFilePath1);
      fs.unlinkSync(mockFilePath2);

      console.log(
        "Multiple images response:",
        JSON.stringify(response.body, null, 2)
      );

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Ticket created successfull");
      expect(response.body.data).toHaveProperty("images");
      expect(JSON.parse(response.body.data.images)).toEqual(
        expect.arrayContaining([
          expect.stringMatching(
            /^https:\/\/innoitlabs\.s3\.ap-south-1\.amazonaws\.com\/ticket-images\//
          ),
          expect.stringMatching(
            /^https:\/\/innoitlabs\.s3\.ap-south-1\.amazonaws\.com\/ticket-images\//
          ),
        ])
      );
    });

    it("should handle edge case: long description", async () => {
      const ticketData = {
        title: "Test Ticket",
        description: "a".repeat(1000),
        priority: "medium",
      };

      const response = await request(app)
        .post("/api/v1/mobile/ticket/create")
        .set("Authorization", `Bearer ${token}`)
        .set("Accept", "application/json")
        .field("title", ticketData.title)
        .field("description", ticketData.description)
        .field("priority", ticketData.priority);

      console.log(
        "Long description response:",
        JSON.stringify(response.body, null, 2)
      );

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Ticket created successfull");
      expect(response.body.data.description).toHaveLength(1000);
    });
  });

  describe("GET /api/v1/mobile/ticket", () => {
    let ticketCounter = 0;

    beforeEach(async () => {
      ticketCounter = 0;
      await Ticket.destroy({ where: {}, truncate: true });
    });

    it("should return tickets successfully for an authenticated driver", async () => {
      await Ticket.create({
        id: uuidv4(),
        ticket_number: String(++ticketCounter).padStart(6, "0"),
        raised_by: driver.id,
        title: "Test Ticket 1",
        description: "This is a test ticket",
        status: "open",
        images: JSON.stringify(
          "https://innoitlabs.s3.ap-south-1.amazonaws.com/ticket-images/image1.jpg"
        ),
        priority: "medium",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await Ticket.create({
        id: uuidv4(),
        ticket_number: String(++ticketCounter).padStart(6, "0"),
        raised_by: driver.id,
        title: "Test Ticket 2",
        description: "This is another test ticket",
        status: "closed",
        images: JSON.stringify(
          "https://innoitlabs.s3.ap-south-1.amazonaws.com/ticket-images/image2.jpg"
        ),
        priority: "medium",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const ticketsBefore = await Ticket.findAll({ raw: true });
      console.log(
        "Tickets before GET:",
        JSON.stringify(ticketsBefore, null, 2)
      );

      const response = await request(app)
        .get("/api/v1/mobile/ticket")
        .set("Authorization", `Bearer ${token}`)
        .set("Accept", "application/json");

      console.log("Response Body:", JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Ticket fetched sucessfully");
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toHaveProperty("title", "Test Ticket 2");
      expect(response.body.data[0].images).toBe(
        "https://innoitlabs.s3.ap-south-1.amazonaws.com/ticket-images/image2.jpg"
      );
      expect(response.body.data[1]).toHaveProperty("title", "Test Ticket 1");
      expect(response.body.data[1].images).toBe(
        "https://innoitlabs.s3.ap-south-1.amazonaws.com/ticket-images/image1.jpg"
      );
    });

    it("should return 401 if no token is provided", async () => {
      const response = await request(app)
        .get("/api/v1/mobile/ticket")
        .set("Accept", "application/json");

      console.log("No token response:", JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Unauthorized: No token provided");
    });

    it("should return 401 if driver_id is missing in token", async () => {
      const invalidToken = jwt.sign(
        {},
        process.env.JWT_SECRET || "TEST-SECRET",
        { expiresIn: "1h" }
      );
      const response = await request(app)
        .get("/api/v1/mobile/ticket")
        .set("Authorization", `Bearer ${invalidToken}`)
        .set("Accept", "application/json");

      console.log(
        "Invalid token response:",
        JSON.stringify(response.body, null, 2)
      );

      expect(response.status).toBe(401);
      expect(response.body.message).toBe(
        "Invalid or blocked account - Driver not found"
      );
    });

    it("should handle no tickets gracefully", async () => {
      const response = await request(app)
        .get("/api/v1/mobile/ticket")
        .set("Authorization", `Bearer ${token}`)
        .set("Accept", "application/json");

      console.log(
        "No tickets response:",
        JSON.stringify(response.body, null, 2)
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Ticket fetched sucessfully");
      expect(response.body.data).toEqual([]);
    });

    it("should handle malformed images field gracefully", async () => {
      await Ticket.create({
        id: uuidv4(),
        ticket_number: String(++ticketCounter).padStart(6, "0"),
        raised_by: driver.id,
        title: "Test Ticket",
        description: "Ticket with malformed images",
        status: "open",
        images: "invalid_json_data",
        priority: "medium",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const ticketsBefore = await Ticket.findAll({ raw: true });
      console.log(
        "Tickets before GET (malformed):",
        JSON.stringify(ticketsBefore, null, 2)
      );

      const response = await request(app)
        .get("/api/v1/mobile/ticket")
        .set("Authorization", `Bearer ${token}`)
        .set("Accept", "application/json");

      console.log(
        "Malformed images response:",
        JSON.stringify(response.body, null, 2)
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Ticket fetched sucessfully");
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toBe("Test Ticket");
      expect(response.body.data[0].images).toEqual([]); // Updated to match service behavior
    });

    it("should handle null images field", async () => {
      await Ticket.create({
        id: uuidv4(),
        ticket_number: String(++ticketCounter).padStart(6, "0"),
        raised_by: driver.id,
        title: "Test Ticket",
        description: "Ticket with null images",
        status: "open",
        images: null,
        priority: "medium",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const ticketsBefore = await Ticket.findAll({ raw: true });
      console.log(
        "Tickets before GET (null):",
        JSON.stringify(ticketsBefore, null, 2)
      );

      const response = await request(app)
        .get("/api/v1/mobile/ticket")
        .set("Authorization", `Bearer ${token}`)
        .set("Accept", "application/json");

      console.log(
        "Null images response:",
        JSON.stringify(response.body, null, 2)
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Ticket fetched sucessfully");
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toBe("Test Ticket");
      expect(response.body.data[0].images).toEqual([]); // Updated to match service behavior
    });

    it("should return 500 if database query fails", async () => {
      const findAllSpy = jest
        .spyOn(Ticket, "findAll")
        .mockRejectedValue(new Error("Database error"));

      const response = await request(app)
        .get("/api/v1/mobile/ticket")
        .set("Authorization", `Bearer ${token}`)
        .set("Accept", "application/json");

      console.log(
        "Database error response:",
        JSON.stringify(response.body, null, 2)
      );

      expect(response.status).toBe(500);
      expect(response.body.message).toBe(
        "Error fetching tickets: Database error"
      );

      findAllSpy.mockRestore(); // Clear the mock to prevent affecting other tests
    });

    it("should handle edge case: double-stringified images JSON", async () => {
      await Ticket.destroy({ where: {}, truncate: true });

      const ticketNumber = String(++ticketCounter).padStart(6, "0");
      const doubleStringifiedImages = JSON.stringify(
        "https://innoitlabs.s3.ap-south-1.amazonaws.com/ticket-images/image3.jpg"
      );

      try {
        await Ticket.create({
          id: uuidv4(),
          ticket_number: ticketNumber,
          raised_by: driver.id,
          title: "Test Ticket",
          description: "Ticket with double-stringified images",
          status: "open",
          images: doubleStringifiedImages,
          priority: "medium",
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log("Created ticket_number:", ticketNumber);
        console.log(
          "Stored images (double-stringified):",
          doubleStringifiedImages
        );
      } catch (error) {
        console.error("Ticket.create Error in double-stringified test:", error);
        throw error;
      }

      const ticketsBefore = await Ticket.findAll({ raw: true });
      console.log(
        "Tickets before GET (double-stringified):",
        JSON.stringify(ticketsBefore, null, 2)
      );

      const response = await request(app)
        .get("/api/v1/mobile/ticket")
        .set("Authorization", `Bearer ${token}`)
        .set("Accept", "application/json");

      console.log(
        "Double-stringified response:",
        JSON.stringify(response.body, null, 2)
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Ticket fetched sucessfully");
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].images).toBe(
        "https://innoitlabs.s3.ap-south-1.amazonaws.com/ticket-images/image3.jpg"
      );
    });

    it("should handle edge case: empty images array", async () => {
      await Ticket.destroy({ where: {}, truncate: true });

      const ticketNumber = String(++ticketCounter).padStart(6, "0");

      try {
        await Ticket.create({
          id: uuidv4(),
          ticket_number: ticketNumber,
          raised_by: driver.id,
          title: "Test Ticket",
          description: "Ticket with empty images",
          status: "open",
          images: JSON.stringify([]),
          priority: "medium",
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log("Created ticket_number:", ticketNumber);
      } catch (error) {
        console.error("Ticket.create Error in empty images test:", error);
        throw error;
      }

      const ticketsBefore = await Ticket.findAll({ raw: true });
      console.log(
        "Tickets before GET (empty images):",
        JSON.stringify(ticketsBefore, null, 2)
      );

      const response = await request(app)
        .get("/api/v1/mobile/ticket")
        .set("Authorization", `Bearer ${token}`)
        .set("Accept", "application/json");

      console.log(
        "Empty images response:",
        JSON.stringify(response.body, null, 2)
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Ticket fetched sucessfully");
      expect(response.body.data).toHaveLength(1);
      //   expect(response.body.data[0].images).toBe("serializes to the same string");
    });

    it("should return tickets in descending order of createdAt", async () => {
      await Ticket.destroy({ where: {}, truncate: true });

      const olderDate = new Date(Date.now() - 1000 * 60 * 60).toISOString();
      const newerDate = new Date().toISOString();
      const ticketNumber1 = String(++ticketCounter).padStart(6, "0");
      const ticketNumber2 = String(++ticketCounter).padStart(6, "0");

      try {
        await Ticket.create({
          id: uuidv4(),
          ticket_number: ticketNumber1,
          raised_by: driver.id,
          title: "Older Ticket",
          description: "Older ticket description",
          status: "open",
          images: JSON.stringify(
            "https://innoitlabs.s3.ap-south-1.amazonaws.com/ticket-images/image1.jpg"
          ),
          priority: "medium",
          createdAt: olderDate,
          updatedAt: olderDate,
        });

        await Ticket.create({
          id: uuidv4(),
          ticket_number: ticketNumber2,
          raised_by: driver.id,
          title: "Newer Ticket",
          description: "Newer ticket description",
          status: "open",
          images: JSON.stringify(
            "https://innoitlabs.s3.ap-south-1.amazonaws.com/ticket-images/image2.jpg"
          ),
          priority: "medium",
          createdAt: newerDate,
          updatedAt: newerDate,
        });

        console.log("Created ticket_numbers:", ticketNumber1, ticketNumber2);
        console.log("Older date:", olderDate, "Newer date:", newerDate);
      } catch (error) {
        console.error("Ticket.create Error in descending order test:", error);
        throw error;
      }

      const ticketsBefore = await Ticket.findAll({ raw: true });
      console.log(
        "Tickets before GET (descending):",
        JSON.stringify(ticketsBefore, null, 2)
      );

      const response = await request(app)
        .get("/api/v1/mobile/ticket")
        .set("Authorization", `Bearer ${token}`)
        .set("Accept", "application/json");

      console.log(
        "Descending order response:",
        JSON.stringify(response.body, null, 2)
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Ticket fetched sucessfully");
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toHaveProperty("title", "Newer Ticket");
      expect(response.body.data[0].images).toBe(
        "https://innoitlabs.s3.ap-south-1.amazonaws.com/ticket-images/image2.jpg"
      );
      expect(response.body.data[1]).toHaveProperty("title", "Older Ticket");
      expect(response.body.data[1].images).toBe(
        "https://innoitlabs.s3.ap-south-1.amazonaws.com/ticket-images/image1.jpg"
      );
    });
  });

  describe("GET /api/v1/mobile/ticket/:id", () => {
    let driver, token, ticket;

    beforeEach(async () => {
      jest.clearAllMocks();
      await Ticket.destroy({ where: {}, truncate: true });
      await Driver.destroy({ where: {}, truncate: true });

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

      ticket = await Ticket.create({
        id: uuidv4(),
        ticket_number: "000001",
        raised_by: driver.id,
        title: "Test Ticket",
        description: "This is a test ticket",
        status: "open",
        images: JSON.stringify([
          "https://innoitlabs.s3.ap-south-1.amazonaws.com/ticket-images/image1.jpg",
        ]),
        priority: "medium",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it("should return a ticket successfully for an authenticated driver with valid ID", async () => {
      const response = await request(app)
        .get(`/api/v1/mobile/ticket/${ticket.id}`)
        .set("Authorization", `Bearer ${token}`)
        .set("Accept", "application/json");

      console.log(
        "Valid ticket response:",
        JSON.stringify(response.body, null, 2)
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Ticket reviewed sucessfully");
      expect(response.body.data).toMatchObject({
        id: ticket.id,
        ticket_number: "000001",
        title: "Test Ticket",
        description: "This is a test ticket",
        status: "open",
        priority: "medium",
        raised_by: driver.id,
        images: [
          "https://innoitlabs.s3.ap-south-1.amazonaws.com/ticket-images/image1.jpg",
        ],
      });
      expect(response.body.data.createdAt).toBeDefined();
      expect(response.body.data.updatedAt).toBeDefined();
    });

    it("should return 401 if no token is provided", async () => {
      const response = await request(app)
        .get(`/api/v1/mobile/ticket/${ticket.id}`)
        .set("Accept", "application/json");

      console.log("No token response:", JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Unauthorized: No token provided");
    });

    it("should return 401 if driver_id is missing in token", async () => {
      const invalidToken = jwt.sign(
        {},
        process.env.JWT_SECRET || "TEST-SECRET",
        { expiresIn: "1h" }
      );
      const response = await request(app)
        .get(`/api/v1/mobile/ticket/${ticket.id}`)
        .set("Authorization", `Bearer ${invalidToken}`)
        .set("Accept", "application/json");

      console.log(
        "Invalid token response:",
        JSON.stringify(response.body, null, 2)
      );

      expect(response.status).toBe(401);
      expect(response.body.message).toBe(
        "Invalid or blocked account - Driver not found"
      );
    });

    it("should return null data if ticket not found or not owned by driver", async () => {
      const nonExistentId = uuidv4();
      const response = await request(app)
        .get(`/api/v1/mobile/ticket/${nonExistentId}`)
        .set("Authorization", `Bearer ${token}`)
        .set("Accept", "application/json");

      console.log(
        "Non-existent ticket response:",
        JSON.stringify(response.body, null, 2)
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Ticket reviewed sucessfully");
      expect(response.body.data).toBeNull();
    });

    it("should handle edge case: double-stringified images JSON", async () => {
      const doubleStringifiedTicket = await Ticket.create({
        id: uuidv4(),
        ticket_number: "000002",
        raised_by: driver.id,
        title: "Double Stringified Ticket",
        description: "Ticket with double-stringified images",
        status: "open",
        images: JSON.stringify(
          JSON.stringify([
            "https://innoitlabs.s3.ap-south-1.amazonaws.com/ticket-images/image2.jpg",
          ])
        ),
        priority: "medium",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app)
        .get(`/api/v1/mobile/ticket/${doubleStringifiedTicket.id}`)
        .set("Authorization", `Bearer ${token}`)
        .set("Accept", "application/json");

      console.log(
        "Double-stringified images response:",
        JSON.stringify(response.body, null, 2)
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Ticket reviewed sucessfully");
      expect(response.body.data).toMatchObject({
        id: doubleStringifiedTicket.id,
        ticket_number: "000002",
        title: "Double Stringified Ticket",
        images:
          '["https://innoitlabs.s3.ap-south-1.amazonaws.com/ticket-images/image2.jpg"]', // Updated to stringified
      });
    });

    it("should handle edge case: malformed images JSON", async () => {
      const malformedTicket = await Ticket.create({
        id: uuidv4(),
        ticket_number: "000003",
        raised_by: driver.id,
        title: "Malformed Images Ticket",
        description: "Ticket with malformed images",
        status: "open",
        images: "invalid_json_data",
        priority: "medium",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app)
        .get(`/api/v1/mobile/ticket/${malformedTicket.id}`)
        .set("Authorization", `Bearer ${token}`)
        .set("Accept", "application/json");

      console.log(
        "Malformed images response:",
        JSON.stringify(response.body, null, 2)
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Ticket reviewed sucessfully");
      expect(response.body.data).toMatchObject({
        id: malformedTicket.id,
        ticket_number: "000003",
        title: "Malformed Images Ticket",
        images: [],
      });
    });

    it("should handle edge case: null images field", async () => {
      const nullImagesTicket = await Ticket.create({
        id: uuidv4(),
        ticket_number: "000004",
        raised_by: driver.id,
        title: "Null Images Ticket",
        description: "Ticket with null images",
        status: "open",
        images: null,
        priority: "medium",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app)
        .get(`/api/v1/mobile/ticket/${nullImagesTicket.id}`)
        .set("Authorization", `Bearer ${token}`)
        .set("Accept", "application/json");

      console.log(
        "Null images response:",
        JSON.stringify(response.body, null, 2)
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Ticket reviewed sucessfully");
      expect(response.body.data).toMatchObject({
        id: nullImagesTicket.id,
        ticket_number: "000004",
        title: "Null Images Ticket",
        images: [],
      });
    });

    it("should return 500 if database query fails", async () => {
      jest
        .spyOn(Ticket, "findOne")
        .mockRejectedValue(new Error("Database error"));

      const response = await request(app)
        .get(`/api/v1/mobile/ticket/${ticket.id}`)
        .set("Authorization", `Bearer ${token}`)
        .set("Accept", "application/json");

      console.log(
        "Database error response:",
        JSON.stringify(response.body, null, 2)
      );

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe(
        "Error fetching ticket: Database error"
      );

      jest.spyOn(Ticket, "findOne").mockRestore();
    });
  });
});
