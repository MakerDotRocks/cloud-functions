module.exports = function(stripe) {
    var customers = [];
    var resHandler = function(res) {
        if(typeof res.data !== 'undefined') {
            for(var i = 0; i < res.data.length; i++) {
                customers.push(res.data[i]);
            }
        }
        if(!res.has_more) {
            return {data: customers};
        } else {
            return stripe.customers.list({limit: 100, starting_after: res.data.reverse()[0].id})
            .then(resHandler)
        }
    };
    return stripe.customers.list({limit: 100})
    .then(resHandler)
}