import Product from "../models/Product.js";

const notExpiredFilter = () => ({
  $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
});

export const getProductById = async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      isActive: true,
      ...notExpiredFilter(),
    }).populate("farmer", "firstName lastName email profileImage");

    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createProduct = async (req, res) => {
  try {
    const {
      name,
      category,
      subcategory,
      price,
      quantity,
      unit,
      description,
      harvestDate,
      shelfLife,
    } = req.body;

    if (!name?.trim() || !category?.trim()) {
      return res.status(400).json({ message: "Name and category are required" });
    }

    const parsedPrice = Number(price);
    const parsedQuantity = Number(quantity);
    const parsedShelfLife = Number(shelfLife);

    if (Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      return res.status(400).json({ message: "Price must be a positive number" });
    }
    if (Number.isNaN(parsedQuantity) || parsedQuantity <= 0) {
      return res.status(400).json({ message: "Quantity must be a positive number" });
    }
    if (Number.isNaN(parsedShelfLife) || parsedShelfLife <= 0) {
      return res.status(400).json({ message: "Shelf life must be a positive number" });
    }

    let parsedHarvestDate = null;
    if (harvestDate) {
      parsedHarvestDate = new Date(harvestDate);
      if (isNaN(parsedHarvestDate.getTime())) {
        return res.status(400).json({ message: "Invalid harvest date format" });
      }
    }

    const productData = {
      farmer: req.user._id,
      name: name.trim(),
      category: category.trim(),
      subcategory: subcategory?.trim() || "",
      price: parsedPrice,
      quantity: parsedQuantity,
      unit: unit || "kg",
      description: description?.trim() || "",
      harvestDate: parsedHarvestDate,
      shelfLife: parsedShelfLife,
      image: req.file ? `/uploads/${req.file.filename}` : "",
    };

    const product = await Product.create(productData);
    res.status(201).json(product);
  } catch (err) {
    console.error("Create product ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Not found" });

    if (product.farmer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const numberFields = ["price", "quantity", "shelfLife"];
    const textFields = ["name", "category", "subcategory", "unit", "description"];

    for (const field of numberFields) {
      if (req.body[field] !== undefined && req.body[field] !== "") {
        const num = Number(req.body[field]);
        if (Number.isNaN(num)) {
          return res.status(400).json({ message: `${field} must be a valid number` });
        }
        product[field] = num;
      }
    }

    for (const field of textFields) {
      if (req.body[field] !== undefined && req.body[field] !== "") {
        product[field] = req.body[field].trim();
      }
    }

    if (req.body.harvestDate !== undefined) {
      if (req.body.harvestDate === "" || req.body.harvestDate === null) {
        product.harvestDate = null;
      } else {
        const date = new Date(req.body.harvestDate);
        if (isNaN(date.getTime())) {
          return res.status(400).json({ message: "Invalid harvest date format" });
        }
        product.harvestDate = date;
      }
    }

    if (req.file) {
      product.image = `/uploads/${req.file.filename}`;
    }

    await product.save();
    res.json(product);
  } catch (err) {
    console.error("Update product ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};

export const getMyProducts = async (req, res) => {
  try {
    const products = await Product.find({
      farmer: req.user._id,
      isActive: true,
      ...notExpiredFilter(),
    }).sort({ createdAt: -1 });

    res.json(products);
  } catch (err) {
    console.error("Get my products ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Not found" });

    if (product.farmer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    product.isActive = false;
    await product.save();

    res.json({ message: "Product disabled" });
  } catch (err) {
    console.error("Delete product ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};

export const getPublicProducts = async (req, res) => {
  try {
    const { category, subcategory, limit = 20 } = req.query;

    const filter = {
      isActive: true,
      ...notExpiredFilter(),
    };

    if (category) filter.category = category;
    if (subcategory) filter.subcategory = subcategory;

    const products = await Product.find(filter)
      .populate("farmer", "firstName lastName email")
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    res.json(products);
  } catch (err) {
    console.error("Get public products ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};
