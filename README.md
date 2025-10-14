# Sawari_Server

upsertRide (home.controller) need to correct

1)driver can create a new ride and they got (10% of ride) commission when ride is completed.
2)and ui have logo if driver created their logo will shown in the app. if not then default logo will be shown.(nothing logo)

3.

# pending

need to check if driver is accepted id they cant delete or deactivate their account until ride complete
->before accepting ride need to check minium balance is thier or not
-> change INR TO AED in while wallet top-up

Perfect — here’s a complete example of adding RSA digital signature to your current Razorpay payment flow.

We’ll cover:

🔐 Goal
Server signs order/payment data using a private key (RSA)

Client or verification step can use the public key to confirm authenticity

This gives you data integrity + non-repudiation

🔧 Setup (One-Time)
✅ Generate RSA Keys (on server)
bash
Copy
Edit

# Generate private key (keep this secret)

openssl genpkey -algorithm RSA -out private_key.pem -pkeyopt rsa_keygen_bits:2048

# Generate public key (can be shared for verification)

openssl rsa -in private_key.pem -pubout -out public_key.pem
Store these securely — ideally outside the project folder and never commit them to Git.

📦 Dependencies
bash
Copy
Edit
npm install fs crypto
📄 addMoneyToWallet (With RSA Signature)
js
Copy
Edit
const fs = require("fs");
const crypto = require("crypto");

const addMoneyToWallet = async (req, res) => {
const driver_id = req.driver?.id;
const { amount } = req.body;

if (!driver_id) return res.status(401).json({ message: "Unauthorized" });
if (!amount || amount <= 0) return res.status(400).json({ message: "Invalid amount" });

try {
const options = {
amount: amount \* 100, // in paise
currency: "INR",
receipt: uuidv4(),
notes: { driver_id }
};

    const order = await razorpayInstance.orders.create(options);

    // 🔏 Create digital signature of the order
    const privateKey = fs.readFileSync("path/to/private_key.pem", "utf-8");
    const payload = JSON.stringify({
      order_id: order.id,
      amount: amount,
      driver_id,
    });

    const sign = crypto.createSign("RSA-SHA256");
    sign.update(payload);
    sign.end();

    const rsaSignature = sign.sign(privateKey, "base64");

    return res.status(200).json({
      success: true,
      message: "Razorpay order created",
      data: order,
      rsa_signature: rsaSignature, // send to client for optional validation
      payload,
    });

} catch (error) {
console.error("Order creation error:", error);
return res.status(500).json({
success: false,
message: "Razorpay order creation failed",
});
}
};
✅ verifyPayment (Verifies Razorpay + RSA Signature)
js
Copy
Edit
const verifyPayment = async (req, res) => {
const driver_id = req.driver?.id;
const { order_id, payment_id, signature, amount, rsa_signature, rsa_payload } = req.body;

if (!driver_id) return res.status(401).json({ message: "Unauthorized" });
if (!order_id || !payment_id || !signature || !amount || !rsa_signature || !rsa_payload) {
return res.status(400).json({ message: "Missing required fields" });
}

let t;
try {
// 🛡️ Step 1: Verify Razorpay Signature
const secret = process.env.KEY_SECRET;
const generatedSignature = crypto
.createHmac("sha256", secret)
.update(`${order_id}|${payment_id}`)
.digest("hex");

    if (generatedSignature !== signature) {
      return res.status(401).json({ success: false, message: "Invalid Razorpay signature" });
    }

    // 🛡️ Step 2: Verify RSA Signature
    const publicKey = fs.readFileSync("path/to/public_key.pem", "utf-8");

    const verify = crypto.createVerify("RSA-SHA256");
    verify.update(rsa_payload);
    verify.end();

    const isSignatureValid = verify.verify(publicKey, rsa_signature, "base64");

    if (!isSignatureValid) {
      return res.status(403).json({ success: false, message: "Invalid RSA signature" });
    }

    // 🛑 Step 3: Check for duplicate
    const existingReport = await WalletReport.findOne({ where: { order_id } });
    if (existingReport) {
      return res.status(200).json({
        success: true,
        message: "Payment already processed",
        data: existingReport
      });
    }

    // ✅ Step 4: Update wallet & save report
    t = await sequelize.transaction();

    const driver = await getDriverById(driver_id);
    const updatedBalance = parseFloat(driver.wallet_balance || 0) + parseFloat(amount);

    await updateDriverBalance(driver_id, updatedBalance);
    await createWalletReport(driver_id, amount, updatedBalance, order_id, t);

    await t.commit();

    return res.status(200).json({
      success: true,
      message: "Payment verified, wallet updated"
    });

} catch (error) {
if (t) await t.rollback();
console.error("Payment verification error:", error);
return res.status(500).json({ message: "Internal server error", error: error.message });
}
};
✅ Payload Sent to Client
Client receives:

json
Copy
Edit
{
"rsa_signature": "signed_payload_string",
"payload": "{\"order_id\":\"order_xyz\",\"amount\":100,\"driver_id\":42}"
}
They can verify it (optionally) before sending to /verify-payment.

🔐 Summary
Feature Benefit
RSA Digital Signature Ensures request is genuine and untampered
Razorpay Signature Check Confirms payment authenticity
order_id check Prevents duplicate payment
Transaction rollback Avoids partial updates on failure

Would you like a sample public_key.pem / private_key.pem to test locally?

You said:

# Generate private key (keep this secret)

openssl genpkey -algorithm RSA -out private_key.pem -pkeyopt rsa_keygen_bits:2048

# Generate public key (can be shared for verification)

openssl rsa -in private_key.pem -pubout -out public_key.pem

i want full explanation about that

ChatGPT said:
Absolutely! Let's break down those OpenSSL commands step by step so you fully understand what you're doing and why.

🔐 What You're Doing
You're creating an RSA key pair:

private_key.pem – used to sign data (keep it secure)

public_key.pem – used to verify the signature (can be shared)

This is the foundation of asymmetric cryptography, commonly used in:

Digital signatures

HTTPS

JWTs (with RS256)

Secure API requests

🧰 Command Breakdown
🔑 Step 1: Generate the Private Key
bash
Copy
Edit
openssl genpkey -algorithm RSA -out private_key.pem -pkeyopt rsa_keygen_bits:2048
🔍 What this does:
Part Meaning
openssl The CLI tool for using OpenSSL (crypto toolkit)
genpkey Command to generate a private key
-algorithm RSA Specifies you're generating an RSA key
-out private_key.pem The output file (PEM format) to save the private key
-pkeyopt rsa_keygen_bits:2048 Sets the key size to 2048 bits (secure for most use cases)

🔐 Result: private_key.pem
This file contains your RSA private key — used for signing.

🔐 Sample Output (private_key.pem)
pem
Copy
Edit
-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkq...
... (a long Base64-encoded key) ...
-----END PRIVATE KEY-----
Keep this secret! Store it in .env, a secrets manager, or secured file storage.

🗝️ Step 2: Generate the Public Key
bash
Copy
Edit
openssl rsa -in private_key.pem -pubout -out public_key.pem
🔍 What this does:
Part Meaning
openssl rsa Uses the RSA algorithm
-in private_key.pem Reads the previously generated private key
-pubout Tells OpenSSL to extract the public key from it
-out public_key.pem Saves the result to a file

🔓 Result: public_key.pem
This file contains your RSA public key — used to verify signatures.

🛂 Sample Output (public_key.pem)
pem
Copy
Edit
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9...
... (a long Base64-encoded key) ...
-----END PUBLIC KEY-----
Safe to share with clients or other services to verify your signed data.

🔁 How These Keys Work Together
Signing (with private key):
text
Copy
Edit
Your Server
|
|-- sign(payload, private_key) --> signature
Verifying (with public key):
text
Copy
Edit
Client / Other Service
|
|-- verify(payload, signature, public_key) --> ✅ or ❌
💡 Only your private key can generate a signature that matches your public key.

⚠️ Security Tips
🔒 Best Practice Why
Never expose private_key.pem If leaked, others can forge signatures
Use at least 2048 bits 1024-bit RSA is not secure anymore
Store keys securely Use .env, AWS Secrets Manager, Vault, etc.
Set correct file permissions Only your app/user should read the private key file

bash
Copy
Edit
chmod 600 private_key.pem
💡 Real-World Uses of RSA Keys
JWT with RS256 (e.g., Auth0): Signs with private key, verifies with public key

Webhook signing: APIs sign messages with private keys, you verify them

Digital contracts: Sign PDFs or docs with RSA

SSL/TLS: HTTPS uses public/private keys for secure connections

✅ Summary
Key Usage Shareable?
private_key.pem Signing data ❌ Never share
public_key.pem Verifying data ✅ Safe to share

for eslint
->npm install eslint --save-dev
->npx eslint --init
->npx eslint . (for checking any error)
-> npm run lint
-> npm run prepare (for husky)

for testing install library and dependency

-> npm install --save-dev jest supertest
-> jest: Test runner and assertion library.
-> supertest: For testing HTTP endpoints.
-> sequelize: ORM for database interactions.

if route failed u can just comment this line of code nodeenv = test
if u r testing mod ejust uncomment it

const fs = require("fs").promises;
const path = require("path");
const express = require("express");

module.exports = async (app) => {
const isTestMode = process.env.NODE_ENV === "test";
try {
const versionPath = path.join(\_\_dirname, "../api");
if(!isTestMode) console.log(`Loading routes from: ${versionPath}`);

    const versions = await fs.readdir(versionPath, { withFileTypes: true });

    for (const versionDir of versions) {
      if (!versionDir.isDirectory()) continue;

      const version = versionDir.name;
      const versionDirPath = path.join(versionPath, version);

      const groups = await fs.readdir(versionDirPath, { withFileTypes: true });

      for (const groupDir of groups) {
        if (!groupDir.isDirectory()) continue;

        const groupName = groupDir.name;
        const groupDirPath = path.join(versionDirPath, groupName);

        const files = await fs.readdir(groupDirPath, { withFileTypes: true });

        for (const file of files) {
          if (file.isFile() && file.name.endsWith(".routes.js")) {
            try {
              const routePath = path.join(groupDirPath, file.name);
              const route = require(routePath);

              if (!(route instanceof express.Router)) {
                if(!isTestMode) console.warn(`⚠️ Skipping ${file.name}: Not a valid Express router`);
                continue;
              }

              const routeName = file.name.replace(".routes.js", "");
              const routeUrl = `/api/${version}/${groupName}/${routeName}`;

              app.use(routeUrl, route);
              if(!isTestMode) console.log(`✅ Registered route: ${routeUrl}`);
            } catch (err) {
              if(!isTestMode) console.error(`❌ Failed to load route ${file.name}: ${err.message}`);
            }
          }
        }
      }
    }

} catch (err) {
if(!isTestMode) console.error(`❌ Failed to load routes: ${err.message}`);
throw err;
}
};

for prettier check -> npx prettier --write .

<!-- for single or multiple file check -->

npx prettier --write README.md src/controllers/mobile/ticket.controller.js src/controllers/mobile/vehicle.controller.js src/controllers/mobile/wallet.controller.js
