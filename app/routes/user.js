const express = require("express");
var jwt = require("jsonwebtoken");
const userValidation = require("../validators/user");
const bcrypt = require("bcrypt");
const { validationResult } = require("express-validator");
let config = require("config");
const User = require("../models/user");
const Recharge = require("../models/recharges");
const LoginActivity = require("../models/loginActivity");
var getIP = require("ipware")().get_ip;

const router = express.Router();
const loginRouter = express.Router();
const app = express();

function registerUser(req, res) {
  const errors = validationResult(req);
  if (errors.errors.length !== 0) {
    return res.status(400).send({ errors: errors.errors });
  }

  User.findOne()
    .sort({ userId: -1 })
    .exec((err, data) => {
      if (err) return res.status(404).send({ message: "user not found", err });
      const user = new User(req.body);
      user.userId = data.userId + 1;
      if(req.decoded.role == '1') user.superAdminId = req.decoded.userId
      if(req.decoded.role == '2') {
        user.parentId = req.decoded.userId
        user.superAdminId = req.decoded.superAdminId
      }
      
      if(req.decoded.role == '3'){
        user.superAdminId = req.decoded.superAdminId
        user.parentId = req.decoded.parentId
        user.adminId = req.decoded.userId
      } 
      if(req.decoded.role == '4'){
        user.adminId = req.decoded.adminId
        user.superAdminId = req.decoded.superAdminId
        user.parentId = req.decoded.parentId
        user.masterId = req.decoded.userId
      }
      if (req.body.isActive == true) {
        user.status = 1;
      } else {
        user.status = 0;
      }
      if (req.body.role == "3") {
        if (!req.body.downLineShare)
          return res.status(404).send({ message: "downLineShare is required" });
      }
      user.downLineShare = req.body.downLineShare;
      var token = getNonExpiringToken(
        user.userId,
        req.decoded.userId,
        req.body.role
      );
      user.token = token;
      user.createdBy = req.decoded.userId;
      user.save((err, user) => {
        if (err && err.code === 11000) {
          if (err.keyPattern.userName === 1)
            return res.status(404).send({ message: "user already present" });
        }
        if (err) return res.status(404).send({ message: "user not registered", err });
        // Add balance to recharge collection
        const recharge = new Recharge({
          userId: user.userId,
          dateCreated: Date.now(),
          amount: req.body.balance,
          createdBy: req.decoded.userId,
          rechargedBy: req.decoded.role,
          role: req.body.role,
        });
        recharge.save((err, success) => {
          if (err)
            return res.status(404).send({ message: "recharge not saved", err });
          console.log("recharge saved successfully");
        });
        return res.send({ message: "Register Success", success: true, results: user });
      });
    });
}

function login(req, res) {
  const errors = validationResult(req);
  if (errors.errors.length !== 0) {
    return res.status(400).send({ errors: errors.errors });
  }
  User.findOne(
    { userName: req.body.userName, isActive: true, status: 1 },
    (err, user) => {
      if (err || !user)
        return res.status(404).send({ message: "user not found or user is not active" });
      // check if user password is matched or not.
      bcrypt.compare(req.body.password, user.password, function (err, result) {
        if (err) return res.status(404).send({ message: "incorrect password" });
        if (!result)
          return res.status(404).send({ message: "incorrect password" });
        var token = getNonExpiringToken(user.userId, user.createdBy, user.role, user.parentId, user.superAdminId, user.adminId);
        user.token = token;
        var ipInfo = getIP(req);
        var userDetailsForLoginActivity = {
          userName: user.userName,
          userId: user.userId,
          balance: user.balance,
          status: user.status,
          phone: user.phone,
          role: user.role,
          token: user.token,
          isActive: user.isActive,
          createdBy: user.createdBy,
          ipAddress: ipInfo.clientIp,
          createdAt: new Date().getTime(),
          updatedAt: new Date().getTime(),
        };
        // console.log("userDetailsForLoginActivity", userDetailsForLoginActivity);
        saveLoginActivity(userDetailsForLoginActivity, (err, data) => {
          if (err)
            return res
              .status(404)
              .send({ message: "login activity not saved" });
          return res.send({
            success: true,
            message: "User Login Successfully",
            userName: user.userName,
            token: user.token,
            role: user.role,
            userId: user.userId,
            balance: user.balance
          });
        });
      });
    }
  );
}

function saveLoginActivity(detailsForLoginActivity, _callback) {
  LoginActivity.findOneAndUpdate(
    {
      userId: detailsForLoginActivity.userId,
    },
    detailsForLoginActivity,
    { upsert: true, new: true },
    (err, user) => {
      if (err) return _callback({ message: "login activity not saved" });
      return _callback(null, {
        success: true,
        message: "Login Successfully",
        userName: user.userName,
        token: user.token,
        role: user.role,
      });
    }
  );
}

function getNonExpiringToken(userId, createdBy, role, parentId,superAdminId,adminId) {
  const payload = {
    userId: userId,
    createdBy: createdBy,
    role: role,
    parentId: parentId,
    superAdminId: superAdminId,
    adminId: adminId
  };
  var token = jwt.sign(payload, config.secret, {});
  return token;
}
app.set("secret", config.secret);

//   This will ensure that only users with roles that are allowed to access the endpoint can load user balance.

function loadUserBalance(req, res) {
  const errors = validationResult(req);
  if (errors.errors.length !== 0) {
    return res.status(400).send({ errors: errors.errors });
  }
  if (
    req.body.role == req.decoded.role &&
    req.body.userId == req.decoded.userId
  ) {
    return res
      .status(404)
      .send({ message: "You cannot recharge balance to yourself " });
  }
  // Find the user who is initiating the balance transfer
  User.findOne(
    { role: req.decoded.role, userId: req.decoded.userId },
    (err, user) => {
      if (err || !user) {
        return res.status(404).send({ message: "User not found" });
      }

      // Check if the user has enough balance to transfer the requested amount
      if (user.balance < req.body.loadedAmount) {
        return res.status(404).send({ message: "Insufficient balance" });
      }

      // Deduct the loaded amount from the user's balance
      user.balance -= req.body.loadedAmount;
      user.save();

      // Deduct the loaded amount from the user's recharge amount
      Recharge.findOne(
        { role: req.decoded.role, userId: req.decoded.userId },
        (err, recharge) => {
          if (err || !recharge) {
            return res
              .status(404)
              .send({ message: " recharge amount not found" });
          }
          recharge.amount -= req.body.loadedAmount;
          recharge.save();

          // Find the recipient user in the user

          User.findOne(
            { role: req.body.role, userId: req.body.userId },
            (err, user) => {
              if (err || !user) {
                return res
                  .status(404)
                  .send({ message: "Recipient User not found" });
              }
              // Add the loaded amount in the recipient user's account
              user.balance += req.body.loadedAmount;
              user.save();

              // Find the recipient user in the recharge table

              Recharge.findOne(
                { userId: req.body.userId, role: req.body.role },
                (err, recharge) => {
                  if (err || !recharge) {
                    return res.status(404).send({
                      message: "Recipient user recharge not found",
                    });
                  }

                  // Add the loaded amount to the recipient user's balance
                  recharge.amount += req.body.loadedAmount;
                  (recharge.loadedAmount = req.body.loadedAmount),
                    (recharge.loadedBy = req.decoded.role),
                  recharge.save((err, results) => {
                    if (err || !results) {
                      return res.status(404).send({
                        message: "Failed to update recharge data",
                      });
                    }
                    return res.send({
                      success: true,
                      message: "Loaded user balance successfully",
                      results: results,
                    });
                  });
                }
              );
            }
          );
        }
      );
    }
  );
}

function getAllUsers(req, res) {
  // Initialize variables with default values
  let query = {};
  if (req.decoded.login.role == "0") {
    query = {};
  }
  let page = 1;
  let sort = -1;
  let sortValue = "createdAt";
  var limit = config.pageSize;
  if (req.query.numRecords) {
    if (isNaN(req.query.numRecords))
      return res.status(404).send({ message: "NUMBER_RECORDS_IS_NOT_PROPER" });
    if (req.query.numRecords < 0)
      return res.status(404).send({ message: "NUMBER_RECORDS_IS_NOT_PROPER" });
    if (req.query.numRecords > 100)
      return res.status(404).send({
        message: "NUMBER_RECORDS_NEED_TO_LESS_THAN_100",
      });
    limit = Number(req.query.numRecords);
  }
  if (req.query.sortValue) sortValue = req.query.sortValue;
  if (req.query.sort) {
    sort = Number(req.query.sort);
  }
  if (req.query.page) {
    page = Number(req.query.page);
  }

  if(req.decoded.login.role == '1') query.superAdminId = req.decoded.userId
  if(req.decoded.login.role == '2') query.parentId = req.decoded.userId
  if(req.decoded.login.role == '3') query.adminId = req.decoded.userId
  if(req.decoded.login.role == '4') query.masterId = req.decoded.userId
  // if (req.decoded.parentId) {
  //   query.parentId = req.decoded.parentId;
  // }
  if(req.query.userId) {
    query.userId = req.query.userId
  }

  User.paginate(
    query,
    { page: page, sort: { [sortValue]: sort }, limit: limit },
    (err, results) => {
      if(results.total == 0){
        return res.status(404).send({message:"No records found"})
      }
      if (err)
        return res.status(404).send({ message: "USERS_PAGINATION_FAILED" });
      return res.send({
        success: true,
        message: "Users Record Found",
        results: results,
      });
    }
  );
}

function changePassword(req, res) {
  const errors = validationResult(req);
  if (errors.errors.length !== 0) {
    return res.status(400).send({ errors: errors.errors });
  }
  User.findOne({ userId: req.decoded.userId }, (err, user) => {
    if (err || !user)
      return res.status(404).send({ message: "User not found" });
    user.password = req.body.password;
    user.passwordChanged = true;
    user.hashPass(function (err) {
      if (err) return res.status(404).send({ message: "NEW_PASS_HASH_FAIL" });
      user.save((err, results) => {
        if (err) {
          return res.status(404).send({ message: "USER_NOT_FOUND" });
        }
        return res.send({ success: true, message: "USER_PASSWORD_UPDATED", results: results });
      });
    });
  });
}

function updateUser(req, res) {
  const errors = validationResult(req);
  if (errors.errors.length !== 0) {
    return res.status(400).send({ errors: errors.errors });
  }
  let updateData = {
    isActive: req.body.isActive,
    canSettlePL: req.body.canSettlePL,
    bettingAllowed: req.body.bettingAllowed,
    phone: req.body.phone,
    reference: req.body.reference,
    notes: req.body.notes,
    updatedBy: req.decoded.userId,
  };
  User.findOne({ _id: req.body.id }, (err, user) => {
    if (err || !user) res.status(404).send({ message: "user not found" });
    bcrypt.hash(req.body.password, config.saltRounds, (err, hash) => {
      if (err) return res.status(404).send({ message: "NEW_PASS_HASH_FAIL" });
      updateData.password = hash;
      User.updateOne(
        { _id: req.body.id },
        { $set: updateData },
        { new: true },
        (err, updatedUser) => {
          if (err)
            return res.status(404).send({ message: "user not updated " });
          return res.send({
            success: true,
            message: "user updated successfully",
            results : null
          });
        }
      );
    });
  });
}

function searchUsers(req, res) {
  const errors = validationResult(req);
  if (errors.errors.length !== 0) {
    return res.status(400).send({ errors: errors.errors });
  }
	var page = 1
	var sort = -1
	var sortValue = 'createdAt'
	var limit = config.pageSize
	if (req.body.numRecords) {
	  if (isNaN(req.body.numRecords))
		return res.status(404).send({ message: 'NUMBER_RECORDS_IS_NOT_PROPER' })
	  if (req.body.numRecords < 0)
		return res.status(404).send({ message: 'NUMBER_RECORDS_IS_NOT_PROPER' })
	  if (req.body.numRecords > 100)
		return res.status(404).send({
		  message: 'NUMBER_RECORDS_NEED_TO_LESS_THAN_100',
		})
	  limit = Number(req.body.numRecords)
	}
	if (req.body.page) {
	  page = req.body.page
	}
	let query = {}
	query.userName = { $regex: req.body.userName, $options: 'i' }
	User.paginate(
	  query,
	  { page: page, sort: { [sortValue]: sort }, limit: limit },
	  (err, results) => {
		if (err) return res.status(404).send({ message: "search users pagination failed" })
		return res.send({
      success: true,
		  message: 'users record found',
		  results
	  	})
	 })
  }

function getCurrentUser(req,res){
  const errors = validationResult(req)
	if (errors.errors.length !== 0) {
	  return res.status(400).send({ errors: errors.errors })
	}
  User.findOne(
	  { userId: req.decoded.userId },
	  (err, user) => {
		if (err || !user) return res.status(404).send({ message: "user not found" })
		return res.send({
      success: true,
		  message: 'users record found',
		  results : user
		})
	})
} 
function getSingleUser(req,res){
  const errors = validationResult(req)
	if (errors.errors.length !== 0) {
	  return res.status(400).send({ errors: errors.errors })
	}
  User.findOne(
	  { _id: req.body.id },
	  (err, result) => {
		if (err || !result) return res.status(404).send({ message: "user not found" })
		return res.send({
      success: true,
		  message: 'users record found',
		  results : result
		})
	})
}

router.post("/login", userValidation.validate("login"), login);
loginRouter.post(
  "/register",
  userValidation.validate("registerUser"),
  registerUser
);
loginRouter.post(
  "/loadUserBalance",
  userValidation.validate("loadUserBalance"),
  loadUserBalance
);
loginRouter.get("/getAllUsers", getAllUsers);
loginRouter.post(
  "/changePassword",
  userValidation.validate("changePassword"),
  changePassword
);
loginRouter.post(
  "/updateUser",
  userValidation.validate("updateUser"),
  updateUser
);

loginRouter.post(
  "/searchUsers",
  userValidation.validate("searchUsers"),
  searchUsers
);
loginRouter.get("/getCurrentUser",getCurrentUser);
router.post("/getSingleUser",
userValidation.validate("getSingleUser"),
getSingleUser
);

module.exports = { router, loginRouter };
