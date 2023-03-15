const mongoose = require("mongoose");
const Schema = mongoose.Schema;
var bcrypt = require("bcrypt");
let config = require("config"); // we load the db location from the JSON files
let Global = require("../global/settings");

mongoose.set("debug", true);
const saltrounds = config.saltRounds;
/**
 * [UserSchema description]
 * @roles [ 0 (company) 1 (superAdmin), 2 (admin), 3 (superMaster), 4 (master), 5 (better)]
 */
const userSchema = new Schema({
  userName: { type: String, index: true, required: true, unique: true },
  password: { type: String, required: true },
  reference: { type: String,required: true },
  phone: { type: String,required: true },
  token: { type: String, default: "", index: true },
  role: { type: String, default: 0, index: true },
  isActive: { type: Boolean, default: false },
  status: { type: Number, default: 0 },
  notes: { type: String },
  userId: { type: Number, required: true, index: true, unique: true, default: 0 },
  passwordChanged: { type: Boolean, default: false },
  balance: { type: Number, default: 0, required: true },
  createdBy: { type: String, default: "0" },
  downLineShare: { type: Number, default: 0 },
  bettingAllowed: { type: Boolean, default: false },
  canSettlePL: { type: Boolean, default: false },
  adminId : { type: String, default: '' }, // only for supermaster 
  parentId : { type: String, default: '' }, // only for supermaster 
  masterId: { type: String, default: '' }, // 
  superAdminId: { type: String, default: '' },
  updatedBy: { type: Number },
  updatedAt: { type: Number },
  createdAt: { type: Number },
});

// userSchema.plugin(Global.paginate)

userSchema.methods.hashPass = function (next) {
  // add some stuff to the users name
  bcrypt.hash(this.password, saltrounds, function (error, hash) {
    if (error) {
      return next(error);
    } else {
      this.password = hash;
      // next should be called after the password has been hashed
      // otherwise non hashed password will be saved in the db
      next();
    }
  });
};

// Sets the createdAt parameter equal to the current time
userSchema.pre("save", function (next) {
  if (!this.isModified("password")) {
    return next();
  } // Adding this statement solved the problem!!
  const user = this;
  var now = new Date().getTime() / 1000;
  if (!this.createdAt) {
    this.createdAt = now;
    this.updatedAt = now;
  } else {
    this.updatedAt = now;
  }
  bcrypt.hash(user.password, saltrounds, function (error, hash) {
    if (error) {
      return next(error);
    } else {
      user.password = hash;
      // next should be called after the password has been hashed
      // otherwise non hashed password will be saved in the db
      next();
    }
  });
});
userSchema.plugin(Global.paginate);
userSchema.plugin(Global.aggregatePaginate);

userSchema.index({ userName: 1, isActive: 1 });

const User = mongoose.model("User", userSchema);
// User.createIndexes();

module.exports = User;
