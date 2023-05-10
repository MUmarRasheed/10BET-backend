const mongoose = require('mongoose');
const BetSizes = require('./betSizes');
let Global = require('../global/settings');
/**
 * [betSchema description]
 *  @status [ active),(settled),(cancelled),(voided)]
 */
const betSchema = new mongoose.Schema({
  sportsId: { type: String, required: true },
  userId: { type: Number, required: true },
  betAmount: { type: Number, required: true },
  betRate: { type: Number, required: true }, // bet rate chosen by user
  returnAmount: { type: Number, required: true },
  createdAt: { type: Number },
  updatedAt: { type: Number },
  status: { type: String, default: 'pending' },
  team: { type: String },
  matchId: { type: String },
  status: { type: String },
  winningAmount: { type: Number },
  loosingAmount: { type: Number },
  subMarketId: { type: String },

  event: { type: String, default: '' },
  runner: { type: String, default: '' },
  position: { type: Number, default: 0 },
});

betSchema.pre('save', function (next) {
  var now = new Date().getTime() / 1000;
  if (!this.createdAt) {
    this.createdAt = now;
  } else {
    this.updatedAt = now;
  }
  next();
});

betSchema.plugin(Global.aggregatePaginate);
betSchema.plugin(Global.paginate);
const Bets = mongoose.model('bet', betSchema);
//   Bets.createIndexes();
module.exports = Bets;
