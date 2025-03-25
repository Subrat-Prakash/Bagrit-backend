const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY); 
require("dotenv").config();

const userMiddleware = require("../middlewares/user");
const innovativeProd = require("../models/innovativeProdModel");
const User = require("../models/user");
const { sendVerificationEmail, sendResetEmail } = require("../utils/emailService");

const secretKey = process.env.SECRET || "Bharath601";  // Use env variables for security

// ✅ Generate Tokens
const verification_key = (email) => jwt.sign({ email }, secretKey, { expiresIn: "1d" });
const passwordResetToken = (email) => jwt.sign({ email }, secretKey, { expiresIn: "1d" });


// ✅ Signup Route
router.post("/signup", async (req, res) => {
    const { username, email, password, cPassword } = req.body;

    if (!username || !email || !password || !cPassword) {
        return res.status(400).json({ error: "All fields are required." });
    }

    if (!email.includes("@")) {
        return res.status(400).json({ error: "Enter a correct email address." });
    }

    if (password.length < 8) {
        return res.status(400).json({ error: "Password should contain at least 8 characters." });
    }

    if (password !== cPassword) {
        return res.status(400).json({ error: "Password and Confirm password should be the same." });
    }

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: "User already exists." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            username,
            email,
            password: hashedPassword,
            verified: false
        });

        await user.save();
        
        // Send verification email
        const token = verification_key(email);
        sendVerificationEmail(email, token);

        res.status(201).json({ message: "User created successfully. Please verify your email." });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error." });
    }
});

// ✅ Signin Route
router.post("/signin", async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({ msg: "Incorrect email or password" });
        }

        if (!user.verified) {
            return res.status(401).json({ msg: "Please verify your email first." });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ msg: "Incorrect email or password" });
        }

        const token = jwt.sign({ email }, secretKey, { expiresIn: "1h" });

        res.cookie("token", token, {
            httpOnly: true,
            secure: true,
            sameSite: "None"
        });

        res.status(200).json({ msg: "Login successful", email: user.email });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error." });
    }
});

// ✅ Get User Route
router.get("/user", userMiddleware, async (req, res) => {
    try {
        const email = req.user.email;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const boughtProducts = user.boughtProducts.map(product => {
            const { stripeSessionId, ...productDetails } = product;
            return productDetails;
        });

        res.json({
            username: user.username,
            email: user.email,
            boughtProducts
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});

// ✅ Stripe Checkout Route
router.post("/create-checkout-session", userMiddleware, async (req, res) => {
    try {
        const email = req.user.email;
        const { items, userDetails } = req.body;

        const lineItems = items.map(item => ({
            price_data: {
                currency: "inr",
                product_data: { name: item.title },
                unit_amount: item.price * 100
            },
            quantity: item.quantity
        }));

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: lineItems,
            mode: "payment",
            success_url: `${process.env.FRONTEND_URL}/success`,
            cancel_url: `${process.env.FRONTEND_URL}/failure`,
            shipping_address_collection: { allowed_countries: ["IN"] },
            customer_email: email,
        });

        const user = await User.findOne({ email });

        if (user) {
            user.boughtProducts.push({
                stripeSessionId: session.id,
                ...userDetails,
                products: items
            });

            await user.save();
        }

        res.json({ sessionId: session.id });

    } catch (error) {
        console.error("Error creating Stripe checkout session:", error);
        res.status(500).json({ error: error.message });
    }
});

// ✅ Stripe Webhook Route
router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    const sig = req.headers["stripe-signature"];

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
        const session = event.data.object;

        await User.updateOne(
            { email: session.customer_email },
            { $push: { boughtProducts: { stripeSessionId: session.id } } }
        );
    }

    res.json({ received: true });
});

// ✅ Email Verification Route
router.get("/verify-email", async (req, res) => {
    try {
        const { token } = req.query;
        const { email } = jwt.verify(token, secretKey);

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        user.verified = true;
        await user.save();

        res.send("Email successfully verified!");

    } catch (error) {
        console.error("Error verifying email:", error);
        res.status(400).send("Invalid or expired token.");
    }
});

// ✅ Forgot Password Route
router.post("/forgot_password", async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).send("User not found.");
        }

        const resetToken = passwordResetToken(email);
        sendResetEmail(email, resetToken);

        res.status(201).send("Password reset email sent.");

    } catch (error) {
        console.error(error);
        res.status(500).send(error.message);
    }
});

// ✅ Reset Password Route
router.post("/reset-password", async (req, res) => {
    try {
        const { email, newPassword } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).send("User not found.");
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        res.status(200).send("Password successfully updated.");

    } catch (error) {
        console.error(error);
        res.status(500).send(error.message);
    }
});

// ✅ Logout Route
router.get("/logout", (req, res) => {
    res.clearCookie("token", { path: "/", httpOnly: true, secure: true, sameSite: "None" });
    res.status(200).json({ message: "Logged out successfully" });
});

module.exports = router;
