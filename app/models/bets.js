const mongoose = require("mongoose");
const BetSizes = require("./betSizes");

const betSchema = new mongoose.Schema({
  sportsId: { type: Number, required: true },
  userId: { type: Number, required: true },
  betAmount: { type: Number, required: true },
  betRate: { type: Number, required: true },
  returnAmount: { type: Number, required: true },
  createdAt: { type: Number },
  updatedAt: { type: Number },
});

betSchema.pre("save", function (next) {
  var now = new Date().getTime() / 1000;
  if (!this.createdAt) {
    this.createdAt = now;
  } else {
    this.updatedAt = now;
  }
  next();
});

const Bets = mongoose.model("bet", betSchema);
//   Bets.createIndexes();
module.exports = Bets;
