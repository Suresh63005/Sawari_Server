// tests/unit/mobile/driver.test.js

const { verifyDriverMobile } = require("../../../src/services/driver.service");
const driverFirebase = require("firebase-admin");
const { generateToken } = require("../../../src/utils/tokenUtils");
const { normalizePhone } = require("../../../src/utils/phoneUtils"); // Now correctly importing normalizePhone

// Mock Firebase Admin
jest.mock("firebase-admin", () => ({
  auth: jest.fn(() => ({
    verifyIdToken: jest.fn(),
  })),
}));

// Mock token generator
jest.mock("../../../src/utils/tokenUtils", () => ({
  generateToken: jest.fn(),
}));

// Mock normalizePhone from utils/phoneUtils.js
jest.mock("../../../src/utils/phoneUtils", () => ({
  normalizePhone: jest.fn(), // Now mocking the correctly named function
}));

// Mock the index.js module to return mocked models
jest.mock("../../../src/models/index", () => {
  const { Sequelize, DataTypes } = require("sequelize");
  const sequelize = new Sequelize("sqlite::memory:", { logging: false });

  const Driver = sequelize.define("Driver", {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    email: { type: DataTypes.STRING, unique: true },
    phone: { type: DataTypes.STRING, unique: true },
    status: {
      type: DataTypes.ENUM("active", "inactive", "blocked", "rejected"),
    },
    last_login: { type: DataTypes.DATE },
    social_login: { type: DataTypes.ENUM("google") },
    document_check_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  });

  // Other models...
  const Admin = sequelize.define("Admin", {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
  });
  const Ride = sequelize.define("Ride", {});
  const DriverCar = sequelize.define("DriverCar", {});
  const Earnings = sequelize.define("Earnings", {});
  const PaymentReports = sequelize.define("PaymentReports", {});
  const Permissions = sequelize.define("Permissions", {});
  const WalletReports = sequelize.define("WalletReports", {});
  const Review = sequelize.define("Review", {});
  const Car = sequelize.define("Car", {});
  const Package = sequelize.define("Package", {});
  const SubPackage = sequelize.define("SubPackage", {});
  const PackagePrice = sequelize.define("PackagePrice", {});

  return {
    Driver,
    Admin,
    Ride,
    DriverCar,
    Earnings,
    PaymentReports,
    Permissions,
    WalletReports,
    Review,
    Car,
    Package,
    SubPackage,
    PackagePrice,
    sequelize,
    Sequelize,
  };
});

// Apply associations
require("../../../src/models/associations");

describe("verifyDriverMobile", () => {
  let Driver;
  let mockVerifyIdToken; // Hold a reference to the mocked Firebase verifyIdToken

  beforeEach(() => {
    jest.clearAllMocks();
    Driver = require("../../../src/models/index").Driver;
    Driver.prototype.save = jest.fn().mockResolvedValue(true);

    // Get the actual mocked verifyIdToken function
    mockVerifyIdToken = driverFirebase.auth().verifyIdToken;
    mockVerifyIdToken.mockReset(); // Reset it for each test

    normalizePhone.mockReset(); // Reset the normalizePhone mock for each test
  });

  describe("Google Social Login", () => {
    it("should verify driver with valid Google token and existing driver", async () => {
      const mockToken = "valid-token";
      const mockEmail = "test@example.com";
      const mockDriver = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        email: mockEmail,
        status: "active",
        last_login: null,
        save: jest.fn().mockResolvedValue(true),
      };
      const mockJwtToken = "jwt-token";

      mockVerifyIdToken.mockResolvedValue({ email: mockEmail });
      jest.spyOn(Driver, "findOne").mockResolvedValue(mockDriver);
      generateToken.mockReturnValue(mockJwtToken);

      const result = await verifyDriverMobile(
        null,
        mockToken,
        mockEmail,
        "google"
      );

      expect(mockVerifyIdToken).toHaveBeenCalledWith(mockToken);
      expect(Driver.findOne).toHaveBeenCalledWith({
        where: { email: mockEmail },
      });
      expect(mockDriver.save).toHaveBeenCalled();
      expect(generateToken).toHaveBeenCalledWith(mockDriver.id);
      expect(result).toEqual({
        message: "Driver verified",
        token: mockJwtToken,
        driver: mockDriver,
      });
    });

    it("should create new driver if not found with Google login", async () => {
      const mockToken = "valid-token";
      const mockEmail = "test@example.com";
      const mockDriver = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        email: mockEmail,
        social_login: "google",
        last_login: expect.any(Date),
        status: "inactive",
        document_check_count: 0,
        save: jest.fn().mockResolvedValue(true),
      };
      const mockJwtToken = "jwt-token";

      mockVerifyIdToken.mockResolvedValue({ email: mockEmail });
      jest.spyOn(Driver, "findOne").mockResolvedValue(null);
      jest.spyOn(Driver, "create").mockResolvedValue(mockDriver);
      generateToken.mockReturnValue(mockJwtToken);

      const result = await verifyDriverMobile(
        null,
        mockToken,
        mockEmail,
        "google"
      );

      expect(Driver.create).toHaveBeenCalledWith({
        email: mockEmail,
        social_login: "google",
        last_login: expect.any(Date),
        status: "inactive",
        document_check_count: 0,
      });
      expect(result).toEqual({
        message: "Driver verified",
        token: mockJwtToken,
        driver: mockDriver,
      });
    });

    it("should throw error for blocked driver with Google login", async () => {
      const mockToken = "valid-token";
      const mockEmail = "test@example.com";
      const mockDriver = {
        email: mockEmail,
        status: "blocked",
      };

      mockVerifyIdToken.mockResolvedValue({ email: mockEmail });
      jest.spyOn(Driver, "findOne").mockResolvedValue(mockDriver);

      await expect(
        verifyDriverMobile(null, mockToken, mockEmail, "google")
      ).rejects.toThrow(
        "Your account has been blocked due to multiple failed login / document upload attempts. Please contact the administrator for assistance."
      );
    });

    it("should throw error for email mismatch with Google token", async () => {
      const mockToken = "valid-token";
      const mockEmail = "test@example.com";

      mockVerifyIdToken.mockResolvedValue({ email: "different@example.com" });

      await expect(
        verifyDriverMobile(null, mockToken, mockEmail, "google")
      ).rejects.toThrow("Email mismatch with token");
    });

    it("should throw error if email is missing for Google login", async () => {
      await expect(
        verifyDriverMobile(null, "valid-token", null, "google")
      ).rejects.toThrow("Email is required");
    });
  });

  describe("Phone Login", () => {
    it("should verify driver with valid phone token and existing driver", async () => {
      const mockPhone = "1234567890";
      const mockToken = "valid-token";
      const expectedNormalizedPhone = "+9711234567890"; // Based on your normalizePhone logic
      const mockDriver = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        phone: expectedNormalizedPhone,
        status: "active",
        last_login: null,
        save: jest.fn().mockResolvedValue(true),
      };
      const mockJwtToken = "jwt-token";

      normalizePhone.mockResolvedValue(expectedNormalizedPhone); // Mock the correctly named function
      mockVerifyIdToken.mockResolvedValue({ phone_number: "+91" + mockPhone });
      jest.spyOn(Driver, "findOne").mockResolvedValue(mockDriver);
      generateToken.mockReturnValue(mockJwtToken);

      const result = await verifyDriverMobile(mockPhone, mockToken, null, null);

      expect(normalizePhone).toHaveBeenCalledWith(mockPhone); // Assert the correctly named function was called
      expect(mockVerifyIdToken).toHaveBeenCalledWith(mockToken);
      expect(Driver.findOne).toHaveBeenCalledWith({
        where: { phone: expectedNormalizedPhone },
      });
      expect(mockDriver.save).toHaveBeenCalled();
      expect(generateToken).toHaveBeenCalledWith(mockDriver.id);
      expect(result).toEqual({
        message: "Driver verified",
        token: mockJwtToken,
        driver: mockDriver,
      });
    });

    it("should create new driver if not found with phone login", async () => {
      const mockPhone = "1234567890";
      const mockToken = "valid-token";
      const expectedNormalizedPhone = "+9711234567890";
      const mockDriver = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        phone: expectedNormalizedPhone,
        status: "inactive",
        last_login: expect.any(Date),
        save: jest.fn().mockResolvedValue(true),
      };
      const mockJwtToken = "jwt-token";

      normalizePhone.mockResolvedValue(expectedNormalizedPhone);
      mockVerifyIdToken.mockResolvedValue({ phone_number: "+91" + mockPhone });
      jest
        .spyOn(Driver, "findOne")
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      jest.spyOn(Driver, "create").mockResolvedValue(mockDriver);
      generateToken.mockReturnValue(mockJwtToken);

      const result = await verifyDriverMobile(mockPhone, mockToken, null, null);

      expect(normalizePhone).toHaveBeenCalledWith(mockPhone);
      expect(Driver.create).toHaveBeenCalledWith({
        phone: expectedNormalizedPhone,
        email: null,
        last_login: expect.any(Date),
        status: "inactive",
      });
      expect(result).toEqual({
        message: "Driver verified",
        token: mockJwtToken,
        driver: mockDriver,
      });
    });

    it("should throw error for blocked driver with phone login", async () => {
      const mockPhone = "1234567890";
      const mockToken = "valid-token";
      const expectedNormalizedPhone = "+9711234567890";
      const mockDriver = {
        phone: expectedNormalizedPhone,
        status: "blocked",
      };

      normalizePhone.mockResolvedValue(expectedNormalizedPhone);
      mockVerifyIdToken.mockResolvedValue({ phone_number: "+91" + mockPhone });
      jest.spyOn(Driver, "findOne").mockResolvedValue(mockDriver);

      await expect(
        verifyDriverMobile(mockPhone, mockToken, null, null)
      ).rejects.toThrow(
        "Your account has been blocked due to multiple failed login / document upload attempts. Please contact the administrator for assistance."
      );
    });

    it("should throw error for phone number mismatch with token", async () => {
      const mockPhone = "1234567890";
      const mockToken = "valid-token";
      const expectedNormalizedPhone = "+9711234567890";

      normalizePhone.mockResolvedValue(expectedNormalizedPhone);
      mockVerifyIdToken.mockResolvedValue({ phone_number: "+919876543210" }); // Different phone number in token

      await expect(
        verifyDriverMobile(mockPhone, mockToken, null, null)
      ).rejects.toThrow("Phone number mismatch with token");
    });

    it("should throw error if phone number is missing", async () => {
      await expect(
        verifyDriverMobile(null, "valid-token", null, null)
      ).rejects.toThrow("Phone number is required");
    });

    it("should throw error for invalid phone number format", async () => {
      normalizePhone.mockResolvedValue(null); // Mock normalizePhone to return null

      await expect(
        verifyDriverMobile("invalid-phone", "valid-token", null, null)
      ).rejects.toThrow("Invalid phone number format");
    });
  });

  it("should throw error if token is missing", async () => {
    await expect(
      verifyDriverMobile("1234567890", null, "test@example.com", "google")
    ).rejects.toThrow("Token is required");
  });
});
