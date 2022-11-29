const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SCREAT_KEY);

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
        const blogsCollection = client.db("bdSeller").collection("blogs");
        const productsCollection = client.db("bdSeller").collection("products");
        const productBookingCollection = client
            .db("bdSeller")
            .collection("productBooking");
        const productBookingPaymentCollection = client
            .db("bdSeller")
            .collection("productPayment");
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
            res.status(200).send(users);
        });

        // verified seller by admin
        app.patch("/users/seller/:sellerId", async (req, res) => {
            try {
                const query = {
                    _id: ObjectId(req.params.sellerId),
                };
                const updateDocument = {
                    $set: {
                        ...req.body,
                    },
                };
                const verifiedSeller = await usersCollection.updateOne(
                    query,
                    updateDocument
                );
                res.status(200).send(verifiedSeller);
            } catch (error) {
                res.status(500).send({ message: error.message });
            }
        });
        // get admin user by email
        app.get("/users/admin/:adminEmail", async (req, res) => {
            try {
                const query = {
                    email: req.params.adminEmail,
                };
                const user = await usersCollection.findOne(query);

                res.status(200).send({
                    isAdmin: user?.role === "admin",
                });
            } catch (error) {
                res.status(500).send({ message: error.message });
            }
        });

        // get seller user by email
        app.get("/users/seller/:sellerEmail", async (req, res) => {
            try {
                const query = {
                    email: req.params.sellerEmail,
                };
                const user = await usersCollection.findOne(query);

                res.status(200).send({
                    isSeller: user?.role === "seller",
                    sellerId: user?._id,
                });
            } catch (error) {
                res.status(500).send({ message: error.message });
            }
        });

        // get seller user by sellerId
        app.get("/users/seller", async (req, res) => {
            try {
                const sellerId = req.query.sellerId;
                if (sellerId) {
                    const query = {
                        _id: ObjectId(sellerId),
                    };
                    const user = await usersCollection.findOne(query);
                    res.status(200).send({
                        isVerified: user.isVerified,
                    });
                }
            } catch (error) {
                res.status(500).send({ message: error.message });
            }
        });

        // get buyer user by email
        app.get("/users/buyers/:buyerEmail", async (req, res) => {
            try {
                const query = {
                    email: req.params.buyerEmail,
                };
                const user = await usersCollection.findOne(query);

                res.status(200).send({
                    isBuyer: user?.role === "user",
                });
            } catch (error) {
                res.status(500).send({ message: error.message });
            }
        });

        // remove users by userEmail
        app.delete("/users", async (req, res) => {
            try {
                if (req.query.email) {
                    const query = {
                        email: req.query.email,
                    };
                    const removedUser = await usersCollection.deleteOne(query);
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

        // get all top most offer products
        app.get("/products/topOffer", async (req, res) => {
            try {
                const page = parseInt(req.query.page);
                const size = parseInt(req.query.size);
                let query = {};
                const productsCursor = productsCollection.find(query);
                const products = await productsCursor
                    .skip(page * size)
                    .limit(size)
                    .sort({ saveAmount: -1 })
                    .toArray();
                const totalProduct =
                    await productsCollection.estimatedDocumentCount();
                res.status(200).send({ totalProduct, products });
            } catch (error) {
                res.status(500).send({ message: error.message });
            }
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

        // get all products by isAdvertise
        app.get("/products/advertise/:isAdvertise", async (req, res) => {
            try {
                const isTrue = req.params.isAdvertise === "true";
                if (isTrue) {
                    const query = {
                        isAdvertised: true,
                    };
                    const productsForAdvertise = await productsCollection
                        .find(query)
                        .sort({
                            createdAdvertised: -1,
                        })
                        .limit(1)
                        .toArray();
                    res.status(200).send(productsForAdvertise);
                }
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

        // create new booking product
        app.post("/products/bookings", async (req, res) => {
            try {
                const bookingProductData = {
                    ...req.body,
                    bookingCreated: Date.now(),
                };
                const bookingProduct = await productBookingCollection.insertOne(
                    bookingProductData
                );
                res.status(200).send(bookingProduct);
            } catch (error) {
                res.status(500).send({ message: error.message });
            }
        });

        // get all booking products
        app.get("/bookings", async (req, res) => {
            try {
                const userName = req.query.userName;
                const userEmail = req.query.userEmail;
                if (userName || userEmail) {
                    const query = {
                        userName,
                        userEmail,
                    };
                    const bookingProducts = await productBookingCollection
                        .find(query)
                        .toArray();
                    res.status(200).send(bookingProducts);
                }
            } catch (error) {
                res.status(500).send({ message: error.message });
            }
        });

        // get orders product by orderId
        app.get("/bookings/:orderId", async (req, res) => {
            try {
                try {
                    const query = {
                        _id: ObjectId(req.params.orderId),
                    };
                    const orderProduct = await productBookingCollection.findOne(
                        query
                    );
                    res.status(200).json(orderProduct);
                } catch (error) {
                    res.status(500).send({ message: error.message });
                }
            } catch (error) {
                res.status(500).send({ message: error.message });
            }
        });

        // product payment
        app.post("/create-payment-intent", async (req, res) => {
            const orderProduct = req.body;
            const price = orderProduct.price;
            const amount = price * 100;
            // Create a PaymentIntent with the order amount and currency
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ["card"],
            });

            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });
        // product payment
        app.post("/payment", async (req, res) => {
            try {
                const orderPaymentData = {
                    ...req.body,
                    paymentCreated: Date.now(),
                };
                const payment = await productBookingPaymentCollection.insertOne(
                    orderPaymentData
                );
                res.status(200).send(payment);
            } catch (error) {
                res.status(500).send({ message: error.message });
            }
        });

        // delete booking by productId
        app.delete("/bookings/:productId", async (req, res) => {
            try {
                const query = {
                    productId: req.params.productId,
                };
                const removedBookingProduct =
                    await productBookingCollection.deleteOne(query);
                res.status(200).json(removedBookingProduct);
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
        app.post("/categories", async (req, res) => {});

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

        // get all blogs
        app.get("/blogs", async (req, res) => {
            try {
                const page = parseInt(req.query.page);
                const size = parseInt(req.query.size);
                const query = {};
                if (page || size) {
                    const blogs = await blogsCollection
                        .find(query)
                        .skip(page * size)
                        .limit(size)
                        .toArray();
                    const totalBlogs =
                        await blogsCollection.estimatedDocumentCount();
                    res.status(200).send({ totalBlogs, blogs });
                } else {
                    const blogs = await blogsCollection.find(query).toArray();
                    res.status(200).send(blogs);
                }
            } catch (error) {
                res.status(500).send({ message: error.message });
            }
        });

        // get blog by blogId
        app.get("/blogs/:blogId", async (req, res) => {
            try {
                const query = {
                    _id: ObjectId(req.params.blogId),
                };
                const blog = await blogsCollection.findOne(query);
                res.status(200).send(blog);
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
