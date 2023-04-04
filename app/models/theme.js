/* eslint no-unused-vars: "off" */
let mongoose = require('mongoose');
let Schema = mongoose.Schema;
mongoose.set('debug', true);
let Global = require('../global/settings');

let themeSchema = new Schema({
  defaultThemeName: { type: String, required: false },
  updatedAt: { type: Number },
  createdAt: { type: Number },
});

themeSchema.plugin(Global.aggregatePaginate);
themeSchema.plugin(Global.paginate);

themeSchema.pre('save', function (next) {
  var now = new Date().getTime() / 1000;
  if (!this.createdAt) {
    this.createdAt = now;
  } else {
    this.updatedAt = now;
  }
  next();
});

const Theme = mongoose.model('theme', themeSchema);

module.exports = Theme;
