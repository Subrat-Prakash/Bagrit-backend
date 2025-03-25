const express = require("express");
const router = express.Router();
const userMiddleware = require('../middlewares/user');
const User = require("../models/user");
require("dotenv").config();

// ✅ Add to Cart
router.post("/addToCart", userMiddleware, async (req, res) => {
    try {
        const email = req.user.email;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ msg: "User not found" });
        }

        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ msg: "Invalid item data" });
        }

        user.cart.push(req.body); 
        await user.save();

        res.status(201).json({ msg: "Item added to cart successfully" });

    } catch (error) {
        console.error("Error adding item to cart:", error);
        res.status(500).json({ msg: "Internal Server Error" });
    }
});

// ✅ Add to Buy Cart
router.post("/buyCart", userMiddleware, async (req, res) => {
    try {
        const email = req.user.email;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ msg: "User not found" });
        }

        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ msg: "Invalid item data" });
        }

        user.buyCart.push(req.body);
        await user.save();

        res.status(201).json({ msg: "Item added to buy cart successfully" });

    } catch (error) {
        console.error("Error adding item to buy cart:", error);
        res.status(500).json({ msg: "Internal Server Error" });
    }
});

// ✅ Clear Buy Cart
router.delete("/buyEmpty", userMiddleware, async (req, res) => {
    try {
        const email = req.user.email;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ msg: "User not found" });
        }

        user.buyCart = [];
        await user.save();

        res.status(200).json({ msg: "Buy cart cleared successfully" });

    } catch (error) {
        console.error("Error clearing buy cart:", error);
        res.status(500).json({ msg: "Internal Server Error" });
    }
});

// ✅ Get Buy Cart by Email
router.get("/getBuyEmail", userMiddleware, async (req, res) => {
    try {
        const email = req.user.email;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ msg: "User not found" });
        }

        res.status(200).json(user.buyCart);

    } catch (error) {
        console.error("Error fetching buy cart:", error);
        res.status(500).json({ msg: "Internal Server Error" });
    }
});

// ✅ Clear Cart
router.delete("/clearCart", userMiddleware, async (req, res) => {
    try {
        const email = req.user.email;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ msg: "User not found" });
        }

        user.cart = [];
        await user.save();

        res.status(200).json({ msg: "Cart cleared successfully" });

    } catch (error) {
        console.error("Error clearing cart:", error);
        res.status(500).json({ msg: "Internal Server Error" });
    }
});

// ✅ Get Cart by Email
router.get("/getCartByEmail", userMiddleware, async (req, res) => {
    try {
        const email = req.user.email;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ msg: "User not found" });
        }

        if (user.cart.length > 0) {
            res.status(200).json(user.cart);
        } else {
            res.status(404).json({ msg: "No cart items found for this email" });
        }

    } catch (error) {
        console.error("Error fetching cart items:", error);
        res.status(500).json({ msg: "Internal Server Error" });
    }
});

// ✅ Remove Item from Cart
router.post("/removeFromCart", userMiddleware, async (req, res) => {
    const { itemIndex } = req.body;
    const email = req.user.email;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ msg: "User not found" });
        }

        if (itemIndex >= 0 && itemIndex < user.cart.length) {
            user.cart.splice(itemIndex, 1);
            await user.save();
            res.status(200).json({ msg: "Item removed from cart successfully" });
        } else {
            res.status(400).json({ msg: "Invalid item index" });
        }

    } catch (error) {
        console.error("Error removing item from cart:", error);
        res.status(500).json({ msg: "Internal Server Error" });
    }
});

// ✅ Delete Last Bought Product
router.delete('/delete-last-product', userMiddleware, async (req, res) => {
    try {
        const email = req.user.email;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ msg: "User not found" });
        }

        if (user.boughtProducts.length === 0) {
            return res.status(400).json({ msg: "No bought products to delete" });
        }

        user.boughtProducts.pop();
        await user.save();

        res.status(200).json({ msg: "Last bought product deleted successfully" });

    } catch (error) {
        console.error("Error deleting last bought product:", error);
        res.status(500).json({ msg: "Internal Server Error" });
    }
});

module.exports = router;
