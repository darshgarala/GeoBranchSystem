const express = require("express");
const router = express.Router();

const {
  createBranch,
  getNearestBranch,
  getBranch,
} = require("../controllers/branchController");
const { createTicket } = require("../controllers/ticketController");

router.post("/branch", createBranch);
router.get("/branch", getBranch);
router.get("/branch/nearest", getNearestBranch);
router.post("/ticket", createTicket);

module.exports = router;
