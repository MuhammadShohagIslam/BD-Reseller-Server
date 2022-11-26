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
        const usersCollection = client.db("bdSeller").collection("users");
        const productsCollection = client.db("bdSeller").collection("products");

        // get all products
        app.get("/products", async (req, res) => {
            const page = parseInt(req.query.page);
            const size = parseInt(req.query.size);
            const query = {};
            const productsCursor = productsCollection.find(query);
            const products = await productsCursor
                .skip(page * size)
                .limit(size)
                .toArray();
            const totalProduct =
                await productsCollection.estimatedDocumentCount();
            res.status(200).send({ totalProduct, products });
        });
        // create new products
        app.post("/products", async (req, res) => {
            const productsData = {
                ...req.body,
                productCreated: Date.now(),
            };
            const product = await productsCollection.insertOne(productsData);
            res.status(200).send(product);
        });

        // update product by productId
        app.patch("/products/:productId", async (req, res) => {
            try {
                const updatedProductData = req.body.updatedData;

                const query = {
                    _id: ObjectId(req.params.productId),
                };
                const updateDocument = {
                    $set: {
                        ...updatedProductData,
                    },
                };

                const updatedProduct = await productsCollection.updateOne(
                    query,
                    updateDocument
                );
                res.status(200).send(updatedProduct);
            } catch (error) {
                res.status(500).send({ message: error.message });
            }
        });

        // delete product by productId
        app.delete("/products/:productId", async (req, res) => {
            try {
                const query = {
                    _id: ObjectId(req.params.productId),
                };
                const removedProduct = await productsCollection.deleteOne(
                    query
                );
                res.status(200).json(removedProduct);
            } catch (error) {
                res.status(500).send({ message: error.message });
            }
        });
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
