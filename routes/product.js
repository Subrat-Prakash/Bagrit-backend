const express = require("express");
const router = express.Router();
const userMiddleware = require("../middlewares/user");
const jwt = require("jsonwebtoken");
const innovativeProd = require("../models/innovativeProdModel");
require("dotenv").config();

// ✅ Get All Innovative Products
router.get("/getInnovativeProd", userMiddleware, async (req, res) => {
    try {
        console.log("Fetching innovative products...");
        console.log("User Email:", req.user.email);

        const allInnovativeProds = await innovativeProd.find();

        if (!allInnovativeProds || allInnovativeProds.length === 0) {
            return res.status(404).json({ message: "No products found" });
        }

        res.status(200).json(allInnovativeProds);

    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ✅ Get Innovative Product by ID
router.get("/getInnovativeProd/:id", userMiddleware, async (req, res) => {
    const { id } = req.params;

    try {
        const innovativeProdById = await innovativeProd.findById(id);

        if (!innovativeProdById) {
            return res.status(404).json({ message: "Product not found" });
        }

        res.status(200).json(innovativeProdById);

    } catch (error) {
        console.error("Error fetching product by ID:", error);

        if (error.kind === "ObjectId") {
            return res.status(400).json({ message: "Invalid product ID" });
        }

        res.status(500).json({ error: "Internal server error" });
    }
});

// ✅ Search Innovative Products (Case-Insensitive)
router.get('/search', async (req, res) => {
    const { query } = req.query;

    try {
        if (!query) {
            return res.status(400).json({ message: "Search query is required" });
        }

        const products = await innovativeProd.find({
            title: { $regex: query, $options: "i" } // Case-insensitive search
        });

        if (!products.length) {
            return res.status(404).json({ message: "No products match your search" });
        }

        res.status(200).json(products);

    } catch (error) {
        console.error("Error searching products:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;
