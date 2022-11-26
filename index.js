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
        const productsCategoryCollection = client.db("bdSeller").collection("categories");

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

        // get all categories
        app.get("/categories", async (req, res) => {
            const query = {};
            const categories = await productsCategoryCollection.find(query).toArray();
            console.log(categories)
            res.status(200).send(categories);
        });

        // create new category
        app.post("/categories", async (req, res) => {
            const categoryData = {
               ...req.body,
                productCreated: Date.now(),
            };
            const product = await productsCategoryCollection.insertOne(categoryData);
            res.status(200).send(product);
        });

        // update category by categoryId
        app.patch("/categories/:categoryId", async (req, res) => {
            try {
                const updatedCategoryData = req.body;

                const query = {
                    _id: ObjectId(req.params.categoryId),
                };
                const updateDocument = {
                    $set: {
                        categoryName: updatedCategoryData,
                    },
                };

                const updatedCategory = await productsCategoryCollection.updateOne(
                    query,
                    updateDocument
                );
                res.status(200).send(updatedCategory);
            } catch (error) {
                res.status(500).send({ message: error.message });
            }
        });

        // delete category by categoryId
        app.delete("/categories/:categoryId", async (req, res) => {
            try {
                const query = {
                    _id: ObjectId(req.params.categoryId),
                };
                const removedCategory = await productsCategoryCollection.deleteOne(
                    query
                );
                res.status(200).json(removedCategory);
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
