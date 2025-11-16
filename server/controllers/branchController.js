const Branch = require("../models/branchSchema");

const createBranch = async (req, res) => {
  try {
    const { name, city, location } = req.body;

    if (!name || !city || !location || !location.lat || !location.lng) {
      return res.status(400).json({
        message: "Missing required fields.",
      });
    }

    const geoJsonLocation = {
      type: "Point",
      coordinates: [location.lng, location.lat],
    };

    const newBranch = new Branch({
      name,
      city,
      location: geoJsonLocation,
    });

    await newBranch.save();
    res.status(201).json(newBranch);
  } catch (error) {
    console.error("Error creating branch:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getNearestBranch = async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res
        .status(400)
        .json({ message: "Missing required query parameters: lat, lng" });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const maxDistanceInMeters = 50 * 1000;

    const nearestBranch = await Branch.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [longitude, latitude],
          },
          $maxDistance: maxDistanceInMeters,
        },
      },
    });

    if (!nearestBranch) {
      return res
        .status(404)
        .json({ message: "No branches found within a 50km radius." });
    }

    res.status(200).json(nearestBranch);
  } catch (error) {
    console.error("Error finding nearest branch:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getBranch = async (req, res) => {
  try {
    const branches = await Branch.find({});
    res.status(200).json(branches);
  } catch (error) {
    console.error("Error fetching all branches:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  createBranch,
  getNearestBranch,
  getBranch,
};
