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
  if(!authorization){
    return res.status(401).send({message: 'Invalid authorization'})
  }

  const token = authorization?.split(' ')[1];
  jwt.verify(token, process.env.ASSESS_SECRET, (err, decode) => {
    if(err) {
      return res.status(403).send({message: 'Forbidden access'})
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
    usersCollection = database.collection("users");
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

//App routers for users
app.post("/api/set-token", async (req, res) => {
  try {
    const user = req.body;
    const token = jwt.sign(user, process.env.ASSESS_SECRET,{
      expiresIn: '24h'
    });
    res.send({token});
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch classes by instructor email' });
  }
});


//middleware for admin and instructor
const verifyAdmin = async (req, res, next) => {
  const email = req.decode.email;
  const query = {email: email};
  const user = await usersCollection.findOne(query);
  if(user.role == "admin"){
    next();
  }else{
    return res.status(401).send({message: 'Unauthorized access'})
  }
}

const verifyInstructor = async (req, res, next) => {
  const email = req.decode.email;
  const query = {email: email};
  const user = await usersCollection.findOne(query);
  if(user.role == "instructor"){
    next();
  }else{
    return res.status(401).send({message: 'Unauthorized access'})
  }
}


app.post('/new-user', async (req, res) => {
  try {
    const newUser = req.body;
    const result = await usersCollection.insertOne(newUser);
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch classes by instructor email' });
  }
});

app.get('/users', async (req, res) => {
  try {
    const result = await usersCollection.find({}).toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch classes by instructor email' });
  }
});


app.get('/users/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const query = {_id : new ObjectId(id) };
    const result = await usersCollection.findOne(query);
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch classes by instructor email' });
  }
});


app.get('/user/:email',verifyJWT, async (req, res) => {
  try {
    const email = req.params.email;
    const query = {email: email};
    const result = await usersCollection.findOne(query);
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch classes by instructor email' });
  }
});


app.get('/update-user/:id',verifyJWT,verifyAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const updatedUser = req.body;
    const filter = {_id: new ObjectId(id)};
    const options = {upsert: true};
    const updateDoc = {
      $set:{
        name : updatedUser.name,
        email : updatedUser.email,
        role : updatedUser.option,
        address : updatedUser.address,
        about : updatedUser.about,
        photoUrl : updatedUser.photoUrl,
        skills: updatedUser.skills ? updatedUser.skills : null,
      }
    }
    const result = await usersCollection.updateOne(filter, updateDoc, options);
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch classes by instructor email' });
  }
});

app.delete('/delete-user/:email',verifyJWT,verifyAdmin,verifyJWT, async (req, res) => {
  try {
    const id = req.params.id;
    const query = {_id: new ObjectId(id)};
    const result = await usersCollection.deleteOne(query);
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch classes by instructor email' });
  }
});

app.post("/new-class",verifyJWT,verifyInstructor, async (req, res) => {
  try {
    const newClass = req.body;
    const result = await classesCollection.insertOne(newClass);
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: 'Failed to insert new class' });
  }
});

app.get("/classes", async (req, res) => {
    try {
      const query = { status: 'approved' };
      const result = await classesCollection.find(query).toArray();
      res.send(result);
    } catch (error) {
      res.status(500).send({ error: 'Failed to fetch classes' });
    }
});

app.get("/classes/:email",verifyJWT,verifyInstructor, async (req, res) => {
    try {
      const email = req.params.email;
      const query = { instructorEmail: email };
      const result = await classesCollection.find(query).toArray();
      res.send(result);
    } catch (error) {
      res.status(500).send({ error: 'Failed to fetch classes by instructor email' });
    }
})

//manage classes
app.get("/classes-manage", async (req, res) => {
    try {
      const result = await classesCollection.find().toArray();
      res.send(result);
    } catch (error) {
      res.status(500).send({ error: 'Failed to fetch classes by instructor email' });
    }
});
  

//updata classes stust and reason
app.patch("/change-status/:id",verifyJWT,verifyAdmin, async (req, res) => {
    try {
      const id = req.params.id;
      const status = req.body.status;
      const reason = req.body.reason;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          status: status,
          reason: reason,
        },
      };
      const result = await classesCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    } catch (error) {
      res.status(500).send({ error: 'Failed to update class status' });
    }
});


//get approved classes
app.get("/approved-manage", async (req, res) => {
    try {
      const query = {status: "approved"};
      const result = await classesCollection.find(query).toArray();
      res.send(result);
    } catch (error) {
      res.status(500).send({ error: 'Failed to fetch classes by instructor email' });
    }
});


//get signle class details
app.get("/class/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await classesCollection.findOne(query);
      res.send(result);
    } catch (error) {
      res.status(500).send({ error: 'Failed to fetch classes by instructor email' });
    }
});

// update class details (all data)
app.put("/update-class/:id",verifyJWT,verifyInstructor, async (req, res) => {
    try {
      const id = req.params.id;
      const updateClass = req.body;
      const filter = {_id: new ObjectId(id)};
      const options ={upsert: true};
      const updateDoc = {
        $set:{
            name : updateClass.name,
            description : updateClass.description,
            price: updateClass.price,
            availableSeats: parseInt(updateClass.availableSeats),
            videoLink: updateClass.videoLink,
            status: 'pending',
        }
      };
      const result = await classesCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    } catch (error) {
      res.status(500).send({ error: 'Failed to fetch classes by instructor email' });
    }
});


// Cart routes 
app.post("/add-to-cart",verifyJWT, async (req, res) => {
  try {
    const newCartItem = req.body;
    const result = await cartCollection.insertOne(newCartItem);
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch classes by instructor email' });
  }
});

//get Cart item by id
app.get("/cart-item/:id",verifyJWT, async (req, res) => {
  try {
    const id = req.params.id;
    const email = req.body.email;
    const query = {
      classId: id,
      userMail: email
    };
    const projection = {classId: 1};
    const result = await cartCollection.findOne(query,{projection: projection});
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch classes by instructor email' });
  }
});


//get Cart bu user email
app.get("/cart/:email",verifyJWT, async (req, res) => {
  try {
    const email = req.params.email;
    const query = {userMail: email};
    const projection = {classId: 1};
    const carts = await cartCollection.find(query,{projection: projection});
    const classIds = carts.map((cart) => new ObjectId(cart.classId));
    const query2 = {_id:{$in: classIds}};
    const result = await cartCollection.find(query2).toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch classes by instructor email' });
  }
});


//delete cart item
app.delete("/delete-cart-item/:id",verifyJWT, async (req, res) => {
  try {
    const id = req.params.id;
    const query = {classId: id};
    const result = await cartCollection.deleteOne(query);
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch classes by instructor email' });
  }
});


//Enroll,ent Routes
app.get("/popular_classes", async (req, res) => {
  try {
    const result = await classesCollection.find().sort({totalEnrolled:-1}).limit(6).toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch classes by instructor email' });
  }
});


app.get('/popular_instructors', async (req, res) => {
  try {
    const pipeline = [
      {
        $group : {
          _id: "$instructorEmail",
          totalEnrolled:{$sum : "totalErolled"}
        }
      },{
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "email",
          as: "instructor"
        }
      },
      {
        $project:{
          _id: 0,
          instructor:{
            $arrayElemAt:["$instructor",0]
          },
          totalEnrolled: 1
        }        
      },
      {
        $sort:{
          totalEnrolled:-1
        }
      },
      {
        $limit: 6
      }
    ];
    const result = await classesCollection.aggregate(pipeline).toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch classes by instructor email' });
  }
});


//Admin status
app.get('/admin-stats',verifyJWT,verifyAdmin, async (req, res) => {
  try {
    const approvedCllases = ((await classesCollection.find({status: 'approved'})).toArray()).length;
    const pendingCllases = ((await classesCollection.find({status: 'pending'})).toArray()).length;
    const instructor = ((await classesCollection.find({role: 'instructor'})).toArray()).length;
    const totalCllases = ((await classesCollection.find()).toArray()).length;
    const totalEnrolled = ((await classesCollection.find()).toArray()).length;
    const result = {
      approvedCllases,
      pendingCllases,
      instructor,
      totalCllases,
      totalEnrolled
    }
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch classes by instructor email' });
  }
});


//get all instructor
app.get("/instructors", async (req, res) => {
  try {
    const result = await classesCollection.find({role: 'instructor'}).toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch classes by instructor email' });
  }
});


app.get("/enrolled-classes/:email",verifyJWT, async (req, res) => {
  try {
    const email = req.params.email;
    const query = {userMail: email};
    const pipeline = [
      {
        $match: query
      },
      {
        $lookup: {
          from : "classes",
          localField: "ClasssesId",
          foreignField: "_id",
          as: "classes"
        }
      }, {
        $unwind: "$classes"
      },
      {
        $lookup : {
          from : "users",
          localField: "classes.instructorEmail",
          foreignField: "email",
          as: "instructor"
        }
      }, {
        $project:{
          _id: 0,
          instructor:{
            $arrayElemAt: ["$instructor", 0]
          },
          classes:1
        }
      }
    ];
    const result = await enrolledCollection.aggregate(pipeline).toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch classes by instructor email' });
  }
});


//appliend for instructors
app.post("/ass-instructor", async (req, res) => {
  try {
    const data = req.body;
    const result = await appliedCollection.insertOne(data);
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch classes by instructor email' });
  }
});


app.get("/applied-instructors/:email", async (req, res) => {
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
