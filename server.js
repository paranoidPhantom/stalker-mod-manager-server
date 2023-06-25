const express = require("express");
const cors = require("cors");
const app = express();
const JSON_DB = require("simple-json-db");
const modsDB = new JSON_DB("db/modDB.json");
const colors = require("colors");
require("dotenv").config();
const port = process.env.PORT || 3000;

app.use(cors());

function makeSessionID(length) {
    let result = "";
    const characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
        result += characters.charAt(
            Math.floor(Math.random() * charactersLength)
        );
        counter += 1;
    }
    return result;
}

// GET request to get all mods
app.get("/api/mods", (req, res) => {
    const mods = modsDB.JSON()["mods"];
    mods.forEach((mod, id) => {
        mod.id = id;
    });
    res.json(mods);
});

// GET request to get individual mod metadata with a unique ID
app.get("/api/mods/:id", (req, res) => {
    const id = parseInt(req.params.id);
    let mod = null;
    const dbCurrent = modsDB.JSON();
    if (!dbCurrent["mods"]) {
        modsDB.set("mods", []);
    }
    dbCurrent["mods"].forEach((data, elementID) => {
        if (id === elementID) {
            mod = data;
        }
    });
    if (mod) {
        res.json(mod);
    } else {
        res.status(404).send("Mod not found");
    }
});

// POST request to add a new mod
app.post("/api/mods", (req, res) => {
    const mod = req.body;
    if (mod) {
        const mods = modsDB.JSON()["mods"];
        let id = 0;
        if (mods) {
            id = mods.length;
        }
        mods[id] = mod;
        modsDB.set("mods", mods);
        res.json({ message: "Mod added successfully!", mod });
    } else {
        res.status(400).send("Invalid mod data");
    }
});

app.post("/api/login", async (req, res) => {
    const sessionsDB = new JSON_DB("db/sessionsDB.json");
    const { code } = req.query;
    if (sessionsDB.JSON()[`_login_code_${code}`]) {
        const sessionID = makeSessionID(120);
        const user = sessionsDB.get("_login_code_" + code);
        sessionsDB.delete("_login_code_" + code);
        sessionsDB.set("_session_" + sessionID, user);
        res.json({ session: sessionID, user });
    } else {
        console.log(`${`_login_code_${code}`} not found...`);
        res.status(400).send("Invalid auth code");
    }
});

app.get("/api/validate", async (req, res) => {
    const sessionsDB = new JSON_DB("db/sessionsDB.json");
    const { session } = req.query;
    const valid = sessionsDB.has(`_session_${session}`);
    res.json({ valid: valid });
});

app.get("/api/dashboard", async (req, res) => {
    // Get user access level
    const sessionsDB = new JSON_DB("db/sessionsDB.json");
    const usersDB = new JSON_DB("db/usersDB.json");
    //
    const { session } = req.query;
    const { id: UID } = sessionsDB.get(`_session_${session}`);
    //
    const { accessLevel } = usersDB.get(UID);
    // Actual logic
    switch (accessLevel) {
        case ("0"): {
            res.status(403).send("Insufficient access level");
            break;
        }
        case ("1"): {
            const mods = modsDB.JSON()["mods"];
            const result = [];
            mods.forEach((mod, id) => {
                mod.id = id;
                if (mod["uploader"] === UID) {
                    result.push(mod);
                }
            });
            res.json({ mods: result });
            break
        }
        case ("2" || "3"): {
            const mods = modsDB.JSON()["mods"];
            mods.forEach((mod, id) => {
                mod.id = id;
            });
            res.json({ mods });
            break
        }
    }
});

app.listen(port, () => {
    console.clear();
    console.log(`Server listening on port ${port}`.rainbow);
});

// Launch bot
const BOT = require("./bot.js");
