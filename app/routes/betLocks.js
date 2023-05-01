const express = require('express');
const { validationResult } = require('express-validator');
let config = require('config');
const BetLock = require('../models/betLocks');
const betLockValidator = require('../validators/betLocks');
const User = require('../models/user');
const MarketType = require('../models/marketTypes');
const loginRouter = express.Router();

async function addBetLock(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).send({ errors: errors.errors });
    }

    const selectedUsers = req.body.selectedUsers;
    const allUsers = req.body.allUsers;
    const bettingAllowed = req.body.bettingAllowed;
    const marketId = req.body.marketId;
    let query = {};
    query.isDeleted = false;
    if (req.decoded.login.role === '1') {
      query.superAdminId = req.decoded.userId;
    } else if (req.decoded.login.role === '2') {
      query.parentId = req.decoded.userId;
    } else if (req.decoded.login.role === '3') {
      query.adminId = req.decoded.userId;
    } else if (req.decoded.login.role === '4') {
      query.masterId = req.decoded.userId;
    }

    let foundUsers = [];
    if (allUsers) {
      foundUsers = await User.find(query).select(
        '_id userId userName bettingAllowed'
      );
      // update the bettingAllowed field for all users
      await User.updateMany(query, { $set: { bettingAllowed } });
    } else if (selectedUsers.length > 0) {
      const bulkUpdateOperations = selectedUsers.map((user) => ({
        updateOne: {
          filter: {
            userId: user.userId,
            ...query,
          },
          update: {
            $set: { bettingAllowed: user.bettingAllowed },
          },
        },
      }));
      const result = await User.bulkWrite(bulkUpdateOperations, {
        ordered: false,
      });

      foundUsers = await User.find({
        userId: { $in: selectedUsers.map((user) => user.userId) },
        ...query,
      }).select('_id userId userName bettingAllowed');
      if (foundUsers.length !== selectedUsers.length) {
        return res.status(404).send({ message: 'One or more users not found' });
      }
    }
    // const betlock = new BetLock({
    //   users: foundUsers.map((user) => ({
    //     user: user._id,
    //     selected: user.bettingAllowed,
    //     userName: user.userName,
    //     userId: user.userId,
    //     marketId: market.marketId,
    //     marketName: market.name,
    //   })),
    //   betLockStatus: bettingAllowed,
    // });

    // await betlock.save();
    return res.send({
      success: true,
      message: 'Betlock created successfully',
      results: null,
    });
  } catch (err) {
    console.error(err);
    res.status(404).send({ message: 'betlock not saved' });
  }
}

loginRouter.post(
  '/addBetLock',
  betLockValidator.validate('addBetLock'),
  addBetLock
);

module.exports = { loginRouter };
