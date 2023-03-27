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
    if (req.body.numRecords > 100)
      return res
        .status(404)
        .send({ message: 'NUMBER_RECORDS_NEED_TO_LESS_THAN_100' });
    limit = Number(req.body.numRecords);
  }

  let match = {};
  if (req.body.endTime && req.body.startTime) {
    match.createdAt = {
      $gte: req.body.startTime / 1000,
      $lte: req.body.endTime / 1000,
    };
  } else if (req.body.endTime) {
    match.createdAt = { $lte: req.body.endTime / 1000 };
  } else if (req.body.startTime) {
    match.createdAt = { $gte: req.body.startTime / 1000 };
  }

  CashDeposit.paginate(
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
    if (req.body.numRecords > 100)
      return res
        .status(404)
        .send({ message: 'NUMBER_RECORDS_NEED_TO_LESS_THAN_100' });
    limit = Number(req.body.numRecords);
  }

  let match = {};
  if (req.body.endTime && req.body.startTime) {
    match.createdAt = {
      $gte: req.body.startTime / 1000,
      $lte: req.body.endTime / 1000,
    };
  } else if (req.body.endTime) {
    match.createdAt = { $lte: req.body.endTime / 1000 };
  } else if (req.body.startTime) {
    match.createdAt = { $gte: req.body.startTime / 1000 };
  }
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

// to do
function getFinalReport(req, res) {
  let query = {};
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
    if (req.body.numRecords > 100)
      return res
        .status(404)
        .send({ message: 'NUMBER_RECORDS_NEED_TO_LESS_THAN_100' });
    limit = Number(req.body.numRecords);
  }
  if (req.decoded.login.role === '1') {
    query.superAdminId = req.decoded.userId;
  } else if (req.decoded.login.role === '2') {
    query.parentId = req.decoded.userId;
  } else if (req.decoded.login.role === '3') {
    query.adminId = req.decoded.userId;
  } else if (req.decoded.login.role === '4') {
    query.masterId = req.decoded.userId;
  }
  if (req.decoded.login.role === '5') {
    query.userId = null;
  }
  if (req.query.userId) {
    query.userId = req.query.userId;
  }
  if (req.query.userName) {
    query.userName = req.query.userName;
  }

  User.paginate(
    query,
    {
      page: page,
      sort: { [sortValue]: sort },
      limit: limit,
      select: '-_id amount createdAt',
    },
    (err, results) => {
      if (err)
        return res.status(404).send({ message: 'final report not found' });
      return res.send({
        success: true,
        message: 'final report found',
        results: results,
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
module.exports = { loginRouter };
