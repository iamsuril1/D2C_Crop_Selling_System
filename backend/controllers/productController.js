import Product from "../models/Product.js";
import User    from "../models/User.js";

const notExpiredFilter = () => ({
  $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
});

export const getProductById = async (req, res) => {
  try {
    const product = await Product.findOne({
      _id:      req.params.id,
      isActive: true,
      ...notExpiredFilter(),
    }).populate("farmer", "firstName lastName email profileImage addressText location");

    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createProduct = async (req, res) => {
  try {
    const {
      name, category, subcategory, price, bulkPrice,
      minOrderQty, quantity, unit, description,
      harvestDate, shelfLife,
    } = req.body;

    if (!name?.trim() || !category?.trim()) {
      return res.status(400).json({ message: "Name and category are required" });
    }

    const parsedPrice      = Number(price);
    const parsedQuantity   = Number(quantity);
    const parsedShelfLife  = Number(shelfLife);
    const parsedMinOrder   = Number(minOrderQty) || 10;
    const parsedBulkPrice  = bulkPrice ? Number(bulkPrice) : null;

    if (isNaN(parsedPrice)     || parsedPrice    <= 0) return res.status(400).json({ message: "Price must be a positive number"      });
    if (isNaN(parsedQuantity)  || parsedQuantity <= 0) return res.status(400).json({ message: "Quantity must be a positive number"   });
    if (isNaN(parsedShelfLife) || parsedShelfLife<= 0) return res.status(400).json({ message: "Shelf life must be a positive number" });
    if (parsedMinOrder < 1)                            return res.status(400).json({ message: "Minimum order must be at least 1"     });
    if (parsedBulkPrice !== null && (isNaN(parsedBulkPrice) || parsedBulkPrice <= 0)) {
      return res.status(400).json({ message: "Bulk price must be a positive number" });
    }
    if (parsedBulkPrice !== null && parsedBulkPrice >= parsedPrice) {
      return res.status(400).json({ message: "Bulk price must be less than the regular price" });
    }

    let parsedHarvestDate = null;
    if (harvestDate) {
      parsedHarvestDate = new Date(harvestDate);
      if (isNaN(parsedHarvestDate.getTime())) {
        return res.status(400).json({ message: "Invalid harvest date format" });
      }
    }

    const product = await Product.create({
      farmer:      req.user._id,
      name:        name.trim(),
      category:    category.trim(),
      subcategory: subcategory?.trim() || "",
      price:       parsedPrice,
      bulkPrice:   parsedBulkPrice,
      minOrderQty: parsedMinOrder,
      quantity:    parsedQuantity,
      unit:        unit || "kg",
      description: description?.trim() || "",
      harvestDate: parsedHarvestDate,
      shelfLife:   parsedShelfLife,
      image:       req.file ? `/uploads/${req.file.filename}` : "",
    });

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

    const numberFields = ["price", "quantity", "shelfLife", "minOrderQty", "bulkPrice"];
    const textFields   = ["name", "category", "subcategory", "unit", "description"];

    for (const field of numberFields) {
      if (req.body[field] !== undefined && req.body[field] !== "" && req.body[field] !== null) {
        const num = Number(req.body[field]);
        if (isNaN(num)) return res.status(400).json({ message: `${field} must be a valid number` });
        product[field] = num;
      }
      if (field === "bulkPrice" && (req.body[field] === "" || req.body[field] === null)) {
        product.bulkPrice = null;
      }
    }

    for (const field of textFields) {
      if (req.body[field] !== undefined && req.body[field] !== "") {
        product[field] = req.body[field].trim();
      }
    }

    if (product.bulkPrice !== null && product.bulkPrice >= product.price) {
      return res.status(400).json({ message: "Bulk price must be less than the regular price" });
    }
    if (product.minOrderQty < 1) {
      return res.status(400).json({ message: "Minimum order must be at least 1" });
    }

    if (req.body.harvestDate !== undefined) {
      if (!req.body.harvestDate) {
        product.harvestDate = null;
      } else {
        const d = new Date(req.body.harvestDate);
        if (isNaN(d.getTime())) return res.status(400).json({ message: "Invalid harvest date format" });
        product.harvestDate = d;
      }
    }

    if (req.file) product.image = `/uploads/${req.file.filename}`;

    await product.save();
    res.json(product);
  } catch (err) {
    console.error("Update product ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};

export const getMyProducts = async (req, res) => {
  try {
    const products = await Product.find({ farmer: req.user._id }).sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
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
    res.status(500).json({ message: err.message });
  }
};

export const getPublicProducts = async (req, res) => {
  try {
    const { category, subcategory, limit = 20, lat, lng, maxDistance = 5000 } = req.query;

    const filter = { isActive: true, ...notExpiredFilter() };
    if (category)    filter.category    = category;
    if (subcategory) filter.subcategory = subcategory;

    if (lat === undefined || lng === undefined) {
      const products = await Product.find(filter)
        .populate("farmer", "firstName lastName email profileImage addressText location")
        .limit(Number(limit))
        .sort({ createdAt: -1 });
      return res.json({ mode: "all", products });
    }

    const latNum = Number(lat);
    const lngNum = Number(lng);
    const maxD   = Number(maxDistance);

    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      return res.status(400).json({ message: "lat/lng must be numbers" });
    }

    const nearbyFarmers = await User.find({
      role: "farmer",
      location: {
        $near: {
          $geometry:    { type: "Point", coordinates: [lngNum, latNum] },
          $maxDistance: maxD,
        },
      },
    }).select("_id");

    const farmerIds = nearbyFarmers.map((u) => u._id);
    const products  = await Product.find({ ...filter, farmer: { $in: farmerIds } })
      .populate("farmer", "firstName lastName email profileImage addressText location")
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    return res.json({ mode: "nearby", maxDistance: maxD, products });
  } catch (err) {
    console.error("Get public products ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};