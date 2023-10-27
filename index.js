const express = require("express");
const cors = require("cors");
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

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    client.connect();
    const db = client.db("zoaDB");
    const usersCollection = db.collection("usersCollection");
    const plantsCollection = db.collection("plantsCollection");
    const birdsCollection = db.collection("birdsCollection");
    const fishesCollection = db.collection("fishesCollection");
    const animalsCollection = db.collection("animalsCollection");
    const foodsCollection = db.collection("foodsCollection");
    const medicinesCollection = db.collection("medicinesCollection");
    const toolsCollection = db.collection("toolsCollection");

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
      console.log(data);
      const result = await plantsCollection.insertOne(data);
      res.send(result);
    });
    //post product in Birds collections
    app.post("/birds", verifyJWT, async (req, res) => {
      const data = req.body;
      console.log(data);
      const result = await birdsCollection.insertOne(data);
      res.send(result);
    });
    //post product in fishes collections
    app.post("/fishes", verifyJWT, async (req, res) => {
      const data = req.body;
      console.log(data);
      const result = await fishesCollection.insertOne(data);
      res.send(result);
    });
    //post product in animals collections
    app.post("/animals", verifyJWT, async (req, res) => {
      const data = req.body;
      console.log(data);
      const result = await animalsCollection.insertOne(data);
      res.send(result);
    });
    //post product in foods collections
    app.post("/foods", verifyJWT, async (req, res) => {
      const data = req.body;
      console.log(data);
      const result = await foodsCollection.insertOne(data);
      res.send(result);
    });
    //post product in medicines collections
    app.post("/medicines", verifyJWT, async (req, res) => {
      const data = req.body;
      console.log(data);
      const result = await medicinesCollection.insertOne(data);
      res.send(result);
    });
    //post product in tools collections
    app.post("/tools", verifyJWT, async (req, res) => {
      const data = req.body;
      console.log(data);
      const result = await toolsCollection.insertOne(data);
      res.send(result);
    });
    //get all products
    app.get('/all-products', async(req, res)=>{
              const { category, subCategory, sortDirection}=req.query;
             
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
               if (category !=='null' && category !== 'undefined' ) {
                filter.category = category;
              }
            
               if(subCategory){
                filter.subCategory=subCategory;
                }
               
console.log("filter" ,filter);
const results = [];
for (const collectionName of collections) {
  const products = await db
    .collection(collectionName)
    .find(filter)
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



console.log(results);
res.send(results);

    })
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
    app.delete("/delete-product/:id",verifyJWT, async (req, res) => {
      const id = req.params.id;
      console.log(id);
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
    app.patch("/update-product/:id",verifyJWT, async (req, res) => {
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
        updateProduct.$set.price = parseFloat(data.price).toFixed(2);
      }

      if (
        data.quantity !== undefined &&
        data.quantity !== null &&
        data.quantity !== ""
      ) {
        updateProduct.$set.available_quantity = parseFloat(data.quantity);
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
