/* eslint no-unused-vars: "off" */
let mongoose = require('mongoose');
let Schema = mongoose.Schema;
mongoose.set('debug', true);
let Global = require('../global/settings');

let creditSchema = new Schema({
  userId: { type: Number, index: true },
  description: { type: String, required: false },
  amount: { type: Number, required: true, default: 0 },
  balance: { type: Number, required: false, default: 0 },
  maxWithdraw: { type: Number, default: 0 },
  credit: { type: Number, default: 0 },
  createdBy: { type: String },
  updatedAt: { type: Number },
  createdAt: { type: Number },
});

creditSchema.plugin(Global.aggregatePaginate);
creditSchema.plugin(Global.paginate);

creditSchema.pre('save', function (next) {
  var now = new Date().getTime() / 1000;
  if (!this.createdAt) {
    this.createdAt = now;
  } else {
    this.updatedAt = now;
  }
  next();
});

const Credit = mongoose.model('credit', creditSchema);
Credit.createIndexes();

module.exports = Credit;
