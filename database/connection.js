require('dotenv').config();
const mongoose = require('mongoose');

const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  throw new Error('MONGODB_URI must be set in your environment variables.');
}

mongoose.set('strictQuery', false);
mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB Atlas.');
}).catch((err) => {
  console.error('MongoDB connection error:', err.message);
});

module.exports = mongoose;
