const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
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
// verify user by JWT
const verifyJWT = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).send({ message: "unauthorize access" });
        }

        const token = authHeader.split(" ")[1];

        jwt.verify(
            token,
            process.env.ACCESS_TOKEN_SCREAT,
            function (err, decoded) {
                if (err) {
                    return res
                        .status(403)
                        .send({ message: "Forbidden Access" });
                }
                req.decoded = decoded;
                next();
            }
        );
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

const run = async () => {
    try {
        const usersCollection = client.db("bdSeller").collection("users");
        const productsCollection = client.db("bdSeller").collection("products");
        const productsCategoryCollection = client
            .db("bdSeller")
            .collection("categories");
        const wishListCollection = client
            .db("bdSeller")
            .collection("wishLists");

        // create token
        app.post("/createJwtToken", (req, res) => {
            try {
                const userData = {
                    ...req.body,
                };
                const token = jwt.sign(
                    userData,
                    process.env.ACCESS_TOKEN_SCREAT,
                    {
                        expiresIn: "14d",
                    }
                );
                res.status(200).json({ token });
            } catch (error) {
                res.status(500).send({ message: error.message });
            }
        });

        // create new user
        app.post("/users", async (req, res) => {
            try {
                const userData = {
                    ...req.body,
                };
                console.log(userData);
                const newUser = await usersCollection.insertOne(userData);
                res.status(200).send(newUser);
            } catch (error) {
                res.status(500).send({ message: error.message });
            }
        });

        // get all users by role
        app.get("/users", async (req, res) => {
            let query = {};
            if (req.query.role === "user") {
                query.role = req.query.role;
            }
            if (req.query.role === "admin") {
                query.role = req.query.role;
            }
            if (req.query.role === "seller") {
                query.role = req.query.role;
            }
            const users = await usersCollection.find(query).toArray();
            console.log(users);
            res.status(200).send(users);
        });

        // remove users by userEmail
        app.delete("/users", async (req, res) => {
            try {
                if (req.query.email) {
                    const query = {
                        email: req.query.email,
                    };
                    const removedUser = await usersCollection.deleteOne(
                        query
                    );
                    res.status(200).json(removedUser);
                }
            } catch (error) {
                res.status(500).send({ message: error.message });
            }
        });

        // get all products
        app.get("/products", async (req, res) => {
            const page = parseInt(req.query.page);
            const size = parseInt(req.query.size);
            let query = {};
            if (req.query.categoryName !== "undefined") {
                query.productCategory = req.query.categoryName;
            }
            const productsCursor = productsCollection.find(query);
            const products = await productsCursor
                .skip(page * size)
                .limit(size)
                .toArray();
            const totalProduct =
                await productsCollection.estimatedDocumentCount();
            res.status(200).send({ totalProduct, products });
        });

        // get product by productId
        app.get("/products/:productId", async (req, res) => {
            try {
                const query = {
                    _id: ObjectId(req.params.productId),
                };
                const product = await productsCollection.findOne(query);
                res.status(200).send(product);
            } catch (error) {
                res.status(500).send({ message: error.message });
            }
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
                const query = {
                    _id: ObjectId(req.params.productId),
                };
                const updateDocument = {
                    $set: {
                        ...req.body,
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
            const categories = await productsCategoryCollection
                .find(query)
                .toArray();
            res.status(200).send(categories);
        });

        // create new category
        app.post("/categories", async (req, res) => {
            const categoryData = {
                ...req.body,
                productCreated: Date.now(),
            };
            const product = await productsCategoryCollection.insertOne(
                categoryData
            );
            res.status(200).send(product);
        });

        // update category by categoryId
        app.patch("/categories/:categoryId", async (req, res) => {
            try {
                const query = {
                    _id: ObjectId(req.params.categoryId),
                };
                const updateDocument = {
                    $set: {
                        categoryName: req.body.categoryName,
                    },
                };

                const updatedCategory =
                    await productsCategoryCollection.updateOne(
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
                const removedCategory =
                    await productsCategoryCollection.deleteOne(query);
                res.status(200).json(removedCategory);
            } catch (error) {
                res.status(500).send({ message: error.message });
            }
        });

        // get all wish-list products
        app.get("/wishLists", async (req, res) => {
            const userName = req.query.userName;
            const userEmail = req.query.userEmail;
            if (userName || userEmail) {
                const query = {
                    userName,
                    userEmail,
                };
                const wishLists = await wishListCollection
                    .find(query)
                    .toArray();
                res.status(200).send(wishLists);
            }
        });

        // create new wish-list product
        app.post("/products/wishLists", async (req, res) => {
            const wishListData = {
                ...req.body,
                wishListCreated: Date.now(),
            };
            const wishList = await wishListCollection.insertOne(wishListData);
            res.status(200).send(wishList);
        });

        //delete wish-list product by productId
        app.delete("/wishLists/:productId", async (req, res) => {
            try {
                const query = {
                    productId: req.params.productId,
                };
                const removedWishList = await wishListCollection.deleteOne(
                    query
                );
                res.status(200).json(removedWishList);
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
