var mongoose = require('mongoose');
var connect = process.env.MONGODB_URI;
mongoose.connect(connect);


var contactSchema = new mongoose.Schema({
  name: String,
  phone: String,
  owner: String
});

var userSchema = new mongoose.Schema({
  username: String,
  password: String,
  phone: String,
  fId: String
});

var messageSchema = new mongoose.Schema({
  created: Date,
  content: String,
  user: String,
  contact: String,
  status: String,
  from: String,
  timeToSend: Date
});

module.exports = {
    Contact: mongoose.model('Contact', contactSchema),
    User: mongoose.model('User', userSchema),
    Message: mongoose.model('Message', messageSchema)
};
