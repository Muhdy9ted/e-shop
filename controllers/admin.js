const Product = require('../models/product');
const { validationResult } = require('express-validator');
const fileHelper = require('../util/file');


exports.getAddProduct = (req, res, next) => {
  res.render('admin/add-product', {
    pageTitle: 'Add Product',
    path: '/admin/add-product',
    editing: false,
    hasError: false,
    errorMessage: null,
    validationErrors: []
  });
};

exports.postAddProduct = (req, res, next) => {
  const title = req.body.title;
  let imageUrl = req.file;
  const price = req.body.price;
  const description = req.body.description;
  console.log(imageUrl)

  if(!imageUrl){ //a supported file mimetype was selected by the user, we checked that in the app.js fileFilter constant which we then passed to multer setup
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Add Product',
      path: '/admin/add-product',
      editing: false,
      hasError: true,
      product: {
        title: title,
        imageUrl: null,
        price: price,
        description: description
      },
      errorMessage: 'Attached file is not of accepted image format',
      validationErrors: []
    });
  }

  imageUrl = imageUrl.path;
  console.log(imageUrl)
  const errors = validationResult(req);
  
  if(!errors.isEmpty()){
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Add Product',
      path: '/admin/add-product',
      editing: false,
      hasError: true,
      product: {
        title: title,
        imageUrl: imageUrl,
        price: price,
        description: description
      },
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array(),
    });
  }

  const product = new Product({
    title: title,
    price: price,
    description: description,
    imageUrl: imageUrl,
    userId: req.user
  });
  product
    .save()
    .then(result => {
      // console.log(result);
      console.log('Created Product');
      res.redirect('/admin/products');
    })
    .catch(err => {
      // if(!errors.isEmpty()){
      //   return res.status(422).render('admin/edit-product', {
      //     pageTitle: 'Add Product',
      //     path: '/admin/add-product',
      //     editing: false,
      //     hasError: true,
      //     product: {
      //       title: title,
      //       imageUrl: imageUrl,
      //       price: price,
      //       description: description
      //     },
      //     errorMessage: 'Database operation failed, please try again',
      //     validationErrors: [],
      //   });
      // }
      // res.redirect('/500');
      console.log('add product error', err)
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error)

    });
};

exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect('/');
  }
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(product => {
      if (!product) {
        return res.redirect('/');
      }
      res.render('admin/edit-product', {
        pageTitle: 'Edit Product',
        path: '/admin/edit-product',
        editing: editMode,
        product: product,
        hasError: false,
        errorMessage: null,
        validationErrors: []
      });
    })
    .catch(err => {
      console.log(err)
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error)
    });
};

exports.postEditProduct = (req, res, next) => {
  const prodId = req.body.productId;
  const updatedTitle = req.body.title;
  const updatedPrice = req.body.price;
  const updatedImageUrl = req.file;
  const updatedDesc = req.body.description;

  const errors = validationResult(req);
  
  if(!errors.isEmpty()){
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Edit Product',
      path: '/admin/edit-product',
      editing: true,
      hasError: true,
      product: {
        title: updatedTitle,
        imageUrl: null,
        price: updatedPrice,
        description: updatedDesc,
        _id: prodId
      },
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array()
    });
  }

  Product.findById(prodId)
    .then(product => {
      if(product.userId.toString() !== req.user._id.toString()){
        return res.redirect('/')
      }
      product.title = updatedTitle;
      product.price = updatedPrice;
      product.description = updatedDesc;
      if(updatedImageUrl){
        fileHelper.deleteFile(product.imageUrl);
        product.imageUrl = updatedImageUrl.path;
      }
      return product.save().then(result => {
        console.log('UPDATED PRODUCT!');
        res.redirect('/admin/products');
      });
    }).catch(err => {
      console.log(err)
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error)

    });
};

exports.getProducts = (req, res, next) => {
  Product.find({userId: req.user._id})
    // .select('title price -_id')
    // .populate('userId', 'name')
    .then(products => {
      console.log(products);
      res.render('admin/products', {
        prods: products,
        pageTitle: 'Admin Products',
        path: '/admin/products',
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

exports.postDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId).then(product => {
    if(!product){
      return next(new Error('Product not found'))
    }
    console.log('thisis the dleted image', product)
    fileHelper.deleteFile(product.imageUrl);
    return   Product.deleteOne({_id: prodId, userId: req.user._id})
  }).then(() => {
    console.log('DESTROYED PRODUCT');
    res.redirect('/admin/products');
  }).catch(err => {
    console.log(err)
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error)
  });

};

exports.deleteProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId).then(product => {
    if(!product){
      return next(new Error('Product not found'))
    }
    console.log('thisis the dleted image', product)
    fileHelper.deleteFile(product.imageUrl);
    return   Product.deleteOne({_id: prodId, userId: req.user._id})
  }).then(() => {
    console.log('DESTROYED PRODUCT');
    res.status(200).json({message: 'Success'})
  }).catch(err => {
   res.status(500).json({message: 'deleting product failed'})
  });

};


