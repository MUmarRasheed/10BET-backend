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

    SelectedCasino.find({}, { _id: 1, status: 1 }, (err, selectedCasino) => {
      if (err || !selectedCasino) {
        return res.status(404).send({ message: 'Failed to retrieve casino categories' });
      }

      const results = casinoCategories.map((category) => {
        const matchingCategory = selectedCasino.find((selected) => selected._id.equals(category._id));
        const status = matchingCategory ? parseInt(matchingCategory.status) : 0;
        return {
          _id: category._id,
          category: category.category,
          status: status.toString(),
        };
      });

      return res.send({
        message: 'Casino Categories Found',
        success: true,
        results: results,
      });
    });
  });
}

async function addSelectedCasinoCategories(req, res) {
  const { casinoCategories } = req.body;

  try {
    for (const category of casinoCategories) {
      const { _id, status, games } = category;

      const allCasino = await CasinoGames.findOne({ _id }).exec();
      let selectedCasino = await SelectedCasino.findOne({ _id }).exec();

      if (!selectedCasino) {
        selectedCasino = new SelectedCasino({
          _id: _id,
          category: _id,
          status: status,
          games: []
        });
      }

      if (status === 2) {
        console.log('in here');
        // Add all games for _id in selectedCasino
        selectedCasino._id = _id; // Assign _id
        selectedCasino.status = status; // Assign status
        selectedCasino.games = allCasino.games;
        await selectedCasino.save();
      } else if (status === 1) {
        for (const gameID of games) {
          let matchingGame = allCasino.games.find(game => game.id === gameID);

          if (matchingGame) {
            console.log("Matching game found:", matchingGame);
            // Check if the game is already present in selectedCasino
            const isGameAlreadyAdded = selectedCasino.games.some(game => game.id === gameID);

            if (!isGameAlreadyAdded) {
              selectedCasino.games.push(matchingGame); // Add the matching game to selectedCasino
            } else {
              console.log("Game already present:", matchingGame);
            }
          } else {
            console.log("No matching game found for ID:", gameID);
          }
        }
        await selectedCasino.save();
      }
    }

    for (const category of casinoCategories) {
      const { _id, status } = category;
      if (status === 0) {
        console.log('Deleting selected casino:', _id);
        await SelectedCasino.deleteOne({ _id: _id });
      }
    }

    res.send({ message: 'Selected casino categories saved successfully', success: true });
  } catch (err) {
    console.error("Error saving selected casino categories:", err);
    res.status(500).send({ message: 'Failed to save selected casino categories' });
  }
}


function getSelectedCasinoGames(req, res) {
  let categoryId = req.query.categoryId;
  SelectedCasino.find({ _id: categoryId }, (err, casinoCategories) => {
    if (err || !casinoCategories || casinoCategories.length === 0) {
      return res.status(404).send({ message: 'Casino Categories Not Found' });
    }

    const games = casinoCategories[0].games;

    return res.send({
      message: 'Selected Casino Games Found',
      success: true,
      results: games,
    });
  });
}



function getCategoryCasinoGames(req, res) {
  let categoryId = req.query._id;
  CasinoGames.findOne({ _id: categoryId }, (err, casinoCategories) => {
    if (err || !casinoCategories || casinoCategories.length === 0) {
      return res.status(404).send({ message: 'Casino Categories Not Found' });
    }
    SelectedCasino.findOne({ _id: categoryId }, (err, selectedCategory) => {

      if (err || !selectedCategory || selectedCategory.length === 0) {
        return res.status(404).send({ message: 'Casino Categories Not Found' });
      }
      const results = casinoCategories.games.map((game) => {

          const matchingGame = selectedCategory.games.some(selected => selected.id === game.id);

        console.log("matchibg", matchingGame);
        
        const status = matchingGame ? 1 : 0;
        return {
          _id: game._id,
          game: game,
          status: status,
        }
      })
    return res.send({
      message: 'Selected Casino Games Found',
      success: true,
      results: results,
    });
  })
  })
}


router.post('/addCasinoGameDetails', addCasinoGameDetails);

router.get('/getAllCasinoCategories', getAllCasinoCategories);

router.get('/getCategoryCasinoGames', getCategoryCasinoGames);


router.get('/getSelectedCasinoGames', getSelectedCasinoGames);

router.post('/addSelectedCasinoCategories', addSelectedCasinoCategories);

module.exports = { router };
