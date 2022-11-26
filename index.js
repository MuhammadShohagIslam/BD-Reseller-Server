const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use([cors(), express.json()]);

// connect mongoDB
const uri = process.env.MONGO_URL;
const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverApi: ServerApiVersion.v1,
});



const run = async () => {
    try {
        const usersCollection = client
            .db("bdSeller")
            .collection("users");
        const productsCollection = client
            .db("bdSeller")
            .collection("products");

       
        // create new products
        app.post("/products", async (req, res)=>{
            const productsData = req.body;
            const products = await productsCollection.insertOne(productsData);
            res.status(200).send(products);
        })
       
       
    } finally {
    }
};

run().catch((error) => console.log(error));

app.get("/", (req, res) => {
    res.send("BDSeller server is running");
});

app.listen(port, () => {
    console.log(`BDSeller server is running on ${port}`);
});
