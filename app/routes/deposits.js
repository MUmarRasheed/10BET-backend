const express = require('express');
const { validationResult } = require('express-validator');
let config = require('config');
const Cash = require('../models/deposits');
const User = require('../models/user');
const cashValidator = require('../validators/deposits');
const { log } = require('async');
const loginRouter = express.Router();

async function addCashDeposit(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).send({ errors: errors.errors });
  }
  try {
    const userToUpdate = await User.findOne({ userId: req.body.userId });
    if (!userToUpdate) {
      return res.status(404).send({ message: 'user not found' });
    }
    
    const currentUserParent = await User.findOne({
      userId: userToUpdate.createdBy,
    });
    if (!currentUserParent) {
      return res.status(404).send({ message: 'user not found' });
    }

    if (currentUserParent.role !== '0') {
      if (  req.body.amount > (currentUserParent.clientPL + currentUserParent.credit )) {
        return res
          .status(400)
          .send({ message: `Max cash deposit is ${currentUserParent.clientPL + currentUserParent.credit}` });
      }
    }

    let lastDeposit = await Cash.findOne({
      userId: userToUpdate.userId,
      cashOrCredit: 'Cash',
    }).sort({
      _id: -1,
    });

    let lastMaxWithdraw = await Cash.findOne({
      userId: userToUpdate.userId,
    }).sort({
      _id: -1,
    });

    let parentLastMaxWithdraw = await Cash.findOne({
      userId: currentUserParent.userId,
    }).sort({
      _id: -1,
    });

    let Dealers = ['1', '2', '3', '4'];
    if (currentUserParent.role === '0' && userToUpdate.role !== '5') {
      userToUpdate.clientPL += req.body.amount;
      let cash = new Cash({
        userId: userToUpdate.userId,
        description: req.body.description ? req.body.description : '(Cash)',
        createdBy: req.decoded.userId,
        amount: req.body.amount,
        maxWithdraw: lastMaxWithdraw
          ? lastMaxWithdraw.maxWithdraw + req.body.amount
          : req.body.amount,
        cashOrCredit: 'Cash',
      });
      await cash.save();

    } 

    else if (currentUserParent.role === '0' && userToUpdate.role == '5') {
      userToUpdate.balance += req.body.amount;
      userToUpdate.availableBalance += req.body.amount;
      userToUpdate.clientPL += req.body.amount;

      let cash = new Cash({
        userId: userToUpdate.userId,
        description: req.body.description ? req.body.description : '(Cash)',
        createdBy: req.decoded.userId,
        amount: req.body.amount,
        balance: lastMaxWithdraw
          ? lastMaxWithdraw.balance + req.body.amount
          : req.body.amount,

        availableBalance: lastMaxWithdraw
          ? lastMaxWithdraw.availableBalance + req.body.amount
          : req.body.amount,

        cashOrCredit: 'Cash',
      });
      await cash.save();
    } 

    else if (Dealers.includes(currentUserParent.role) && Dealers.includes(userToUpdate.role)) {
      currentUserParent.clientPL -= req.body.amount;
      userToUpdate.clientPL += req.body.amount;

      // Add Cash 
      let cash = new Cash({
        userId: userToUpdate.userId,
        description: req.body.description ? req.body.description : '(Cash)',
        createdBy: req.decoded.userId,
        amount: req.body.amount,
        maxWithdraw: lastMaxWithdraw
          ? lastMaxWithdraw.maxWithdraw + req.body.amount
          : req.body.amount,
        cashOrCredit: 'Cash',
      });
      await cash.save();
      // -VS Cash from parent 
      let parentCash = new Cash({
        userId: currentUserParent.userId,
        description: req.body.description ? req.body.description : '(Cash)',
        createdBy: req.decoded.userId,
        amount: -req.body.amount,
        maxWithdraw: parentLastMaxWithdraw
          ? parentLastMaxWithdraw.maxWithdraw - req.body.amount
          : -req.body.amount,
        cashOrCredit: 'Cash',
      });
      await parentCash.save();
    } 
    
    else if (Dealers.includes(currentUserParent.role) && userToUpdate.role === '5') {
      currentUserParent.clientPL -= req.body.amount;
      userToUpdate.balance += req.body.amount;
      userToUpdate.availableBalance += req.body.amount;
      userToUpdate.clientPL += req.body.amount;

      let cash = new Cash({
        userId: userToUpdate.userId,
        description: req.body.description ? req.body.description : '(Cash)',
        createdBy: req.decoded.userId,
        amount: req.body.amount,
        balance: lastMaxWithdraw
          ? lastMaxWithdraw.balance + req.body.amount
          : req.body.amount,

        availableBalance: lastMaxWithdraw
          ? lastMaxWithdraw.availableBalance + req.body.amount
          : req.body.amount,

        // maxWithdraw: lastDeposit
        //   ? lastDeposit.maxWithdraw + req.body.amount
        //   : req.body.amount,
        cashOrCredit: 'Cash',
      });
      await cash.save();

      // parent update 
      let parentCash = new Cash({
        userId: currentUserParent.userId,
        description: req.body.description ? req.body.description : '(Cash)',
        createdBy: req.decoded.userId,
        amount: -req.body.amount,
        maxWithdraw: parentLastMaxWithdraw
          ? parentLastMaxWithdraw.maxWithdraw - req.body.amount
          : -req.body.amount,
        cashOrCredit: 'Cash',
      });
      await parentCash.save();

    } 
    else {
      return res.status(400).send({ message: 'Invalid User Information' });
    }
    await userToUpdate.save();
    await currentUserParent.save();
    return res.send({
      success: true,
      message: 'Cash deposit added successfully',
      results: null,
    });
  } catch (err) {
    console.error(err);
    return res.status(404).send({ message: 'server error', err });
  }
}

async function withDrawCashDeposit(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).send({ errors: errors.errors });
  }
  try {
    const userToUpdate = await User.findOne({ userId: req.body.userId });
    if (!userToUpdate) {
      return res.status(404).send({ message: 'user not found' });
    }
    
    const currentUserParent = await User.findOne({
      userId: userToUpdate.createdBy,
    });
    if (!currentUserParent) {
      return res.status(404).send({ message: 'user not found' });
    }

    if(userToUpdate.role !== '5' &&  req.body.amount > (userToUpdate.clientPL + userToUpdate.creditRemaining ) ) {
      console.log("comming");
      return res
        .status(400)
        .send({ message: `Max cash withdraw is ${userToUpdate.clientPL + userToUpdate.creditRemaining}` });
    }
    else if(userToUpdate.role === '5' &&  req.body.amount > userToUpdate.availableBalance ){
      return res
        .status(400)
        .send({ message: `Max cash withdraw is ${userToUpdate.availableBalance }` });
    }

    let lastDeposit = await Cash.findOne({
      userId: userToUpdate.userId,
      cashOrCredit: 'Cash',
    }).sort({
      _id: -1,
    });

    let lastMaxWithdraw = await Cash.findOne({
      userId: userToUpdate.userId,
    }).sort({
      _id: -1,
    });

    let parentLastMaxWithdraw = await Cash.findOne({
      userId: currentUserParent.userId,
    }).sort({
      _id: -1,
    });

    let Dealers = ['1', '2', '3', '4'];
    if (currentUserParent.role === '0' && userToUpdate.role !== '5') {

      userToUpdate.clientPL -= req.body.amount;

      let cash = new Cash({
        userId: userToUpdate.userId,
        description: req.body.description ? req.body.description : '(Cash)',
        createdBy: req.decoded.userId,
        amount: -req.body.amount,

        maxWithdraw: lastMaxWithdraw
          ? lastMaxWithdraw.maxWithdraw - req.body.amount
          : req.body.amount,
        cashOrCredit: 'Cash',
      });

      await cash.save();
    } 

    else if (currentUserParent.role === '0' && userToUpdate.role == '5') {
      userToUpdate.balance -= req.body.amount;
      userToUpdate.availableBalance -= req.body.amount;
      userToUpdate.clientPL -= req.body.amount;

      let cash = new Cash({
        userId: userToUpdate.userId,
        description: req.body.description ? req.body.description : '(Cash)',
        createdBy: req.decoded.userId,
        amount: -req.body.amount,
        balance: lastMaxWithdraw
          ? lastMaxWithdraw.balance - req.body.amount
          : req.body.amount,
        availableBalance: lastMaxWithdraw
          ? lastMaxWithdraw.availableBalance - req.body.amount
          : req.body.amount,

        cashOrCredit: 'Cash',
      });
      await cash.save();
    } 

    else if (Dealers.includes(currentUserParent.role) && Dealers.includes(userToUpdate.role)) {
      userToUpdate.clientPL -= req.body.amount;
      currentUserParent.clientPL += req.body.amount;
      // Add Cash 
      let cash = new Cash({
        userId: userToUpdate.userId,
        description: req.body.description ? req.body.description : '(Cash)',
        createdBy: req.decoded.userId,
        amount: -req.body.amount,
        maxWithdraw: lastMaxWithdraw
          ? lastMaxWithdraw.maxWithdraw - req.body.amount
          : req.body.amount,
        cashOrCredit: 'Cash',
      });
      await cash.save();
      // -VS Cash from parent 
      let parentCash = new Cash({
        userId: currentUserParent.userId,
        description: req.body.description ? req.body.description : '(Cash)',
        createdBy: req.decoded.userId,
        amount: -req.body.amount,
        maxWithdraw: parentLastMaxWithdraw
          ? parentLastMaxWithdraw.maxWithdraw + req.body.amount
          : req.body.amount,
        cashOrCredit: 'Cash',
      });
      await parentCash.save();
    } 
    
    else if (Dealers.includes(currentUserParent.role) && userToUpdate.role === '5') {
      userToUpdate.balance -= req.body.amount;
      userToUpdate.availableBalance -= req.body.amount;
      userToUpdate.clientPL -= req.body.amount;
      currentUserParent.clientPL += req.body.amount;

      let cash = new Cash({
        userId: userToUpdate.userId,
        description: req.body.description ? req.body.description : '(Cash)',
        createdBy: req.decoded.userId,
        amount: -req.body.amount,
        balance: lastMaxWithdraw
          ? lastMaxWithdraw.balance - req.body.amount
          : req.body.amount,
        availableBalance: lastMaxWithdraw
          ? lastMaxWithdraw.availableBalance - req.body.amount
          : req.body.amount,
        cashOrCredit: 'Cash',
      });

      await cash.save();

      // parent update 
      let parentCash = new Cash({
        userId: currentUserParent.userId,
        description: req.body.description ? req.body.description : '(Cash)',
        createdBy: req.decoded.userId,
        amount: -req.body.amount,
        balance: 0,
        availableBalance: 0,
        maxWithdraw: parentLastMaxWithdraw
          ? parentLastMaxWithdraw.maxWithdraw + req.body.amount
          : req.body.amount,
        cashOrCredit: 'Cash',
      });

      await parentCash.save();

    } else {
      return res.status(400).send({ message: 'Invalid User Information' });
    }
    await userToUpdate.save();
    await currentUserParent.save();
    return res.send({
      success: true,
      message: 'Cash withdrawl added successfully',
      results: null,
    });
  } catch (err) {
    console.error(err);
    return res.status(404).send({ message: 'server error', err });
  }
}

function getAllDeposits(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).send({ errors: errors.errors });
  }

  Cash.find(
    { userId: req.query.userId }
  ).exec((err, results) => {
      if (err || !results)
        return res
          .status(404)
          .send({ message: 'cash deposit record not found' });
      else return res.send({ message: 'Cash Deposit Record Found', results });
    });
}

function getAllDeposits1(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).send({ errors: errors.errors });
  }

  User.findOne({ userId: req.query.userId }, (err, success) => {
    console.log('successs', success);
    if (err || !success) return res.status(404).send({ message: 'user not found' });
    if ( success.role === '5' ) {
  maxWithdraw  = success.maxWithdraw

    }
    Cash.findOne(
      { userId: req.query.userId },
      //creditlimit should be of the user that is login
      { maxWithdraw: 1 }
    )
      .sort({ _id: -1 })
      .exec((err, results) => {
        console.log('result', results);
        if (err || !results)
          return res.status(404).send({ message: ' Record Not Found' });
        else
          return res.send({
            message: 'Deposita Record Found',
            results: {
              ...results._doc,
              creditLimit: success.creditRemaining,
              balance: success.balance,
              availableBalance: success.availableBalance,
            },
          });
      });
  });
}

loginRouter.post(
  '/addCashDeposit',
  cashValidator.validate('addCashDeposit'),
  addCashDeposit
);
loginRouter.post(
  '/withDrawCashDeposit',
  cashValidator.validate('withDrawCashDeposit'),
  withDrawCashDeposit
);
loginRouter.get(
  '/getAllDeposits',
  getAllDeposits
);
module.exports = { loginRouter };
