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
            if(customersWithEmail[0].metadata.signinCode === body.code) {
                var updatedMetadata = customersWithEmail[0].metadata;
                var keys = Object.keys(body.metadata);
                for(var i = 0; i <  keys.length; i++) {
                    var key = keys[i];
                    if(key !== 'signinCode') {
                        updatedMetadata[key] = body.metadata[key];
                    }
                }
                console.log(updatedMetadata);
                return stripe.customers.update(customersWithEmail[0].id, {
                    metadata: updatedMetadata
                })
                .then(res => {
                    console.log(res);
                    callback(null, {statusCode: 200,headers});
                });
            } else {
                callback(null, {statusCode: 401,headers,body: JSON.stringify({code: 'WRONG_AUTH_CODE'})});
            }
        } else {
            callback(null, {statusCode: 404,headers,body: JSON.stringify({code: 'USER_NOT_FOUND'})});
        }
    });
}