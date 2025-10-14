const request = require("supertest");
const app = require("../../../src/app");
const {
  Driver,
  DriverCar,
  Car,
  Ride,
  Earnings,
  WalletReports,
} = require("../../../src/models");
const jwt = require("jsonwebtoken");
const { PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const sequelize = require("../../../src/config/db");
const driverService = require("../../../src/services/driver.service");
const driverCarService = require("../../../src/services/driverCar.service");
const walletService = require("../../../src/services/wallet.service");

console.log(DeleteObjectCommand);
// Mock normalizePhone to ensure consistent behavior in tests
jest.mock("../../../src/services/driver.service", () => {
  const original = jest.requireActual("../../../src/services/driver.service");
  return {
    ...original,
    normalizePhone: jest.fn((phone) => phone.replace(/[- ]/g, "")), // Mock normalizePhone to remove spaces and dashes
    blockDriverByPhoneOrEmail: jest.fn(original.blockDriverByPhoneOrEmail), // Preserve original function but allow mocking
    getDriverById: jest.fn(original.getDriverById),
    checkActiveRide: jest.fn(original.checkActiveRide),
    deactivateDriver: jest.fn(original.deactivateDriver),
    getStatusByDriver: jest.fn(original.getStatusByDriver),
    updateDriverProfile: jest.fn(original.updateDriverProfile),
    updateOneSignalPlayerId: jest.fn(original.updateOneSignalPlayerId),
    deleteOneSignalPlayerId: jest.fn(original.deleteOneSignalPlayerId),
  };
});

// Mock driverCarService
jest.mock("../../../src/services/driverCar.service", () => {
  const original = jest.requireActual(
    "../../../src/services/driverCar.service"
  );
  return {
    ...original,
    getDriverCarByDriverId: jest.fn(original.getDriverCarByDriverId),
  };
});

// Mock walletService
jest.mock("../../../src/services/wallet.service", () => {
  const original = jest.requireActual("../../../src/services/wallet.service");
  return {
    ...original,
    getWalletBalance: jest.fn(original.getWalletBalance),
  };
});

// Mock AWS S3
jest.mock("@aws-sdk/client-s3", () => {
  const mockSend = jest.fn().mockResolvedValue({});
  return {
    S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
    PutObjectCommand: jest.fn(),
    DeleteObjectCommand: jest.fn(),
  };
});

// Mock getSignedUrl
jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: jest
    .fn()
    .mockResolvedValue("https://s3.amazonaws.com/drivers/profile.jpg?signed"),
}));

describe("Driver API Integration Tests", () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    getSignedUrl.mockResolvedValue(
      "https://innoitlabs.s3.us-east-1.amazonaws.com/drivers/profile.jpg?signed"
    );
    await Driver.destroy({ truncate: true, cascade: true });
    await DriverCar.destroy({ truncate: true, cascade: true });
    await Car.destroy({ truncate: true, cascade: true });
    await Ride.destroy({ truncate: true, cascade: true });
    await Earnings.destroy({ truncate: true, cascade: true });
    await WalletReports.destroy({ truncate: true, cascade: true });
    await sequelize.models.SubPackage.destroy({
      truncate: true,
      cascade: true,
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe("POST /api/v1/mobile/driver/verify", () => {
    it("should verify a new driver with Google social login and return 200", async () => {
      const email = "john@example.com";
      const token = "valid-google-token";
      require("../../../src/config/firebase-config")
        .driverFirebase.auth()
        .verifyIdToken.mockResolvedValue({ email });

      const response = await request(app)
        .post("/api/v1/mobile/driver/verify")
        .send({ email, token, social_login: "google" })
        .set("Accept", "application/json");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("result");
      expect(response.body.result).toHaveProperty("token");
      expect(response.body.result).toHaveProperty("driver");
      expect(response.body.result.driver.email).toBe(email);
      expect(response.body.result.driver.status).toBe("inactive");

      const dbDriver = await Driver.findOne({ where: { email } });
      expect(dbDriver).not.toBeNull();
      expect(dbDriver.social_login).toBe("google");
      expect(dbDriver.last_login).toBeTruthy();
    });

    it("should verify an existing active driver with phone login and return 200", async () => {
      const phone = "+971912345678";
      const token = "valid-phone-token";
      require("../../../src/config/firebase-config")
        .driverFirebase.auth()
        .verifyIdToken.mockResolvedValue({ phone_number: "+971912345678" });

      await Driver.create({
        id: "123e4567-e89b-12d3-a456-426614174000",
        phone,
        email: "active@example.com",
        status: "active",
        last_login: new Date(),
      });

      const response = await request(app)
        .post("/api/v1/mobile/driver/verify")
        .send({ phone, token })
        .set("Accept", "application/json");

      expect(response.status).toBe(200);
      expect(response.body.result).toHaveProperty("token");
      expect(response.body.result.driver.phone).toBe(phone);
      expect(response.body.result.driver.status).toBe("active");

      const dbDriver = await Driver.findOne({ where: { phone } });
      expect(dbDriver.last_login).toBeTruthy();
    });

    it("should return 400 for invalid Google token", async () => {
      const email = "john@example.com";
      const token = "invalid-token";
      require("../../../src/config/firebase-config")
        .driverFirebase.auth()
        .verifyIdToken.mockRejectedValue(new Error("Invalid token"));

      const response = await request(app)
        .post("/api/v1/mobile/driver/verify")
        .send({ email, token, social_login: "google" })
        .set("Accept", "application/json");

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid token");
    });

    it("should return 400 for email mismatch in Google login", async () => {
      const email = "john@example.com";
      const token = "valid-token";
      require("../../../src/config/firebase-config")
        .driverFirebase.auth()
        .verifyIdToken.mockResolvedValue({ email: "different@example.com" });

      const response = await request(app)
        .post("/api/v1/mobile/driver/verify")
        .send({ email, token, social_login: "google" })
        .set("Accept", "application/json");

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Email mismatch with token");
    });
  });

  describe("POST /api/v1/mobile/driver/update-profile", () => {
    let driverId, carId, token;
    beforeAll(async () => {
      process.env.S3_BUCKET_NAME = "innoitlabs";
      process.env.AWS_REGION = "ap-south-1";
      await sequelize.sync({ force: true });
    });

    beforeEach(async () => {
      driverId = "123e4567-e89b-12d3-a456-426614174000";
      carId = "223e4567-e89b-12d3-a456-426614174001";
      token = jwt.sign(
        { id: driverId },
        process.env.JWT_SECRET || "your-secret",
        { expiresIn: "1h" }
      );

      await Driver.destroy({ truncate: true, cascade: true });
      await Car.destroy({ truncate: true, cascade: true });
      await DriverCar.destroy({ truncate: true, cascade: true });

      try {
        const uniqueEmail = `john-${Date.now()}@example.com`;
        console.log("Seeding Driver with:", {
          id: driverId,
          email: uniqueEmail,
          phone: `+971912345678-${Date.now()}`,
          status: "inactive",
          wallet_balance: 0.0,
          document_check_count: 0,
        });
        await Driver.create({
          id: driverId,
          email: uniqueEmail,
          phone: `+971912345678-${Date.now()}`,
          status: "inactive",
          wallet_balance: 0.0,
          document_check_count: 0,
        });
        console.log("Driver created successfully");

        console.log("Seeding Car with:", {
          id: carId,
          brand: "Toyota",
          model: "Camry",
          status: "active",
        });
        await Car.create({
          id: carId,
          brand: "Toyota",
          model: "Camry",
          status: "active",
        });
        console.log("Car created successfully");

        console.log("Seeding DriverCar with:", {
          id: "323e4567-e89b-12d3-a456-426614174002",
          driver_id: driverId,
          car_id: carId,
          color: "red",
          license_plate: "XYZ789",
          car_photos: JSON.stringify([
            "https://s3.amazonaws.com/driver-cars/old_car.jpg",
          ]),
          rc_doc: "https://s3.amazonaws.com/driver-cars/old_rc_doc.jpg",
          rc_doc_back:
            "https://s3.amazonaws.com/driver-cars/old_rc_doc_back.jpg",
          insurance_doc:
            "https://s3.amazonaws.com/driver-cars/old_insurance_doc.jpg",
          rc_doc_status: "pending",
          insurance_doc_status: "pending",
          is_approved: false,
        });
        await DriverCar.create({
          id: "323e4567-e89b-12d3-a456-426614174002",
          driver_id: driverId,
          car_id: carId,
          color: "red",
          license_plate: "XYZ789",
          car_photos: JSON.stringify([
            "https://s3.amazonaws.com/driver-cars/old_car.jpg",
          ]),
          rc_doc: "https://s3.amazonaws.com/driver-cars/old_rc_doc.jpg",
          rc_doc_back:
            "https://s3.amazonaws.com/driver-cars/old_rc_doc_back.jpg",
          insurance_doc:
            "https://s3.amazonaws.com/driver-cars/old_insurance_doc.jpg",
          rc_doc_status: "pending",
          insurance_doc_status: "pending",
          is_approved: false,
        });
        console.log("DriverCar created successfully");
      } catch (error) {
        console.error("Error in beforeEach:", error);
        throw error;
      }
    });

    it("should update driver profile and create new car details with presigned URLs, returning 200", async () => {
      const profileData = {
        first_name: "John",
        last_name: "Doe",
        email: `john-${Date.now()}@example.com`,
        phone: "+971912345678",
        dob: "01-01-1990",
        languages: ["Hindi", "Arabic"],
        experience: 5,
        emirates_id: "784123456789012",
        profile_pic: "https://s3.amazonaws.com/drivers/profile.jpg?signed",
        emirates_doc_front:
          "https://s3.amazonaws.com/drivers/emirates_front.jpg?signed",
        emirates_doc_back:
          "https://s3.amazonaws.com/drivers/emirates_back.jpg?signed",
        license_front:
          "https://s3.amazonaws.com/drivers/license_front.jpg?signed",
        license_back:
          "https://s3.amazonaws.com/drivers/license_back.jpg?signed",
        full_address: "123 Main St, Dubai, UAE",
      };
      const carData = {
        car_id: carId,
        license_plate: "ABC123",
        color: "Blue",
        car_photos: [
          "https://s3.amazonaws.com/driver-cars/car1.jpg?signed",
          "https://s3.amazonaws.com/driver-cars/car2.jpg?signed",
        ],
        rc_doc: "https://s3.amazonaws.com/driver-cars/rc_doc.jpg?signed",
        rc_doc_back:
          "https://s3.amazonaws.com/driver-cars/rc_doc_back.jpg?signed",
        insurance_doc:
          "https://s3.amazonaws.com/driver-cars/insurance_doc.jpg?signed",
      };

      console.log("Sending update-profile request with:", {
        ...profileData,
        ...carData,
      });
      const response = await request(app)
        .post("/api/v1/mobile/driver/update-profile")
        .set("Authorization", `Bearer ${token}`)
        .set("Accept", "application/json")
        .send({ ...profileData, ...carData });

      console.log("Update-profile response:", response.body);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("driver");
      expect(response.body).toHaveProperty("vehicle");
      expect(response.body.driver.first_name).toBe("John");
      expect(response.body.driver.status).toBe("inactive");
      expect(response.body.vehicle.car_id).toBe(carId);
      expect(response.body.vehicle.rc_doc_status).toBe("pending");

      const dbDriver = await Driver.findByPk(driverId);
      console.log("Database Driver state:", dbDriver.toJSON());
      expect(dbDriver.first_name).toBe("John");
      const expectedLanguages = ["Hindi", "Arabic"];
      if (typeof dbDriver.languages === "string") {
        expect(JSON.parse(dbDriver.languages)).toEqual(expectedLanguages);
      } else {
        expect(dbDriver.languages).toEqual(expectedLanguages);
      }
      expect(dbDriver.emirates_verification_status).toBe("pending");

      const dbCar = await DriverCar.findOne({ where: { driver_id: driverId } });
      console.log("Database DriverCar state:", dbCar.toJSON());
      expect(dbCar).not.toBeNull();
      expect(dbCar.car_id).toBe(carId);
      expect(
        Array.isArray(dbCar.car_photos)
          ? dbCar.car_photos
          : JSON.parse(dbCar.car_photos)
      ).toHaveLength(2);
      expect(dbCar.rc_doc_status).toBe("pending");
      expect(dbCar.insurance_doc_status).toBe("pending");
      expect(dbCar.is_approved).toBe(false);
    });
  });

  describe("POST /upload-token", () => {
    it("should generate presigned URL for image upload", async () => {
      getSignedUrl.mockImplementation(async (client, command, options) => {
        console.log("getSignedUrl called with:", { client, command, options });
        return "https://innoitlabs.s3.ap-south-1.amazonaws.com/drivers/profile.jpg?signed";
      });

      const payload = {
        folder: "drivers",
        files: { fileName: "profile.jpg", fileType: "image/jpeg" },
      };

      console.log("Sending upload-token request with:", payload);
      const response = await request(app)
        .post("/upload-token")
        .set("Content-Type", "application/json")
        .set("Accept", "application/json")
        .send(payload);

      console.log("Upload-token response:", response.body);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("files");
      expect(response.body.files[0].uploadUrl).toContain(
        "https://innoitlabs.s3.ap-south-1.amazonaws.com/"
      );
      expect(response.body.files[0].fileUrl).toContain(
        "https://innoitlabs.s3.ap-south-1.amazonaws.com/"
      );
      expect(getSignedUrl).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(PutObjectCommand),
        { expiresIn: 300 }
      );
    });

    it("should return 400 for missing fileName or fileType", async () => {
      const payload = {
        folder: "drivers",
        files: JSON.stringify({}),
      };

      console.log("Sending upload-token request with:", payload);
      const response = await request(app)
        .post("/upload-token")
        .set("Content-Type", "application/json")
        .set("Accept", "application/json")
        .send(payload);

      console.log("Upload-token response:", response.body);
      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        "Each file must have fileName and fileType"
      );
    });
  });

  describe("POST /api/v1/mobile/driver/status", () => {
    beforeAll(async () => {
      await sequelize.sync({ force: true });
    });

    beforeEach(async () => {
      jest.clearAllMocks();
      await Driver.destroy({ truncate: true, cascade: true });
    });

    it("should block a driver by phone and return 200", async () => {
      const phone = `+971912345678-${Date.now()}`;
      await Driver.create({
        id: `123e4567-e89b-12d3-a456-426614174${Date.now()}`,
        phone,
        email: `john-${Date.now()}@example.com`,
        status: "active",
      });

      const response = await request(app)
        .post("/api/v1/mobile/driver/status")
        .send({ phone })
        .set("Accept", "application/json");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        "message",
        "Driver status updated to blocked"
      );
      expect(response.body).toHaveProperty("data");
      expect(response.body.data.phone).toBe(phone);
      expect(response.body.data.status).toBe("blocked");

      const dbDriver = await Driver.findOne({ where: { phone } });
      expect(dbDriver).not.toBeNull();
      expect(dbDriver.status).toBe("blocked");
    });

    it("should block a driver by email and return 200", async () => {
      const email = `john-${Date.now()}@example.com`;
      console.log(`Creating driver with email: ${email}`);
      try {
        await Driver.create({
          id: `123e4567-e89b-12d3-a456-426614174${Date.now()}`,
          phone: `+971912345678-${Date.now()}`,
          email,
          status: "active",
        });
        console.log(`Driver created successfully with email: ${email}`);
      } catch (error) {
        console.error("Error creating driver:", error);
        throw error;
      }

      const response = await request(app)
        .post("/api/v1/mobile/driver/status")
        .send({ email })
        .set("Accept", "application/json");

      console.log("Response:", response.body);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        "message",
        "Driver status updated to blocked"
      );
      expect(response.body).toHaveProperty("data");
      expect(response.body.data.email).toBe(email);
      expect(response.body.data.status).toBe("blocked");

      const dbDriver = await Driver.findOne({ where: { email } });
      expect(dbDriver).not.toBeNull();
      expect(dbDriver.status).toBe("blocked");
    });

    it("should return 400 if both phone and email are provided", async () => {
      const response = await request(app)
        .post("/api/v1/mobile/driver/status")
        .send({ phone: "+971912345678", email: "john@example.com" })
        .set("Accept", "application/json");

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty(
        "message",
        "Provide either phone or email, not both or neither."
      );
    });

    // it("should return 400 if neither phone nor email is provided", async () => {
    //   const response = await request(app)
    //     .post("/api/v1/mobile/driver/status")
    //     .send({})
    //     .set("Accept", "application/json");

    //   expect(response.status).toBe(400);
    //   expect(response.body).toHaveProperty("message", "Provide either phone or email, not both or neither.");
    // });

    it("should return 400 if driver is not found by phone", async () => {
      const phone = "+971912345678";
      const response = await request(app)
        .post("/api/v1/mobile/driver/status")
        .send({ phone })
        .set("Accept", "application/json");

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty(
        "error",
        "Driver not found with provided phone or email."
      );
    });

    it("should return 400 if driver is not found by email", async () => {
      const email = "john@example.com";
      const response = await request(app)
        .post("/api/v1/mobile/driver/status")
        .send({ email })
        .set("Accept", "application/json");

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty(
        "error",
        "Driver not found with provided phone or email."
      );
    });

    it("should handle invalid phone format and return 400", async () => {
      const invalidPhone = "invalid-phone";
      const response = await request(app)
        .post("/api/v1/mobile/driver/status")
        .send({ phone: invalidPhone })
        .set("Accept", "application/json");

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty(
        "error",
        "Driver not found with provided phone or email."
      );
    });

    it("should handle invalid email format and return 400", async () => {
      const invalidEmail = "invalid-email";
      const response = await request(app)
        .post("/api/v1/mobile/driver/status")
        .send({ email: invalidEmail })
        .set("Accept", "application/json");

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty(
        "error",
        "Driver not found with provided phone or email."
      );
    });

    it("should handle driver already blocked and return 200", async () => {
      const email = `john-${Date.now()}@example.com`;
      await Driver.create({
        id: `123e4567-e89b-12d3-a456-426614174${Date.now()}`,
        phone: `+971912345678-${Date.now()}`,
        email,
        status: "blocked",
      });

      const response = await request(app)
        .post("/api/v1/mobile/driver/status")
        .send({ email })
        .set("Accept", "application/json");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        "message",
        "Driver status updated to blocked"
      );
      expect(response.body.data.status).toBe("blocked");

      const dbDriver = await Driver.findOne({ where: { email } });
      expect(dbDriver).not.toBeNull();
      expect(dbDriver.status).toBe("blocked");
    });

    it("should handle special characters in email", async () => {
      const email = `john+test-${Date.now()}@example.com`;
      await Driver.create({
        id: `123e4567-e89b-12d3-a456-426614174${Date.now()}`,
        phone: `+971912345678-${Date.now()}`,
        email,
        status: "active",
      });

      const response = await request(app)
        .post("/api/v1/mobile/driver/status")
        .send({ email })
        .set("Accept", "application/json");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        "message",
        "Driver status updated to blocked"
      );
      expect(response.body.data.email).toBe(email);
      expect(response.body.data.status).toBe("blocked");

      const dbDriver = await Driver.findOne({ where: { email } });
      expect(dbDriver).not.toBeNull();
      expect(dbDriver.status).toBe("blocked");
    });

    it("should handle database error during save", async () => {
      const email = `john-${Date.now()}@example.com`;
      console.log(`Creating driver with email: ${email}`);
      try {
        await Driver.create({
          id: `123e4567-e89b-12d3-a456-426614174${Date.now()}`,
          phone: `+971912345678-${Date.now()}`,
          email,
          status: "active",
        });
        console.log(`Driver created successfully with email: ${email}`);
      } catch (error) {
        console.error("Error creating driver:", error);
        throw error;
      }

      jest
        .spyOn(Driver.prototype, "save")
        .mockRejectedValueOnce(new Error("Database save error"));

      const response = await request(app)
        .post("/api/v1/mobile/driver/status")
        .send({ email })
        .set("Accept", "application/json");

      console.log("Response:", response.body);
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "Database save error");
    });

    it("should handle phone with spaces and dashes", async () => {
      const timestamp = Date.now();
      const rawPhone = `+971-912-345-678-${timestamp}`;
      const normalizedPhone = `+971912345678${timestamp}`;
      console.log(`Creating driver with normalized phone: ${normalizedPhone}`);
      try {
        await Driver.create({
          id: `123e4567-e89b-12d3-a456-426614174${timestamp}`,
          phone: normalizedPhone,
          email: `john-${timestamp}@example.com`,
          status: "active",
        });
        console.log(
          `Driver created successfully with phone: ${normalizedPhone}`
        );
      } catch (error) {
        console.error("Error creating driver:", error);
        throw error;
      }

      // Mock the entire blockDriverByPhoneOrEmail to control the behavior
      driverService.blockDriverByPhoneOrEmail.mockImplementation(
        async (phone, email) => {
          console.log(
            `blockDriverByPhoneOrEmail called with phone: ${phone}, email: ${email}`
          );
          const normalized = driverService.normalizePhone(phone);
          console.log(`Normalized phone: ${normalized}`);
          const driver = await Driver.findOne({ where: { phone: normalized } });
          if (!driver) {
            throw new Error("Driver not found with provided phone or email.");
          }
          driver.status = "blocked";
          await driver.save();
          return driver;
        }
      );

      const response = await request(app)
        .post("/api/v1/mobile/driver/status")
        .send({ phone: rawPhone })
        .set("Accept", "application/json");

      console.log("Response:", response.body);
      console.log(
        "normalizePhone called with:",
        driverService.normalizePhone.mock.calls
      );
      expect(driverService.normalizePhone).toHaveBeenCalledWith(rawPhone);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        "message",
        "Driver status updated to blocked"
      );
      expect(response.body.data.phone).toBe(normalizedPhone);
      expect(response.body.data.status).toBe("blocked");

      const dbDriver = await Driver.findOne({
        where: { phone: normalizedPhone },
      });
      expect(dbDriver).not.toBeNull();
      expect(dbDriver.status).toBe("blocked");
    });
  });

  describe("GET /api/v1/mobile/driver/account-details", () => {
    let driverId, token;

    beforeEach(async () => {
      jest.clearAllMocks();
      const timestamp = Date.now();
      driverId = `123e4567-e89b-12d3-a456-426614174${timestamp}`;
      token = jwt.sign(
        { id: driverId },
        process.env.JWT_SECRET || "your-secret",
        { expiresIn: "1h" }
      );

      // Clear all relevant tables
      await Driver.destroy({ truncate: true, cascade: true });
      await DriverCar.destroy({ truncate: true, cascade: true });
      await Car.destroy({ truncate: true, cascade: true });
      await Ride.destroy({ truncate: true, cascade: true });
      await Earnings.destroy({ truncate: true, cascade: true });
      await WalletReports.destroy({ truncate: true, cascade: true });
      await sequelize.models.Package.destroy({ truncate: true, cascade: true });
      await sequelize.models.SubPackage.destroy({
        truncate: true,
        cascade: true,
      });

      // Verify table is empty
      const driverCount = await Driver.count();
      if (driverCount > 0) {
        console.error(
          `Driver table not empty before test: ${driverCount} records`
        );
      }
      const packageCount = await sequelize.models.Package.count();
      if (packageCount > 0) {
        console.error(
          `Package table not empty before test: ${packageCount} records`
        );
      }

      // Create a driver with all required fields and unique values
      try {
        await Driver.create({
          id: driverId,
          first_name: "John",
          last_name: "Doe",
          email: `john${timestamp}@example.com`,
          phone: `+971912345678${timestamp}`,
          profile_pic: "https://s3.amazonaws.com/drivers/profile.jpg",
          otp_count: 0,
          dob: "1990-01-01",
          experience: 5,
          full_address: "123 Main St, Dubai",
          emirates_id: `784123456789012${timestamp}`,
          emirates_doc_front:
            "https://s3.amazonaws.com/drivers/emirates_front.jpg",
          emirates_doc_back:
            "https://s3.amazonaws.com/drivers/emirates_back.jpg",
          languages: JSON.stringify(["English", "Arabic"]),
          license_front: "https://s3.amazonaws.com/drivers/license_front.jpg",
          license_back: "https://s3.amazonaws.com/drivers/license_back.jpg",
          license_verification_status: "pending",
          emirates_verification_status: "pending",
          is_approved: false,
          one_signal_id: `onesignal123${timestamp}`,
          reason: null,
          availability_status: "online",
          wallet_balance: 100.0,
          credit_ride_count: 0,
          status: "active",
          document_check_count: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          social_login: null,
          last_login: new Date(),
          ride_request: true,
          system_alerts: true,
          earning_updates: true,
          ride_count: 0,
        });
      } catch (error) {
        console.error("Driver.create error:", error);
        throw error;
      }

      // Create a car
      const carId = `223e4567-e89b-12d3-a456-426614174${timestamp}`;
      await Car.create({
        id: carId,
        brand: "Toyota",
        model: "Camry",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create a driver-car association
      await DriverCar.create({
        id: `323e4567-e89b-12d3-a456-426614174${timestamp}`,
        driver_id: driverId,
        car_id: carId,
        color: "Blue",
        license_plate: `ABC123${timestamp}`,
        car_photos: JSON.stringify([
          "https://s3.amazonaws.com/driver-cars/car1.jpg",
        ]),
        rc_doc: "https://s3.amazonaws.com/driver-cars/rc_doc.jpg",
        rc_doc_back: "https://s3.amazonaws.com/driver-cars/rc_doc_back.jpg",
        insurance_doc: "https://s3.amazonaws.com/driver-cars/insurance_doc.jpg",
        rc_doc_status: "pending",
        insurance_doc_status: "pending",
        is_approved: false,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create a package
      const packageId = `523e4567-e89b-12d3-a456-426614174${timestamp}`;
      try {
        await sequelize.models.Package.create({
          id: packageId,
          name: `Standard Package ${timestamp}`, // Use unique name
          status: "active",
          description: "Standard package description", // Added required field
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } catch (error) {
        console.error("Package.create error:", error);
        throw error;
      }

      // Create a subpackage
      const subpackageId = `623e4567-e89b-12d3-a456-426614174${timestamp}`;
      await sequelize.models.SubPackage.create({
        id: subpackageId,
        package_id: packageId,
        name: "1-Hour Ride",
        description: "One-hour ride package",
        status: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create ride data with all required fields
      const rideId = `423e4567-e89b-12d3-a456-426614174${timestamp}`;
      await Ride.create({
        id: rideId,
        driver_id: driverId,
        status: "completed",
        dropoff_time: new Date(),
        pickup_location: JSON.stringify({ lat: 25.276987, lng: 55.296249 }),
        dropoff_location: JSON.stringify({ lat: 25.204849, lng: 55.270783 }),
        pickup_address: "Location A",
        drop_address: "Location B",
        package_id: packageId,
        subpackage_id: subpackageId,
        car_id: carId,
        Price: 50.0,
        Total: 50.0,
        rider_hours: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        payment_status: "completed",
      });

      // Create earnings data
      await Earnings.create({
        id: `723e4567-e89b-12d3-a456-426614174${timestamp}`,
        driver_id: driverId,
        ride_id: rideId,
        amount: 50.0,
        commission: 5.0,
        percentage: 10.0,
        status: "processed",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create wallet report
      await WalletReports.create({
        id: `823e4567-e89b-12d3-a456-426614174${timestamp}`,
        driver_id: driverId,
        transaction_type: "credit",
        amount: 50.0,
        balance_after: 100.0,
        transaction_date: new Date(),
        status: "completed",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it("should fetch driver account details successfully and return 200", async () => {
      const response = await request(app)
        .get("/api/v1/mobile/driver/account-details")
        .set("Authorization", `Bearer ${token}`)
        .set("Accept", "application/json");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        "message",
        "Driver account details fetched successfully."
      );
      expect(response.body).toHaveProperty("driver");
      expect(response.body).toHaveProperty("vehicle");
      expect(response.body).toHaveProperty("walletBalance", "100.00");

      const { driver, vehicle } = response.body;
      expect(driver.id).toBe(driverId);
      expect(driver.first_name).toBe("John");
      expect(driver.last_name).toBe("Doe");
      expect(driver.email).toMatch(/john\d+@example\.com/);
      expect(driver.phone).toMatch(/\+971912345678\d+/);
      expect(driver.parsed_languages).toEqual(["English", "Arabic"]);
      expect(driver.completedRidesCount).toBe(1);
      expect(driver.completionRate).toBe("100.00");
      expect(driver.totalEarnings).toBe(50);
      expect(driver.lastRideTime).toBeDefined();
      expect(vehicle).toHaveProperty("Car");
      expect(vehicle.Car.brand).toBe("Toyota");
      expect(vehicle.Car.model).toBe("Camry");
      expect(vehicle.color).toBe("Blue");
      expect(vehicle.license_plate).toMatch(/ABC123\d+/);
    });

    it("should return 401 if driver is not authorized", async () => {
      const response = await request(app)
        .get("/api/v1/mobile/driver/account-details")
        .set("Accept", "application/json"); // No Authorization header

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty(
        "message",
        "Unauthorized: No token provided"
      );
    });

    it("should return 500 if driver is not found", async () => {
      driverService.getDriverById.mockRejectedValueOnce(
        new Error("Driver not found")
      );

      const response = await request(app)
        .get("/api/v1/mobile/driver/account-details")
        .set("Authorization", `Bearer ${token}`)
        .set("Accept", "application/json");

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("message", "Internal server error");
    });

    it("should return driver details with null vehicle if no vehicle is found", async () => {
      driverCarService.getDriverCarByDriverId.mockResolvedValueOnce(null);

      const response = await request(app)
        .get("/api/v1/mobile/driver/account-details")
        .set("Authorization", `Bearer ${token}`)
        .set("Accept", "application/json");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        "message",
        "Driver account details fetched successfully."
      );
      expect(response.body).toHaveProperty("driver");
      expect(response.body).toHaveProperty("vehicle", null);
      expect(response.body).toHaveProperty("walletBalance", "100.00");

      const { driver } = response.body;
      expect(driver.id).toBe(driverId);
      expect(driver.completedRidesCount).toBe(1);
      expect(driver.totalEarnings).toBe(50);
    });

    it("should return 500 if wallet balance fetch fails", async () => {
      walletService.getWalletBalance.mockRejectedValueOnce(
        new Error("Failed to fetch wallet balance")
      );

      const response = await request(app)
        .get("/api/v1/mobile/driver/account-details")
        .set("Authorization", `Bearer ${token}`)
        .set("Accept", "application/json");

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("message", "Internal server error");
    });

    it("should return 0.00 wallet balance if no wallet entry exists", async () => {
      await WalletReports.destroy({ truncate: true, cascade: true });
      walletService.getWalletBalance.mockResolvedValueOnce("0.00");

      const response = await request(app)
        .get("/api/v1/mobile/driver/account-details")
        .set("Authorization", `Bearer ${token}`)
        .set("Accept", "application/json");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        "message",
        "Driver account details fetched successfully."
      );
      expect(response.body).toHaveProperty("walletBalance", "0.00");
    });
  });

  describe("PUT /api/v1/mobile/driver/delete-account", () => {
    let driverId, token;

    beforeEach(async () => {
      jest.clearAllMocks();
      const timestamp = Date.now();
      driverId = `123e4567-e89b-12d3-a456-426614174${timestamp}`;
      token = jwt.sign(
        { id: driverId },
        process.env.JWT_SECRET || "your-secret",
        { expiresIn: "1h" }
      );

      // Clear all relevant tables
      await Driver.destroy({ truncate: true, cascade: true });
      await DriverCar.destroy({ truncate: true, cascade: true });
      await Car.destroy({ truncate: true, cascade: true });
      await Ride.destroy({ truncate: true, cascade: true });
      await Earnings.destroy({ truncate: true, cascade: true });
      await WalletReports.destroy({ truncate: true, cascade: true });
      await sequelize.models.Package.destroy({ truncate: true, cascade: true });
      await sequelize.models.SubPackage.destroy({
        truncate: true,
        cascade: true,
      });

      // Verify table is empty
      const driverCount = await Driver.count();
      if (driverCount > 0) {
        console.error(
          `Driver table not empty before test: ${driverCount} records`
        );
      }
      const packageCount = await sequelize.models.Package.count();
      if (packageCount > 0) {
        console.error(
          `Package table not empty before test: ${packageCount} records`
        );
      }

      // Create a driver with minimal required fields
      try {
        await Driver.create({
          id: driverId,
          first_name: "John",
          last_name: "Doe",
          email: `john${timestamp}@example.com`,
          phone: `+971912345678${timestamp}`,
          status: "active",
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } catch (error) {
        console.error("Driver.create error:", error);
        throw error;
      }
    });

    it("should deactivate driver account successfully and return 200", async () => {
      // Mock checkActiveRide to return no active rides
      driverService.checkActiveRide.mockResolvedValue([]);

      const response = await request(app)
        .put("/api/v1/mobile/driver/delete-account")
        .set("Authorization", `Bearer ${token}`)
        .set("Accept", "application/json");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        "message",
        "Account deactivated successfully"
      );

      const dbDriver = await Driver.findByPk(driverId);
      expect(dbDriver).not.toBeNull();
      expect(dbDriver.status).toBe("inactive");
      expect(driverService.checkActiveRide).toHaveBeenCalledWith(driverId); // Removed second argument
    });

    it("should return 400 if driver has active rides", async () => {
      // Mock checkActiveRide to return an active ride
      driverService.checkActiveRide.mockResolvedValue([
        {
          id: "ride123",
          driver_id: driverId,
          status: "pending",
        },
      ]);

      const response = await request(app)
        .put("/api/v1/mobile/driver/delete-account")
        .set("Authorization", `Bearer ${token}`)
        .set("Accept", "application/json");

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty(
        "error",
        "Cannot deactivate account with active rides"
      );
      expect(driverService.checkActiveRide).toHaveBeenCalledWith(driverId); // Removed second argument

      // Verify driver status remains unchanged
      const dbDriver = await Driver.findByPk(driverId);
      expect(dbDriver).not.toBeNull();
      expect(dbDriver.status).toBe("active");
    });

    it("should return 400 if driver is not found", async () => {
      // Mock checkActiveRide to return no active rides
      driverService.checkActiveRide.mockResolvedValue([]);
      // Mock driverService.deactivateDriver to throw "Driver not found"
      driverService.deactivateDriver.mockRejectedValueOnce(
        new Error("Driver not found")
      );

      const response = await request(app)
        .put("/api/v1/mobile/driver/delete-account")
        .set("Authorization", `Bearer ${token}`)
        .set("Accept", "application/json");

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "Driver not found");
      expect(driverService.checkActiveRide).toHaveBeenCalledWith(driverId); // Removed second argument
    });

    it("should return 401 if driver is not authorized", async () => {
      const response = await request(app)
        .put("/api/v1/mobile/driver/delete-account")
        .set("Accept", "application/json"); // No Authorization header

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty(
        "message",
        "Unauthorized: No token provided"
      );
    });
  });

  describe("GET /api/v1/mobile/driver/check-status", () => {
    let driverId, token;

    beforeEach(async () => {
      jest.clearAllMocks();
      const timestamp = Date.now();
      driverId = `123e4567-e89b-12d3-a456-426614174${timestamp}`;
      token = jwt.sign(
        { id: driverId },
        process.env.JWT_SECRET || "your-secret",
        { expiresIn: "1h" }
      );

      //clear all relevant tables
      await Driver.destroy({ truncate: true, cascade: true });
      await DriverCar.destroy({ truncate: true, cascade: true });
      await Car.destroy({ truncate: true, cascade: true });
      await Ride.destroy({ truncate: true, cascade: true });
      await Earnings.destroy({ truncate: true, cascade: true });
      await WalletReports.destroy({ truncate: true, cascade: true });

      // Create a driver
      try {
        await Driver.create({
          id: driverId,
          first_name: "John",
          last_name: "Doe",
          email: `john${timestamp}@example.com`,
          phone: `+971912345678${timestamp}`,
          profile_pic: "https://s3.amazonaws.com/drivers/profile.jpg",
          dob: "1990-01-01",
          experience: 5,
          full_address: "123 Main St, Dubai",
          emirates_id: `784123456789012${timestamp}`,
          emirates_doc_front:
            "https://s3.amazonaws.com/drivers/emirates_front.jpg",
          emirates_doc_back:
            "https://s3.amazonaws.com/drivers/emirates_back.jpg",
          languages: JSON.stringify(["English", "Arabic"]),
          license_front: "https://s3.amazonaws.com/drivers/license_front.jpg",
          license_back: "https://s3.amazonaws.com/drivers/license_back.jpg",
          license_verification_status: "pending",
          emirates_verification_status: "pending",
          is_approved: false,
          one_signal_id: `onesignal123${timestamp}`,
          availability_status: "online",
          wallet_balance: 100.0,
          credit_ride_count: 0,
          status: "active",
          document_check_count: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } catch (error) {
        console.error("Driver.create error:", error);
        throw error;
      }

      // Create a car
      const carId = `223e4567-e89b-12d3-a456-426614174${timestamp}`;
      await Car.create({
        id: carId,
        brand: "Toyota",
        model: "Camry",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create a driver-car association
      await DriverCar.create({
        id: `323e4567-e89b-12d3-a456-426614174${timestamp}`,
        driver_id: driverId,
        car_id: carId,
        color: "Blue",
        license_plate: `ABC123${timestamp}`,
        car_photos: JSON.stringify([
          "https://s3.amazonaws.com/driver-cars/car1.jpg",
        ]),
        rc_doc: "https://s3.amazonaws.com/driver-cars/rc_doc.jpg",
        rc_doc_back: "https://s3.amazonaws.com/driver-cars/rc_doc_back.jpg",
        insurance_doc: "https://s3.amazonaws.com/driver-cars/insurance_doc.jpg",
        rc_doc_status: "pending",
        insurance_doc_status: "pending",
        is_approved: false,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create a completed ride
      // Create a package
      const packageId = `523e4567-e89b-12d3-a456-426614174${timestamp}`;
      await sequelize.models.Package.create({
        id: packageId,
        name: `Standard Package ${timestamp}`,
        status: "active",
        description: "Standard package description",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create a subpackage
      const subpackageId = `623e4567-e89b-12d3-a456-426614174${timestamp}`;
      await sequelize.models.SubPackage.create({
        id: subpackageId,
        package_id: packageId,
        name: "1-Hour Ride",
        description: "One-hour ride package",
        status: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create a completed ride
      const rideId = `423e4567-e89b-12d3-a456-426614174${timestamp}`;
      await Ride.create({
        id: rideId,
        driver_id: driverId,
        package_id: packageId,
        subpackage_id: subpackageId,
        status: "completed",
        dropoff_time: new Date(),
        pickup_location: JSON.stringify({ lat: 25.276987, lng: 55.296249 }),
        dropoff_location: JSON.stringify({ lat: 25.204849, lng: 55.270783 }),
        pickup_address: "Location A",
        drop_address: "Location B",
        car_id: carId,
        Price: 50.0,
        Total: 50.0,
        rider_hours: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        payment_status: "completed",
      });

      // Create earnings data
      await Earnings.create({
        id: `723e4567-e89b-12d3-a456-426614174${timestamp}`,
        driver_id: driverId,
        ride_id: rideId,
        amount: 50.0,
        commission: 5.0,
        percentage: 10.0,
        status: "processed",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it("should return driver and vehicle status sucessfully and return 200", async () => {
      const response = await request(app)
        .get("/api/v1/mobile/driver/check-status")
        .set("Authorization", `Bearer ${token}`)
        .set("Accept", "application/json");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty(
        "message",
        "Driver and vehicle data fetched successfully"
      );
      expect(response.body).toHaveProperty("data");
      expect(response.body.data).toHaveProperty("driver");
      expect(response.body.data).toHaveProperty("vehicle");

      const { driver, vehicle } = response.body.data;
      expect(driver.id).toBe(driverId);
      expect(driver.first_name).toBe("John");
      expect(driver.last_name).toBe("Doe");
      expect(driver.email).toMatch(/john\d+@example\.com/);
      expect(driver.phone).toMatch(/\+971912345678\d+/);
      expect(driver.parsed_languages).toEqual(["English", "Arabic"]);
      expect(driver.completedRidesCount).toBe(1);
      expect(driver.completionRate).toBe("100.00");
      expect(driver.totalEarnings).toBe(50);
      expect(driver.lastRideTime).toBeDefined();
      expect(driver.status).toBe("active");

      expect(vehicle).toHaveProperty("Car");
      expect(vehicle.Car.brand).toBe("Toyota");
      expect(vehicle.Car.model).toBe("Camry");
      expect(vehicle.color).toBe("Blue");
      expect(vehicle.license_plate).toMatch(/ABC123\d+/);
      expect(vehicle.rc_doc_status).toBe("pending");
      expect(vehicle.insurance_doc_status).toBe("pending");
    });

    it("should return 400 if no driver ID is provided", async () => {
      const invalidToken = jwt.sign(
        {},
        process.env.JWT_SECRET || "your-secret",
        { expiresIn: "1h" }
      );

      const response = await request(app)
        .get("/api/v1/mobile/driver/check-status")
        .set("Authorization", `Bearer ${invalidToken}`)
        .set("Accept", "application/json");

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty(
        "message",
        "Invalid or blocked account - Driver not found"
      );
    });

    it("should return 401 if no token is provided", async () => {
      const response = await request(app)
        .get("/api/v1/mobile/driver/check-status")
        .set("Accept", "application/json");

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty(
        "message",
        "Unauthorized: No token provided"
      );
    });

    it("should return 404 if driver is not found", async () => {
      driverService.getDriverById.mockResolvedValueOnce(null); // Mock driver not found

      const response = await request(app)
        .get("/api/v1/mobile/driver/check-status")
        .set("Authorization", `Bearer ${token}`)
        .set("Accept", "application/json");

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("message", "Driver not found");
    });

    it("should return 404 if vehicle is not found", async () => {
      driverCarService.getDriverCarByDriverId.mockResolvedValueOnce(null); // Mock vehicle not found

      const response = await request(app)
        .get("/api/v1/mobile/driver/check-status")
        .set("Authorization", `Bearer ${token}`)
        .set("Accept", "application/json");

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("message", "Vehicle not found");
    });
  });

  describe("GET /api/v1/mobile/driver/get-notify-statuses", () => {
    let driverId, token;

    beforeEach(async () => {
      jest.clearAllMocks();
      const timestamp = Date.now();
      driverId = `123e4567-e89b-12d3-a456-426614174${timestamp}`;
      token = jwt.sign(
        { id: driverId },
        process.env.JWT_SECRET || "your-secret",
        { expiresIn: "1h" }
      );

      // Clear relevant tables
      await Driver.destroy({ truncate: true, cascade: true });

      // Create a driver
      try {
        await Driver.create({
          id: driverId,
          first_name: "John",
          last_name: "Doe",
          email: `john${timestamp}@example.com`,
          phone: `+971912345678${timestamp}`,
          ride_request: true,
          system_alerts: true,
          earning_updates: true,
          status: "active",
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } catch (error) {
        console.error("Driver.create error:", error);
        throw error;
      }
    });

    it("should return driver notification statuses successfully and return 200", async () => {
      const response = await request(app)
        .get("/api/v1/mobile/driver/get-notify-statuses")
        .set("Authorization", `Bearer ${token}`)
        .set("Accept", "application/json");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty(
        "message",
        "Driver statuses fetched successfully"
      );
      expect(response.body).toHaveProperty("data");
      expect(response.body.data).toHaveProperty("ride_request", true);
      expect(response.body.data).toHaveProperty("system_alerts", true);
      expect(response.body.data).toHaveProperty("earning_updates", true);
    });

    it("should return 401 if no driver ID is provided", async () => {
      const invalidToken = jwt.sign(
        {},
        process.env.JWT_SECRET || "your-secret",
        { expiresIn: "1h" }
      );

      const response = await request(app)
        .get("/api/v1/mobile/driver/get-notify-statuses")
        .set("Authorization", `Bearer ${invalidToken}`)
        .set("Accept", "application/json");

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty(
        "message",
        "Invalid or blocked account - Driver not found"
      );
    });

    it("should return 404 if driver is not found", async () => {
      driverService.getStatusByDriver.mockResolvedValueOnce(null); // Simulate driver not found

      const response = await request(app)
        .get("/api/v1/mobile/driver/get-notify-statuses")
        .set("Authorization", `Bearer ${token}`)
        .set("Accept", "application/json");

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("message", "Driver not found");
    });

    it("should return 500 if an unexpected error occurs", async () => {
      driverService.getStatusByDriver.mockRejectedValueOnce(
        new Error("Database error")
      );

      const response = await request(app)
        .get("/api/v1/mobile/driver/get-notify-statuses")
        .set("Authorization", `Bearer ${token}`)
        .set("Accept", "application/json");

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("message", "Internal server error");
    });
  });

  describe("PUT /api/v1/mobile/driver/update-notify-statuses", () => {
    let driverId, token;

    beforeEach(async () => {
      jest.clearAllMocks();
      const timestamp = Date.now();
      driverId = `123e4567-e89b-12d3-a456-426614174${timestamp}`;
      token = jwt.sign(
        { id: driverId },
        process.env.JWT_SECRET || "your-secret",
        { expiresIn: "1h" }
      );

      // Clear relevant tables
      await Driver.destroy({ truncate: true, cascade: true });

      // Create a driver
      try {
        await Driver.create({
          id: driverId,
          first_name: "John",
          last_name: "Doe",
          email: `john${timestamp}@example.com`,
          phone: `+971912345678${timestamp}`,
          ride_request: true,
          system_alerts: true,
          earning_updates: true,
          status: "active",
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } catch (error) {
        console.error("Driver.create error:", error);
        throw error;
      }
    });

    it("should update driver notification statuses successfully and return 200", async () => {
      // Mock updateDriverProfile for this test
      driverService.updateDriverProfile.mockImplementation(
        async (driverId, updates) => {
          const mockDriver = await Driver.findByPk(driverId);
          if (!mockDriver) {
            throw new Error("Driver not found");
          }
          await mockDriver.update(updates);
          return mockDriver;
        }
      );

      const updateData = {
        ride_request: false,
        system_alerts: true,
        earning_updates: false,
      };

      const response = await request(app)
        .put("/api/v1/mobile/driver/update-notify-statuses")
        .set("Authorization", `Bearer ${token}`)
        .set("Accept", "application/json")
        .send(updateData);

      console.log("Response body:", response.body); // Debug the response

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty(
        "message",
        "Driver statuses updated successfully"
      );
      expect(response.body).toHaveProperty("data");
      expect(response.body.data).toHaveProperty("ride_request", false);
      expect(response.body.data).toHaveProperty("system_alerts", true);
      expect(response.body.data).toHaveProperty("earning_updates", false);

      const dbDriver = await Driver.findByPk(driverId);
      expect(dbDriver.ride_request).toBe(false);
      expect(dbDriver.system_alerts).toBe(true);
      expect(dbDriver.earning_updates).toBe(false);
    });

    it("should return 401 if no driver ID is provided", async () => {
      const invalidToken = jwt.sign(
        {},
        process.env.JWT_SECRET || "your-secret",
        { expiresIn: "1h" }
      );

      const response = await request(app)
        .put("/api/v1/mobile/driver/update-notify-statuses")
        .set("Authorization", `Bearer ${invalidToken}`)
        .set("Accept", "application/json")
        .send({ ride_request: false });

      expect(response.status).toBe(401); // Update to match controller's response
      expect(response.body).toHaveProperty(
        "message",
        "Invalid or blocked account - Driver not found"
      );
    });

    it("should return 404 if driver is not found", async () => {
      driverService.updateDriverProfile.mockResolvedValueOnce(null); // Simulate driver not found

      const response = await request(app)
        .put("/api/v1/mobile/driver/update-notify-statuses")
        .set("Authorization", `Bearer ${token}`)
        .set("Accept", "application/json")
        .send({ ride_request: false });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("message", "Driver not found");
    });

    it("should return 400 if request body is invalid", async () => {
      const invalidData = {
        ride_request: "invalid", // Should be boolean or null
      };

      const response = await request(app)
        .put("/api/v1/mobile/driver/update-notify-statuses")
        .set("Authorization", `Bearer ${token}`)
        .set("Accept", "application/json")
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty(
        "message",
        '"ride_request" must be a boolean'
      );
    });

    it("should return 500 if an unexpected error occurs", async () => {
      driverService.updateDriverProfile.mockRejectedValueOnce(
        new Error("Database error")
      );

      const response = await request(app)
        .put("/api/v1/mobile/driver/update-notify-statuses")
        .set("Authorization", `Bearer ${token}`)
        .set("Accept", "application/json")
        .send({ ride_request: false });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("message", "Internal server error");
    });
  });

  describe("PUT /api/v1/mobile/driver/update-onesignal-id", () => {
    let driverId, token;

    beforeEach(async () => {
      jest.clearAllMocks();
      const timestamp = Date.now();
      driverId = `123e4567-e89b-12d3-a456-426614174${timestamp}`;
      token = jwt.sign(
        { id: driverId },
        process.env.JWT_SECRET || "your-secret",
        { expiresIn: "1h" }
      );

      // Clear relevant tables
      await Driver.destroy({ truncate: true, cascade: true });

      // Create a driver
      try {
        await Driver.create({
          id: driverId,
          first_name: "John",
          last_name: "Doe",
          email: `john${timestamp}@example.com`,
          phone: `+971912345678${timestamp}`,
          status: "active",
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } catch (error) {
        console.error("Driver.create error:", error);
        throw error;
      }
    });

    it("should update OneSignal ID successfully and return 200", async () => {
      const oneSignalData = {
        oneSignalId: "onesignal-12345",
      };

      const response = await request(app)
        .put("/api/v1/mobile/driver/update-onesignal-id")
        .set("Authorization", `Bearer ${token}`)
        .set("Accept", "application/json")
        .send(oneSignalData);

      console.log("Response body:", response.body);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty(
        "message",
        "OneSignal ID updated successfully"
      );
      expect(response.body).toHaveProperty("data");
      expect(response.body.data).toHaveProperty(
        "one_signal_id",
        "onesignal-12345"
      );

      const dbDriver = await Driver.findByPk(driverId);
      expect(dbDriver.one_signal_id).toBe("onesignal-12345");
    });

    it("should return 400 if oneSignalId is not provided", async () => {
      const response = await request(app)
        .put("/api/v1/mobile/driver/update-onesignal-id")
        .set("Authorization", `Bearer ${token}`)
        .set("Accept", "application/json")
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty(
        "message",
        "Driver ID and OneSignal ID are required"
      );
    });

    it("should return 401 if no driver ID is provided in token", async () => {
      const invalidToken = jwt.sign(
        {},
        process.env.JWT_SECRET || "your-secret",
        { expiresIn: "1h" }
      );

      const response = await request(app)
        .put("/api/v1/mobile/driver/update-onesignal-id")
        .set("Authorization", `Bearer ${invalidToken}`)
        .set("Accept", "application/json")
        .send({ oneSignalId: "onesignal-12345" });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty(
        "message",
        "Invalid or blocked account - Driver not found"
      );
    });

    it("should return 500 if an unexpected error occurs", async () => {
      driverService.updateOneSignalPlayerId.mockRejectedValueOnce(
        new Error("Database error")
      );

      const response = await request(app)
        .put("/api/v1/mobile/driver/update-onesignal-id")
        .set("Authorization", `Bearer ${token}`)
        .set("Accept", "application/json")
        .send({ oneSignalId: "onesignal-12345" });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("message", "Internal server error");
    });
  });

  describe("PUT /api/v1/mobile/driver/:id/delete-onesignal-id", () => {
    let driverId, token, timestamp;

    beforeEach(async () => {
      jest.clearAllMocks();
      timestamp = Date.now();
      driverId = `123e4567-e89b-12d3-a456-426614174${timestamp}`;
      token = jwt.sign(
        { id: driverId },
        process.env.JWT_SECRET || "your-secret",
        { expiresIn: "1h" }
      );

      // Clear relevant tables, including soft-deleted records
      await Driver.destroy({ truncate: true, cascade: true, force: true });

      // Create a driver with a unique one_signal_id within a transaction
      const transaction = await sequelize.transaction();
      try {
        await Driver.create(
          {
            id: driverId,
            first_name: "John",
            last_name: "Doe",
            email: `john${timestamp}@example.com`,
            phone: `+971912345678${timestamp}`,
            status: "active",
            one_signal_id: `onesignal-12345-${timestamp}`, // Use unique one_signal_id
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          { transaction }
        );

        // Verify driver creation
        const createdDriver = await Driver.findByPk(driverId, { transaction });
        if (!createdDriver) {
          throw new Error(`Failed to create driver with ID: ${driverId}`);
        }
        console.log("Driver created successfully:", createdDriver.toJSON());
        expect(createdDriver.one_signal_id).toBe(
          `onesignal-12345-${timestamp}`
        );
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        console.error("Driver.create error:", error);
        throw error;
      }
    });

    it("should delete OneSignal ID successfully and return 200", async () => {
      const transaction = await sequelize.transaction();
      try {
        // Verify the driver has the initial one_signal_id
        const driver = await Driver.findByPk(driverId, { transaction });
        console.log(
          "Driver before API call:",
          driver ? driver.toJSON() : "Not found"
        );
        expect(driver).not.toBeNull();
        expect(driver.one_signal_id).toBe(`onesignal-12345-${timestamp}`); // Use timestamp from beforeEach

        const response = await request(app)
          .put(`/api/v1/mobile/driver/${driverId}/delete-onesignal-id`)
          .set("Authorization", `Bearer ${token}`)
          .set("Accept", "application/json");

        console.log("Response body:", response.body);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("success", true);
        expect(response.body).toHaveProperty(
          "message",
          "OneSignal ID deleted successfully"
        );
        expect(response.body).toHaveProperty("data");
        expect(response.body.data).toHaveProperty("one_signal_id", null);

        const dbDriver = await Driver.findByPk(driverId, { transaction });
        expect(dbDriver).not.toBeNull();
        expect(dbDriver.one_signal_id).toBeNull();
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        console.error("Test error:", error);
        throw error;
      }
    });

    it("should return 401 if no driver ID is provided in token", async () => {
      const invalidToken = jwt.sign(
        {},
        process.env.JWT_SECRET || "your-secret",
        { expiresIn: "1h" }
      );

      const response = await request(app)
        .put(`/api/v1/mobile/driver/${driverId}/delete-onesignal-id`)
        .set("Authorization", `Bearer ${invalidToken}`)
        .set("Accept", "application/json");

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty(
        "message",
        "Invalid or blocked account - Driver not found"
      );
    });

    it("should return 500 if an unexpected error occurs", async () => {
      driverService.deleteOneSignalPlayerId.mockRejectedValueOnce(
        new Error("Database error")
      );

      const response = await request(app)
        .put(`/api/v1/mobile/driver/${driverId}/delete-onesignal-id`)
        .set("Authorization", `Bearer ${token}`)
        .set("Accept", "application/json");

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("message", "Internal server error");
    });

    it("should return 200 even if OneSignal ID is already null", async () => {
      const transaction = await sequelize.transaction();
      try {
        // Set one_signal_id to null
        const driver = await Driver.findByPk(driverId, { transaction });
        await driver.update({ one_signal_id: null }, { transaction });

        const response = await request(app)
          .put(`/api/v1/mobile/driver/${driverId}/delete-onesignal-id`)
          .set("Authorization", `Bearer ${token}`)
          .set("Accept", "application/json");

        console.log("Response body:", response.body);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("success", true);
        expect(response.body).toHaveProperty(
          "message",
          "OneSignal ID deleted successfully"
        );
        expect(response.body).toHaveProperty("data");
        expect(response.body.data).toHaveProperty("one_signal_id", null);

        const dbDriver = await Driver.findByPk(driverId, { transaction });
        expect(dbDriver).not.toBeNull();
        expect(dbDriver.one_signal_id).toBeNull();
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        console.error("Test error:", error);
        throw error;
      }
    });
  });
});
