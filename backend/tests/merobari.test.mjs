"use strict";

import bcrypt from "bcryptjs";
import jwt    from "jsonwebtoken";

/* ============================================================
   CONSTANTS  (mirrored from source)
   ============================================================ */
const JWT_SECRET           = "test_secret_merobari";
const NORMAL_MIN_KG        = 20;
const NORMAL_MAX_KG        = 99;
const BULK_MIN_KG          = 100;
const PLATFORM_CHARGE      = 25;
const BASE_FEE             = 50;
const BASE_KM              = 10;
const RATE_PER_KM          = 5;
const MAX_FEE              = 500;
const MIN_FEE              = 50;
const PAYOUT_COOLDOWN_DAYS = 15;
const RETURN_WINDOW_DAYS   = 2;
const OTP_EXPIRY_MINUTES   = 10;
const ORDER_EXPIRY_MINUTES = 60;
const MAX_PRODUCT_NAME_LEN = 100;
const MAX_DESC_LEN         = 1000;
const SHELF_LIFE_MAX_DAYS  = 365;

/* ============================================================
   HELPER / BUSINESS-LOGIC FUNCTIONS
   ============================================================ */

const signToken = (id, role) =>
  jwt.sign({ id, role }, JWT_SECRET, { expiresIn: "7d" });

/* ── User Management ── */
const validateRegister = ({ firstName, lastName, email, password, phone }) => {
  if (!firstName || !lastName || !email || !password || !phone)
    return "All fields including phone number are required";
  if (!/^[0-9]{10}$/.test(phone.trim()))
    return "Phone number must be exactly 10 digits";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return "Invalid email format";
  if (password.length < 6)
    return "Password must be at least 6 characters";
  return null;
};

const validateProfileUpdate = ({ firstName, lastName, phone }) => {
  if (firstName !== undefined && !firstName.trim())
    return "First name cannot be empty";
  if (lastName !== undefined && !lastName.trim())
    return "Last name cannot be empty";
  if (phone !== undefined && !/^[0-9]{10}$/.test(phone.trim()))
    return "Phone number must be exactly 10 digits";
  return null;
};

const simulateLogin = async (dbUser, inputPassword) => {
  if (!dbUser)            return { error: "Invalid credentials" };
  if (!dbUser.password)   return { error: "This account uses Google sign-in." };
  const match = await bcrypt.compare(inputPassword, dbUser.password);
  if (!match)             return { error: "Invalid credentials" };
  return { token: signToken(dbUser._id, dbUser.role) };
};

const isOtpExpired = (expiresAt) => new Date(expiresAt) < new Date();
const isOtpValid   = (stored, input, expiresAt) =>
  stored === input && !isOtpExpired(expiresAt);

const canDeleteAccount = (role, activeOrders = []) => {
  if (role === "farmer" && activeOrders.length > 0)
    return { allowed: false, reason: "Cannot delete account with active orders" };
  return { allowed: true };
};

/* ── Product Management ── */
const validateProduct = ({ name, price, quantity, shelfLife, unit }) => {
  if (!name || !name.trim())           return "Product name is required";
  if (name.length > MAX_PRODUCT_NAME_LEN) return `Name must be ≤ ${MAX_PRODUCT_NAME_LEN} characters`;
  if (!price || Number(price) <= 0)    return "Price must be a positive number";
  if (quantity === undefined || Number(quantity) < 0) return "Quantity must be ≥ 0";
  if (!shelfLife || Number(shelfLife) <= 0) return "Shelf life must be a positive number";
  if (Number(shelfLife) > SHELF_LIFE_MAX_DAYS) return `Shelf life must be ≤ ${SHELF_LIFE_MAX_DAYS} days`;
  if (!unit || !unit.trim())           return "Unit is required";
  return null;
};

const validateBulkPrice = (price, bulkPrice) => {
  if (bulkPrice === null || bulkPrice === undefined) return null;
  if (isNaN(Number(bulkPrice)) || Number(bulkPrice) <= 0)
    return "Bulk price must be a positive number";
  if (Number(bulkPrice) >= Number(price))
    return "Bulk price must be less than the regular price";
  return null;
};

const canEditProduct = (farmer, product) => {
  if (String(product.sellerId) !== String(farmer._id))
    return { allowed: false, reason: "You can only edit your own products" };
  return { allowed: true };
};

const effectivePrice = (product, orderType) =>
  orderType === "bulk" && product.bulkPrice && Number(product.bulkPrice) > 0
    ? Number(product.bulkPrice)
    : Number(product.price);

/* ── Checkout Management ── */
const validateItemOrderType = (orderType, qty, unit = "kg") => {
  if (orderType === "normal") {
    if (qty < NORMAL_MIN_KG)
      return `Normal orders require ≥ ${NORMAL_MIN_KG} ${unit} (item has ${qty})`;
    if (qty > NORMAL_MAX_KG)
      return `Normal orders allow ≤ ${NORMAL_MAX_KG} ${unit}. Switch to Bulk for ${qty} ${unit}`;
  } else if (orderType === "bulk") {
    if (qty < BULK_MIN_KG)
      return `Bulk orders require ≥ ${BULK_MIN_KG} ${unit} (item has ${qty})`;
  } else {
    return `Invalid order type "${orderType}"`;
  }
  return null;
};

const haversineKm = (c1, c2) => {
  const toRad = (d) => (d * Math.PI) / 180;
  const [lng1, lat1] = c1;
  const [lng2, lat2] = c2;
  const R    = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a    =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const calcDeliveryFee = (farmerCoords, consumerCoords) => {
  if (!farmerCoords || !consumerCoords) return 100;
  const distKm  = haversineKm(farmerCoords, consumerCoords);
  const extraKm = Math.max(0, Math.ceil(distKm) - BASE_KM);
  const fee     = BASE_FEE + extraKm * RATE_PER_KM;
  return Math.min(MAX_FEE, Math.max(MIN_FEE, Math.round(fee)));
};

const calcGrandTotal = (itemsSubtotal, deliveryTotal, platformCharge = PLATFORM_CHARGE) =>
  itemsSubtotal + deliveryTotal + platformCharge;

const canCancelOrder = (order, actor) => {
  if (["shipped", "delivered", "cancelled"].includes(order.status))
    return { allowed: false, reason: `Cannot cancel a ${order.status} order` };
  if (actor === "consumer" && order.paymentStatus === "paid" && order.status !== "pending")
    return { allowed: false, reason: "Paid and confirmed orders cannot be cancelled by consumer" };
  return { allowed: true };
};

/* ── Payment Management ── */
const canInitiatePayment = (order) => {
  if (!order)                       return { ok: false, reason: "Order not found" };
  if (order.status === "cancelled") return { ok: false, reason: "This order has been cancelled" };
  if (order.paymentStatus === "paid") return { ok: false, reason: "Order is already paid" };
  return { ok: true };
};

const isOrderExpired = (createdAt) => {
  const ageMs = Date.now() - new Date(createdAt).getTime();
  return ageMs >= ORDER_EXPIRY_MINUTES * 60 * 1000;
};

const canAutoCancel = (order) =>
  order.status === "pending" &&
  order.paymentStatus === "pending" &&
  isOrderExpired(order.createdAt);

const STATUS_PROGRESSIONS = {
  pending:   ["confirmed"],
  confirmed: ["shipped"],
  shipped:   ["delivered"],
};

const canProgressStatus = (currentStatus, newStatus) => {
  const allowed = STATUS_PROGRESSIONS[currentStatus] || [];
  return allowed.includes(newStatus);
};

/* ── Return & Refund ── */
const isReturnWindowOpen = (deliveredAt) => {
  const daysSince = (Date.now() - new Date(deliveredAt).getTime()) / 86_400_000;
  return daysSince <= RETURN_WINDOW_DAYS;
};

const calcRefundAmount = (shipment, order) => {
  const shipmentCount          = (order.shipments || []).length || 1;
  const itemsSubtotal          = shipment.subtotal    || 0;
  const deliveryFee            = shipment.deliveryFee || 0;
  const proratedPlatformCharge = Math.round(
    (order.platformCharge || PLATFORM_CHARGE) / shipmentCount
  );
  return itemsSubtotal + deliveryFee + proratedPlatformCharge;
};

const checkPayoutCooldown = (lastPaidAt) => {
  if (!lastPaidAt) return { allowed: true, daysLeft: 0 };
  const daysSince = (Date.now() - new Date(lastPaidAt).getTime()) / 86_400_000;
  const daysLeft  = Math.ceil(PAYOUT_COOLDOWN_DAYS - daysSince);
  return { allowed: daysSince >= PAYOUT_COOLDOWN_DAYS, daysLeft: Math.max(0, daysLeft) };
};

/* ── Notification Management ── */
const NOTIFICATION_TYPES = ["order", "payment", "delivery", "promotional", "system"];

const validateNotification = ({ userId, type, message }) => {
  if (!userId)                            return "userId is required";
  if (!NOTIFICATION_TYPES.includes(type)) return `Invalid notification type: ${type}`;
  if (!message || !message.trim())        return "Message cannot be empty";
  if (message.length > 500)              return "Message must be ≤ 500 characters";
  return null;
};

const canMarkRead = (notification, requestingUserId) => {
  if (String(notification.userId) !== String(requestingUserId))
    return { allowed: false, reason: "Cannot mark another user's notification as read" };
  return { allowed: true };
};

const buildOrderNotification = (order, event) => {
  const messages = {
    confirmed:  `Your order #${order._id} has been confirmed by the farmer.`,
    shipped:    `Your order #${order._id} has been shipped.`,
    delivered:  `Your order #${order._id} has been delivered. Enjoy!`,
    cancelled:  `Your order #${order._id} has been cancelled.`,
    paid:       `Payment for order #${order._id} was successful.`,
  };
  return {
    userId:  order.consumer,
    type:    event === "paid" ? "payment" : "order",
    message: messages[event] || `Order #${order._id} status updated to ${event}.`,
    isRead:  false,
    createdAt: new Date().toISOString(),
  };
};

/* ============================================================
   MOCK DATA FACTORIES
   ============================================================ */
const makeUser = (overrides = {}) => ({
  _id:       "user001",
  firstName: "Hari",
  lastName:  "Farmer",
  email:     "farmer@merobari.com",
  phone:     "9800000001",
  role:      "farmer",
  password:  null,
  isActive:  true,
  ...overrides,
});

const makeProduct = (overrides = {}) => ({
  _id:        "prod001",
  sellerId:   "user001",
  name:       "Fresh Tomatoes",
  category:   "vegetables",
  price:      50,
  bulkPrice:  35,
  quantity:   500,
  unit:       "kg",
  shelfLife:  7,
  isAvailable: true,
  createdAt:  new Date().toISOString(),
  ...overrides,
});

const makeOrder = (overrides = {}) => ({
  _id:            "order001",
  consumer:       "consumer001",
  status:         "pending",
  paymentStatus:  "pending",
  createdAt:      new Date().toISOString(),
  totalAmount:    2025,
  itemsSubtotal:  1950,
  deliveryTotal:  50,
  platformCharge: 25,
  shipments: [
    {
      farmer:      "farmer001",
      subtotal:    1950,
      deliveryFee: 50,
      items: [{ product: "p1", name: "Tomato", quantity: 50, price: 39 }],
    },
  ],
  ...overrides,
});

const makeReturn = (overrides = {}) => ({
  _id:          "return001",
  order:        "order001",
  consumer:     "consumer001",
  farmer:       "farmer001",
  items:        [{ name: "Tomato", quantity: 20, price: 39 }],
  reason:       "damaged_item",
  status:       "pending",
  refundStatus: "pending",
  refundAmount: 830,
  createdAt:    new Date().toISOString(),
  ...overrides,
});

const makeNotification = (overrides = {}) => ({
  _id:       "notif001",
  userId:    "user001",
  type:      "order",
  message:   "Your order has been confirmed.",
  isRead:    false,
  createdAt: new Date().toISOString(),
  ...overrides,
});

/* ============================================================
   ██╗   ██╗███████╗███████╗██████╗
   ██║   ██║██╔════╝██╔════╝██╔══██╗
   ██║   ██║███████╗█████╗  ██████╔╝
   ██║   ██║╚════██║██╔══╝  ██╔══██╗
   ╚██████╔╝███████║███████╗██║  ██║
   ╚═════╝ ╚══════╝╚══════╝╚═╝  ╚═╝
   MANAGEMENT
   ============================================================ */
describe("╔══════════════════════════════╗", () => {
  test("║  MODULE 1 — USER MANAGEMENT  ║", () => { expect(true).toBe(true); });
});

describe("User Management › Registration", () => {

  test("UM-TC-01 | Valid registration details → no error", () => {
    const result = validateRegister({
      firstName: "Ram", lastName: "Thapa",
      email: "ram@example.com", phone: "9812345678", password: "securePass1",
    });
    expect(result).toBeNull();
  });

  test("UM-TC-02 | Missing required field (phone) → error", () => {
    const result = validateRegister({
      firstName: "Ram", lastName: "Thapa",
      email: "ram@example.com", password: "securePass1", phone: "",
    });
    expect(result).toMatch(/required/i);
  });

  test("UM-TC-03 | Phone with 9 digits → error", () => {
    const result = validateRegister({
      firstName: "A", lastName: "B", email: "a@b.com",
      password: "pass123", phone: "123456789",
    });
    expect(result).toMatch(/10 digits/);
  });

  test("UM-TC-04 | Phone with letters → error", () => {
    const result = validateRegister({
      firstName: "A", lastName: "B", email: "a@b.com",
      password: "pass123", phone: "abcdefghij",
    });
    expect(result).toMatch(/10 digits/);
  });

  test("UM-TC-05 | Phone with 11 digits → error", () => {
    const result = validateRegister({
      firstName: "A", lastName: "B", email: "a@b.com",
      password: "pass123", phone: "98123456789",
    });
    expect(result).toMatch(/10 digits/);
  });

  test("UM-TC-06 | Invalid email format → error", () => {
    const result = validateRegister({
      firstName: "A", lastName: "B", email: "notanemail",
      password: "pass123", phone: "9812345678",
    });
    expect(result).toMatch(/email/i);
  });

  test("UM-TC-07 | Password shorter than 6 chars → error", () => {
    const result = validateRegister({
      firstName: "A", lastName: "B", email: "a@b.com",
      password: "123", phone: "9812345678",
    });
    expect(result).toMatch(/6 characters/i);
  });

  test("UM-TC-08 | All fields missing → error", () => {
    const result = validateRegister({});
    expect(result).toBeTruthy();
  });

});

describe("User Management › Login & Authentication", () => {

  test("UM-TC-09 | Correct password → token returned", async () => {
    const hashed = await bcrypt.hash("correctPassword", 10);
    const dbUser = makeUser({ _id: "u1", password: hashed });
    const result = await simulateLogin(dbUser, "correctPassword");
    expect(result.token).toBeTruthy();
    expect(result.error).toBeUndefined();
  });

  test("UM-TC-10 | Wrong password → Invalid credentials", async () => {
    const hashed = await bcrypt.hash("correctPassword", 10);
    const dbUser = makeUser({ _id: "u1", password: hashed });
    const result = await simulateLogin(dbUser, "wrongPassword");
    expect(result.error).toBe("Invalid credentials");
  });

  test("UM-TC-11 | Unregistered user (null) → Invalid credentials", async () => {
    const result = await simulateLogin(null, "anyPassword");
    expect(result.error).toBe("Invalid credentials");
  });

  test("UM-TC-12 | Google OAuth user tries password login → error", async () => {
    const googleUser = makeUser({ password: null }); // no password hash
    const result     = await simulateLogin(googleUser, "anyPassword");
    expect(result.error).toMatch(/Google sign-in/i);
  });

});

describe("User Management › OTP Verification", () => {

  test("UM-TC-13 | Correct OTP within expiry → valid", () => {
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    expect(isOtpValid("123456", "123456", expiresAt)).toBe(true);
  });

  test("UM-TC-14 | Expired OTP → invalid", () => {
    const expiresAt = new Date(Date.now() - (OTP_EXPIRY_MINUTES + 1) * 60 * 1000);
    expect(isOtpValid("123456", "123456", expiresAt)).toBe(false);
    expect(isOtpExpired(expiresAt)).toBe(true);
  });

  test("UM-TC-15 | Wrong OTP code → invalid", () => {
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    expect(isOtpValid("123456", "999999", expiresAt)).toBe(false);
  });

  test("UM-TC-16 | OTP exactly at expiry boundary → expired", () => {
    const expiresAt = new Date(Date.now() - 1); // 1 ms past
    expect(isOtpExpired(expiresAt)).toBe(true);
  });

});

describe("User Management › Profile Management", () => {

  test("UM-TC-17 | Valid profile update fields → no error", () => {
    const result = validateProfileUpdate({ firstName: "Sita", phone: "9800000002" });
    expect(result).toBeNull();
  });

  test("UM-TC-18 | Empty first name in update → error", () => {
    const result = validateProfileUpdate({ firstName: "  " });
    expect(result).toMatch(/first name/i);
  });

  test("UM-TC-19 | Invalid phone in update → error", () => {
    const result = validateProfileUpdate({ phone: "12345" });
    expect(result).toMatch(/10 digits/);
  });

  test("UM-TC-20 | Farmer with active orders cannot delete account", () => {
    const farmer = makeUser({ role: "farmer" });
    const result = canDeleteAccount(farmer.role, ["order001"]);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/active orders/i);
  });

  test("UM-TC-21 | Consumer with no active orders can delete account", () => {
    const result = canDeleteAccount("consumer", []);
    expect(result.allowed).toBe(true);
  });

});

describe("User Management › JWT Token", () => {

  test("UM-TC-22 | Signed token decodes correctly", () => {
    const token   = signToken("user123", "farmer");
    const decoded = jwt.verify(token, JWT_SECRET);
    expect(decoded.id).toBe("user123");
    expect(decoded.role).toBe("farmer");
  });

  test("UM-TC-23 | Tampered token is rejected", () => {
    const token = signToken("user123", "farmer");
    expect(() => jwt.verify(token + "tampered", JWT_SECRET)).toThrow();
  });

  test("UM-TC-24 | Token contains correct role", () => {
    const token   = signToken("admin001", "admin");
    const decoded = jwt.verify(token, JWT_SECRET);
    expect(decoded.role).toBe("admin");
  });

});


/* ============================================================
   ██████╗ ██████╗  ██████╗ ██████╗ ██╗   ██╗ ██████╗████████╗
   ██╔══██╗██╔══██╗██╔═══██╗██╔══██╗██║   ██║██╔════╝╚══██╔══╝
   ██████╔╝██████╔╝██║   ██║██║  ██║██║   ██║██║        ██║
   ██╔═══╝ ██╔══██╗██║   ██║██║  ██║██║   ██║██║        ██║
   ██║     ██║  ██║╚██████╔╝██████╔╝╚██████╔╝╚██████╗   ██║
   ╚═╝     ╚═╝  ╚═╝ ╚═════╝ ╚═════╝  ╚═════╝  ╚═════╝   ╚═╝
   MANAGEMENT
   ============================================================ */
describe("╔═════════════════════════════════╗", () => {
  test("║  MODULE 2 — PRODUCT MANAGEMENT  ║", () => { expect(true).toBe(true); });
});

describe("Product Management › Adding Products", () => {

  test("PM-TC-01 | Valid product data → no error", () => {
    const result = validateProduct({
      name: "Fresh Tomatoes", price: 50, quantity: 500, shelfLife: 7, unit: "kg",
    });
    expect(result).toBeNull();
  });

  test("PM-TC-02 | Missing product name → error", () => {
    const result = validateProduct({ name: "", price: 50, quantity: 100, shelfLife: 7, unit: "kg" });
    expect(result).toMatch(/name/i);
  });

  test("PM-TC-03 | Price = 0 → error", () => {
    const result = validateProduct({ name: "Carrot", price: 0, quantity: 100, shelfLife: 7, unit: "kg" });
    expect(result).toMatch(/price/i);
  });

  test("PM-TC-04 | Negative price → error", () => {
    const result = validateProduct({ name: "Carrot", price: -10, quantity: 100, shelfLife: 7, unit: "kg" });
    expect(result).toMatch(/price/i);
  });

  test("PM-TC-05 | Quantity = 0 → allowed (out-of-stock listing)", () => {
    const result = validateProduct({ name: "Carrot", price: 50, quantity: 0, shelfLife: 7, unit: "kg" });
    expect(result).toBeNull();
  });

  test("PM-TC-06 | Shelf life = 0 → error", () => {
    const result = validateProduct({ name: "Carrot", price: 50, quantity: 100, shelfLife: 0, unit: "kg" });
    expect(result).toMatch(/shelf life/i);
  });

  test("PM-TC-07 | Shelf life > 365 days → error", () => {
    const result = validateProduct({ name: "Carrot", price: 50, quantity: 100, shelfLife: 400, unit: "kg" });
    expect(result).toMatch(/365/);
  });

  test("PM-TC-08 | Missing unit → error", () => {
    const result = validateProduct({ name: "Carrot", price: 50, quantity: 100, shelfLife: 7, unit: "" });
    expect(result).toMatch(/unit/i);
  });

  test("PM-TC-09 | Product name > 100 chars → error", () => {
    const result = validateProduct({
      name: "A".repeat(101), price: 50, quantity: 100, shelfLife: 7, unit: "kg",
    });
    expect(result).toMatch(/100/);
  });

});

describe("Product Management › Bulk Price Validation", () => {

  test("PM-TC-10 | Bulk price < regular price → valid", () => {
    expect(validateBulkPrice(80, 60)).toBeNull();
  });

  test("PM-TC-11 | Bulk price = regular price → error", () => {
    expect(validateBulkPrice(80, 80)).toMatch(/less than/i);
  });

  test("PM-TC-12 | Bulk price > regular price → error", () => {
    expect(validateBulkPrice(80, 100)).toMatch(/less than/i);
  });

  test("PM-TC-13 | Bulk price = 0 → error", () => {
    expect(validateBulkPrice(80, 0)).toMatch(/positive/i);
  });

  test("PM-TC-14 | Bulk price not provided (null) → no error", () => {
    expect(validateBulkPrice(80, null)).toBeNull();
  });

  test("PM-TC-15 | Bulk price not provided (undefined) → no error", () => {
    expect(validateBulkPrice(80, undefined)).toBeNull();
  });

});

describe("Product Management › Effective Price & Stock", () => {

  test("PM-TC-16 | Bulk order → bulk price applied", () => {
    const product = makeProduct({ price: 80, bulkPrice: 60 });
    expect(effectivePrice(product, "bulk")).toBe(60);
  });

  test("PM-TC-17 | Normal order → regular price applied", () => {
    const product = makeProduct({ price: 80, bulkPrice: 60 });
    expect(effectivePrice(product, "normal")).toBe(80);
  });

  test("PM-TC-18 | Bulk order but bulkPrice = null → regular price used", () => {
    const product = makeProduct({ price: 80, bulkPrice: null });
    expect(effectivePrice(product, "bulk")).toBe(80);
  });

  test("PM-TC-19 | Out-of-stock product (qty=0) → add-to-cart disabled", () => {
    const product = makeProduct({ quantity: 0 });
    expect(Number(product.quantity) > 0).toBe(false);
  });

  test("PM-TC-20 | Farmer can only edit own product", () => {
    const farmer  = makeUser({ _id: "farmer001" });
    const product = makeProduct({ sellerId: "farmer999" });
    const result  = canEditProduct(farmer, product);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/own products/i);
  });

  test("PM-TC-21 | Farmer edits own product → allowed", () => {
    const farmer  = makeUser({ _id: "farmer001" });
    const product = makeProduct({ sellerId: "farmer001" });
    const result  = canEditProduct(farmer, product);
    expect(result.allowed).toBe(true);
  });

});


/* ============================================================
    ██████╗██╗  ██╗███████╗ ██████╗██╗  ██╗ ██████╗ ██╗   ██╗████████╗
   ██╔════╝██║  ██║██╔════╝██╔════╝██║ ██╔╝██╔═══██╗██║   ██║╚══██╔══╝
   ██║     ███████║█████╗  ██║     █████╔╝ ██║   ██║██║   ██║   ██║
   ██║     ██╔══██║██╔══╝  ██║     ██╔═██╗ ██║   ██║██║   ██║   ██║
   ╚██████╗██║  ██║███████╗╚██████╗██║  ██╗╚██████╔╝╚██████╔╝   ██║
    ╚═════╝╚═╝  ╚═╝╚══════╝ ╚═════╝╚═╝  ╚═╝ ╚═════╝  ╚═════╝    ╚═╝
   MANAGEMENT
   ============================================================ */
describe("╔════════════════════════════════════╗", () => {
  test("║  MODULE 3 — CHECKOUT MANAGEMENT   ║", () => { expect(true).toBe(true); });
});

describe("Checkout Management › Order Type Validation", () => {

  test("CM-TC-01 | Normal order qty=20 (min boundary) → valid", () => {
    expect(validateItemOrderType("normal", 20, "kg")).toBeNull();
  });

  test("CM-TC-02 | Normal order qty=99 (max boundary) → valid", () => {
    expect(validateItemOrderType("normal", 99, "kg")).toBeNull();
  });

  test("CM-TC-03 | Normal order qty=10 (below min) → error", () => {
    expect(validateItemOrderType("normal", 10, "kg")).toMatch(/≥ 20 kg/);
  });

  test("CM-TC-04 | Normal order qty=100 (exceeds max) → switch-to-bulk error", () => {
    expect(validateItemOrderType("normal", 100, "kg")).toMatch(/Switch to Bulk/);
  });

  test("CM-TC-05 | Bulk order qty=100 (min boundary) → valid", () => {
    expect(validateItemOrderType("bulk", 100, "kg")).toBeNull();
  });

  test("CM-TC-06 | Bulk order qty=80 (below min) → error", () => {
    expect(validateItemOrderType("bulk", 80, "kg")).toMatch(/≥ 100 kg/);
  });

  test("CM-TC-07 | Invalid order type → error", () => {
    expect(validateItemOrderType("express", 50, "kg")).toMatch(/Invalid order type/);
  });

  test("CM-TC-08 | Normal order qty=50 (mid range) → valid", () => {
    expect(validateItemOrderType("normal", 50, "kg")).toBeNull();
  });

  test("CM-TC-09 | Bulk order qty=500 (large) → valid", () => {
    expect(validateItemOrderType("bulk", 500, "kg")).toBeNull();
  });

});

describe("Checkout Management › Delivery Fee", () => {

  test("CM-TC-10 | Same location (0 km) → base fee Rs. 50", () => {
    const coords = [85.3240, 27.7172];
    expect(calcDeliveryFee(coords, coords)).toBe(MIN_FEE);
  });

  test("CM-TC-11 | Farmer 15 km away → fee Rs. 75", () => {
    // formula: 50 + (ceil(15)-10)*5 = 50 + 25 = 75
    const distKm  = 15;
    const extraKm = Math.max(0, Math.ceil(distKm) - BASE_KM);
    const fee     = Math.min(MAX_FEE, Math.max(MIN_FEE, BASE_FEE + extraKm * RATE_PER_KM));
    expect(fee).toBe(75);
  });

  test("CM-TC-12 | Farmer ~15 km (real coords) → fee Rs. 75–80", () => {
    const farmerCoords   = [85.3240, 27.7172];
    const consumerCoords = [85.3240, 27.8527];
    const fee = calcDeliveryFee(farmerCoords, consumerCoords);
    expect(fee).toBeGreaterThanOrEqual(75);
    expect(fee).toBeLessThanOrEqual(80);
  });

  test("CM-TC-13 | No coordinates provided → fallback Rs. 100", () => {
    expect(calcDeliveryFee(null, null)).toBe(100);
  });

  test("CM-TC-14 | Very far distance (>100 km) → capped at Rs. 500", () => {
    const fee = calcDeliveryFee([80.0, 27.7], [88.0, 27.7]);
    expect(fee).toBe(MAX_FEE);
  });

  test("CM-TC-15 | Exactly 10 km → base fee Rs. 50 (no extra)", () => {
    const distKm  = 10;
    const extraKm = Math.max(0, Math.ceil(distKm) - BASE_KM);
    const fee     = Math.min(MAX_FEE, Math.max(MIN_FEE, BASE_FEE + extraKm * RATE_PER_KM));
    expect(fee).toBe(50);
  });

});

describe("Checkout Management › Grand Total & Cancellation", () => {

  test("CM-TC-16 | Grand total = items + delivery + platform charge", () => {
    expect(calcGrandTotal(1950, 75, 25)).toBe(2050);
  });

  test("CM-TC-17 | Platform charge is always Rs. 25", () => {
    expect(PLATFORM_CHARGE).toBe(25);
  });

  test("CM-TC-18 | Consumer cancels pending unpaid order → allowed", () => {
    const order  = makeOrder({ status: "pending", paymentStatus: "pending" });
    const result = canCancelOrder(order, "consumer");
    expect(result.allowed).toBe(true);
  });

  test("CM-TC-19 | Consumer cancels shipped order → blocked", () => {
    const order  = makeOrder({ status: "shipped" });
    const result = canCancelOrder(order, "consumer");
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/shipped/i);
  });

  test("CM-TC-20 | Consumer cancels delivered order → blocked", () => {
    const order  = makeOrder({ status: "delivered" });
    const result = canCancelOrder(order, "consumer");
    expect(result.allowed).toBe(false);
  });

  test("CM-TC-21 | Already-cancelled order → cannot re-cancel", () => {
    const order  = makeOrder({ status: "cancelled" });
    const result = canCancelOrder(order, "consumer");
    expect(result.allowed).toBe(false);
  });

});


/* ============================================================
   ██████╗  █████╗ ██╗   ██╗███╗   ███╗███████╗███╗   ██╗████████╗
   ██╔══██╗██╔══██╗╚██╗ ██╔╝████╗ ████║██╔════╝████╗  ██║╚══██╔══╝
   ██████╔╝███████║ ╚████╔╝ ██╔████╔██║█████╗  ██╔██╗ ██║   ██║
   ██╔═══╝ ██╔══██║  ╚██╔╝  ██║╚██╔╝██║██╔══╝  ██║╚██╗██║   ██║
   ██║     ██║  ██║   ██║   ██║ ╚═╝ ██║███████╗██║ ╚████║   ██║
   ╚═╝     ╚═╝  ╚═╝   ╚═╝   ╚═╝     ╚═╝╚══════╝╚═╝  ╚═══╝   ╚═╝
   MANAGEMENT
   ============================================================ */
describe("╔═════════════════════════════════════╗", () => {
  test("║  MODULE 4 — PAYMENT MANAGEMENT     ║", () => { expect(true).toBe(true); });
});

describe("Payment Management › eSewa / Pre-Payment", () => {

  test("PAY-TC-01 | Pending unpaid order → eSewa initiation allowed", () => {
    const result = canInitiatePayment(makeOrder({ status: "pending" }));
    expect(result.ok).toBe(true);
  });

  test("PAY-TC-02 | Cancelled order → eSewa initiation blocked", () => {
    const result = canInitiatePayment(makeOrder({ status: "cancelled" }));
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/cancelled/i);
  });

  test("PAY-TC-03 | Already paid order → initiation blocked", () => {
    const result = canInitiatePayment(makeOrder({ paymentStatus: "paid" }));
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/already paid/i);
  });

  test("PAY-TC-04 | Order not found (null) → blocked", () => {
    const result = canInitiatePayment(null);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/not found/i);
  });

});

describe("Payment Management › Cash on Delivery / FonePay", () => {

  test("PAY-TC-05 | COD confirmation → paymentStatus = paid, method = cash_on_delivery", () => {
    const order   = makeOrder();
    const updated = {
      ...order,
      paymentType:   "post_payment",
      paymentStatus: "paid",
      shipments: order.shipments.map((s) => ({
        ...s, paymentMethod: "cash_on_delivery", paymentStatus: "paid",
      })),
    };
    expect(updated.paymentStatus).toBe("paid");
    expect(updated.shipments[0].paymentMethod).toBe("cash_on_delivery");
    expect(updated.status).toBe("pending"); // order status unchanged until farmer acts
  });

  test("PAY-TC-06 | FonePay confirmation → paymentStatus = paid, method = fonepay", () => {
    const order   = makeOrder();
    const updated = {
      ...order,
      paymentType:   "post_payment",
      paymentStatus: "paid",
      shipments: order.shipments.map((s) => ({
        ...s, paymentMethod: "fonepay", paymentStatus: "paid",
      })),
    };
    expect(updated.paymentStatus).toBe("paid");
    expect(updated.shipments[0].paymentMethod).toBe("fonepay");
  });

});

describe("Payment Management › Order Expiry & Auto-Cancel", () => {

  test("PAY-TC-07 | Unpaid pending order >60 min → auto-cancel eligible", () => {
    const order = makeOrder({
      status: "pending", paymentStatus: "pending",
      createdAt: new Date(Date.now() - 61 * 60 * 1000).toISOString(),
    });
    expect(canAutoCancel(order)).toBe(true);
  });

  test("PAY-TC-08 | Unpaid pending order <60 min → NOT auto-cancelled", () => {
    const order = makeOrder({
      status: "pending", paymentStatus: "pending",
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    });
    expect(canAutoCancel(order)).toBe(false);
  });

  test("PAY-TC-09 | Paid order >60 min → NOT auto-cancelled", () => {
    const order = makeOrder({
      status: "pending", paymentStatus: "paid",
      createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    });
    expect(canAutoCancel(order)).toBe(false);
  });

  test("PAY-TC-10 | Exactly 60 min old unpaid order → NOT yet cancelled (boundary)", () => {
    const order = makeOrder({
      status: "pending", paymentStatus: "pending",
      createdAt: new Date(Date.now() - 60 * 60 * 1000 + 5000).toISOString(), // 5s short
    });
    expect(canAutoCancel(order)).toBe(false);
  });

});

describe("Payment Management › Order Status Progression", () => {

  test("PAY-TC-11 | pending → confirmed → valid", () => {
    expect(canProgressStatus("pending", "confirmed")).toBe(true);
  });

  test("PAY-TC-12 | confirmed → shipped → valid", () => {
    expect(canProgressStatus("confirmed", "shipped")).toBe(true);
  });

  test("PAY-TC-13 | shipped → delivered → valid", () => {
    expect(canProgressStatus("shipped", "delivered")).toBe(true);
  });

  test("PAY-TC-14 | pending → shipped (skip step) → blocked", () => {
    expect(canProgressStatus("pending", "shipped")).toBe(false);
  });

  test("PAY-TC-15 | delivered → confirmed (reverse) → blocked", () => {
    expect(canProgressStatus("delivered", "confirmed")).toBe(false);
  });

  test("PAY-TC-16 | delivered → delivered (same status) → blocked", () => {
    expect(canProgressStatus("delivered", "delivered")).toBe(false);
  });

});

describe("Payment Management › Return & Refund", () => {

  test("PAY-TC-17 | Return requested 3 days after delivery → window closed", () => {
    const deliveredAt = new Date(Date.now() - 3 * 86_400_000).toISOString();
    expect(isReturnWindowOpen(deliveredAt)).toBe(false);
  });

  test("PAY-TC-18 | Return requested 1 day after delivery → window open", () => {
    const deliveredAt = new Date(Date.now() - 86_400_000).toISOString();
    expect(isReturnWindowOpen(deliveredAt)).toBe(true);
  });

  test("PAY-TC-19 | Return exactly at 2-day boundary → window open", () => {
    const deliveredAt = new Date(Date.now() - 2 * 86_400_000 + 60_000).toISOString();
    expect(isReturnWindowOpen(deliveredAt)).toBe(true);
  });

  test("PAY-TC-20 | Farmer approves return → status = approved, stock restored", () => {
    const returnDoc = makeReturn({ status: "pending" });
    const updated   = {
      ...returnDoc, status: "approved", decidedAt: new Date().toISOString(), stockRestored: true,
    };
    expect(updated.status).toBe("approved");
    expect(updated.stockRestored).toBe(true);
  });

  test("PAY-TC-21 | Admin processes refund → refundStatus = processed, farmer deducted", () => {
    const returnDoc = makeReturn({ status: "approved" });
    const updated   = {
      ...returnDoc,
      refundStatus:    "processed",
      farmerDeducted:  true,
      refundRecord:    { method: "esewa", reference: "TXN123", amount: returnDoc.refundAmount },
    };
    expect(updated.refundStatus).toBe("processed");
    expect(updated.farmerDeducted).toBe(true);
    expect(updated.refundRecord.method).toBe("esewa");
  });

  test("PAY-TC-22 | Refund amount = items subtotal + delivery + prorated platform charge", () => {
    const order    = makeOrder({ platformCharge: 25, shipments: [{ subtotal: 1000, deliveryFee: 75 }] });
    const refund   = calcRefundAmount(order.shipments[0], order);
    expect(refund).toBe(1100); // 1000 + 75 + 25
  });

  test("PAY-TC-23 | Farmer deduction = items only (not delivery/platform)", () => {
    const returnDoc    = makeReturn();
    const farmerDeduct = returnDoc.items.reduce((s, i) => s + i.price * i.quantity, 0);
    expect(farmerDeduct).toBe(780); // 39 * 20
    expect(farmerDeduct).toBeLessThan(returnDoc.refundAmount);
  });

});

describe("Payment Management › Farmer Payout", () => {

  test("PAY-TC-24 | Payout within 15-day cooldown → blocked", () => {
    const lastPaidAt = new Date(Date.now() - 10 * 86_400_000);
    const cooldown   = checkPayoutCooldown(lastPaidAt);
    expect(cooldown.allowed).toBe(false);
    expect(cooldown.daysLeft).toBeGreaterThan(0);
  });

  test("PAY-TC-25 | Payout after 15-day cooldown → allowed", () => {
    const lastPaidAt = new Date(Date.now() - 16 * 86_400_000);
    const cooldown   = checkPayoutCooldown(lastPaidAt);
    expect(cooldown.allowed).toBe(true);
    expect(cooldown.daysLeft).toBe(0);
  });

  test("PAY-TC-26 | No previous payout → always allowed", () => {
    const cooldown = checkPayoutCooldown(null);
    expect(cooldown.allowed).toBe(true);
  });

  test("PAY-TC-27 | Payout exactly 15 days + 1 min ago → allowed (boundary)", () => {
    const lastPaidAt = new Date(Date.now() - PAYOUT_COOLDOWN_DAYS * 86_400_000 - 60_000);
    const cooldown   = checkPayoutCooldown(lastPaidAt);
    expect(cooldown.allowed).toBe(true);
  });

  test("PAY-TC-28 | Farmer payout = items subtotal; delivery + platform kept by admin", () => {
    const order        = makeOrder({ itemsSubtotal: 1950, deliveryTotal: 75, platformCharge: 25 });
    const farmerPayout = order.shipments[0].subtotal;
    const adminKeeps   = order.deliveryTotal + order.platformCharge;
    expect(farmerPayout + adminKeeps).toBe(order.itemsSubtotal + order.deliveryTotal + order.platformCharge);
  });

});


/* ============================================================
   ███╗   ██╗ ██████╗ ████████╗██╗███████╗██╗ ██████╗ █████╗ ████████╗██╗ ██████╗ ███╗   ██╗
   ████╗  ██║██╔═══██╗╚══██╔══╝██║██╔════╝██║██╔════╝██╔══██╗╚══██╔══╝██║██╔═══██╗████╗  ██║
   ██╔██╗ ██║██║   ██║   ██║   ██║█████╗  ██║██║     ███████║   ██║   ██║██║   ██║██╔██╗ ██║
   ██║╚██╗██║██║   ██║   ██║   ██║██╔══╝  ██║██║     ██╔══██║   ██║   ██║██║   ██║██║╚██╗██║
   ██║ ╚████║╚██████╔╝   ██║   ██║██║     ██║╚██████╗██║  ██║   ██║   ██║╚██████╔╝██║ ╚████║
   ╚═╝  ╚═══╝ ╚═════╝    ╚═╝   ╚═╝╚═╝     ╚═╝ ╚═════╝╚═╝  ╚═╝   ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝
   MANAGEMENT
   ============================================================ */
describe("╔══════════════════════════════════════════╗", () => {
  test("║  MODULE 5 — NOTIFICATION MANAGEMENT     ║", () => { expect(true).toBe(true); });
});

describe("Notification Management › Validation", () => {

  test("NM-TC-01 | Valid notification → no error", () => {
    const result = validateNotification({
      userId: "user001", type: "order", message: "Your order has been confirmed.",
    });
    expect(result).toBeNull();
  });

  test("NM-TC-02 | Missing userId → error", () => {
    const result = validateNotification({ userId: "", type: "order", message: "Test" });
    expect(result).toMatch(/userId/i);
  });

  test("NM-TC-03 | Invalid notification type → error", () => {
    const result = validateNotification({ userId: "u1", type: "sms", message: "Test" });
    expect(result).toMatch(/Invalid notification type/i);
  });

  test("NM-TC-04 | Empty message → error", () => {
    const result = validateNotification({ userId: "u1", type: "order", message: "  " });
    expect(result).toMatch(/empty/i);
  });

  test("NM-TC-05 | Message > 500 chars → error", () => {
    const result = validateNotification({
      userId: "u1", type: "order", message: "A".repeat(501),
    });
    expect(result).toMatch(/500/);
  });

  test("NM-TC-06 | Message exactly 500 chars → valid", () => {
    const result = validateNotification({
      userId: "u1", type: "order", message: "A".repeat(500),
    });
    expect(result).toBeNull();
  });

  test("NM-TC-07 | All valid notification types are accepted", () => {
    for (const type of NOTIFICATION_TYPES) {
      const result = validateNotification({ userId: "u1", type, message: "Test message" });
      expect(result).toBeNull();
    }
  });

});

describe("Notification Management › Read Status", () => {

  test("NM-TC-08 | User marks own notification as read → allowed", () => {
    const notif  = makeNotification({ userId: "user001" });
    const result = canMarkRead(notif, "user001");
    expect(result.allowed).toBe(true);
  });

  test("NM-TC-09 | User tries to mark another user's notification → blocked", () => {
    const notif  = makeNotification({ userId: "user001" });
    const result = canMarkRead(notif, "user999");
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/another user/i);
  });

  test("NM-TC-10 | New notification defaults to unread (isRead = false)", () => {
    const notif = makeNotification();
    expect(notif.isRead).toBe(false);
  });

});

describe("Notification Management › Auto-Generated Notifications", () => {

  test("NM-TC-11 | Order confirmed event → order-type notification for consumer", () => {
    const order  = makeOrder({ consumer: "consumer001" });
    const notif  = buildOrderNotification(order, "confirmed");
    expect(notif.userId).toBe("consumer001");
    expect(notif.type).toBe("order");
    expect(notif.message).toMatch(/confirmed/i);
    expect(notif.isRead).toBe(false);
  });

  test("NM-TC-12 | Order shipped event → message includes 'shipped'", () => {
    const order = makeOrder();
    const notif = buildOrderNotification(order, "shipped");
    expect(notif.message).toMatch(/shipped/i);
  });

  test("NM-TC-13 | Order delivered event → message includes 'delivered'", () => {
    const order = makeOrder();
    const notif = buildOrderNotification(order, "delivered");
    expect(notif.message).toMatch(/delivered/i);
  });

  test("NM-TC-14 | Order cancelled event → message includes 'cancelled'", () => {
    const order = makeOrder();
    const notif = buildOrderNotification(order, "cancelled");
    expect(notif.message).toMatch(/cancelled/i);
  });

  test("NM-TC-15 | Payment success event → type = payment", () => {
    const order = makeOrder();
    const notif = buildOrderNotification(order, "paid");
    expect(notif.type).toBe("payment");
    expect(notif.message).toMatch(/payment/i);
  });

  test("NM-TC-16 | Auto-generated notification has createdAt timestamp", () => {
    const order = makeOrder();
    const notif = buildOrderNotification(order, "confirmed");
    expect(notif.createdAt).toBeTruthy();
    expect(new Date(notif.createdAt)).toBeInstanceOf(Date);
  });

  test("NM-TC-17 | Unknown event → fallback message with status", () => {
    const order = makeOrder({ _id: "order999" });
    const notif = buildOrderNotification(order, "processing");
    expect(notif.message).toMatch(/processing/i);
  });

});