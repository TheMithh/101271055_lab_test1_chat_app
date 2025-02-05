// File: routes/messages.js
const express = require("express");
const router = express.Router();
const GroupMessage = require("../models/GroupMessage");
const PrivateMessage = require("../models/PrivateMessage");

// 1) GET group messages for a room
router.get("/:room", async (req, res) => {
  try {
    const { room } = req.params;
    const messages = await GroupMessage.find({ room }).sort({ date_sent: 1 });
    res.json(messages);
  } catch (err) {
    console.error("Error in GET /:room:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// 2) POST private messages for a conversation
router.post("/private/:buddy", async (req, res) => {
  try {
    const { buddy } = req.params; // the other person's username
    const { currentUser } = req.body; // the local user's username

    // Find all messages between these two users
    const messages = await PrivateMessage.find({
      $or: [
        { from_user: currentUser, to_user: buddy },
        { from_user: buddy, to_user: currentUser }
      ]
    }).sort({ date_sent: 1 });

    res.json(messages);
  } catch (err) {
    console.error("Error in POST /private/:buddy:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
