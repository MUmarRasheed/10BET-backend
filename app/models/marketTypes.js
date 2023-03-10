/* eslint no-unused-vars: "off" */
let mongoose = require("mongoose");
let Schema = mongoose.Schema;
// let Global = require('../global/settings')
/**
 * [marketTypesSchema description]
 * @status [ 0(non-active), 1 (active)]
 */
let marketTypesSchema = new Schema({
  marketId: { type: Number, unique: true, index: true },
  name: { type: Number },
  status: { type: Number, required: true },
  updatedAt: { type: Number },
  createdAt: { type: Number },
});

marketTypesSchema.pre("save", function (next) {
  var now = new Date().getTime() / 1000;
  if (!this.createdAt) {
    this.createdAt = now;
  } else {
    this.updatedAt = now;
  }
  next();
});

const MarketType = mongoose.model("marketType", marketTypesSchema);
MarketType.createIndexes();

module.exports = MarketType;
