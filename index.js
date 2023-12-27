const express = require("express");
const cors = require("cors");
const SSLCommerzPayment = require("sslcommerz-lts");

const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");

const port = process.env.PORT || 5000;
//middleware
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("ZOA agro running");
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3jhdbx1.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
//ssl ecommerz id,pass
const store_id = process.env.STORE_ID;
const store_passwd = process.env.STORE_PASS;
const is_live = false; //true for live, false for sandbox

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    client.connect();
    const db = client.db("zoaDB");
    const usersCollection = db.collection("usersCollection");
    const orderCollection = db.collection("orderCollection");
    const plantsCollection = db.collection("plantsCollection");
    const birdsCollection = db.collection("birdsCollection");
    const fishesCollection = db.collection("fishesCollection");
    const animalsCollection = db.collection("animalsCollection");
    const foodsCollection = db.collection("foodsCollection");
    const medicinesCollection = db.collection("medicinesCollection");
    const toolsCollection = db.collection("toolsCollection");
    //sslcommerz init

    const tran_id = new ObjectId().toString();
    app.post("/order", async (req, res) => {
      const order = req.body;
        console.log("Order api",order);
      const data = {
        total_amount: order.totalPayable,
        currency: "BDT",
        tran_id: tran_id, // use unique tran_id for each api call
        success_url: `https://zoa-server.vercel.app/payment-success/${tran_id}`,
        fail_url: `https://zoa-server.vercel.app/payment-fail/${tran_id}`,
        cancel_url: `https://zoa-server.vercel.app/payment-fail/${tran_id}`,
        ipn_url: "http://localhost:3030/ipn",
        shipping_method: "Courier",
        product_name: "Agriculture",
        product_category: "Agricultural",
        product_profile: "general",
        ordered_products: order?.orderedProducts,
        cus_name: order.userName,
        cus_email: order.userEmail,
        cus_add1: order.address,
        cus_add2: order.address,
        cus_city: "adas",
        cus_state: "sas",
        cus_postcode: "asa",
        cus_country: "Bangladesh",
        cus_phone: order.phone,
        cus_fax: "dsa",
        ship_name: order.userName,
        ship_add1: order.address,
        ship_add2: order.address,
        ship_city: "sdasdas",
        ship_state: "sdsa",
        ship_postcode: "wdwd",
        ship_country: "Bangladesh",
      };

      const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
      sslcz.init(data).then((apiResponse) => {
        // Redirect the user to payment gateway
        let GatewayPageURL = apiResponse.GatewayPageURL;
        res.send({ url: GatewayPageURL });
       const date = new Date();
        const finalOrder = {
          order,
          paidStatus: false,
          cus_email: order.userEmail,
          transactionId: tran_id,
          date,
        };
        const result = orderCollection.insertOne(finalOrder);
        console.log("Redirecting to: ", GatewayPageURL);
      });

      app.post("/payment-success/:tranId", async (req, res) => {
        const result = await orderCollection.updateOne(
          { transactionId: req.params.tranId },
          {
            $set: {
              paidStatus: true,
            },
          }
        );
        if (result.modifiedCount) {
          res.redirect(
            `https://zoa-agro.web.app/payment-success/${req.params.tranId}`
          );
        }
      });
      app.post("/payment-fail/:tranId", async (req, res) => {
        const result = await orderCollection.deleteOne({
          transactionId: req.params.tranId,
        });
        if (result.deletedCount) {
          res.redirect("https://zoa-agro.web.app/payment-fail");
        }
      });
    });
    app.get("/ordered-products", async (req, res) => {
      const email = req.query.email;
      const orderedProducts = await orderCollection
        .find({ cus_email: email })
        .toArray();
      res.send(orderedProducts);
    });
    app.get("/allordered-products", async (req, res) => {
      const orderedProducts = await orderCollection
        .find()
        .toArray();
      res.send(orderedProducts);
    });
   

    //jwt
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });
    //user post to database
    app.post("/users", async (req, res) => {
      const user = req.body;

      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exists" });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });
    //get users
    app.get("/users", verifyJWT, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });
    //admin
    app.get("/users/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email === email) {
        const query = { email: email };
        const user = await usersCollection.findOne(query);
        const result = { admin: user?.role === "admin" };
        res.send(result);
      } else {
        res.send({ admin: false });
      }
    });
    //seller
    app.get("/users/seller/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email === email) {
        const query = { email: email };
        const user = await usersCollection.findOne(query);
        const result = { seller: user?.role === "seller" };
        res.send(result);
      } else {
        res.send({ seller: false });
      }
    });
    //make seller
    app.patch("/users/seller/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedUser = {
        $set: {
          role: "seller",
        },
      };
      const result = await usersCollection.updateOne(filter, updatedUser);
      res.send(result);
    });
    //make user
    app.patch("/users/user/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedUser = {
        $set: {
          role: "user",
        },
      };
      const result = await usersCollection.updateOne(filter, updatedUser);
      res.send(result);
    });

    //post product in plants collections
    app.post("/plants", verifyJWT, async (req, res) => {
      const data = req.body;
      const result = await plantsCollection.insertOne(data);
      res.send(result);
    });
    //post product in Birds collections
    app.post("/birds", verifyJWT, async (req, res) => {
      const data = req.body;
      const result = await birdsCollection.insertOne(data);
      res.send(result);
    });
    //post product in fishes collections
    app.post("/fishes", verifyJWT, async (req, res) => {
      const data = req.body;
      const result = await fishesCollection.insertOne(data);
      res.send(result);
    });
    //post product in animals collections
    app.post("/animals", verifyJWT, async (req, res) => {
      const data = req.body;
      const result = await animalsCollection.insertOne(data);
      res.send(result);
    });
    //post product in foods collections
    app.post("/foods", verifyJWT, async (req, res) => {
      const data = req.body;
      const result = await foodsCollection.insertOne(data);
      res.send(result);
    });
    //post product in medicines collections
    app.post("/medicines", verifyJWT, async (req, res) => {
      const data = req.body;
      const result = await medicinesCollection.insertOne(data);
      res.send(result);
    });
    //post product in tools collections
    app.post("/tools", verifyJWT, async (req, res) => {
      const data = req.body;
      const result = await toolsCollection.insertOne(data);
      res.send(result);
    });

    //get allProducts
    app.get("/allProducts", async (req, res) => {
      const collections = [
        "plantsCollection",
        "birdsCollection",
        "fishesCollection",
        "animalsCollection",
        "foodsCollection",
        "medicinesCollection",
        "toolsCollection",
      ];

      // An array to store the promises for querying each collection
      const queryPromises = collections.map(async (collectionName) => {
        const products = await db
          .collection(collectionName)
          .find()
          .sort({ _id: -1 })
          .toArray();
        return products;
      });

      // Execute all the queries concurrently and await their results
      const results = await Promise.all(queryPromises);

      // Merge the results from all collections into a single array
      const allProducts = [].concat(...results);

      // Sort the merged array by createdAt in descending order
      allProducts.sort((a, b) => b.createdAt - a.createdAt);

      res.send(allProducts);
    });
    //get all products based on parameter
    app.get("/all-products", async (req, res) => {
      const { category, subCategory, sortDirection } = req.query;

      const collections = [
        "plantsCollection",
        "birdsCollection",
        "fishesCollection",
        "animalsCollection",
        "foodsCollection",
        "medicinesCollection",
        "toolsCollection",
      ];
      let filter = {};
      if (category !== "null" && category !== "undefined") {
        filter.category = category;
      }

      if (subCategory) {
        filter.subCategory = subCategory;
      }

      const results = [];
      for (const collectionName of collections) {
        const products = await db
          .collection(collectionName)
          .find(filter)
          .sort({ createdAt: -1 })
          .toArray();
        results.push(...products);
      }
      // Sort the results based on price
      if (sortDirection) {
        if (sortDirection === "low to high") {
          results.sort((a, b) => a.price - b.price); // Ascending (low to high)
        } else if (sortDirection === "high to low") {
          results.sort((a, b) => b.price - a.price); // Descending (high to low)
        }
      }

      res.send(results);
    });
    // get seller products
    app.get("/products", async (req, res) => {
      const email = req.query.email;
      const collections = [
        "plantsCollection",
        "birdsCollection",
        "fishesCollection",
        "animalsCollection",
        "foodsCollection",
        "medicinesCollection",
        "toolsCollection",
      ];
      const results = [];
      for (const collectionName of collections) {
        const products = await db
          .collection(collectionName)
          .find({ seller_email: email })
          .toArray();
        results.push(...products);
      }
      res.send(results);
    });
    // delete seller products
    app.delete("/delete-product/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const collections = [
        "plantsCollection",
        "birdsCollection",
        "fishesCollection",
        "animalsCollection",
        "foodsCollection",
        "medicinesCollection",
        "toolsCollection",
      ];

      const deletePromises = collections.map(async (collectionName) => {
        const result = await db
          .collection(collectionName)
          .deleteOne({ _id: new ObjectId(id) });
        return result.deletedCount;
      });
      res.send(deletePromises);
    });
    // Update  products
    app.patch("/update-product/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const data = req.body.data;
      const query = { _id: new ObjectId(id) };
      const updateProduct = {
        $set: {},
      };
      if (
        data.price !== undefined &&
        data.price !== null &&
        data.price !== ""
      ) {
        updateProduct.$set.price = parseInt(data.price,10);
      }

      if (
        data.quantity !== undefined &&
        data.quantity !== null &&
        data.quantity !== ""
      ) {
        updateProduct.$set.available_quantity = parseInt(data.quantity,10);
      }
      const collections = [
        "plantsCollection",
        "birdsCollection",
        "fishesCollection",
        "animalsCollection",
        "foodsCollection",
        "medicinesCollection",
        "toolsCollection",
      ];

      const updatePromises = collections.map(async (collectionName) => {
        const result = await db
          .collection(collectionName)
          .updateOne(query, updateProduct);
        return result.deletedCount;
      });
      res.send(updatePromises);
    });
    // post cart data to database
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Listening From: ${port}`);
});
