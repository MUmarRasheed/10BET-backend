const express = require('express');
const { validationResult } = require('express-validator');
let config = require('config');
const CashCredit = require('../models/cashDeposit');

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
      if (  req.body.amount > (currentUserParent.credit )) {
        return res
          .status(400)
          .send({ message: `Max available credit is is ${currentUserParent.credit}` });
      }
    }

    let lastDeposit = await CashCredit.findOne({
      userId: userToUpdate.userId,
      cashOrCredit: 'Credit',
    }).sort({
      _id: -1,
    });

    let lastMaxWithdraw = await CashCredit.findOne({
      userId: userToUpdate.userId,
    }).sort({
      _id: -1,
    });

    let parentLastMaxWithdraw = await CashCredit.findOne({
      userId: currentUserParent.userId,
    }).sort({
      _id: -1,
    });

    let Dealers = ['1', '2', '3', '4'];
    if (currentUserParent.role === '0' && userToUpdate.role !== '5') {
      userToUpdate.credit += req.body.amount;
      userToUpdate.creditRemaining += req.body.amount 

      let cashCredit = new CashCredit({
        userId: userToUpdate.userId,
        description: req.body.description ? req.body.description : '(Cash)',
        createdBy: req.decoded.userId,
        amount: req.body.amount,
        balance: 0,
        availableBalance: 0,

        maxWithdraw: lastMaxWithdraw
          ? lastMaxWithdraw.maxWithdraw + req.body.amount
          : req.body.amount,
        cashOrCredit: 'Credit',
      });
      await cashCredit.save();
    } else if (currentUserParent.role === '0' && userToUpdate.role == '5') {
      userToUpdate.balance += req.body.amount;
      userToUpdate.availableBalance += req.body.amount;
      userToUpdate.credit += req.body.amount;
      userToUpdate.creditRemaining += req.body.amount;

      let cashCredit = new CashCredit({
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
        cashOrCredit: 'Credit',
      });
      await cashCredit.save();
    } 
    else if (Dealers.includes(currentUserParent.role) && Dealers.includes(userToUpdate.role)) {
      // currentUserParent.credit -= req.body.amount;
      currentUserParent.creditRemaining -= req.body.amount;

      userToUpdate.credit += req.body.amount;
      userToUpdate.creditRemaining += req.body.amount;

      // Add Cash 
      let cashCredit = new CashCredit({
        userId: userToUpdate.userId,
        description: req.body.description ? req.body.description : '(Cash)',
        createdBy: req.decoded.userId,
        amount: req.body.amount,
        balance: 0,
        availableBalance: 0,
        maxWithdraw: lastMaxWithdraw
          ? lastMaxWithdraw.maxWithdraw + req.body.amount
          : req.body.amount,
        cashOrCredit: 'Credit',
      });
      await cashCredit.save();
      // -VS Cash from parent 
      let parentCash = new CashCredit({
        userId: currentUserParent.userId,
        description: req.body.description ? req.body.description : '(Cash)',
        createdBy: req.decoded.userId,
        amount: -req.body.amount,
        balance: 0,
        availableBalance: 0,
        maxWithdraw: parentLastMaxWithdraw
          ? parentLastMaxWithdraw.maxWithdraw - req.body.amount
          : -req.body.amount,
        cashOrCredit: 'Credit',
      });
      await parentCash.save();
    } else if (Dealers.includes(currentUserParent.role) && userToUpdate.role === '5') {
      // currentUserParent.credit -= req.body.amount;
      currentUserParent.creditRemaining -= req.body.amount;

      userToUpdate.balance += req.body.amount;
      userToUpdate.availableBalance += req.body.amount;
      userToUpdate.credit += req.body.amount;
      userToUpdate.creditRemaining += req.body.amount;

      let cashCredit = new CashCredit({
        userId: userToUpdate.userId,
        description: req.body.description ? req.body.description : '(Credit)',
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
        cashOrCredit: 'Credit',
      });
      await cashCredit.save();

      // parent update 
      let parentCash = new CashCredit({
        userId: currentUserParent.userId,
        description: req.body.description ? req.body.description : '(Credit)',
        createdBy: req.decoded.userId,
        amount: -req.body.amount,
        balance: 0,
        availableBalance: 0,
        maxWithdraw: parentLastMaxWithdraw
          ? parentLastMaxWithdraw.maxWithdraw - req.body.amount
          : -req.body.amount,
        cashOrCredit: 'Credit',
      });
      await parentCash.save();

    } else {
      return res.status(400).send({ message: 'Invalid User Information' });
    }
    await userToUpdate.save();
    await currentUserParent.save();

    return res.send({
      success: true,
      message: 'Cash credit added successfully',
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
      if (  req.body.amount >  userToUpdate.credit ) {
        return res
          .status(400)
          .send({ message: `Max credit to withdraw is ${userToUpdate.credit}` });
      }
    }

    let lastDeposit = await CashCredit.findOne({
      userId: userToUpdate.userId,
      cashOrCredit: 'Credit',
    }).sort({
      _id: -1,
    });

    let lastMaxWithdraw = await CashCredit.findOne({
      userId: userToUpdate.userId,
    }).sort({
      _id: -1,
    });

    let parentLastMaxWithdraw = await CashCredit.findOne({
      userId: currentUserParent.userId,
    }).sort({
      _id: -1,
    });

    let Dealers = ['1', '2', '3', '4'];
    if (currentUserParent.role === '0' && userToUpdate.role !== '5') {
      userToUpdate.credit -= req.body.amount;

      let cashCredit = new CashCredit({
        userId: userToUpdate.userId,
        description: req.body.description ? req.body.description : '(Cash)',
        createdBy: req.decoded.userId,
        amount: -req.body.amount,
        balance: 0,
        availableBalance: 0,

        maxWithdraw: lastMaxWithdraw
          ? lastMaxWithdraw.maxWithdraw - req.body.amount
          : req.body.amount,
        cashOrCredit: 'Credit',
      });
      await cashCredit.save();
    } else if (currentUserParent.role === '0' && userToUpdate.role == '5') {
      userToUpdate.balance -= req.body.amount;
      userToUpdate.availableBalance -= req.body.amount;
      userToUpdate.credit -= req.body.amount;

      let cashCredit = new CashCredit({
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
        cashOrCredit: 'Credit',
      });
      await cashCredit.save();
    } 
    else if (Dealers.includes(currentUserParent.role) && Dealers.includes(userToUpdate.role)) {
      currentUserParent.credit += req.body.amount;
      currentUserParent.creditRemaining += req.body.amount;

      userToUpdate.credit -= req.body.amount;

      // Add Cash 
      let cashCredit = new CashCredit({
        userId: userToUpdate.userId,
        description: req.body.description ? req.body.description : '(Cash)',
        createdBy: req.decoded.userId,
        amount: -req.body.amount,
        balance: 0,
        availableBalance: 0,
        maxWithdraw: lastMaxWithdraw
          ? lastMaxWithdraw.maxWithdraw - req.body.amount
          : req.body.amount,
        cashOrCredit: 'Credit',
      });
      await cashCredit.save();
      // -VS Cash from parent 
      let parentCash = new CashCredit({
        userId: currentUserParent.userId,
        description: req.body.description ? req.body.description : '(Cash)',
        createdBy: req.decoded.userId,
        amount: -req.body.amount,
        balance: 0,
        availableBalance: 0,
        maxWithdraw: parentLastMaxWithdraw
          ? parentLastMaxWithdraw.maxWithdraw + req.body.amount
          : req.body.amount,
        cashOrCredit: 'Credit',
      });

      await parentCash.save();

    } else if (Dealers.includes(currentUserParent.role) && userToUpdate.role === '5') {
      currentUserParent.credit += req.body.amount;
      currentUserParent.creditRemaining += req.body.amount;
      userToUpdate.balance -= req.body.amount;
      userToUpdate.availableBalance -= req.body.amount;
      userToUpdate.credit -= req.body.amount;

      let cashCredit = new CashCredit({
        userId: userToUpdate.userId,
        description: req.body.description ? req.body.description : '(Cash)',
        createdBy: req.decoded.userId,
        amount: -req.body.amount,
        balance: lastDeposit
          ? lastDeposit.balance - req.body.amount
          : req.body.amount,

        availableBalance: lastDeposit
          ? lastDeposit.availableBalance - req.body.amount
          : req.body.amount,

        maxWithdraw: lastMaxWithdraw
          ? lastMaxWithdraw.maxWithdraw - req.body.amount
          : req.body.amount,
        cashOrCredit: 'Credit',
      });

      await cashCredit.save();

      // parent update 
      let parentCash = new CashCredit({
        userId: currentUserParent.userId,
        description: req.body.description ? req.body.description : '(Cash)',
        createdBy: req.decoded.userId,
        amount: -req.body.amount,
        balance: 0,
        availableBalance: 0,
        maxWithdraw: parentLastMaxWithdraw
          ? parentLastMaxWithdraw.maxWithdraw + req.body.amount
          : req.body.amount,
        cashOrCredit: 'Credit',
      });

      await parentCash.save();

    } else {
      return res.status(400).send({ message: 'Invalid User Information' });
    }

    await userToUpdate.save();
    await currentUserParent.save();

    return res.send({
      success: true,
      message: 'Credit withdrawl added successfully',
      results: null,
    });
  } catch (err) {
    console.error(err);
    return res.status(404).send({ message: 'server error', err });
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

    CashCredit.findOne(
      { userId: req.query.userId, cashOrCredit:'Credit' },
      //creditlimit should be of the user that is login
      { credit: 1, availableBalance: 1 }
    )
      .sort({ _id: -1 })
      .exec((err, results) => {
        console.log('result', results);
        if (err || !results)
          return res.status(404).send({ message: 'Credit Record Not Found' });
        else
          return res.send({
            message: 'Credit Record Found',
            results: {
              ...results._doc,
              credit: success.credit,
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
