const express = require("express");
var jwt = require("jsonwebtoken");
const userValidation = require("../validators/user");
const bcrypt = require("bcrypt");
const { validationResult } = require("express-validator");
let config = require("config");
const MarketType = require("../models/marketTypes");
const SubMarketType = require("../models/subMarketTypes");

const router = express.Router();
const loginRouter = express.Router();

function addMarketType(req, res) {
  const errors = validationResult(req);
  if (errors.errors.length !== 0) {
    return res.status(400).send({ errors: errors.errors });
  }
  MarketType.findOne()
  .sort({ marketId: -1 })
  .exec((err, data) => {
    if (err) return res.status(404).send({ message: "market type not found", err });
  const marketType = new MarketType(req.body);
  marketType.marketId = data ? data.marketId + 1: 0;
  marketType.save((err,marketType) => {
    if (err && err.code === 11000) {
        if (err.keyPattern.name === 1)
          return res.status(404).send({ message: "market type already present" });
      }
    if (err || !marketType) {
        return res.status(404).send({ message: "market type not added" ,err});
      }
      return res.send({ success: true, message: "Market type added successfully",results: marketType});
    })
 })
}

function addSubMarketTypes(req, res) {
    const errors = validationResult(req);
    if (errors.errors.length !== 0) {
      return res.status(400).send({ errors: errors.errors });
    }
    MarketType.findOne({ marketId: req.body.marketId },((err, data) => {
      if (err) return res.status(404).send({ message: "market type not found", err });
    const subMarketType = new SubMarketType(req.body);
    subMarketType.marketId = data.marketId
    subMarketType.save((err,marketType) => {
      if (err && err.code === 11000) {
          if (err.keyPattern.name === 1)
            return res.status(404).send({ message: "sub market type already present" });
        }
      if (err || !marketType) {
          return res.status(404).send({ message: "sub market type not added" ,err});
        }
        return res.send({ success: true, message: "Sub Market type added successfully",results: marketType});
      })
   })
)}

function getAllMarketTypes(req, res) {
    let query = {};
    let page = 1;
    let sort = -1;
    let sortValue = "createdAt";
    var limit = config.pageSize;
    if (req.query.numRecords) {
      if (isNaN(req.query.numRecords))
        return res.status(404).send({ message: "NUMBER_RECORDS_IS_NOT_PROPER" });
      if (req.query.numRecords < 0)
        return res.status(404).send({ message: "NUMBER_RECORDS_IS_NOT_PROPER" });
      if (req.query.numRecords > 100)
        return res.status(404).send({
          message: "NUMBER_RECORDS_NEED_TO_LESS_THAN_100",
        });
      limit = Number(req.query.numRecords);
    }
    if (req.query.sortValue) sortValue = req.query.sortValue;
    if (req.query.sort) {
      sort = Number(req.query.sort);
    }
    if (req.query.page) {
      page = Number(req.query.page);
    }
    
    MarketType.paginate(
      query,
      { page: page, sort: { [sortValue]: sort }, limit: limit },
      (err, results) => {
        if (err)
          return res.status(404).send({ message: "MARKET_TYPES_PAGINATION_FAILED" });
        return res.send({
          success: true,
          message: "MARKET_TYPES_RECORD_FOUND",
          results: results
        });
      }
    );
  }

  function addAllowedMarketTypes(req, res) {
    const errors = validationResult(req);
    if (errors.errors.length !== 0) {
      return res.status(400).send({ errors: errors.errors });
    }
    MarketType.findOne({ marketId: req.body.marketId },((err, data) => {
        console.log('marketdata',data)
      if (err) return res.status(404).send({ message: "market type not found", err });
    SubMarketType.find({ marketId: req.body.marketId },((err, data) => {
        console.log('submarketdata',data);
      if (err) return res.status(404).send({ message: "market type not found", err });
    // const subMarketType = new SubMarketType(req.body);
    // subMarketType.marketId = data.marketId
    // subMarketType.save((err,marketType) => {
    //   if (err && err.code === 11000) {
    //       if (err.keyPattern.name === 1)
    //         return res.status(404).send({ message: "sub market type already present" });
    //     }
    //   if (err || !marketType) {
    //       return res.status(404).send({ message: "sub market type not added" ,err});
    //     }
    //     return res.send({ success: true, message: "Sub Market type added successfully",results: marketType});
    //   })
    })
    )
   })
)
}


loginRouter.get("/getAllMarketTypes", 
getAllMarketTypes);

loginRouter.post("/addMarketType", addMarketType);
loginRouter.post("/addSubMarketTypes", addSubMarketTypes);
loginRouter.post("/addAllowedMarketTypes", addAllowedMarketTypes);

module.exports = { router,loginRouter };
