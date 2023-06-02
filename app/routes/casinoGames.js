const express = require('express');
const CasinoGames = require('../models/casinoGames');
const SelectedCasino = require('../models/selectedCasino');

const router = express.Router();
const axios = require('axios');

async function addCasinoGameDetails(req, res) {
  try {
    const response = await axios.post(
      'https://stage.game-program.com/api/seamless/provider',
      {
        api_password: '6w9GNrsxZsHBeC795N',
        api_login: '1obet_mc_s',
        method: 'getGameList',
        show_additional: true,
        show_systems: 1,
        currency: 'EUR',
      }
    );

    console.log('Response:', response.data);
    const gameList = response.data.response;
    const bulkOps = gameList.map((game) => ({
      updateOne: {
        filter: { category: game.category },
        update: { $push: { games: { ...game, details: JSON.parse(game.details) } } },
        upsert: true,
      },
    }));

    await CasinoGames.bulkWrite(bulkOps);
    res.send({ success: true, message: 'Casino games added successfully' });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .send({ success: false, message: 'Failed to add casino games' });
  }
}

function getAllCasinoCategories(req, res) {
  CasinoGames.find({}, { _id: 1, category: 1 }, (err, casinoCategories) => {
    if (err || !casinoCategories || casinoCategories.length === 0) {
      return res.status(404).send({ message: 'Casino Categories Not Found' });
    }

    SelectedCasino.find({}, { _id: 1 }, (err, selectedCasino) => {
      if (err ||!selectedCasino) {
        return res.status(404).send({ message: 'Failed to retrieve casino categories' });
      }

      const selectedCategoryIds = selectedCasino.map((selected) => selected._id);
      const results = casinoCategories.map((category) => ({
        _id: category._id,
        category: category.category,
        status: selectedCategoryIds.includes(category._id) ? 1 : 0,
      }));

      return res.send({
        message: 'Casino Categories Found',
        results: results,
      });
    });
  });
}

function getSelectedCasinoCategories(req, res) {
  const { selectedCategories } = req.body;
  SelectedCasino.find({}, { _id: 1 }, (err, existingSelectedCasino) => {
    if (err || !existingSelectedCasino) {
      return res.status(404).send({ message: 'Failed to retrieve casino categories' });
    }

    const existingSelectedCasinoIds = existingSelectedCasino.map((casino) => casino._id);

    const deletePromises = existingSelectedCasinoIds
      .filter((id) => !selectedCasinoIds.includes(id))
      .map((id) => SelectedCasino.deleteOne({ _id: id }).exec());

    const savePromises = selectedCasinoIds
      .filter((id) => !existingSelectedCasinoIds.includes(id))
      .map((id) => {
        const newSelectedCasino = new SelectedCasino({ _id: id });
        return newSelectedCasino.save();
      });

    const updatePromises = deletePromises.concat(savePromises);

    SelectedCasino.find({ _id: { $in: selectedCasinoIds } }, (err, updatedSelectedCasino) => {
      if (err) {
        return res.status(500).send({ message: 'Failed to update casino categories' });
      }

      const results = updatedSelectedCasino.map((casino) => ({
        _id: casino._id,
        status: 1,
      }));

      return res.send({ message: 'Selected casino categories updated successfully', results });
    });
  });
}


router.post('/addCasinoGameDetails', addCasinoGameDetails);
router.get('/getAllCasinoCategories', getAllCasinoCategories);
router.get('/getSelectedCasinoCategories', getSelectedCasinoCategories);

module.exports = { router };
