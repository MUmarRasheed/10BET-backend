const express = require('express');
const { validationResult } = require('express-validator');
let config = require('config');
const CashDeposit = require('../models/cashDeposit');
const Credit = require('../models/cashCredit');

const User = require('../models/user');
const cashValidator = require('../validators/cashDeposit');
const loginRouter = express.Router();

async function addCredit(req, res) {
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

    if (currentUser.creditLimit < req.body.amount) {
      return res.status(400).send({ message: 'Insufficient credit limit' });
    }

    currentUser.creditLimit -= req.body.amount;
    await currentUser.save();

    if (req.decoded.role == '0') {
      if (
        req.body.role == '1' ||
        req.body.role == '2' ||
        req.body.role == '3' ||
        req.body.role == '4'
      ) {
        userToUpdate.credit += req.body.amount;
        userToUpdate.creditLimit += req.body.amount;
      } else if (req.body.role == '5') {
        userToUpdate.balance += req.body.amount;
        userToUpdate.availableBalance += req.body.amount;
        userToUpdate.clientPL += req.body.amount;
      }
    }
    if (req.decoded.role == '1') {
      if (
        req.body.role == '2' ||
        req.body.role == '3' ||
        req.body.role == '4'
      ) {
        userToUpdate.credit += req.body.amount;
        userToUpdate.creditLimit += req.body.amount;
      } else if (req.body.role == '5') {
        userToUpdate.balance += req.body.amount;
        userToUpdate.availableBalance += req.body.amount;
        userToUpdate.clientPL += req.body.amount;
      }
    }
    if (req.decoded.role == '2') {
      if (req.body.role == '3' || req.body.role == '4') {
        userToUpdate.credit += req.body.amount;
        userToUpdate.creditLimit += req.body.amount;
      } else if (req.body.role == '5') {
        userToUpdate.balance += req.body.amount;
        userToUpdate.availableBalance += req.body.amount;
        userToUpdate.clientPL += req.body.amount;
      }
    } else if (req.decoded.role == '3') {
      if (req.body.role == '4') {
        userToUpdate.credit += req.body.amount;
        userToUpdate.creditLimit += req.body.amount;
      } else if (req.body.role == '5') {
        userToUpdate.balance += req.body.amount;
        userToUpdate.availableBalance += req.body.amount;
        userToUpdate.clientPL += req.body.amount;
      }
    } else if (req.decoded.role == '4') {
      if (req.body.role == '5') {
        userToUpdate.balance += req.body.amount;
        userToUpdate.availableBalance += req.body.amount;
        userToUpdate.clientPL += req.body.amount;
      }
    }

    await userToUpdate.save();

    // Update the cashWithdraw field in cashdeposit collection
    const cashDeposit = await CashDeposit.findOne({
      userId: userToUpdate.userId,
    }).sort({ _id: -1 });
    if (cashDeposit) {
      cashDeposit.maxWithdraw += req.body.amount;
      await cashDeposit.save();
    }

    let cash = await Credit.findOne({ userId: userToUpdate.userId });
    if (!cash) {
      cash = new Credit({
        userId: userToUpdate.userId,
        description: req.body.description ? req.body.description : '(Cash)',
        createdBy: currentUser.role,
        amount: req.body.amount,
        credit: req.body.amount,
        balance: req.body.amount,
        maxWithdraw: userToUpdate.clientPL + req.body.amount,
        creditLimit: userToUpdate.creditLimit,
        availableBalance: req.body.amount,
      });
    } else {
      const cashCredit = await Credit.findOne({
        userId: userToUpdate.userId,
      }).sort({ _id: -1 });
      cash = new Credit({
        userId: userToUpdate.userId,
        description: req.body.description ? req.body.description : '(Cash)',
        createdBy: currentUser.role,
        amount: req.body.amount,
        credit: cashCredit.credit + req.body.amount,
        balance: cashCredit.balance + req.body.amount,
        maxWithdraw: cashCredit.maxWithdraw + req.body.amount,
        creditLimit: userToUpdate.creditLimit,
        availableBalance: cashCredit.availableBalance + req.body.amount,
      });
    }

    // Update credit limit for both users
    const userToUpdateCredit = await Credit.findOne({
      userId: userToUpdate.userId,
    });
    if (userToUpdateCredit) {
      userToUpdateCredit.creditLimit += req.body.amount;
      await userToUpdateCredit.save();
    }

    const currentUserCredit = await Credit.findOne({
      userId: currentUser.userId,
    });
    if (currentUserCredit) {
      currentUserCredit.creditLimit -= req.body.amount;
      await currentUserCredit.save();
    }
    const cashCredit = await cash.save();
    return res.send({
      success: true,
      message: 'Credit added successfully',
      results: cashCredit,
    });
  } catch (err) {
    return res.status(404).send({ message: 'server error', err });
  }
}

// async function addcCredit(req, res) {
//   const errors = validationResult(req);
//   if (!errors.isEmpty()) {
//     return res.status(400).send({ errors: errors.errors });
//   }

//   try {
//     const currentUser = await User.findOne({ userId: req.decoded.userId });
//     if (!currentUser) {
//       return res.status(404).send({ message: 'user not found' });
//     }

//     const userToUpdate = await User.findOne({
//       userId: req.body.userId,
//       role: req.body.role,
//     });
//     if (!userToUpdate) {
//       return res.status(404).send({ message: 'user not found' });
//     }

//     // Update the cashWithdraw field in cashdeposit collection
//     const cashDeposit = await CashDeposit.findOne({
//       userId: userToUpdate.userId,
//     }).sort({ createdAt: -1 });
//     if (cashDeposit) {
//       cashDeposit.maxWithdraw += req.body.amount;
//       await cashDeposit.save();
//     }

//     userToUpdate.credit += req.body.amount;
//     userToUpdate.save();

//     let cash = await Credit.findOne({ userId: userToUpdate.userId });
//     if (!cash) {
//       cash = new Credit({
//         userId: userToUpdate.userId,
//         description: req.body.description ? req.body.description : '(Cash)',
//         createdBy: currentUser.role,
//         amount: req.body.amount,
//         credit: req.body.amount,
//         balance: req.body.amount,
//         maxWithdraw: userToUpdate.clientPL + req.body.amount,
//       });
//     } else {
//       const cashCreditWithdraw = await Credit.findOne().sort({ createdAt: -1 });
//       cash = new Credit({
//         userId: userToUpdate.userId,
//         description: req.body.description ? req.body.description : '(Cash)',
//         createdBy: currentUser.role,
//         amount: req.body.amount,
//         credit: cashCreditWithdraw.credit + req.body.amount,
//         balance: cashCreditWithdraw.balance + req.body.amount,
//         maxWithdraw: cashCreditWithdraw.maxWithdraw + req.body.amount,
//       });
//     }

//     const cashCredit = await cash.save();
//     return res.send({
//       success: true,
//       message: 'Credit added successfully',
//       results: cashCredit,
//     });
//   } catch (err) {
//     return res.status(404).send({ message: 'server error', err });
//   }
// }

async function withdrawCredit(req, res) {
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

    if (userToUpdate.credit < req.body.amount) {
      return res.status(400).send({
        message: 'user credit is less than requested credit to withdraw',
      });
    }

    // Update the maxWithdraw field in cashdeposit collection
    const cashDeposit = await CashDeposit.findOne({
      userId: userToUpdate.userId,
    }).sort({ _id: -1 });
    if (cashDeposit) {
      cashDeposit.maxWithdraw -= req.body.amount;
      await cashDeposit.save();
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
        userToUpdate.clientPL -= req.body.amount;
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
        userToUpdate.clientPL -= req.body.amount;
      }
    }
    if (req.decoded.role == '2') {
      if (req.body.role == '3' || req.body.role == '4') {
        userToUpdate.credit -= req.body.amount;
        userToUpdate.creditLimit -= req.body.amount;
      } else if (req.body.role == '5') {
        userToUpdate.balance -= req.body.amount;
        userToUpdate.availableBalance -= req.body.amount;
        userToUpdate.clientPL -= req.body.amount;
      }
    } else if (req.decoded.role == '3') {
      if (req.body.role == '4') {
        userToUpdate.credit -= req.body.amount;
        userToUpdate.creditLimit -= req.body.amount;
      } else if (req.body.role == '5') {
        userToUpdate.balance -= req.body.amount;
        userToUpdate.availableBalance -= req.body.amount;
        userToUpdate.clientPL -= req.body.amount;
      }
    } else if (req.decoded.role == '4') {
      if (req.body.role == '5') {
        userToUpdate.balance -= req.body.amount;
        userToUpdate.availableBalance -= req.body.amount;
        userToUpdate.clientPL -= req.body.amount;
      }
    }
    await userToUpdate.save();

    const cashCreditWithdraw = await Credit.findOne().sort({ _id: -1 });
    const cash = cashCreditWithdraw.credit - req.body.amount;
    const creditWithdraw = new Credit({
      credit: cash,
      userId: userToUpdate.userId,
      description: req.body.description ? req.body.description : '(Cash)',
      createdBy: currentUser.role,
      amount: -req.body.amount,
      balance: cashCreditWithdraw.balance - req.body.amount,
      availableBalance:
        cashCreditWithdraw.availableBalance - req.body.availableBalance,
      //   maxWithdraw: cashCreditWithdraw.maxWithdraw + req.body.amount,
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
    if (err || !success)
      return res.status(404).send({ message: 'user not found' });

    Credit.findOne(
      { userId: req.query.userId },
      //creditlimit should be of the user that is login
      { credit: 1, availableBalance: 1, creditLimit: -1 }
    )
      .sort({ _id: -1 })
      .exec((err, results) => {
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
