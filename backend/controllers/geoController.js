import User from "../models/User.js";
import Product from "../models/Product.js";

const notExpiredFilter = () => ({
  $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
});


export const getNearbyFarmersForMe = async (req, res) => {
  try {
    const { maxDistance = 5000, limit = 50 } = req.query;

    const coords = req.user?.location?.coordinates;
    if (!Array.isArray(coords) || coords.length !== 2) {
      return res.status(400).json({ message: "Set your location first" });
    }

    const [lng, lat] = coords;

    const farmers = await User.find({
      role: "farmer",
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [lng, lat] },
          $maxDistance: Number(maxDistance),
        },
      },
    })
      .limit(Number(limit))
      .select("firstName lastName email profileImage addressText location");

    res.json({ maxDistance: Number(maxDistance), farmers });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getNearbyProductsForMe = async (req, res) => {
  try {
    const { maxDistance = 5000, limit = 20, category, subcategory } = req.query;

    const coords = req.user?.location?.coordinates;
    if (!Array.isArray(coords) || coords.length !== 2) {
      return res.status(400).json({ message: "Set your location first" });
    }

    const [lng, lat] = coords;

    const nearbyFarmers = await User.find({
      role: "farmer",
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [lng, lat] },
          $maxDistance: Number(maxDistance),
        },
      },
    }).select("_id");

    const farmerIds = nearbyFarmers.map((u) => u._id);

    const filter = {
      isActive: true,
      ...notExpiredFilter(),
      farmer: { $in: farmerIds },
    };
    if (category) filter.category = category;
    if (subcategory) filter.subcategory = subcategory;

    const products = await Product.find(filter)
      .populate("farmer", "firstName lastName email profileImage addressText location")
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    res.json({ mode: "nearbyMe", maxDistance: Number(maxDistance), products });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
