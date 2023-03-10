/* eslint no-unused-vars: "off" */
let mongoose = require("mongoose");
let Schema = mongoose.Schema;
mongoose.set("debug", true);
// let Global = require('../global/settings')

let betSizesSchema = new Schema({
  userId: { type: Number, unique: true, index: true },
  soccer: { type: Number },
  tennis: { type: Number },
  cricket: { type: String },
  fancy: { type: Number },
  races: { type: Number },
  casino: { type: Number },
  greyHound: { type: Number },
  bookMaker: { type: Number },
  tPin: { type: Number },
  updatedAt: { type: Number },
  createdAt: { type: Number },
});

// betSizesSchema.plugin(Global.aggregatePaginate)
// betSizesSchema.plugin(Global.paginate)

betSizesSchema.pre("save", function (next) {
  var now = new Date().getTime() / 1000;
  if (!this.createdAt) {
    this.createdAt = now;
  } else {
    this.updatedAt = now;
  }
  next();
});

const BetSizes = mongoose.model("betSize", betSizesSchema);
BetSizes.createIndexes();

module.exports = BetSizes;
