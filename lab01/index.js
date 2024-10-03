const express = require('express');
const cors = require('cors');

require('dotenv').config()
const MongoClient = require("mongodb").MongoClient;
const mongoUri = process.env.MONGO_URI;


const dbname = "recipe_book"; 
// -------------------------------------------------//
let app = express();
app.use(cors());

// !! Enable processing JSON data
app.use(express.json());

// !! Enable CORS
app.use(cors());

// -------------------------------------------------//

async function connect(uri, dbname) {
    let client = await MongoClient.connect(uri, {
        useUnifiedTopology: true
    })
    let db = client.db(dbname);
    return db;
}

async function main() {
    let db = await connect(mongoUri, dbname);

    // Routes

//STEP 10
    const { ObjectId } = require('mongodb');

app.get("/recipes/:id", async (req, res) => {
    try {
        const id = req.params.id;
        
        // First, fetch the recipe
        const recipe = await db.collection("recipes").findOne(
            { _id: new ObjectId(id) },
            { projection: { _id: 0 } }
        );
        
        if (!recipe) {
            return res.status(404).json({ error: "Recipe not found" });
        }
        
        
        res.json(recipe);
    } catch (error) {
        console.error("Error fetching recipe:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// STEP 09
    app.get("/recipes", async (req, res) => {
        try {
            const recipes = await db.collection("recipes").find().project({
                name: 1,
                cuisine: 1,
                tags: 1,
                prepTime: 1,
            }).toArray();
            
            res.json({ recipes });
        } catch (error) {
            console.error("Error fetching recipes:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
}


main();


// START SERVER
app.listen(3000, ()=>{
    console.log("Server started")
})