const express = require('express');
const cors = require('cors');
const { ObjectId } = require('mongodb');

const MongoClient = require("mongodb").MongoClient;
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');


const dbname = "recipe_book";

// ENABLE DOTENV
require('dotenv').config() //env

// mpngoUri => MONGO_URI
const mongoUri = process.env.MONGO_URI;

//function to generate and acess token
function generateAccessToken(id, email) {
    let payload = {
        'user_id': id,
        'email': email,
    }

    let token = jwt.sign(payload, process.env.TOKEN_SECRET, {
        'expiresIn':'1h'
    });

    return token;
}

// AUTHORIZATION PART
function verifyToken(req, res, next){
    let authHeader = req.headers['authorization'];
    let token = null;
    if (authHeader) {
        token = authHeader.split(' ')[1]; //token will be stored as BEARER <JWT TOKEN>
        if (token) {
            jwt.verify(token, process.env.TOKEN_SECRET, function(err, payload){
                if (err) {
                    console.error(err);
                    return res.sendStatus(403);
                }
                req.user = payload; // save payload into request
                //call the route function
                next();

            })
        } else {
            return res.sendStatus(403);
        }
    } else {
        return res.sendStatus(403);
    }
}

// -------------------------------------------------//
// create the app
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

    // Routes --------------------------------------------------------

    // STEP 09
    /*
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
                res.status(500).json({ error: "Internal server error02" });
            }
        });*/


    app.get('/recipes', verifyToken, async (req, res) => {
        try {
            const { tags, cuisine, ingredients, name } = req.query;
            let query = {};

            if (tags) {
                query['tags.name'] = { $in: tags.split(',') };
            }

            if (cuisine) {
                query['cuisine.name'] = { $regex: cuisine, $options: 'i' };
            }

            if (ingredients) {
                query['ingredients.name'] = { $all: ingredients.split(',').map(i => new RegExp(i, 'i')) };
            }

            if (name) {
                query.name = { $regex: name, $options: 'i' };
            }

            const recipes = await db.collection('recipes').find(query).project({
                name: 1,
                'cuisine.name': 1,
                'tags.name': 1,
                _id: 0
            }).toArray();

            res.json({ recipes });
        } catch (error) {
            console.error('Error searching recipes:', error);
            res.status(500).json({ error: 'Internal server error01' });
        }
    });

    //STEP 10
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
            res.status(500).json({ error: "Internal server error03" });
        }
    });

    //POST
    app.post('/recipes', async (req, res) => {
        try {
            const { name, cuisine, prepTime, cookTime, servings, ingredients, instructions, tags } = req.body;

            // Basic validation
            if (!name || !cuisine || !ingredients || !instructions || !tags) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            // Fetch the cuisine document
            const cuisineDoc = await db.collection('cuisines').findOne({ name: cuisine });
            if (!cuisineDoc) {
                return res.status(400).json({ error: 'Invalid cuisine' });
            }

            // Fetch the tag documents
            const tagDocs = await db.collection('tags').find({ name: { $in: tags } }).toArray();
            if (tagDocs.length !== tags.length) {
                return res.status(400).json({ error: 'One or more invalid tags' });
            }

            // Create the new recipe object
            const newRecipe = {
                name,
                cuisine: {
                    _id: cuisineDoc._id,
                    name: cuisineDoc.name
                },
                prepTime,
                cookTime,
                servings,
                ingredients,
                instructions,
                tags: tagDocs.map(tag => ({
                    _id: tag._id,
                    name: tag.name
                }))
            };

            // Insert the new recipe into the database
            const result = await db.collection('recipes').insertOne(newRecipe);

            // Send back the created recipe
            res.status(201).json({
                message: 'Recipe created successfully',
                recipeId: result.insertedId
            });
        } catch (error) {
            console.error('Error creating recipe:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    //PUT
    app.put('/recipes/:id', async (req, res) => {
        try {
            const recipeId = req.params.id;
            const { name, cuisine, prepTime, cookTime, servings, ingredients, instructions, tags } = req.body;

            // Basic validation
            if (!name || !cuisine || !ingredients || !instructions || !tags) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            // Fetch the cuisine document
            const cuisineDoc = await db.collection('cuisines').findOne({ name: cuisine });
            if (!cuisineDoc) {
                return res.status(400).json({ error: 'Invalid cuisine' });
            }

            // Fetch the tag documents
            const tagDocs = await db.collection('tags').find({ name: { $in: tags } }).toArray();
            if (tagDocs.length !== tags.length) {
                return res.status(400).json({ error: 'One or more invalid tags' });
            }

            // Create the updated recipe object
            const updatedRecipe = {
                name,
                cuisine: {
                    _id: cuisineDoc._id,
                    name: cuisineDoc.name
                },
                prepTime,
                cookTime,
                servings,
                ingredients,
                instructions,
                tags: tagDocs.map(tag => ({
                    _id: tag._id,
                    name: tag.name
                }))
            };

            // Update the recipe in the database
            const result = await db.collection('recipes').updateOne(
                { _id: new ObjectId(recipeId) },
                { $set: updatedRecipe }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({ error: 'Recipe not found' });
            }

            // Send back the success response
            res.json({
                message: 'Recipe updated successfully'
            });
        } catch (error) {
            console.error('Error updating recipe:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    //DELETE
    app.delete('/recipes/:id', async (req, res) => {
        try {
            const recipeId = req.params.id;

            // Attempt to delete the recipe
            const result = await db.collection('recipes').deleteOne({ _id: new ObjectId(recipeId) });

            if (result.deletedCount === 0) {
                return res.status(404).json({ error: 'Recipe not found' });
            }

            res.json({ message: 'Recipe deleted successfully' });
        } catch (error) {
            console.error('Error deleting recipe:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    // route for user to sign up
    app.post('/users', async function(req,res) {

    try {
        let {email, password} = req.body;
        if (!email || !password) {
            return res.status(400).json({
                "error": "Please provide user name and password"
            })
        }

        let userDocument = {
            email,
            password: await bcrypt.hash(password, 12)
        };
        
        let result = await db.collection("users").insertOne(userDocument);

        res.json({
            "message":"New user account has been created",
            result
        })

    } catch (e) {
        console.error(e);
        res.status(500);
    }





    })

    app.post('/login', async function(req, res){
        try{
            let {email, password} = req.body;
            if (!email || !password){
                return res.status(400).json({
                    'message':'Please provide email and password'
                })
            }

            //finding user by email
            let user = await db.collection('users').findOne({
                "email": email
            });

            if (user){
                if (bcrypt.compareSync(password, user.password)) {
                    let accessToken = generateAccessToken(user._id,user.email);
                    res.json({
                        "accessToken": accessToken
                    })
                } else {
                    res.status(401);
                }
            } else {
                res.status(401);
            }

        } catch (e) {
            console.error(e);
            res.status(500);
        }
    })

    app.get('/profile', verifyToken, async function(req, res){

        // get the payload
        let user = req.user;
        res.json({
            user 
        })

    })

}


main();


// START SERVER
app.listen(3000, () => {
    console.log("Server started")
})