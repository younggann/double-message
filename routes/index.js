var express = require('express');
var router = express.Router();
var models = require('../models/models')
var contact = models.Contact;
var message = models.Message;
// var twilio = require('../twilio');

var twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

/* GET home page. */
router.get('/', function(req, res, next) {
	res.redirect('/contacts');
});

router.post('/messages/receive', function(req, res, next){
	contact.findOne({phone: req.body.From.substring(2)}, function(err, contact){
		if(err) res.status(500).send("Contact not found");
		var newMessage = new message({
			contact: contact._id,
			created: new Date(),
			content: req.body.Body,
			user: contact.owner,
			status: "recieved",
			from: req.body.From.substring(2)
		});
		newMessage.save(function(err, success){
			if(err) res.status(400).send(err);
			res.send(success);
		});
	})
});

router.get('/contacts', function(req, res, next){
	contact.find({owner: req.user._id}, function(err, contacts){
		if(err) res.status(500).render('error', { error: err });
		res.render('contacts', {
			contacts: contacts
		});
	})
});

router.get('/contacts/new', function(req, res, next){
	res.render('editContact');
});

router.post('/contacts/new', function(req, res, next){
	var newContact = new contact ({
		name: req.body.name,
		phone: req.body.phone,
		owner: req.user._id
	});
	newContact.save(function(err, success){
		if(err) res.status(400).send(err);
		res.redirect('/contacts');
	});
});

router.post('/contacts/:id', function(req, res, next){
	contact.findByIdAndUpdate(req.params.id, {
		name: req.body.name,
		phone: req.body.phone
	}, function (err){
		if(err) res.status(400).send(err);
		res.redirect('/contacts');
	})
});

router.get('/contacts/:id', function(req, res, next){
	var id = req.params.id;
	contact.findById(id, function(err, contact){
		if(err) res.status(400).render('error', { error: err });
		res.render('editContact',{
			contact: contact
		});
	})
});

router.get('/messages', function(req, res, next){
	message.find(function(err, messages){
		if(!messages) {
			res.status(404).send("Not Found!");
		}
		else if(err) {
			res.status(400).render('error', {
				error: err
			});
		}
		else {
			contact.find(function(err, contact){
				if(!messages) {
					res.status(404).send("Not Found!");
				}
				else if(err) {
					res.status(400).render('error', {
						error: err
					});
				}
				else {
					message.find({
						status: "scheduled"
					}, function(err, schedMsg){
						if (schedMsg) {
							var message = messages.map(function(msg) {
								var d = new Date(msg.created);
								msg.sentTo = contact.name;
								msg.createdAt = d.toLocaleString();
								msg.sentByYou = (msg.from === "+13239420315");
								return msg;
							})

							res.render('messages',{
								name: "Everyone",
								contact: contact,
								messages: message,
								scheduled: schedMsg
							});

						}
						else if (err){
							res.status(400).render('error', {
								error: err
							});
						}
						else if (!schedMsg) {
							var message = messages.map(function(msg) {
								var d = new Date(msg.created);
								msg.sentTo = contact.name;
								msg.createdAt = d.toLocaleString();
								msg.sentByYou = (msg.from === "+13239420315");
								return msg;
							})
							res.render('messages',{
								name: "Everyone",
								contact: contact,
								messages: message,
							});
						}
					})
				}
			})
		}
	})
})


router.get('/messages/sendScheduled', function(req,res,next){
	message.find({
		status: "scheduled"
	}, function(err, messages){
		if(!messages) {
			res.status(404).send("Not Found!");
		}
		else if(err) {
			res.status(400).render('error', {
				error: err
			});
		}
		else {
			var pastMessages = messages.map(function(msg){
				if (Math.floor(new Date()-msg.timeToSend)<=0) {
					twilio.sendMessage({

					    to: '+1'+msg.contact, // Any number Twilio can deliver to
					    from: '+13239420315', // A number you bought from Twilio and can use for outbound communication
					    body: msg.content // body of the SMS message

					}, function(err, responseData) { //this function is executed when a response is received from Twilio
					    if (!err) { // "err" is an error received during the request, if any
					    	var id = msg._id;
					    	message.findByIdAndUpdate(id, {$set:{status: "sent"}},
					    		function(err, succ){
					    			if (err){
					    				res.status(500).send("ERROR");
					    			}
					    			else{
					    				res.send("SUCCESS!");
					    			}
					    		})
						}
						else {
							res.status(500).send("Error sending");
						}
					});
				}
			})

		}
	})
});

router.get('/messages/:id', function(req, res, next){
	message.find({ contact: req.params.id }, function(err, messages){
		if(!messages) {
			res.status(404).send("Not Found!");
		} else if(err) {
			res.status(400).render('error', {
				error: err
			});
		} else {
			contact.findById(req.params.id, function(err, contact){
				if(!contact) {
					res.status(404).send("Not Found!");
				} else if(err) {
					res.status(400).render('error', {
						error: err
					});
				} else {

					message.find({
						status: "scheduled"
					}, function(err, schedMsg){
						if(schedMsg){
							var lol = messages.map(function(msg) {
								var d = new Date(msg.created);
								msg.sentTo = contact.name;
								msg.createdAt = d.toLocaleString();
								msg.sentByYou = (msg.from === "+13239420315");
								return msg;
							})
							res.render('messages',{
								name: contact.name,
								contact: contact,
								messages: lol,
								scheduled: schedMsg
							});
						}	else if(err){
							res.status(400).render('error', {
								error: err
							});
						}	else if (!schedMsg){
							var lol = messages.map(function(msg) {
								var d = new Date(msg.created);
								msg.sentTo = contact.name;
								msg.createdAt = d.toLocaleString();
								msg.sentByYou = (msg.from === "+13239420315");
								return msg;
							})
							res.render('messages',{
								name: contact.name,
								contact: contact,
								messages: lol,
							});
						}
					})
				}
			})
		}
	})
})

router.post('/messages/:id', function(req, res, next){
	var contactId = req.params.id;
	var created = new Date();
	var content = req.body.message;
	var user = req.user._id;

	contact.findById(contactId, function(err, contact){
		if(!contact) {
			res.status(404).send("Not Found!");
		} else if(err) {
			res.status(400).render('error', {
				error: err
			});
		} else {
			var number = contact.phone;
			console.log("TESTING" + content);
			if (!req.body.date) {
				twilio.sendMessage({

					    to: '+1'+number, // Any number Twilio can deliver to
					    from: '+13239420315', // A number you bought from Twilio and can use for outbound communication
					    body: content // body of the SMS message

					}, function(err, responseData) { //this function is executed when a response is received from Twilio
					    if (!err) { // "err" is an error received during the request, if any

					        // "responseData" is a JavaScript object containing data received from Twilio.
					        // A sample response from sending an SMS message is here (click "JSON" to see how the data appears in JavaScript):
					        // http://www.twilio.com/docs/api/rest/sending-sms#example-1

					        console.log(responseData.from); // outputs "+14506667788"
					        console.log(responseData.body); // outputs "word to your mother."

					        var newMessage = new message({
					        	created: created,
					        	content: content,
					        	user: user,
					        	contact: contact._id,
					        	status: "sent",
					        	from: '+13239420315',
					        	timetoSend: new Date()
					        })

					        newMessage.save(function(err, success){
					        	if(err){
					        		res.status(400).send(err);
					        	} else {
					        		res.redirect('/messages/'+req.params.id);
					        	}
					        });
					    } else {
					    	console.log(err);
					    	res.send("Unable to send message, please check input fields");
					    }
					});
			} else {

				 var newMessage = new message({

		        	created: created,
		        	content: content,
		        	user: user,
		        	contact: contact._id,
		        	status: "scheduled",
		        	from: '+13239420315',
		        	timetoSend: req.body.date

		        });

		        newMessage.save(function(err, success){
		        	if(err){
		        		res.status(400).send(err);
		        	} else {
		        		res.redirect('/messages/'+req.params.id);
		        	}
		        });
			}
		}
	})
});


router.get('/newMessage/:id', function(req, res, next){
	var id = req.params.id;
	contact.findById(id, function(err, contact){
		if(!contact) {
			res.status(404).send("Not Found!");
		} else if(err) {
			res.status(400).render('error', {
				error: err
			});
		} else {
			res.render('newMessage', {
				contact: contact
			});
		}
	})
});


router.post('/newMessage/:id', function(req, res, next){
	var contactId = req.params.id;
	var created = new Date();
	var content = req.body.message;
	var user = req.user._id;

	contact.findById(contactId, function(err, contact){
		if(!contact) {
			res.status(404).send("Not Found!");
		} else if(err) {
			res.status(400).render('error', {
				error: err
			});
		} else {
			var number = contact.phone;
			console.log("TESTING" + content);
			if (!req.body.date) {
				twilio.sendMessage({

					    to: '+1'+number, // Any number Twilio can deliver to
					    from: '+13239420315', // A number you bought from Twilio and can use for outbound communication
					    body: content // body of the SMS message

					}, function(err, responseData) { //this function is executed when a response is received from Twilio
					    if (!err) { // "err" is an error received during the request, if any

					        // "responseData" is a JavaScript object containing data received from Twilio.
					        // A sample response from sending an SMS message is here (click "JSON" to see how the data appears in JavaScript):
					        // http://www.twilio.com/docs/api/rest/sending-sms#example-1

					        console.log(responseData.from); // outputs "+14506667788"
					        console.log(responseData.body); // outputs "word to your mother."

					        var newMessage = new message({
					        	created: created,
					        	content: content,
					        	user: user,
					        	contact: contact._id,
					        	status: "sent",
					        	from: '+13239420315',
					        	timetoSend: new Date()
					        })

					        newMessage.save(function(err, success){
					        	if(err){
					        		res.status(400).send(err);
					        	} else {
					        		res.redirect('/messages/'+req.params.id);
					        	}
					        });
					    }
					    else {
					    	console.log(err);
					    	res.send("Unable to send message, please check input fields");
					    }
					});
			} else {

				 var newMessage = new message({

		        	created: created,
		        	content: content,
		        	user: user,
		        	contact: contact._id,
		        	status: "scheduled",
		        	from: '+13239420315',
		        	timetoSend: req.body.date

		        });

		        newMessage.save(function(err, success){
		        	if(err){
		        		res.status(400).send(err);
		        	} else {
		        		res.redirect('/messages/'+req.params.id);
		        	}
		        });
			}
		}
	})
});

module.exports = router;
