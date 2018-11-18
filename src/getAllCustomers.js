module.exports = function(stripe) {
    return stripe.customers.list({limit: 100})
}