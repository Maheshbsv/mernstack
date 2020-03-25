const mongoose = require('mongoose');

const config = require('config');
const db = config.get('mongoURI');

console.log(db);

const connectDB = async () => {
    try {
        await mongoose.connect(db, {
            useNewUrlParser: true,
            useCreateIndex: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB Connected...');
    } catch(err) {
        console.error("Error in MongoDB connection: ",err.message);
        //Exit Process with failure
        process.exit(1);
    }
}

// connectDB();

module.exports = connectDB;
