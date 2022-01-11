const Product = require('../models/product');
const Order = require('../models/order');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const ITEMS_PER_PAGE = 2;

exports.getProducts = (req, res, next) => {
  const page = +req.query.page || 1;
  let totalItems;

  Product.find().countDocuments().then(numbProducts => {
    totalItems = numbProducts; 
    return Product.find().skip((page - 1) * ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE) //skip() skips the items of the previous page 
  }).then(products => {
    res.render('shop/product-list', {
      prods: products,
      pageTitle: 'Products',
      path: '/products',
      isAuthenticated: req.session.isLoggedIn,
      currentPage: page,
      hasNextPage: ITEMS_PER_PAGE * page < totalItems,
      hasPreviousPage: page > 1,
      nextPage: page + 1,
      previousPage: page - 1,
      lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)
    });
  }).catch(err => {
      console.log(err)
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error)
    });
};

exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(product => {
      res.render('shop/product-detail', {
        product: product,
        pageTitle: product.title,
        path: '/products',
        isAuthenticated: req.session.isLoggedIn
      });
    })
    .catch(err => {
      console.log(err)
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error)
    });
};

exports.getIndex = (req, res, next) => {
  // const page = +req.query.page ? req.query.page : 1;
  const page = +req.query.page || 1;
  let totalItems;

  Product.find().countDocuments().then(numbProducts => {
    totalItems = numbProducts; 
    return Product.find().skip((page - 1) * ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE) //skip() skips the items of the previous page 
  }).then(products => {
    res.render('shop/index', {
      prods: products,
      pageTitle: 'Shop',
      path: '/',
      isAuthenticated: req.session.isLoggedIn,
      currentPage: page,
      hasNextPage: ITEMS_PER_PAGE * page < totalItems,
      hasPreviousPage: page > 1,
      nextPage: page + 1,
      previousPage: page - 1,
      lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)
    });
  }).catch(err => {
      console.log(err)
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error)
    });
};

exports.getCart = (req, res, next) => {
  req.user
    .populate('cart.items.productId')
    // .execPopulate()
    .then(user => {
      const products = user.cart.items;
      res.render('shop/cart', {
        path: '/cart',
        pageTitle: 'Your Cart',
        products: products,
        isAuthenticated: req.session.isLoggedIn
      });
    })
    .catch(err => {
      console.log(err)
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error)
    });
};

exports.postCart = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId)
    .then(product => {
      return req.user.addToCart(product);
    })
    .then(result => {
      console.log(result);
      res.redirect('/cart');
    });
};

exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  req.user
    .removeFromCart(prodId)
    .then(result => {
      res.redirect('/cart');
    })
    .catch(err => {
      console.log(err)
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error)
    });
};

exports.getCheckout = (req, res, next) => {
  req.user
  .populate('cart.items.productId')
  // .execPopulate()
  .then(user => {
    const products = user.cart.items;
    let total = 0;
    products.forEach(p => {
      total += p.quantity * p.productId.price
    })
    res.render('shop/checkout', {
      path: '/checkout',
      pageTitle: 'Checkout',
      products: products,
      totalSum: total
    });
  })
  .catch(err => {
    console.log(err)
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error)
  });
}

exports.postOrder = (req, res, next) => {
  req.user
    .populate('cart.items.productId')
    // .execPopulate()
    .then(user => {
      const products = user.cart.items.map(i => {
        return { quantity: i.quantity, product: { ...i.productId._doc } };
      });
      const order = new Order({
        user: {
          name: req.user.name,
          userId: req.user
        },
        products: products
      });
      return order.save();
    })
    .then(result => {
      return req.user.clearCart();
    })
    .then(() => {
      res.redirect('/orders');
    })
    .catch(err => {
      console.log(err)
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error)
    });
};

exports.getOrders = (req, res, next) => {
  Order.find({ 'user.userId': req.user._id })
    .then(orders => {
      res.render('shop/orders', {
        path: '/orders',
        pageTitle: 'Your Orders',
        orders: orders,
        isAuthenticated: req.session.isLoggedIn
      });
    })
    .catch(err => {
      console.log(err)
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error)
    });
};

exports.getInvoice = (req, res, next) => {
  const orderId = req.params.orderId;
  Order.findById(orderId).then(order => {
    if(!order){
      return next(new Error ('No order found'));
    }
    if(order.user.userId.toString() !== req.user._id.toString()){
      return next(new Error ('Unauthorized'));
    }

    const invoiceName = 'invoice-' + orderId + '.pdf';
    const invoicePath = path.join('data', 'invoices', invoiceName)
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="'+ invoiceName +'"'); //sets how the browser should open this file
    //   // res.setHeader('Content-Disposition', 'attachment; filename="'+ invoiceName +'"'); //sets how the browser should open this file

    const pdfDoc = new PDFDocument();
    pdfDoc.pipe(fs.createWriteStream(invoicePath));
    pdfDoc.pipe(res);

    pdfDoc.fontSize(26).text('invoice', {
      underline: true
    });

    pdfDoc.text('-------------------');
    let totalPrice = 0;
    order.products.forEach(prod => {
      totalPrice = totalPrice + prod.quantity * prod.product.price;
      pdfDoc.fontSize(14).text(prod.product.title + ' - ' + prod.quantity + ' x ' + '$' + prod.product.price);
    });

    pdfDoc.text('-------------------');

    pdfDoc.fontSize(20).text('Total Price: $' + totalPrice);

    pdfDoc.end();
    // fs.readFile(invoicePath, (err, data) => {
    //   if(err){
    //     return next(err);
    //   }
    //   res.setHeader('Content-Type', 'application/pdf');
    //   res.setHeader('Content-Disposition', 'inline; filename="'+ invoiceName +'"'); //sets how the browser should open this file
    //   // res.setHeader('Content-Disposition', 'attachment; filename="'+ invoiceName +'"'); //sets how the browser should open this file
    //   res.send(data);
    // })

  }).catch(err => {
    return next(err)
  })
}