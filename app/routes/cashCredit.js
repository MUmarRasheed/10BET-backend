const express = require('express');
const { validationResult } = require('express-validator');
let config = require('config');
const CashDeposit = require('../models/cashDeposit');
// const Credit = require('../models/cashCredit');

const User = require('../models/user');
const cashValidator = require('../validators/cashDeposit');
const loginRouter = express.Router();

async function addCredit(req, res) {
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
          .send({ message: `Max available credit is is ${currentUserParent.clientPL + currentUserParent.credit}` });
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

async function withdrawCredit(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).send({ errors: errors.errors });
  }

  try {
    const currentUser = await User.findOne({ userId: req.decoded.userId });
    currentUser.creditLimit += req.body.amount;
    currentUser.credit += req.body.amount;

    await currentUser.save();

    const userToUpdate = await User.findOne({
      userId: req.body.userId,
      role: req.body.role,
    });
    if (!userToUpdate) {
      return res.status(404).send({ message: 'user not found' });
    }
    if (currentUser.credit < req.body.amount) {
      return res.status(400).send({
        message: 'user credit is less than requested credit to withdraw',
      });
    }

    if (req.decoded.role == '0') {
      if (
        req.body.role == '1' ||
        req.body.role == '2' ||
        req.body.role == '3' ||
        req.body.role == '4'
      ) {
        userToUpdate.credit -= req.body.amount;
        userToUpdate.creditLimit -= req.body.amount;
      } else if (req.body.role == '5') {
        userToUpdate.balance -= req.body.amount;
        userToUpdate.availableBalance -= req.body.amount;
        userToUpdate.credit -= req.body.amount;
        userToUpdate.creditLimit -= req.body.amount;
      }
    }
    if (req.decoded.role == '1') {
      if (
        req.body.role == '2' ||
        req.body.role == '3' ||
        req.body.role == '4'
      ) {
        userToUpdate.credit -= req.body.amount;
        userToUpdate.creditLimit -= req.body.amount;
      } else if (req.body.role == '5') {
        userToUpdate.balance -= req.body.amount;
        userToUpdate.availableBalance -= req.body.amount;
        userToUpdate.credit -= req.body.amount;
        userToUpdate.creditLimit -= req.body.amount;
      }
    }
    if (req.decoded.role == '2') {
      if (req.body.role == '3' || req.body.role == '4') {
        userToUpdate.credit -= req.body.amount;
        userToUpdate.creditLimit -= req.body.amount;
      } else if (req.body.role == '5') {
        userToUpdate.balance -= req.body.amount;
        userToUpdate.availableBalance -= req.body.amount;
        userToUpdate.credit -= req.body.amount;
        userToUpdate.creditLimit -= req.body.amount;
      }
    } else if (req.decoded.role == '3') {
      if (req.body.role == '4') {
        userToUpdate.credit -= req.body.amount;
        userToUpdate.creditLimit -= req.body.amount;
      } else if (req.body.role == '5') {
        userToUpdate.balance -= req.body.amount;
        userToUpdate.availableBalance -= req.body.amount;
        userToUpdate.credit -= req.body.amount;
        userToUpdate.creditLimit -= req.body.amount;
      }
    } else if (req.decoded.role == '4') {
      if (req.body.role == '5') {
        userToUpdate.balance -= req.body.amount;
        userToUpdate.availableBalance -= req.body.amount;
        userToUpdate.credit -= req.body.amount;
        userToUpdate.creditLimit -= req.body.amount;
      }
    }

    // //return the amount to the user's balance
    // if (currentUser.userId !== userToUpdate.userId) {
    //   currentUser.balance += req.body.amount;
    //   await currentUser.save();
    // }
    await userToUpdate.save();

    const cashCreditWithdraw = await CashDeposit.findOne().sort({
      _id: -1,
      cashOrCredit: -1,
    });
    const cash = cashCreditWithdraw.credit - req.body.amount;
    const creditWithdraw = new CashDeposit({
      credit: cash,
      userId: userToUpdate.userId,
      description: req.body.description ? req.body.description : '(Cash)',
      createdBy: currentUser.role,
      amount: -req.body.amount,
      balance: cashCreditWithdraw.balance - req.body.amount,
      availableBalance: cashCreditWithdraw.availableBalance - req.body.amount,
      maxWithdraw: cashCreditWithdraw.maxWithdraw - req.body.amount,
      cashOrCredit: 'Credit',
    });
    await creditWithdraw.save();

    return res
      .status(200)
      .send({ message: 'Credit withdrawal successful', creditWithdraw });
  } catch (err) {
    console.error(err);
    return res.status(500).send({ message: 'Server error' });
  }
}

function getAllCredits(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).send({ errors: errors.errors });
  }
  User.findOne({ userId: req.decoded.userId }, (err, success) => {
    console.log('successs.credit', success.creditLimit);
    if (err || !success)
      return res.status(404).send({ message: 'user not found' });

    CashDeposit.findOne(
      { userId: req.query.userId },
      //creditlimit should be of the user that is login
      { credit: 1, availableBalance: 1 }
    )
      .sort({ _id: -1, cashOrCredit: -1 })
      .exec((err, results) => {
        console.log('result', results);
        if (err || !results)
          return res.status(404).send({ message: 'Credit Record Not Found' });
        else
          return res.send({
            message: 'Credit Record Found',
            results: {
              ...results._doc,
              creditLimit: success.creditLimit,
            },
          });
      });
  });
}


loginRouter.post(
  '/addCredit',
  cashValidator.validate('withDrawCashDeposit'),
  addCredit
);
loginRouter.post(
  '/withdrawCredit',
  cashValidator.validate('withDrawCashDeposit'),
  withdrawCredit
);
loginRouter.get(
  '/getAllCredits',
  cashValidator.validate('getAllCashDeposits'),
  getAllCredits
);
module.exports = { loginRouter };
