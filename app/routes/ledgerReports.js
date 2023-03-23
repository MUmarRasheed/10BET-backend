const express = require('express');
const { validationResult } = require('express-validator');
let config = require('config');
const CashDeposit = require('../models/cashDeposit');
const Credit = require('../models/cashCredit');

const User = require('../models/user');
const cashValidator = require('../validators/cashDeposit');
const loginRouter = express.Router();

//to do remove facet in query
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

  var aggregate = CashDeposit.aggregate();

  aggregate.match(match).project({
    _id: 1,
    description: 1,
    amount: 1,
    balance: 1,
    createdAt: 1,
  });

  CashDeposit.aggregatePaginate(
    aggregate,
    { page: page, sort: { [sortValue]: sort }, limit: limit },
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

loginRouter.get('/cashDepositLedger', cashDepositLedger);

module.exports = { loginRouter };
