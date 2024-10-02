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
    return _db;
}

async function main() {
    let db = await connect(mongoUri, dbname);

    // Routes
    app.get("/", function (req, res) {
        res.json({
            message: "Hello World!",
        });
    });
}

main();


//Lab 2
app.get('/echo', (req,res)=>{
    //Get all query parameters
    const queryParams = req.query;

    //Create a response object
    const response = {
        message: "Here are the query parameters you sent:",
        firstName: queryParams.firstName,
        lastName: queryParams.lastName
    };

    //send the response as JSON
    res.json(response);

})

app.listen(3000, ()=>{
    console.log("Server started")
})