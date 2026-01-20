import Product from "../models/Product.js";

export const createProduct = async (req, res) => {
  const { name, category, price, quantity, unit, description } = req.body;

  if (!name || !category || !price || !quantity) {
    return res.status(400).json({ message: "Missing fields" });
  }

  const product = await Product.create({
    farmer: req.user._id,
    name,
    category,
    price,
    quantity,
    unit,
    description,
    image: req.file ? `/uploads/${req.file.filename}` : "",
  });

  res.status(201).json(product);
};

export const getMyProducts = async (req, res) => {
  const products = await Product.find({
    farmer: req.user._id,
    isActive: true,
  });
  res.json(products);
};

export const updateProduct = async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) return res.status(404).json({ message: "Not found" });
  if (product.farmer.toString() !== req.user._id.toString())
    return res.status(403).json({ message: "Unauthorized" });

  const allowed = ["name", "category", "price", "quantity", "unit", "description"];
  allowed.forEach((field) => {
    if (req.body[field] !== undefined) product[field] = req.body[field];
  });

  if (req.file) product.image = `/uploads/${req.file.filename}`;

  await product.save();
  res.json(product);
};

export const deleteProduct = async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) return res.status(404).json({ message: "Not found" });
  if (product.farmer.toString() !== req.user._id.toString())
    return res.status(403).json({ message: "Unauthorized" });

  product.isActive = false;
  await product.save();

  res.json({ message: "Product disabled" });
};

export const getPublicProducts = async (req, res) => {
  try {
    const products = await Product.find({ isActive: true })
      .populate("farmer", "firstName lastName email")
      .sort({ createdAt: -1 });

    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
