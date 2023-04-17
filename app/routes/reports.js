const express = require('express');
const { validationResult } = require('express-validator');
let config = require('config');
const CashDeposit = require('../models/cashDeposit');
const Credit = require('../models/cashCredit');
const User = require('../models/user');

const reportValidator = require('../validators/reports');
const loginRouter = express.Router();

function cashDepositLedger(req, res) {
  const errors = validationResult(req);
  if (errors.errors.length !== 0) {
    return res.status(400).send({
      errors: errors.errors,
    });
  }
  let page = 1;
  var sortValue = 'createdAt';
  var limit = config.pageSize;
  var sort = 1;
  if (req.body.page) {
    page = req.body.page;
  }
  if (req.body.sort) {
    sort = req.body.sort;
  }
  if (req.body.numRecords) {
    if (isNaN(req.body.numRecords))
      return res.status(404).send({ message: 'NUMBER_RECORD_IS_NOT_PROPER' });
    if (req.body.numRecords < 0)
      return res.status(404).send({ message: 'NUMBER_RECORDS_IS_NOT_PROPER' });
    if (req.body.numRecords > 1000)
      return res
        .status(404)
        .send({ message: 'NUMBER_RECORDS_NEED_TO_LESS_THAN_1000' });
    limit = Number(req.body.numRecords);
  }

  let match = { userId: req.body.userId };
  if (req.body.endDate && req.body.startDate) {
    match.createdAt = {
      $gte: req.body.startDate,
      $lte: req.body.endDate,
    };
  } else if (req.body.endDate) {
    match.createdAt = { $lte: req.body.endDate };
  } else if (req.body.startDate) {
    match.createdAt = { $gte: req.body.startDate };
  }

  if (req.body.searchValue) {
    match.$or = [
      { description: { $regex: req.body.searchValue, $options: 'i' } },
      { amount: req.body.searchValue },
      { balance: req.body.searchValue },
    ];
  }

  CashDeposit.paginate(
    match,
    {
      page: page,
      sort: { [sortValue]: sort },
      limit: limit,
      select: '-_id userId description amount balance createdAt',
    },

    (err, results) => {
      if (results.total == 0) {
        return res.status(404).send({ message: 'No records found' });
      }
      if (err)
        return res
          .status(404)
          .send({ message: 'CASH_DEPOSIT_LEDGER_PAGINATION_FAILED' });
      return res.json({
        message: 'Cash Deposit Ledger Report found',
        results,
      });
    }
  );
}

function cashCreditLedger(req, res) {
  const errors = validationResult(req);
  if (errors.errors.length !== 0) {
    return res.status(400).send({
      errors: errors.errors,
    });
  }
  let page = 1;
  var sortValue = 'createdAt';
  var limit = config.pageSize;
  var sort = -1;
  if (req.body.page) {
    page = req.body.page;
  }
  if (req.body.sort) {
    sort = req.body.sort;
  }
  if (req.body.numRecords) {
    if (isNaN(req.body.numRecords))
      return res.status(404).send({ message: 'NUMBER_RECORD_IS_NOT_PROPER' });
    if (req.body.numRecords < 0)
      return res.status(404).send({ message: 'NUMBER_RECORDS_IS_NOT_PROPER' });
    if (req.body.numRecords > 1000)
      return res
        .status(404)
        .send({ message: 'NUMBER_RECORDS_NEED_TO_LESS_THAN_1000' });
    limit = Number(req.body.numRecords);
  }

  let match = {};
  if (req.body.endDate && req.body.startDate) {
    match.createdAt = {
      $gte: req.body.startDate,
      $lte: req.body.endDate,
    };
  } else if (req.body.endDate) {
    match.createdAt = { $lte: req.body.endDate };
  } else if (req.body.startDate) {
    match.createdAt = { $gte: req.body.startDate };
  }
  if (req.body.searchValue) {
    match.$or = [
      { description: { $regex: req.body.searchValue, $options: 'i' } },
      { amount: req.body.searchValue },
      { balance: req.body.searchValue },
    ];
  }

  match.userId = req.body.userId;
  Credit.paginate(
    match,
    {
      page: page,
      sort: { [sortValue]: sort },
      limit: limit,
      select: '-_id description amount balance createdAt',
    },

    (err, results) => {
      if (results.total == 0) {
        return res.status(404).send({ message: 'No records found' });
      }
      if (err)
        return res
          .status(404)
          .send({ message: 'CASH_DEPOSIT_LEDGER_PAGINATION_FAILED' });
      return res.json({
        message: 'Credit Ledger Report found',
        results,
      });
    }
  );
}

function getFinalReport(req, res) {
  let query = {};
  if (req.decoded.login.role === '1') {
    query.superAdminId = String(req.decoded.userId);
  } else if (req.decoded.login.role === '2') {
    query.parentId = String(req.decoded.userId);
  } else if (req.decoded.login.role === '3') {
    query.adminId = String(req.decoded.userId);
  } else if (req.decoded.login.role === '4') {
    query.masterId = String(req.decoded.userId);
  }
  if (req.decoded.login.role === '5') {
    query.userId = null;
  }

  User.aggregate(
    [
      {
        $match: query,
      },
      {
        $group: {
          _id: '$userName',
          clientPL: { $sum: '$clientPL' },
        },
      },
      {
        $group: {
          _id: null,
          positiveClients: {
            $push: {
              $cond: {
                if: { $gte: ['$clientPL', 0] },
                then: { userName: '$_id', clientPL: '$clientPL' },
                else: null,
              },
            },
          },
          negativeClients: {
            $push: {
              $cond: {
                if: { $lt: ['$clientPL', 0] },
                then: { userName: '$_id', clientPL: '$clientPL' },
                else: null,
              },
            },
          },
          totalPositiveClientPL: {
            $sum: {
              $cond: {
                if: { $gte: ['$clientPL', 0] },
                then: '$clientPL',
                else: 0,
              },
            },
          },
          totalNegativeClientPL: {
            $sum: {
              $cond: {
                if: { $lt: ['$clientPL', 0] },
                then: '$clientPL',
                else: 0,
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          positiveClients: {
            $filter: {
              input: '$positiveClients',
              cond: { $ne: ['$$this', null] },
            },
          },
          negativeClients: {
            $filter: {
              input: '$negativeClients',
              cond: { $ne: ['$$this', null] },
            },
          },
          totalPositiveClientPL: 1,
          totalNegativeClientPL: 1,
        },
      },
    ],

    function (err, result) {
      console.log('rerrr', err);
      if (err) {
        return res.status(404).send({ message: 'final report not found' });
      }
      return res.send({
        success: true,
        message: 'final report found',
        results: result[0],
      });
    }
  );
}

//to do
function getClientList(req, res) {
  // Initialize variables with default values
  let query = { isDeleted: false };
  let countQuery = {};
  if (req.decoded.login.role == '0') {
    query.userId = req.decoded.userId;
  }
  if (req.decoded.login.role === '1') {
    query.superAdminId = req.query.userId;
    countQuery.superAdminId = req.query.userId;
  } else if (req.decoded.login.role === '2') {
    query.userId = Number(req.query.userId);
    countQuery.parentId = req.query.userId;
  } else if (req.decoded.login.role === '3') {
    query.adminId = req.query.userId;
    countQuery.adminId = req.query.userId;
  } else if (req.decoded.login.role === '4') {
    query.masterId = req.query.userId;
    countQuery.masterId = req.query.userId;
  } else if (req.decoded.login.role === '5') {
    query.userId = null;
    countQuery.userId = null;
  }
  console.log('query', query);
  console.log('countQuery', countQuery);

  // Retrieve the desired fields from the User collection
  User.findOne(query)
    .select('credit creditRemaining clientPL plDownline plUpline')
    .exec((err, results) => {
      console.log('user', results);
      if (err) {
        return res.status(404).send({ message: 'RETRIEVAL_FAILED' });
      }
      if (!results) {
        return res.status(404).send({ message: 'No records found' });
      }

      // Find the total user count for the logged-in user
      User.countDocuments(countQuery, (err, count) => {
        if (err) {
          return res.status(404).send({ message: 'COUNT_FAILED' });
        }

        // Combine the User fields and user count into a single response object
        const response = {
          creditRecieved: results.credit,
          creditRemaining: results.credit - results.clientPL,
          cash: results.clientPL,
          plDownline: results.clientPL,
          balanceUpline: results.clientPL,
          users: count,
        };
        return res.send({
          success: true,
          message: 'client record found',
          results: response,
        });
      });
    });
}

function GetAllCashCreditLedger(req, res) {
  const errors = validationResult(req);
  if (errors.errors.length !== 0) {
    return res.status(400).send({
      errors: errors.errors,
    });
  }

  let match = {};
  if (req.body.endDate && req.body.startDate) {
    match.createdAt = {
      $gte: req.body.startDate,
      $lte: req.body.endDate,
    };
  } else if (req.body.endDate) {
    match.createdAt = { $lte: req.body.endDate };
  } else if (req.body.startDate) {
    match.createdAt = { $gte: req.body.startDate };
  }
  match.userId = req.body.userId;
  if (req.body.searchValue) {
    match.$or = [
      { description: { $regex: req.body.searchValue, $options: 'i' } },
      { amount: req.body.searchValue },
      { balance: req.body.searchValue },
    ];
  }

  Credit.find(
    match,
    { description: 1, amount: 1, balance: 1, createdAt: 1, _id: 0 },

    (err, results) => {
      if (err || !results)
        return res.status(404).send({ message: 'No Record found' });
      return res.json({
        message: 'ALL Credit Ledger Report found',
        results,
      });
    }
  );
}

function GetAllCashDepositLedger(req, res) {
  const errors = validationResult(req);
  if (errors.errors.length !== 0) {
    return res.status(400).send({
      errors: errors.errors,
    });
  }

  let match = {};
  if (req.body.endDate && req.body.startDate) {
    match.createdAt = {
      $gte: req.body.startDate,
      $lte: req.body.endDate,
    };
  } else if (req.body.endDate) {
    match.createdAt = { $lte: req.body.endDate };
  } else if (req.body.startDate) {
    match.createdAt = { $gte: req.body.startDate };
  }
  if (req.body.searchValue) {
    match.$or = [
      { description: { $regex: req.body.searchValue, $options: 'i' } },
      { amount: req.body.searchValue },
      { balance: req.body.searchValue },
    ];
  }

  match.userId = req.body.userId;
  CashDeposit.find(
    match,
    { description: 1, amount: 1, balance: 1, createdAt: 1, _id: 0 },

    (err, results) => {
      if (err || !results)
        return res.status(404).send({ message: 'No Record found' });
      return res.json({
        message: 'ALL Cash Desposit Ledger Report found',
        results,
      });
    }
  );
}

loginRouter.post(
  '/cashDepositLedger',
  reportValidator.validate('cashDepositLedger'),
  cashDepositLedger
);
loginRouter.post(
  '/cashCreditLedger',
  reportValidator.validate('cashDepositLedger'),
  cashCreditLedger
);
loginRouter.get('/getFinalReport', getFinalReport);
loginRouter.post('/GetAllCashCreditLedger', GetAllCashCreditLedger);
loginRouter.post('/GetAllCashDepositLedger', GetAllCashDepositLedger);

loginRouter.get('/getCLientList', getClientList);
module.exports = { loginRouter };
