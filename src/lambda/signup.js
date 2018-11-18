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
        
    return getAllCustomers(stripe)
    .then(res => {
        if (res.data.filter(customer => customer.email === body.email).length > 0) {
            callback(null, {statusCode: 401,headers,body: JSON.stringify({code: 'USER_WITH_EMAIL_EXISTS'})});
        } else if(res.data.filter(customer => customer.metadata.username === body.username).length > 0) {
            callback(null, {statusCode: 401,headers,body: JSON.stringify({code: 'USER_WITH_USERNAME_EXISTS'})});
        } else {
            return stripe.customers.create({
                email: body.email,
                metadata: {
                    username: body.username
                }
            })
            .then(res => {
                console.log(res);
                var signinLambda = require('./signin.js').handler;
                return signinLambda({httpMethod: 'POST', body: JSON.stringify({email: body.email, testing: body.testing})},{},callback);
            });
        }
    });
}