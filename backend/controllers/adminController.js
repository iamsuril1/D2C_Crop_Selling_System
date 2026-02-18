import User from '../models/User.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import bcrypt from 'bcryptjs';

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error(' Admin getAllUsers ERROR:', err);
    res.status(500).json({ message: err.message });
  }
};

export const createUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;
    if (!['farmer', 'consumer'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: 'Email exists' });
    
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ firstName, lastName, email, password: hashed, role });
    
    res.status(201).json({ id: user.id, firstName, lastName, email, role });
  } catch (err) {
    console.error('❌ Admin createUser ERROR:', err);
    res.status(500).json({ message: err.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error('❌ Admin deleteUser ERROR:', err);
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
    console.error('❌ Admin getAllProducts ERROR:', err);
    res.status(500).json({ message: err.message });
  }
};

export const toggleProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Not found' });
    product.isActive = !product.isActive;
    await product.save();
    res.json(product);
  } catch (err) {
    console.error('❌ Admin toggleProduct ERROR:', err);
    res.status(500).json({ message: err.message });
  }
};

export const deleteProductAdmin = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    console.error('❌ Admin deleteProductAdmin ERROR:', err);
    res.status(500).json({ message: err.message });
  }
};

// 🔥 BULLETPROOF ORDERS - NO POPULATE FAILURES
export const getAllOrders = async (req, res) => {
  try {
    console.log('🔍 Admin fetching orders...');
    
    // STEP 1: Get raw orders WITHOUT complex populate
    const orders = await Order.find({})
      .populate('consumer', 'firstName lastName email') // Safe top-level
      .lean(); // Faster, plain objects
    
    console.log(`✅ Found ${orders.length} orders`);
    
    // STEP 2: Manually populate farmers (safer)
    const ordersWithFarmers = await Promise.all(
      orders.map(async (order) => {
        const shipmentsWithFarmers = await Promise.all(
          (order.shipments || []).map(async (shipment) => {
            if (shipment.farmer) {
              const farmer = await User.findById(shipment.farmer)
                .select('firstName lastName email')
                .lean();
              return { ...shipment, farmer };
            }
            return shipment;
          })
        );
        return { ...order, shipments: shipmentsWithFarmers };
      })
    );

    console.log('✅ Orders populated successfully');
    res.json(ordersWithFarmers);
  } catch (err) {
    console.error('💥 CRITICAL Admin getAllOrders ERROR:', err);
    res.status(500).json({ message: err.message });
  }
};

export const cancelOrderAdmin = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.status === 'delivered') {
      return res.status(400).json({ message: 'Delivered orders cannot be cancelled' });
    }
    order.status = 'cancelled';
    order.cancelledBy = 'admin';
    order.cancelledAt = new Date();
    await order.save();
    res.json({ message: 'Order cancelled successfully', order });
  } catch (err) {
    console.error('❌ Admin cancelOrderAdmin ERROR:', err);
    res.status(500).json({ message: 'Failed to cancel order' });
  }
};
