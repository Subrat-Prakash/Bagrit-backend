const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const dotenv = require("dotenv");

const connectDB = require("./db/connect");
const userRouter = require("./routes/user");
const productRouter = require("./routes/product");
const cartRouter = require("./routes/cart");

dotenv.config();
const app = express();

// ✅ Improved CORS Configuration
app.use(cors({
    origin: ["https://bagrit-frontend.vercel.app", "http://localhost:3000"],  // Add both Render and localhost
    credentials: true,  
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));

// ✅ Middleware
app.use(express.json());
app.use(cookieParser());

// ✅ Preflight Request Handling
app.options("*", cors());

// ✅ Routes
app.use(userRouter);
app.use(productRouter);
app.use(cartRouter);

// ✅ Connect to Database
connectDB(process.env.MONGO_URI);

// ✅ Server Listening
const PORT = process.env.PORT || 5001;  // Use default port if env variable is missing
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
