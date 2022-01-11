const express = require('express');
const bodyParser = require('body-parser');
const path = require('path')
// const expressHbs = require('express-handlebars'); //handlebars template engine setup 1

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const errorController = require('./controllers/error');
const sequelize = require('./util/database');
const Product = require('./models/product');
const User = require('./models/user');
const Cart = require('./models/cart');
const CartItem = require('./models/cart-item');
const Order = require('./models/order');
const OrderItem = require('./models/order-item');

const app = express();

// app.set('view engine', 'pug'); //pug template engine setup 1
// app.set('views', 'views') //pug template engine setup 2

// app.engine('hbs', expressHbs.engine({layoutsDir: 'views/layouts', extname: '.hbs', defaultLayout: "main-layout"})); //handlebars template engine setup 2
// app.set('view engine', 'hbs'); //handlerbars template engine setup 3
// app.set('views', 'views') //handlebars template engine setup 4

app.set('view engine', 'ejs'); //ejs template engine setup 1
app.set('views', 'views') //ejs template engine setup 2

app.use(bodyParser.urlencoded({extended: false})); //a parser for parsing our request body
app.use(express.static(path.join(__dirname, 'public'))) //serving static files like css and images

app.use((req, res, next) => { //triggers on incoming request
    User.findById(1).then(user => {
        req.user = user;
        next();
    }).catch(err => {
        console.log(err)
    });
})


app.use('/admin', adminRoutes);
app.use(shopRoutes);

app.use(errorController.get404);


Product.belongsTo(User, {constraints: true, onDelete: 'CASCADE'});
User.hasMany(Product);

Cart.belongsTo(User, {constraints: true, onDelete: 'CASCADE'});
User.hasOne(Cart);

Cart.belongsToMany(Product, {through: CartItem});
Product.belongsToMany(Cart, {through: CartItem});

Order.belongsTo(User);
User.hasMany(Order);

Order.belongsToMany(Product, {through: OrderItem});
Product.belongsToMany(Order, {through: OrderItem});

// sequelize.sync({force: true}).then((result) => {
sequelize.sync().then((result) => {
    console.log(result)
    app.listen(3000)

}).catch((err) => {
    console.log(err)
});