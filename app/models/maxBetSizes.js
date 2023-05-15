/* eslint no-unused-vars: "off" */
let mongoose = require('mongoose');
let Schema = mongoose.Schema;
mongoose.set('debug', true);
// let Global = require('../global/settings')

let maxBetSizesSchema = new Schema({
  name: { type: String, required: true },
  amount: { type: Number, required: true },
  updatedAt: { type: Number },
  createdAt: { type: Number },
});

maxBetSizesSchema.pre('save', function (next) {
  var now = new Date().getTime() / 1000;
  if (!this.createdAt) {
    this.createdAt = now;
  } else {
    this.updatedAt = now;
  }
  next();
});

const maxBetSizes = mongoose.model('maxbetsizes', maxBetSizesSchema);

module.exports = maxBetSizes;
