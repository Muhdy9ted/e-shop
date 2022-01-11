const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const mongoConnect = require('./util/database-mongodb').mongoConnect;


const adminRoutes = require('./routes/admin-mongodb');
const shopRoutes = require('./routes/shop-mongodb');
const errorController = require('./controllers/error');
const User = require('./models/user-mongodb');

const app = express();

app.set('view engine', 'ejs'); //ejs template engine setup 1
app.set('views', 'views') //ejs template engine setup 2

app.use(bodyParser.urlencoded({extended: false})); //a parser for parsing our request body
app.use(express.static(path.join(__dirname, 'public'))) //serving static files like css and images

app.use((req, res, next) => { //triggers on incoming request
    User.findById('61cc8b3ba6f92b6b7f58dbd7').then(user => {
        req.user = new User(user.name, user.email, user.cart, user._id);
        next();
    }).catch(err => {
        console.log(err)
    });
});

app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(errorController.get404);


mongoConnect(() => {
    app.listen(3000)
})