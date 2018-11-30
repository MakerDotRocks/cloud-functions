exports.handler = async (event, context, callback) => {
    
    if (event.httpMethod === 'OPTIONS') { // The browser is checking the function to see the headers (called 'preflight' I think)
        callback(null, {statusCode: 204,headers});
    }
    if (event.httpMethod !== 'POST') {
        callback({statusCode: 405,headers}, null);
    }
    
    var body = JSON.parse(event.body);
    console.log(body);

    const globals = require('../globals.js')(body.testing === true); // GLOBAL VARIABLES
    const stripe = require('stripe')(process.env[`STRIPE_${body.testing === true ? 'TEST_' : ''}SECRET_KEY`]);
    const endpointSecret = process.env[`STRIPE_${body.testing === true ? 'TEST_' : ''}ENDPOINT_SECRET`];
    const rp = require('request-promise');
    
    var sig = event.headers["stripe-signature"];
    var webhookEvent;
    
    try {
        webhookEvent = stripe.webhooks.constructEvent(event.body, sig, endpointSecret);
        console.log('w',webhookEvent);
    }
    catch (err) {
        console.log(err);
        callback(null,{statusCode: 400, body: JSON.stringify(err)});
    }
    
    var textToSend = null;
    
    if(webhookEvent.type == 'customer.created') {
        textToSend =
`👤🤘 New user for maker.rocks!
             👉 https://maker<b>.</b>rocks/${webhookEvent.data.object.email.replace('@username.maker.rocks','')}`;
    }
    
    if(textToSend !== null || true) {
        return rp({
            method: 'POST',
            uri: `https://api.telegram.org/bot${process.env['TELEGRAM_BOT_TOKEN']}/sendMessage`,
            json: true,
            body: {
                chat_id: process.env['TELEGRAM_CHAT_ID'],
                text: JSON.stringify(webhookEvent, null, 2) + '\n\n ----------- \n\n' + textToSend,
                parse_mode: 'HTML'
            }
        })
    }
}