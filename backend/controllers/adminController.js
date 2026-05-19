/* backend/controllers/adminController.js
   FIX: $unwind preserveNullAndEmpty → preserveNullAndEmptyArrays (correct MongoDB option)
*/

import User    from '../models/User.js';
import Product from '../models/Product.js';
import Order   from '../models/Order.js';
import bcrypt  from 'bcryptjs';
import mongoose from 'mongoose';

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error('Admin getAllUsers ERROR:', err);
    res.status(500).json({ message: err.message });
  }
};

export const createUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;
    if (!['farmer', 'consumer'].includes(role))
      return res.status(400).json({ message: 'Invalid role. Only farmer or consumer allowed.' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: 'Email already exists' });

    const hashed = await bcrypt.hash(password, 10);
    const user   = await User.create({ firstName, lastName, email, password: hashed, role });
    res.status(201).json({ id: user.id, firstName, lastName, email, role });
  } catch (err) {
    console.error('Admin createUser ERROR:', err);
    res.status(500).json({ message: err.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin')
      return res.status(403).json({ message: 'Admin accounts cannot be deleted via this endpoint' });

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error('Admin deleteUser ERROR:', err);
    res.status(500).json({ message: err.message });
  }
};

export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find({})
      .populate('farmer', 'firstName lastName email')
      .sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    console.error('Admin getAllProducts ERROR:', err);
    res.status(500).json({ message: err.message });
  }
};

export const toggleProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    product.isActive = !product.isActive;
    await product.save();
    res.json(product);
  } catch (err) {
    console.error('Admin toggleProduct ERROR:', err);
    res.status(500).json({ message: err.message });
  }
};

export const deleteProductAdmin = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    console.error('Admin deleteProductAdmin ERROR:', err);
    res.status(500).json({ message: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   GET ALL ORDERS
   FIX: preserveNullAndEmpty → preserveNullAndEmptyArrays
   This is the correct MongoDB $unwind option name. The old name
   does not exist and throws error code 28811.
───────────────────────────────────────────────────────────── */
export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.aggregate([
      // 1. Join consumer
      {
        $lookup: {
          from:         'users',
          localField:   'consumer',
          foreignField: '_id',
          as:           'consumer',
          pipeline: [
            { $project: { firstName: 1, lastName: 1, email: 1 } },
          ],
        },
      },
      {
        $unwind: {
          path: '$consumer',
          preserveNullAndEmptyArrays: true,   // ← FIX: was preserveNullAndEmpty
        },
      },

      // 2. Collect farmer IDs from shipments
      {
        $addFields: {
          farmerIds: {
            $map: { input: '$shipments', as: 's', in: '$$s.farmer' },
          },
        },
      },

      // 3. Lookup all shipment farmers in one round-trip
      {
        $lookup: {
          from:         'users',
          localField:   'farmerIds',
          foreignField: '_id',
          as:           'farmerDocs',
          pipeline: [
            { $project: { firstName: 1, lastName: 1, email: 1 } },
          ],
        },
      },

      // 4. Replace shipment.farmer ObjectId with populated doc
      {
        $addFields: {
          shipments: {
            $map: {
              input: '$shipments',
              as:    'shipment',
              in: {
                $mergeObjects: [
                  '$$shipment',
                  {
                    farmer: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: '$farmerDocs',
                            as:    'fd',
                            cond:  { $eq: ['$$fd._id', '$$shipment.farmer'] },
                          },
                        },
                        0,
                      ],
                    },
                  },
                ],
              },
            },
          },
        },
      },

      // 5. Clean up temp fields
      { $unset: ['farmerIds', 'farmerDocs'] },

      { $sort: { createdAt: -1 } },
    ]);

    res.json(orders);
  } catch (err) {
    console.error('Admin getAllOrders ERROR:', err);
    res.status(500).json({ message: err.message });
  }
};

export const cancelOrderAdmin = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.status === 'delivered')
      return res.status(400).json({ message: 'Delivered orders cannot be cancelled' });
    if (order.status === 'cancelled')
      return res.status(400).json({ message: 'Order is already cancelled' });

    // Restore stock
    try {
      await Promise.all(
        order.shipments.flatMap((shipment) =>
          shipment.items.map((item) =>
            Product.findByIdAndUpdate(
              item.product,
              { $inc: { quantity: item.quantity } },
              { new: true }
            )
          )
        )
      );
    } catch (restoreErr) {
      console.error('Stock restore error during admin cancel:', restoreErr);
    }

    order.status      = 'cancelled';
    order.cancelledBy = 'admin';
    order.cancelledAt = new Date();
    await order.save();
    res.json({ message: 'Order cancelled successfully', order });
  } catch (err) {
    console.error('Admin cancelOrderAdmin ERROR:', err);
    res.status(500).json({ message: 'Failed to cancel order' });
  }
};