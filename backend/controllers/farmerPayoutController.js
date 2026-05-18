/* backend/controllers/farmerPayoutController.js
   Per-farmer accumulated payout system.

   Flow:
     1. Admin releases an order payout (existing payoutController) →
        shipment.paymentStatus = "paid", adminPayout.released = true
     2. GET /api/farmer-payouts  → lists each farmer with their total
        accumulated balance (sum of all released-but-not-yet-farmer-paid
        shipment subtotals) plus their payment details from User.paymentMethods
     3. PUT /api/farmer-payouts/:farmerId/pay  → admin marks farmer as paid,
        records method + reference number, sets all relevant shipments to
        farmerPaid = true so they don't appear in the pending balance again
*/

import Order from "../models/Order.js";
import User  from "../models/User.js";
import { sendNotification } from "../utils/notificationHelpers.js";

/* ─────────────────────────────────────────────────────────────
   HELPER — pull enabled payment methods for a farmer
───────────────────────────────────────────────────────────── */
const extractPaymentDetails = (farmer) => {
  const methods = farmer.paymentMethods || [];

  const esewa = methods.find((m) => m.type === "esewa" && m.enabled);
  const bankQr = methods.find((m) => m.type === "bank_qr" && m.enabled);
  const bankTransfer = methods.find((m) => m.type === "bank_transfer" && m.enabled);
  const cod = methods.find((m) => m.type === "cash_on_delivery" && m.enabled);

  return {
    preferred: farmer.preferredPaymentMethod || "cash_on_delivery",
    esewa: esewa ? { esewaId: esewa.esewaId } : null,
    bankQr: bankQr
      ? { bankName: bankQr.bankName, qrCodeImage: bankQr.qrCodeImage }
      : null,
    bankTransfer: bankTransfer
      ? {
          bankName:      bankTransfer.bankName,
          accountNumber: bankTransfer.accountNumber,
          accountName:   bankTransfer.accountName,
          bankBranch:    bankTransfer.bankBranch || "",
        }
      : null,
    cod: cod ? true : null,
  };
};

/* ─────────────────────────────────────────────────────────────
   GET /api/farmer-payouts
   Returns one entry per farmer who has a pending balance:
   {
     farmerId, farmerName, farmerEmail,
     pendingAmount,          ← sum of shipment.subtotals not yet farmer-paid
     pendingOrderCount,      ← number of distinct orders
     pendingShipments: [...] ← detail for the accordion
     paymentDetails,         ← bank/eSewa/QR info from farmer profile
   }
───────────────────────────────────────────────────────────── */
export const getFarmerPayouts = async (req, res) => {
  try {
    /* Find all orders where:
       - admin has released the payout (adminPayout.released = true)
       - at least one shipment is NOT yet farmer-paid (farmerPaid != true)
       - order is not cancelled
    */
    const orders = await Order.find({
      "adminPayout.released": true,
      status: { $nin: ["cancelled"] },
      "shipments.farmerPaid": { $ne: true },
    })
      .populate("consumer", "firstName lastName")
      .populate("shipments.farmer", "firstName lastName email paymentMethods preferredPaymentMethod");

    /* Accumulate per farmer */
    const farmerMap = new Map();

    for (const order of orders) {
      for (const shipment of order.shipments) {
        /* Skip already farmer-paid shipments */
        if (shipment.farmerPaid) continue;
        /* Skip shipments that haven't been admin-released yet */
        if (shipment.paymentStatus !== "paid") continue;

        const farmer = shipment.farmer;
        if (!farmer) continue;

        const fid = (farmer._id || farmer).toString();

        if (!farmerMap.has(fid)) {
          farmerMap.set(fid, {
            farmerId:          fid,
            farmerName:        `${farmer.firstName} ${farmer.lastName}`,
            farmerEmail:       farmer.email,
            pendingAmount:     0,
            pendingOrderCount: 0,
            pendingShipments:  [],
            paymentDetails:    extractPaymentDetails(farmer),
            orderIds:          new Set(),
          });
        }

        const entry = farmerMap.get(fid);
        entry.pendingAmount += shipment.subtotal || 0;
        entry.orderIds.add(order._id.toString());
        entry.pendingShipments.push({
          orderId:         order._id,
          orderDisplayId:  order._id.toString().slice(-6),
          consumerName:    order.consumer
            ? `${order.consumer.firstName} ${order.consumer.lastName}`
            : "Consumer",
          orderType:       order.orderType,
          createdAt:       order.createdAt,
          shipmentSubtotal: shipment.subtotal,
          items:           shipment.items,
          paymentMethod:   shipment.paymentMethod,
        });
      }
    }

    /* Convert map to array, add pendingOrderCount */
    const result = [...farmerMap.values()].map((entry) => ({
      ...entry,
      pendingAmount:     Math.round(entry.pendingAmount),
      pendingOrderCount: entry.orderIds.size,
      orderIds:          undefined, // don't send the Set
    }));

    /* Sort by highest pending amount first */
    result.sort((a, b) => b.pendingAmount - a.pendingAmount);

    res.json(result);
  } catch (err) {
    console.error("[getFarmerPayouts] error:", err);
    res.status(500).json({ message: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   GET /api/farmer-payouts/history
   All farmers who have been fully paid, for the history tab.
───────────────────────────────────────────────────────────── */
export const getFarmerPayoutHistory = async (req, res) => {
  try {
    const orders = await Order.find({
      "adminPayout.released": true,
      "shipments.farmerPaid": true,
    })
      .populate("shipments.farmer", "firstName lastName email")
      .sort({ "adminPayout.releasedAt": -1 })
      .limit(200);

    const farmerMap = new Map();

    for (const order of orders) {
      for (const shipment of order.shipments) {
        if (!shipment.farmerPaid) continue;

        const farmer = shipment.farmer;
        if (!farmer) continue;
        const fid = (farmer._id || farmer).toString();

        if (!farmerMap.has(fid)) {
          farmerMap.set(fid, {
            farmerId:    fid,
            farmerName:  `${farmer.firstName} ${farmer.lastName}`,
            farmerEmail: farmer.email,
            totalPaid:   0,
            payments:    [],
          });
        }

        const entry = farmerMap.get(fid);
        entry.totalPaid += shipment.subtotal || 0;

        if (shipment.farmerPaymentRecord) {
          /* Group by payment batch (farmerPaymentRecord.paidAt rounded to minute) */
          const record = shipment.farmerPaymentRecord;
          const batchKey = record.paidAt
            ? new Date(record.paidAt).toISOString().slice(0, 16)
            : "unknown";

          const existing = entry.payments.find((p) => p.batchKey === batchKey);
          if (existing) {
            existing.amount += shipment.subtotal || 0;
          } else {
            entry.payments.push({
              batchKey,
              amount:    shipment.subtotal || 0,
              method:    record.method,
              reference: record.reference || "",
              paidAt:    record.paidAt,
            });
          }
        }
      }
    }

    const result = [...farmerMap.values()].map((e) => ({
      ...e,
      totalPaid: Math.round(e.totalPaid),
    }));

    result.sort((a, b) => b.totalPaid - a.totalPaid);
    res.json(result);
  } catch (err) {
    console.error("[getFarmerPayoutHistory] error:", err);
    res.status(500).json({ message: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   PUT /api/farmer-payouts/:farmerId/pay
   Body: { method, reference }
     method    — "esewa" | "bank_qr" | "bank_transfer" | "cash"
     reference — transaction ID / UTR / screenshot note (optional)

   Marks ALL pending released shipments for this farmer as
   farmerPaid = true and records the payment details.
───────────────────────────────────────────────────────────── */
export const markFarmerPaid = async (req, res) => {
  try {
    const { farmerId } = req.params;
    const { method, reference = "" } = req.body;

    if (!method) {
      return res.status(400).json({ message: "Payment method is required" });
    }

    const validMethods = ["esewa", "bank_qr", "bank_transfer", "cash"];
    if (!validMethods.includes(method)) {
      return res.status(400).json({
        message: `Invalid method. Must be one of: ${validMethods.join(", ")}`,
      });
    }

    /* Find all orders with unpaid released shipments for this farmer */
    const orders = await Order.find({
      "adminPayout.released":  true,
      "shipments.farmer":      farmerId,
      "shipments.farmerPaid":  { $ne: true },
      "shipments.paymentStatus": "paid",
      status: { $nin: ["cancelled"] },
    });

    if (orders.length === 0) {
      return res.status(404).json({ message: "No pending payouts found for this farmer" });
    }

    const paymentRecord = {
      method,
      reference,
      paidAt:    new Date(),
      paidBy:    req.user._id,
    };

    let totalPaid = 0;

    for (const order of orders) {
      let orderModified = false;

      for (const shipment of order.shipments) {
        const shipFarmerId = (shipment.farmer?._id || shipment.farmer).toString();
        if (shipFarmerId !== farmerId) continue;
        if (shipment.farmerPaid) continue;
        if (shipment.paymentStatus !== "paid") continue;

        shipment.farmerPaid            = true;
        shipment.farmerPaymentRecord   = paymentRecord;
        totalPaid                     += shipment.subtotal || 0;
        orderModified                  = true;
      }

      if (orderModified) await order.save();
    }

    /* Notify the farmer */
    await sendNotification(
      farmerId,
      "payment_paid",
      "Admin has paid your accumulated balance",
      `Rs. ${Math.round(totalPaid)} has been sent to you via ${method.replace("_", " ")}${
        reference ? ` (Ref: ${reference})` : ""
      }.`,
      { method, reference, amount: Math.round(totalPaid) }
    );

    res.json({
      message:   "Farmer paid successfully",
      farmerId,
      totalPaid: Math.round(totalPaid),
      method,
      reference,
      ordersUpdated: orders.length,
    });
  } catch (err) {
    console.error("[markFarmerPaid] error:", err);
    res.status(500).json({ message: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   GET /api/farmer-payouts/stats
───────────────────────────────────────────────────────────── */
export const getFarmerPayoutStats = async (req, res) => {
  try {
    const [pendingOrders, paidShipmentOrders] = await Promise.all([
      Order.find({
        "adminPayout.released":    true,
        "shipments.farmerPaid":    { $ne: true },
        "shipments.paymentStatus": "paid",
        status:                    { $nin: ["cancelled"] },
      }),
      Order.find({
        "adminPayout.released": true,
        "shipments.farmerPaid": true,
      }),
    ]);

    let pendingAmount  = 0;
    let pendingFarmers = new Set();
    let paidAmount     = 0;

    for (const order of pendingOrders) {
      for (const s of order.shipments) {
        if (!s.farmerPaid && s.paymentStatus === "paid") {
          pendingAmount += s.subtotal || 0;
          pendingFarmers.add((s.farmer?._id || s.farmer).toString());
        }
      }
    }

    for (const order of paidShipmentOrders) {
      for (const s of order.shipments) {
        if (s.farmerPaid) paidAmount += s.subtotal || 0;
      }
    }

    res.json({
      pendingAmount:  Math.round(pendingAmount),
      pendingFarmers: pendingFarmers.size,
      paidAmount:     Math.round(paidAmount),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};