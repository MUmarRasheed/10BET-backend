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
    const currentUser = await User.findOne({ userId: req.decoded.userId });
    if (!currentUser) {
      return res.status(404).send({ message: 'user not found' });
    }

    const userToUpdate = await User.findOne({
      userId: req.body.userId,
      role: req.body.role,
    });
    if (!userToUpdate) {
      return res.status(404).send({ message: 'user not found' });
    }
    userToUpdate.clientPL += req.body.amount;
    userToUpdate.save();
    let cash = await Cash.findOne({ userId: userToUpdate.userId });

    if (!cash) {
      cash = new Cash({
        userId: userToUpdate.userId,
        description: req.body.description ? req.body.description : '(Cash)',
        createdBy: currentUser.role,
        amount: req.body.amount,
        balance: req.body.amount,
        maxWithdraw: req.body.amount,
      });
    } else {
      cash = new Cash({
        userId: userToUpdate.userId,
        description: req.body.description ? req.body.description : '(Cash)',
        createdBy: currentUser.role,
        amount: req.body.amount,
        balance: cash.balance + req.body.amount,
        maxWithdraw: cash.amount + req.body.amount,
      });
    }
    const cashDeposit = await cash.save();
    return res.send({
      success: true,
      message: 'Cash deposit added successfully',
      results: cashDeposit,
    });
  } catch (err) {
    return res.status(404).send({ message: 'server error', err });
  }
}

async function withDrawCashDeposit(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).send({ errors: errors.errors });
  }

  try {
    const currentUser = await User.findOne({ userId: req.decoded.userId });
    if (!currentUser) {
      return res.status(404).send({ message: 'User not found' });
    }

    const userToUpdate = await User.findOne({
      userId: req.body.userId,
      role: req.body.role,
    });
    if (!userToUpdate) {
      return res.status(404).send({ message: 'User not found' });
    }

    // Check if the requested withdrawal amount is greater than the maxWithdraw amount
    if (req.body.amount > userToUpdate.clientPL) {
      return res
        .status(400)
        .send({ message: 'Requested amount exceeds max withdraw amount' });
    }

    // Deduct the amount from the clientPL
    userToUpdate.clientPL -= req.body.amount;
    await userToUpdate.save();

    // Create a new Cash object for the transaction
    const cash = new Cash({
      userId: userToUpdate.userId,
      description: req.body.description
        ? req.body.description
        : 'Cash withdrawal',
      createdBy: currentUser.role,
      amount: -req.body.amount,
      balance: userToUpdate.clientPL,
      maxWithdraw: userToUpdate.clientPL,
    });

    const cashWithdrawal = await cash.save();
    return res.send({
      success: true,
      message: 'Cash withdrawal added successfully',
      results: cashWithdrawal,
    });
  } catch (err) {
    return res.status(404).send({ message: 'Server error', err });
  }
}

function getAllCashDeposits(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).send({ errors: errors.errors });
  }
  Cash.findOne({ userId: req.query.userId }, { credit: 1, balance: 1, maxWithdraw: 1 })
  .sort({ createdAt: -1 }).exec((err, results) => {
    if (err) return res.status(404).send({ message:'cash deposit record not found'});
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
loginRouter.get('/getAllCashDeposits', cashValidator.validate('getAllCashDeposits'),getAllCashDeposits)

module.exports = { loginRouter };
