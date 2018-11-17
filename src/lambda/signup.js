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
        
    return stripe.customers.list({email: body.email})
    .then(res => {
        var customersWithEmail = res.data;
        if(customersWithEmail.length > 0) {
            callback(null, {statusCode: 401,headers,body: JSON.stringify({code: 'USER_EXISTS'})});
        } else {
            return stripe.customers.create({
                email: body.email
            })
            .then(res => {
                console.log(res);
                var signinLambda = require('./signin.js').handler;
                signinLambda({httpMethod: 'POST', body: JSON.stringify({email: body.email, testing: body.testing})},{},callback);
            });
        }
    });
}