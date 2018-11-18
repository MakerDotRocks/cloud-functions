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
    const rp = require('request-promise');
    const humanizeDuration = require('humanize-duration');
    const moment = require('moment');
    const getAllCustomers = require('../getAllCustomers.js');
    
    return getAllCustomers(stripe)
    .then(res => {
        var customersWithUsername = res.data.filter(customer => customer.metadata.username === body.username);
        if(customersWithUsername.length > 0) {
            var metadata = customersWithUsername[0].metadata;
            var pageInfo = {};
            var promiseChains = [];
            if(typeof metadata.productHuntUsername == 'string' && metadata.productHuntUsername.length > 0) {
                pageInfo.productHuntUsername = metadata.productHuntUsername;
                var productHuntToken = '';
                var productHuntID = 0;
                promiseChains.push(rp({
                    method: 'POST',
                    uri: `https://api.producthunt.com/v1/oauth/token`,
                    json: true,
                    body: {
                        client_id: process.env['PRODUCT_HUNT_KEY'],
                        client_secret: process.env['PRODUCT_HUNT_SECRET'],
                        grant_type: 'client_credentials'
                    }
                })
                .then(res => {productHuntToken = res.access_token})
                .then(() => rp({
                    method: 'GET',
                    uri: `https://api.producthunt.com/v1/users/${metadata.productHuntUsername}?exclude[]=relationships`,
                    json: true,
                    headers: {
                        Authorization: `Bearer ${productHuntToken}`
                    }
                }))
                .then(res => {
                    var profile = res.user;
                    productHuntID = profile.id;
                    pageInfo.productHuntName = profile.name;
                    pageInfo.productHuntPostCount = profile.maker_of_count;
                    pageInfo.productHuntImageURL = profile.image_url.original;
                    pageInfo.productHuntHeaderImage = profile.header_image_url;
                    pageInfo.productHuntFollowers= profile.followers_count;
                })
                .then(() => rp({
                    method: 'GET',
                    uri: `https://api.producthunt.com/v1/users/${productHuntID}/products`,
                    json: true,
                    headers: {
                        Authorization: `Bearer ${productHuntToken}`
                    }
                }))
                .then(res => {
                    var products = res.posts;
                    pageInfo.productHuntTotalVotes = products.length > 0 ? products.map(p => p.votes_count).reduce((total,num) => total + num) : 0;
                    pageInfo.productHuntAverageVotes = Math.round(pageInfo.productHuntTotalVotes/products.length);
                    pageInfo.productHuntProducts = products.map(product => ({
                        name: product.name,
                        tagline: product.tagline,
                        votes: product.votes_count,
                        createdEpoch: product.created_at,
                        thumbnailURL: product.thumbnail.image_url.replace(/\?.+/,''),
                        screenshotURL: product.screenshot_url['850px'],
                        websiteURL: product.redirect_url
                    }));
                    var productDates = products.map(p => new Date(p.created_at).getTime()).sort((a,b) => b-a);
                    var shortestDuration = Infinity;
                    var longestDuration = 0;
                    var allDurations = [];
                    
                    for(var i = 0; i < productDates.length - 1; i++) {
                        allDurations.push(productDates[i]-productDates[i+1]);
                        
                        if(productDates[i]-productDates[i+1] < shortestDuration) {
                            shortestDuration = productDates[i]-productDates[i+1];
                        }
                        if(productDates[i]-productDates[i+1] > longestDuration) {
                            longestDuration = productDates[i]-productDates[i+1];
                        }
                    }
                    
                    var averageDuration = allDurations.length > 0 ? allDurations.reduce((total,num)=>total+num)/allDurations.length : 0;
                    
                    var humanizedDurationOptions = {
                        conjunction: ' and ',
                        serialComma: false,
                        units: ['y', 'mo', 'd'],
                        round: true
                    };
                    
                    pageInfo.productHuntShortestDuration = humanizeDuration(shortestDuration, humanizedDurationOptions);
                    pageInfo.productHuntLongestDuration = humanizeDuration(longestDuration, humanizedDurationOptions);
                    pageInfo.productHuntAverageDuration = humanizeDuration(averageDuration, humanizedDurationOptions);
                }));
            }
            if(typeof metadata.twitterUsername == 'string' && metadata.twitterUsername.length > 0) {
                pageInfo.twitterUsername = metadata.twitterUsername;
                promiseChains.push(rp({
                    uri: `https://cdn.syndication.twimg.com/widgets/followbutton/info.json?screen_names=${metadata.twitterUsername}`,
                    json: true
                })
                .then(res => {
                    var twitterUser = res[0];
                    pageInfo.twitterName = twitterUser.name;
                    pageInfo.twitterFollowers = twitterUser.followers_count;
                    pageInfo.twitterFollowersFormatted = twitterUser.formatted_followers_count.replace(' followers','');
                }));
            }
            if(typeof metadata.wipUsername == 'string' && metadata.wipUsername.length > 0){
                pageInfo.wipUsername = metadata.wipUsername;
                promiseChains.push(rp({
                    method: 'POST',
                    uri: 'https://wip.chat/graphql',
                    json: true,
                    body: {
                        query: `
                             {
                               user(username: "${metadata.wipUsername}") {
                                    first_name
                                    last_name
                                    streak
                                    todos(completed: true) {
                                        body
                                        completed_at
                                    }
                               }
                             }
                        `
                    }
                })
                .then(res => {
                    var user = res.data.user;
                    pageInfo.wipName = `${user.first_name} ${user.last_name}`;
                    pageInfo.wipStreak = user.streak;
                    pageInfo.wipTasks = user.todos.map(task => ({
                        message: task.body,
                        timeAgo: moment(task.completed_at).from(Date.now())
                    }))
                }))
            }
            if(typeof metadata.makerlogUsername == 'string' && metadata.makerlogUsername.length > 0){
                pageInfo.makerlogUsername = metadata.makerlogUsername;
                var makerlogID = 0;
                promiseChains.push(rp({
                    method: 'GET',
                    uri: `https://api.getmakerlog.com/users/username/${metadata.makerlogUsername}/`,
                    json: true
                })
                .then(res => {
                    makerlogID = res.id;
                    pageInfo.makerlogName = `${res.first_name} ${res.last_name}`;
                    pageInfo.makerlogImage = res.avatar;
                    pageInfo.makerlogStatus = res.status;
                    pageInfo.makerlogDescription = res.description;
                    pageInfo.makerlogStreak = res.streak;
                    pageInfo.makerlogActivityDataPoints = res.activity_trend;
                })
                .then(() => rp({
                    method: 'GET',
                    uri: `https://api.getmakerlog.com/users/${makerlogID}/recent_tasks`,
                    json: true
                }))
                .then(res => {
                    pageInfo.makerlogTasks = res.filter(task => task.done).map(task => ({
                        message: task.content,
                        timeAgo: moment(task.done_at).from(Date.now())
                    }));
                }));
            }
            if(typeof metadata.twitchUsername == 'string' && metadata.twitchUsername.length > 0){
                pageInfo.twitchUsername = metadata.twitchUsername;
            }
            if(typeof metadata.personalWebsite == 'string' && metadata.personalWebsite.length > 0){
                pageInfo.personalWebsite = metadata.personalWebsite;
            }
            
            return Promise.all(promiseChains)
            .then(() => callback(null, {statusCode: 200,headers,body: JSON.stringify(pageInfo)}))
        } else {
            callback(null, {statusCode: 404,headers,body: JSON.stringify({code: 'USER_NOT_FOUND'})});
        }
    });
}