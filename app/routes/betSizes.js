const express = require("express");
var jwt = require("jsonwebtoken");
const userValidation = require("../validators/user");
const bcrypt = require("bcrypt");
const { validationResult } = require("express-validator");
let config = require("config");
const BetSizes = require("../models/betSizes");
const User = require("../models/user");

const loginRouter = express.Router();

function addBetSizes(req, res) {
  const errors = validationResult(req);
  if (errors.errors.length !== 0) {
    return res.status(400).send({ errors: errors.errors });
  }

  const userId = req.decoded.userId;
  const betSizesData = {
    soccer: req.body.soccer,
    tennis: req.body.tennis,
    cricket: req.body.cricket,
    fancy: req.body.fancy,
    races: req.body.races,
    casino: req.body.casino,
    greyHound: req.body.greyHound,
    bookMaker: req.body.bookMaker,
    tPin: req.body.tPin,
    userId: userId,
  };
  const maxAmounts = {
    soccer: 250000,
    tennis: 250000,
    cricket: 5000000,
    fancy: 200000,
    races: 200000,
    casino: 50000,
    greyHound: 50000,
    bookMaker: 2000000
  };
  
  const betTypes = Object.keys(betSizesData);
  for (let i = 0; i < betTypes.length; i++) {
    const betType = betTypes[i];
    const amount = betSizesData[betType];
    if (amount > maxAmounts[betType]) {
      return res.status(404).send({ message: `${betType} bet size cannot exceed ${maxAmounts[betType]}` });
    }
  }

  User.findOne({ userId }, (err, user) => {
    if (err || !user) {
      return res.status(404).send({ message: "User not found" });
    }

    BetSizes.findOneAndUpdate(
      { userId },
      betSizesData,
      { upsert: true, new: true },
      (err, betSizes) => {
        if (err) {
          return res
            .status(404)
            .send({ message: "Error adding/updating bet sizes" });
        }
        return res.send({
          success: true,
          message: "Bet sizes added/updated successfully",
          betSizes
        });
      }
    );
  });
}

loginRouter.post("/addBetSizes", addBetSizes);

module.exports = { loginRouter };
