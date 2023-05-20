const express = require('express');
const { validationResult } = require('express-validator');
let config = require('config');
const Cash = require('../models/cashDeposit');
const User = require('../models/user');
const cashValidator = require('../validators/cashDeposit');
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
      // Check if the user role is not 0
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
        balance: 0,
        availableBalance: 0,

        maxWithdraw: lastMaxWithdraw
          ? lastMaxWithdraw.maxWithdraw + req.body.amount
          : req.body.amount,
        cashOrCredit: 'Cash',
      });
      await cash.save();
    } else if (currentUserParent.role === '0' && userToUpdate.role == '5') {
      userToUpdate.balance += req.body.amount;
      userToUpdate.availableBalance += req.body.amount;
      userToUpdate.clientPL += req.body.amount;

      let cash = new Cash({
        userId: userToUpdate.userId,
        description: req.body.description ? req.body.description : '(Cash)',
        createdBy: req.decoded.userId,
        amount: req.body.amount,
        balance: lastDeposit
          ? lastDeposit.balance + req.body.amount
          : req.body.amount,

        availableBalance: lastDeposit
          ? lastDeposit.availableBalance + req.body.amount
          : req.body.amount,

        maxWithdraw: lastMaxWithdraw
          ? lastMaxWithdraw.maxWithdraw + req.body.amount
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
        balance: 0,
        availableBalance: 0,
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
        balance: 0,
        availableBalance: 0,
        maxWithdraw: parentLastMaxWithdraw
          ? parentLastMaxWithdraw.maxWithdraw - req.body.amount
          : -req.body.amount,
        cashOrCredit: 'Cash',
      });
      await parentCash.save();
    } else if (Dealers.includes(currentUserParent.role) && userToUpdate.role === '5') {
      currentUserParent.clientPL -= req.body.amount;
      userToUpdate.balance += req.body.amount;
      userToUpdate.availableBalance += req.body.amount;
      userToUpdate.clientPL += req.body.amount;

      let cash = new Cash({
        userId: userToUpdate.userId,
        description: req.body.description ? req.body.description : '(Cash)',
        createdBy: req.decoded.userId,
        amount: req.body.amount,
        balance: lastDeposit
          ? lastDeposit.balance + req.body.amount
          : req.body.amount,

        availableBalance: lastDeposit
          ? lastDeposit.availableBalance + req.body.amount
          : req.body.amount,

        maxWithdraw: lastMaxWithdraw
          ? lastMaxWithdraw.maxWithdraw + req.body.amount
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
          ? parentLastMaxWithdraw.maxWithdraw - req.body.amount
          : -req.body.amount,
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

    if (userToUpdate.role !== '5') {
      // dealer 
      // Check if the user role is not 0
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
      userToUpdate.clientPL -= req.body.amount;

      let cash = new Cash({
        userId: userToUpdate.userId,
        description: req.body.description ? req.body.description : '(Cash)',
        createdBy: req.decoded.userId,
        amount: req.body.amount,
        balance: 0,
        availableBalance: 0,

        maxWithdraw: lastMaxWithdraw
          ? lastMaxWithdraw.maxWithdraw - req.body.amount
          : req.body.amount,
        cashOrCredit: 'Cash',
      });
      await cash.save();
    } else if (currentUserParent.role === '0' && userToUpdate.role == '5') {
      userToUpdate.balance -= req.body.amount;
      userToUpdate.availableBalance -= req.body.amount;
      userToUpdate.clientPL -= req.body.amount;

      let cash = new Cash({
        userId: userToUpdate.userId,
        description: req.body.description ? req.body.description : '(Cash)',
        createdBy: req.decoded.userId,
        amount: req.body.amount,
        balance: lastDeposit
          ? lastDeposit.balance - req.body.amount
          : req.body.amount,

        availableBalance: lastDeposit
          ? lastDeposit.availableBalance - req.body.amount
          : req.body.amount,

        maxWithdraw: lastMaxWithdraw
          ? lastMaxWithdraw.maxWithdraw - req.body.amount
          : req.body.amount,
        cashOrCredit: 'Cash',
      });
      await cash.save();
    } 
    else if (Dealers.includes(currentUserParent.role) && Dealers.includes(userToUpdate.role)) {
      currentUserParent.clientPL += req.body.amount;
      userToUpdate.clientPL -= req.body.amount;

      // Add Cash 
      let cash = new Cash({
        userId: userToUpdate.userId,
        description: req.body.description ? req.body.description : '(Cash)',
        createdBy: req.decoded.userId,
        amount: req.body.amount,
        balance: 0,
        availableBalance: 0,
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
        amount: req.body.amount,
        balance: 0,
        availableBalance: 0,
        maxWithdraw: parentLastMaxWithdraw
          ? parentLastMaxWithdraw.maxWithdraw + req.body.amount
          : req.body.amount,
        cashOrCredit: 'Cash',
      });

      await parentCash.save();

    } else if (Dealers.includes(currentUserParent.role) && userToUpdate.role === '5') {
      currentUserParent.clientPL += req.body.amount;
      userToUpdate.balance -= req.body.amount;
      userToUpdate.availableBalance -= req.body.amount;
      userToUpdate.clientPL -= req.body.amount;

      let cash = new Cash({
        userId: userToUpdate.userId,
        description: req.body.description ? req.body.description : '(Cash)',
        createdBy: req.decoded.userId,
        amount: req.body.amount,
        balance: lastDeposit
          ? lastDeposit.balance - req.body.amount
          : req.body.amount,

        availableBalance: lastDeposit
          ? lastDeposit.availableBalance - req.body.amount
          : req.body.amount,

        maxWithdraw: lastMaxWithdraw
          ? lastMaxWithdraw.maxWithdraw - req.body.amount
          : req.body.amount,
        cashOrCredit: 'Cash',
      });

      await cash.save();

      // parent update 
      let parentCash = new Cash({
        userId: currentUserParent.userId,
        description: req.body.description ? req.body.description : '(Cash)',
        createdBy: req.decoded.userId,
        amount: req.body.amount,
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


function getAllCashDeposits(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).send({ errors: errors.errors });
  }
  Cash.findOne(
    { userId: req.query.userId },
    { credit: 1, balance: 1, maxWithdraw: 1, userId: 1 }
  )
    .sort({ _id: -1 })
    .exec((err, results) => {
      if (err || !results)
        return res
          .status(404)
          .send({ message: 'cash deposit record not found' });
      else return res.send({ message: 'Cash Deposit Record Found', results });
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
  '/getAllCashDeposits',
  cashValidator.validate('getAllCashDeposits'),
  getAllCashDeposits
);

module.exports = { loginRouter };
