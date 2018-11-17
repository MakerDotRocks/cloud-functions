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
            // Technique from https://stackoverflow.com/questions/9719570/generate-random-password-string-with-requirements-in-javascript/9719815#comment57492631_9719815
            var signinCode = Math.random().toString(36).substr(2, 8);
            console.log(signinCode);
            var updatedMetadata = customersWithEmail[0].metadata;
            updatedMetadata.signinCode = signinCode;
            
            return stripe.customers.update(customersWithEmail[0].id, {
                metadata: updatedMetadata
            })
            .then(res => {
                console.log(res);
                callback(null, {statusCode: 204,headers});
            });
        } else {
            callback(null, {statusCode: 404,headers,body: JSON.stringify({code: 'USER_NOT_FOUND'})});
        }
    });
}