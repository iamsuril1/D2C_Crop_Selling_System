import Order  from "../models/Order.js";
import User   from "../models/User.js";
import Return from "../models/Return.js";
import { sendNotification } from "../utils/notificationHelpers.js";

const PAYOUT_COOLDOWN_DAYS = 3;
const extractPaymentDetails = (farmer) => {
  const methods = farmer.paymentMethods || [];
  const esewa        = methods.find((m) => m.type === "esewa"         && m.enabled);
  const bankQr       = methods.find((m) => m.type === "bank_qr"       && m.enabled);
  const bankTransfer = methods.find((m) => m.type === "bank_transfer"  && m.enabled);

  return {
    preferred:    farmer.preferredPaymentMethod || "cash",
    esewa:        esewa        ? { esewaId: esewa.esewaId }                                              : null,
    bankQr:       bankQr       ? { bankName: bankQr.bankName, qrCodeImage: bankQr.qrCodeImage }          : null,
    bankTransfer: bankTransfer ? {
      bankName:      bankTransfer.bankName,
      accountNumber: bankTransfer.accountNumber,
      accountName:   bankTransfer.accountName,
      bankBranch:    bankTransfer.bankBranch || "",
    } : null,
  };
};
const checkPayoutCooldown = async (farmerId) => {
  const recentOrder = await Order.findOne({
    "shipments.farmer":     farmerId,
    "shipments.farmerPaid": true,
  })
    .select("shipments")
    .sort({ "shipments.farmerPaymentRecord.paidAt": -1 });

  if (!recentOrder) return { allowed: true, lastPaidAt: null, daysLeft: 0 };

  let lastPaidAt = null;
  for (const s of recentOrder.shipments) {
    if (
      s.farmer?.toString() === farmerId?.toString() &&
      s.farmerPaid &&
      s.farmerPaymentRecord?.paidAt
    ) {
      const paidAt = new Date(s.farmerPaymentRecord.paidAt);
      if (!lastPaidAt || paidAt > lastPaidAt) lastPaidAt = paidAt;
    }
  }

  if (!lastPaidAt) return { allowed: true, lastPaidAt: null, daysLeft: 0 };

  const daysSince = (Date.now() - lastPaidAt.getTime()) / 86_400_000;
  const daysLeft  = Math.ceil(PAYOUT_COOLDOWN_DAYS - daysSince);

  return {
    allowed:    daysSince >= PAYOUT_COOLDOWN_DAYS,
    lastPaidAt,
    daysLeft:   Math.max(0, daysLeft),
  };
};
export const getFarmerPayouts = async (req, res) => {
  try {
    const orders = await Order.find({
      paymentStatus:          "paid",       
      status:                 { $nin: ["cancelled"] },
      "shipments.farmerPaid": { $ne: true },   
    })
      .populate("consumer", "firstName lastName")
      .populate(
        "shipments.farmer",
        "firstName lastName email paymentMethods preferredPaymentMethod"
      );

    const farmerMap = new Map();

    for (const order of orders) {
      for (const shipment of order.shipments) {
        if (shipment.farmerPaid)              continue;
        if (shipment.paymentStatus === "pending") continue; 

        const farmer = shipment.farmer;
        if (!farmer) continue;

        const fid = (farmer._id || farmer).toString();

        const deduction        = shipment.returnDeduction || 0;
        const effectiveSubtotal = Math.max(0, (shipment.subtotal || 0) - deduction);

        if (effectiveSubtotal === 0) continue;

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
        entry.pendingAmount += effectiveSubtotal;
        entry.orderIds.add(order._id.toString());
        entry.pendingShipments.push({
          orderId:          order._id,
          orderDisplayId:   order._id.toString().slice(-6),
          consumerName:     order.consumer
            ? `${order.consumer.firstName} ${order.consumer.lastName}`
            : "Consumer",
          orderType:        order.orderType,
          createdAt:        order.createdAt,
          shipmentSubtotal: effectiveSubtotal,
          originalSubtotal: shipment.subtotal,
          returnDeduction:  deduction,
          items:            shipment.items,
          paymentMethod:    shipment.paymentMethod,
        });
      }
    }

    const result = await Promise.all(
      [...farmerMap.values()].map(async (entry) => {
        const cooldown = await checkPayoutCooldown(entry.farmerId);
        return {
          ...entry,
          pendingAmount:     Math.round(entry.pendingAmount),
          pendingOrderCount: entry.orderIds.size,
          orderIds:          undefined,
          cooldown: {
            allowed:     cooldown.allowed,
            lastPaidAt:  cooldown.lastPaidAt,
            daysLeft:    cooldown.daysLeft,
            nextPayoutAt: cooldown.lastPaidAt
              ? new Date(cooldown.lastPaidAt.getTime() + PAYOUT_COOLDOWN_DAYS * 86_400_000)
              : null,
          },
        };
      })
    );

    result.sort((a, b) => b.pendingAmount - a.pendingAmount);
    res.json(result);
  } catch (err) {
    console.error("[getFarmerPayouts] error:", err);
    res.status(500).json({ message: err.message });
  }
};

export const getFarmerPayoutHistory = async (req, res) => {
  try {
    const orders = await Order.find({
      "shipments.farmerPaid": true,
    })
      .populate("shipments.farmer", "firstName lastName email")
      .sort({ createdAt: -1 })
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
          const record   = shipment.farmerPaymentRecord;
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

export const markFarmerPaid = async (req, res) => {
  try {
    const { farmerId }               = req.params;
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

    const cooldown = await checkPayoutCooldown(farmerId);
    if (!cooldown.allowed) {
      return res.status(429).json({
        message: `Payout cooldown active. Next payout allowed in ${cooldown.daysLeft} day(s).`,
        daysLeft:    cooldown.daysLeft,
        lastPaidAt:  cooldown.lastPaidAt,
        nextPayoutAt: new Date(
          cooldown.lastPaidAt.getTime() + PAYOUT_COOLDOWN_DAYS * 86_400_000
        ),
      });
    }

    const orders = await Order.find({
      paymentStatus:          "paid",
      "shipments.farmer":     farmerId,
      "shipments.farmerPaid": { $ne: true },
      status:                 { $nin: ["cancelled"] },
    });

    if (orders.length === 0) {
      return res.status(404).json({ message: "No pending payouts found for this farmer" });
    }

    const paymentRecord = {
      method,
      reference,
      paidAt: new Date(),
      paidBy: req.user._id,
    };

    let totalPaid = 0;

    for (const order of orders) {
      let orderModified = false;

      for (const shipment of order.shipments) {
        const shipFarmerId = (shipment.farmer?._id || shipment.farmer).toString();
        if (shipFarmerId !== farmerId) continue;
        if (shipment.farmerPaid)       continue;
        if (shipment.paymentStatus === "pending") continue;

        const deduction       = shipment.returnDeduction || 0;
        const effectiveAmount = Math.max(0, (shipment.subtotal || 0) - deduction);

        shipment.farmerPaid          = true;
        shipment.farmerPaymentRecord = paymentRecord;
        totalPaid                   += effectiveAmount;
        orderModified                = true;
      }

      if (orderModified) await order.save();
    }

    await sendNotification(
      farmerId,
      "payment_paid",
      "Payment received from admin",
      `Rs. ${Math.round(totalPaid)} has been sent to you via ${method.replace(/_/g, " ")}${
        reference ? ` (Ref: ${reference})` : ""
      }.`,
      { method, reference, amount: Math.round(totalPaid) }
    );

    res.json({
      message:       "Farmer paid successfully",
      farmerId,
      totalPaid:     Math.round(totalPaid),
      method,
      reference,
      ordersUpdated: orders.length,
    });
  } catch (err) {
    console.error("[markFarmerPaid] error:", err);
    res.status(500).json({ message: err.message });
  }
};

export const getFarmerPayoutStats = async (req, res) => {
  try {
    const [pendingOrders, paidShipmentOrders] = await Promise.all([
      Order.find({
        paymentStatus:          "paid",
        "shipments.farmerPaid": { $ne: true },
        status:                 { $nin: ["cancelled"] },
      }),
      Order.find({
        "shipments.farmerPaid": true,
      }),
    ]);

    let pendingAmount  = 0;
    let pendingFarmers = new Set();
    let paidAmount     = 0;

    for (const order of pendingOrders) {
      for (const s of order.shipments) {
        if (!s.farmerPaid && s.paymentStatus !== "pending") {
          const effective = Math.max(0, (s.subtotal || 0) - (s.returnDeduction || 0));
          if (effective > 0) {
            pendingAmount += effective;
            pendingFarmers.add((s.farmer?._id || s.farmer).toString());
          }
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