const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const jwt = require("jsonwebtoken")
const port = process.env.PORT || 5000;


app.use(cors());
app.use(express.json());


//verify token
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'Unauthorize access' })
  }

  const token = authorization?.split(' ')[1];
  jwt.verify(token, process.env.ASSESS_SECRET, (err, decode) => {
    if (err) {
      return res.status(403).send({ error: true, message: 'Forbidden user or token has expired' })
    }
    req.decode = decode;
    next();
  })
}

// MongoDB connection
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { parse } = require('dotenv');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@nckh-master.t8d3ta8.mongodb.net/?retryWrites=true&w=majority&appName=nckh-master`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server
    await client.connect();


    // Create a database and collections
    database = client.db("nckh-master");
    userCollection = database.collection("users");
    classesCollection = database.collection("classes");
    cartCollection = database.collection("cart");
    paymentCollection = database.collection("payments");
    enrolledCollection = database.collection("enrolled");
    appliedCollection = database.collection("applied");

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

  } catch (error) {
    console.error('MongoDB connection error:', error);
  }
}

run().catch(console.dir);


const verifyAdmin = async (req, res, next) => {
  const email = req.decoded.email;
  const query = { email: email };
  const user = await userCollection.findOne(query);
  if (user.role === 'admin') {
    next()
  }
  else {
    return res.status(401).send({ error: true, message: 'Unauthorize access' })
  }
}

const verifyInstructor = async (req, res, next) => {
  const email = req.decoded.email;
  const query = { email: email };
  const user = await userCollection.findOne(query);
  if (user.role === 'instructor' || user.role === 'admin') {
    next()
  }
  else {
    return res.status(401).send({ error: true, message: 'Unauthorize access' })
  }
}


app.post('/new-user', async (req, res) => {
  try {
    const newUser = req.body;
    const result = await userCollection.insertOne(newUser);
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch classes by instructor email' });
  }
});

//App routers for users
app.post("/api/set-token", async (req, res) => {
  try {
    const user = req.body;
    const token = jwt.sign(user, process.env.ACCESS_SECRET, { expiresIn: '24h' })
    res.send({ token })
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch classes by instructor email' });
  }
});

//Get all user
app.get('/users', async (req, res) => {
  try {
    const users = await userCollection.find({}).toArray();
    res.send(users);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch classes by instructor email' });
  }
});


//Get user by id
app.get('/users/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const user = await userCollection.findOne(query);
    res.send(user);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch classes by instructor email' });
  }
});


//Get user by email
app.get('/user/:email', verifyJWT, async (req, res) => {
  try {
    const email = req.params.email;
    const query = { email: email };
    const result = await userCollection.findOne(query);
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch classes by instructor email' });
  }
});


//Delete a user
app.delete('/delete-user/:id', verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await userCollection.deleteOne(query);
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch classes by instructor email' });
  }
});


//UPDATE USER
app.put('/update-user/:id', verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const updatedUser = req.body;
    const filter = { _id: new ObjectId(id) };
    const options = { upsert: true };
    const updateDoc = {
      $set: {
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.option,
        address: updatedUser.address,
        phone: updatedUser.phone,
        about: updatedUser.about,
        photoUrl: updatedUser.photoUrl,
        skills: updatedUser.skills ? updatedUser.skills : null,
      }
    }
    const result = await userCollection.updateOne(filter, updateDoc, options);
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch classes by instructor email' });
  }
});



// ! CLASSES ROUTES
app.post('/new-class', verifyJWT, verifyInstructor, async (req, res) => {
  try {
    const newClass = req.body;
    newClass.availableSeats = parseInt(newClass.availableSeats)
    const result = await classesCollection.insertOne(newClass);
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: 'Failed to insert new class' });
  }
});



// GET ALL CLASSES ADDED BY INSTRUCTOR
app.get('/classes/:email', verifyJWT, verifyInstructor, async (req, res) => {
  try {
    const email = req.params.email;
    const query = { instructorEmail: email };
    const result = await classesCollection.find(query).toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch classes by instructor email' });
  }
})




// GET ALL CLASSES
app.get('/classes', async (req, res) => {
  try {
    const query = { status: 'approved' };
    const result = await classesCollection.find(query).toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch classes' });
  }
});


app.get('/classes-manage', async (req, res) => {
  try {
    const result = await classesCollection.find().toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch classes by instructor email' });
  }
});


// Change status of a class
app.put('/change-status/:id', verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const status = req.body.status;
    console.log(req.body)
    const reason = req.body.reason;
    const filter = { _id: new ObjectId(id) };
    console.log("🚀 ~ file: index.js:180 ~ app.put ~ reason:", reason)
    const options = { upsert: true };
    const updateDoc = {
      $set: {
        status: status,
        reason: reason
      }
    }
    const result = await classesCollection.updateOne(filter, updateDoc, options);
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: 'Failed to update class status' });
  }
});






// Update a class

// update class details (all data)
app.put('/update-class/:id', verifyJWT, verifyInstructor, async (req, res) => {
  try {
    const id = req.params.id;
    const updatedClass = req.body;
    const filter = { _id: new ObjectId(id) };
    const options = { upsert: true };
    const updateDoc = {
      $set: {
        name: updatedClass.name,
        description: updatedClass.description,
        price: updatedClass.price,
        availableSeats: parseInt(updatedClass.availableSeats),
        videoLink: updatedClass.videoLink,
        status: 'pending'
      }
    }
    const result = await classesCollection.updateOne(filter, updateDoc, options);
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch classes by instructor email' });
  }
});


// Get single class by id for details page
app.get('/class/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await classesCollection.findOne(query);
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch classes by instructor email' });
  }
});


// ! CART ROUTES
// ADD TO CART
app.post('/add-to-cart', verifyJWT, async (req, res) => {
  try {
    const newCartItem = req.body;
    const result = await cartCollection.insertOne(newCartItem);
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch classes by instructor email' });
  }
});



// Get cart item id for checking if a class is already in cart
app.get('/cart-item/:id', verifyJWT, async (req, res) => {
  try {
    const id = req.params.id;
    const email = req.query.email;
    const query = { classId: id, userMail: email };
    const projection = { classId: 1 };
    const result = await cartCollection.findOne(query, { projection: projection });
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch classes by instructor email' });
  }
});


app.get('/cart/:email', verifyJWT, async (req, res) => {
  try {
    const email = req.params.email;
    const query = { userMail: email };
    const projection = { classId: 1 };
    const carts = await cartCollection.find(query, { projection: projection }).toArray();
    const classIds = carts.map(cart => new ObjectId(cart.classId));
    const query2 = { _id: { $in: classIds } };
    const result = await classesCollection.find(query2).toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch classes by instructor email' });
  }
});



// Delete a item form cart
app.delete('/delete-cart-item/:id', verifyJWT, async (req, res) => {
  try {
    const id = req.params.id;
    const query = { classId: id };
    const result = await cartCollection.deleteOne(query);
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch classes by instructor email' });
  }
});



// ! ENROLLED ROUTES
app.get('/popular_classes', async (req, res) => {
  try {
    const result = await classesCollection.find().sort({ totalEnrolled: -1 }).limit(6).toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch classes by instructor email' });
  }
});


app.get('/popular-instructors', async (req, res) => {
  try {
    const pipeline = [
      {
        $group: {
          _id: "$instructorEmail",
          totalEnrolled: { $sum: "$totalEnrolled" },
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "email",
          as: "instructor"
        }
      },
      {
        $match: {
          "instructor.role": "instructor"
        }
      },
      {
        $project: {
          _id: 0,
          instructor: {
            $arrayElemAt: ["$instructor", 0]
          },
          totalEnrolled: 1
        }
      },
      {
        $sort: {
          totalEnrolled: -1
        }
      },
      {
        $limit: 6
      }
    ]
    const result = await classesCollection.aggregate(pipeline).toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch classes by instructor email' });
  }
});


// Admins stats 
app.get('/admin-stats', verifyJWT, verifyAdmin, async (req, res) => {
  try {
    // Get approved classes and pending classes and instructors 
    const approvedClasses = (await classesCollection.find({ status: 'approved' }).toArray()).length;
    const pendingClasses = (await classesCollection.find({ status: 'pending' }).toArray()).length;
    const instructors = (await userCollection.find({ role: 'instructor' }).toArray()).length;
    const totalClasses = (await classesCollection.find().toArray()).length;
    const totalEnrolled = (await enrolledCollection.find().toArray()).length;
    // const totalRevenue = await paymentCollection.find().toArray();
    // const totalRevenueAmount = totalRevenue.reduce((total, current) => total + parseInt(current.price), 0);
    const result = {
      approvedClasses,
      pendingClasses,
      instructors,
      totalClasses,
      totalEnrolled,
      // totalRevenueAmount
    }
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch classes by instructor email' });
  }
});


// !GET ALL INSTrUCTOR  
app.get('/instructors', async (req, res) => {
  try {
    const result = await userCollection.find({ role: 'instructor' }).toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch classes by instructor email' });
  }
});


app.get('/enrolled-classes/:email', verifyJWT, async (req, res) => {
  try {
    const email = req.params.email;
    const query = { userEmail: email };
    const pipeline = [
      {
        $match: query
      },
      {
        $lookup: {
          from: "classes",
          localField: "classesId",
          foreignField: "_id",
          as: "classes"
        }
      },
      {
        $unwind: "$classes"
      },
      {
        $lookup: {
          from: "users",
          localField: "classes.instructorEmail",
          foreignField: "email",
          as: "instructor"
        }
      },
      {
        $project: {
          _id: 0,
          classes: 1,
          instructor: {
            $arrayElemAt: ["$instructor", 0]
          }
        }
      }

    ]
    const result = await enrolledCollection.aggregate(pipeline).toArray();
    // const result = await enrolledCollection.find(query).toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch classes by instructor email' });
  }
});



// Applied route 
app.post('/as-instructor', async (req, res) => {
  try {
    const data = req.body;
    const result = await appliedCollection.insertOne(data);
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch classes by instructor email' });
  }
});


app.get('/applied-instructors/:email',   async (req, res) => {
  try {
    const email = req.params.email;
    const result = await appliedCollection.findOne({email});
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch classes by instructor email' });
  }
});

app.get('/', (req, res) => {
  res.send('Le Hai Nam DHCNTT20A');
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
