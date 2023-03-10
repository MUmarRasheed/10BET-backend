/* eslint no-unused-vars: "off" */
let mongoose = require("mongoose");
let Schema = mongoose.Schema;
// let Global = require('../global/settings')
/**
 * [marketTypesSchema description]
 * @status [ 0(non-active), 1 (active)]
 */
let subMarketTypesSchema = new Schema({
  marketId: { type: Number, unique: true, index: true },
  name: { type: Number },
  status: { type: Number, required: true },
  updatedAt: { type: Number },
  createdAt: { type: Number },
});

subMarketTypesSchema.pre("save", function (next) {
  var now = new Date().getTime() / 1000;
  if (!this.createdAt) {
    this.createdAt = now;
  } else {
    this.updatedAt = now;
  }
  next();
});

const SubMarketType = mongoose.model("subMarketType", subMarketTypesSchema);
SubMarketType.createIndexes();
module.exports = SubMarketType;
