const express = require('express');
const cors = require('cors');
const app = express();
const JSONdb = require('simple-json-db');
const modsDB = new JSONdb('db/modDB.json');


// GET request to get all mods
app.get('/api/mods', (req, res) => {
  const mods = modsDB.JSON()["mods"];
  res.json(mods);
});

// GET request to get individual mod metadata with a unique ID
app.get('/api/mods/:id', (req, res) => {
  const id = parseInt(req.params.id);
  let mod = null
  const dbCurrent = modsDB.JSON()
  if (!dbCurrent.JSON()["mods"]) { modsDB.set("mods", []) }
  dbCurrent["mods"].forEach((data, elementID) => {
    if (id === elementID) {
      mod = data
    }
  });
  if (mod) {
    res.json(mod);
  } else {
    res.status(404).send('Mod not found');
  }
});

// POST request to add a new mod
app.post('/api/mods', (req, res) => {
  const mod = req.body;
  if (mod) {
    const mods = modsDB.JSON()["mods"]
    let id = 0
    if (mods) { id = mods.length }
    mods[id] = mod
    modsDB.set("mods", mods)
    res.json({ message: 'Mod added successfully!', mod });
  } else {
    res.status(400).send('Invalid mod data');
  }
});

app.listen(3000, () => {
  console.clear()
  console.log('Server listening on port 3000');
});
