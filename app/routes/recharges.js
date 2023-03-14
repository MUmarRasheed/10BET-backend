const express = require("express");
var jwt = require("jsonwebtoken");
let config = require("config");
const  Recharges = require("../models/recharges");

const loginRouter = express.Router();

function getAllRecharges(req, res) {
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
    const userId = req.decoded.userId; // As the user ID is stored in req.decoded.userId
  query = {
    rechargedBy: userId,
  };
    Recharges.paginate(
      query,
      { page: page, sort: { [sortValue]: sort }, limit: limit },
      (err, results) => {
        if (err)
          return res.status(404).send({ message: "RECHARGES_PAGINATION_FAILED" });
        return res.send({
          success: true,
          message: "GETTING_ALL_RECHARGES_SUCCESS",
          results
        });
      }
    );
  }

loginRouter.get("/getAllRecharges", 
getAllRecharges);

module.exports = {loginRouter} 
