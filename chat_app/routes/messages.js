const express = require("express");
const GroupMessage = require("../models/GroupMessage");

const router = express.Router();

// ✅ Get all messages for a specific room
router.get("/:room", async (req, res) => {
    try {
        const messages = await GroupMessage.find({ room: req.params.room }).sort({ date_sent: 1 });
        res.json(messages);
    } catch (err) {
        console.error("❌ Error fetching messages:", err);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;
