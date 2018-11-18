module.exports = function(stripe) {
    var resHandler = function(res) {
        if(!res.has_more) {
            return res;
        } else {
            return stripe.customers.list({limit: 100, starting_after: res.reverse()[0].id})
            .then(resHandler)
        }
    };
    return stripe.customers.list({limit: 100})
    .then(resHandler)
}