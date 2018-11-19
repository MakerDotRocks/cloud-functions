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
        if(res.data.length > 0) {
            callback(null, {statusCode: 401,headers,body: JSON.stringify({code: 'USER_WITH_USERNAME_EXISTS'})});
        } else {
            return stripe.customers.create({
                email: body.username + '@username.maker.rocks',
                metadata: {
                    email: body.email
                }
            })
            .then(res => {
                console.log(res);
                var signinLambda = require('./signin.js').handler;
                return signinLambda({httpMethod: 'POST', body: JSON.stringify({username: body.username, testing: body.testing})},{},callback);
            });
        }
    });
}