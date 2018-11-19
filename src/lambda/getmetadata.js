const headers = {
    'Access-Control-Allow-Origin' : '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
};

exports.handler = async (event, context, callback) => {
    
    if (event.httpMethod === 'OPTIONS') { // The browser is checking the function to see the headers (called 'preflight' I think)
        callback(null, {statusCode: 204,headers});
    }
    if (event.httpMethod !== 'POST') {
        callback({statusCode: 405,headers}, null);
    }
    
    var body = JSON.parse(event.body);
    
    const globals = require('../globals.js')(body.testing === true); // GLOBAL VARIABLES    
    const stripe = require('stripe')(process.env[`STRIPE_${body.testing === true ? 'TEST_' : ''}SECRET_KEY`]);
    
    return stripe.customers.list({email: body.username + '@username.maker.rocks'})
    .then(res => {
        var customersWithUsername = res.data;
        if(customersWithUsername.length > 0) {
            if(customersWithUsername[0].metadata.signinCode === body.code) {
                var metadata = customersWithUsername[0].metadata;
                delete metadata.signinCode;
                delete metadata.email;
                callback(null, {statusCode: 200,headers,body: JSON.stringify(metadata)});
            } else {
                callback(null, {statusCode: 401,headers,body: JSON.stringify({code: 'WRONG_AUTH_CODE'})});
            }
        } else {
            callback(null, {statusCode: 404,headers,body: JSON.stringify({code: 'USER_NOT_FOUND'})});
        }
    });
}