const jwt = require("jsonwebtoken");
require("dotenv").config();

function userMiddleware(req, res, next) {
    // ✅ Extract token from cookie or Authorization header
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({ error: "Unauthorized. Please log in." });
    }

    try {
        const user = jwt.verify(token, process.env.SECRET);
        req.user = user;
        next();
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            // ✅ Token expired: Clear cookie and return 401
            res.clearCookie("token");
            return res.status(401).json({ error: "Session expired. Please log in again." });
        } else {
            // ✅ Invalid token: Clear cookie and return 401
            res.clearCookie("token");
            return res.status(401).json({ error: "Unauthorized. Invalid token." });
        }
    }
}

module.exports = userMiddleware;
