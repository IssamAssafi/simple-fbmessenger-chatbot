// Load Node Packages
require('dotenv').config()
express = require('express');
crypto = require('crypto');
body_parser = require('body-parser');
request = require('request');
app = express();
port = process.env.PORT || 5000

// Setup Config
FB_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN,
FB_VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN,
FB_APP_SECRET = process.env.FB_APP_SECRET


// Handle JSON
app.use(body_parser.json());

// Check Facebook Signature
app.use(body_parser.json({
    verify: check_fb_signature
}));

function check_fb_signature(req, res, buf) {
    console.log('Check facebook signature step.')
    let fb_signature = req.headers["x-hub-signature"];
    if (!fb_signature) {
        throw new Error('Signature ver failed.');
    } else {
        let sign_splits = signature.split('=');
        let method = sign_splits[0];
        let sign_hash = sign_splits[1];

        let real_hash = crypto.createHmac('sha1', FB_APP_SECRET)
            .update(buf)
            .digest('hex');

        if (sign_hash != real_hash) {
            throw new Error('Signature ver failed.');
        }
    }
}


// Verify Webhook URL
app.get('/webhook/', function (req, res) {
    console.log('Webhook verification step.')
    if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === FB_VERIFY_TOKEN) {
        res.status(200).send(req.query['hub.challenge']);
    } else {
        console.error("Authentication Failed!.");
        res.sendStatus(403);
    }
})


// Listen Requests
app.listen(port, function () {
    console.log('webhook is running on port', port)
})

// Handle Post Request to receive messages.
app.post('/webhook/', function (req, res) {
    console.log('Webhook messaging step.')
    let chat_data = req.body;
    // Make sure this is a page subscription
    if (chat_data.object == 'page') {
        // Iterate over each entry
        chat_data.entry.forEach(function (page_body) {
            // Iterate over each message
            page_body.messaging.forEach(function (message_obj) {
                console.log(message_obj)

                //Bot logic
                if (message_obj.message) {
                    getMessage(message_obj);
                    message_text = message_obj.message.text
                    //the user sends an image
                    if(hasImage(message_obj)){
                        sendMessage(message_obj.sender.id,"Je ne sais pas traiter ce type de demande")
                    }
                    //The user sends = "Comment vas-tu ?"
                    else if (message_text==='Comment vas-tu ?'){
                        quick_replies = ["Je vais bien,merci","Non, ça ne va pas"]
                        sendMessage(message_obj.sender.id,"Très bien et vous ?",quick_replies)
                    }
                    else
                        sendMessage(message_obj.sender.id,message_text)
                }
            });
        });

        // Indicate all went well.
        res.sendStatus(200);
    }
});

//Check if received message has an image/attachements
function hasImage(message_obj){
    return message_obj.message.hasOwnProperty('attachments')
}

// Get Message
function getMessage(message_obj) {
    let message = message_obj.message.text;
    console.log(message)
}

// Send Message
function sendMessage(recipient_id, message, quick_replies=[]) {
    let messageData = {
        recipient: {
            id: recipient_id
        },
        message: {
            text: message
        }
    }
    if(quick_replies.length){
        messageData.message.quick_replies = []
        quick_replies.forEach(reply=>{
            messageData.message.quick_replies.push(
            {
                "content_type":"text",
                "title":reply,
                "payload":"callback"
            })
        })
    }

    console.log(messageData)
    request({
        uri: 'https://graph.facebook.com/v3.2/me/messages',
        qs: {
            access_token: FB_ACCESS_TOKEN
        },
        method: 'POST',
        json: messageData

    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            console.log("Messeage sent successsfully.");
        } else {
            console.log("Message failed - " + response.statusMessage);
        }
    });
}
