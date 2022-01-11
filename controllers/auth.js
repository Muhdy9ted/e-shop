const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/user');
const sendgridTransport = require('nodemailer-sendgrid-transport');
const nodemailer = require('nodemailer');
const {validationResult} = require('express-validator');


const transporter = nodemailer.createTransport(sendgridTransport({
  auth: {
    api_key: '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' 
  }
}));

exports.getLogin = (req, res, next) => {
  let message = req.flash('error');
  if(message.length > 0){
    message = message[0]
  }else{
    message = null
  }
  res.render('auth/login', {
    path: '/login',
    pageTitle: 'Login',
    errorMessage: message,
    oldInput: {
      email: '',
      password: '',
    },
    validationErrors: []
  });
};

exports.getSignup = (req, res, next) => {
  let message = req.flash('error');
  if(message.length > 0){
    message = message[0]
  }else{
    message = null
  }
  res.render('auth/signup', {
    path: '/signup',
    pageTitle: 'Signup',
    errorMessage: message,
    oldInput: {
      name: '',
      email: '',
      password: '',
      confirmPassword: ''
    },
    validationErrors: []
  });
};

exports.postLogin = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const errors = validationResult(req);

  if(!errors.isEmpty()){
    return res.status(422).render('auth/login', {
      path: '/login',
      pageTitle: 'Login',
      errorMessage: errors.array()[0].msg,
      oldInput: {
        email: email,
        password: password,
      },
      validationErrors: errors.array()
    });
  }
  User.findOne({email: email})
    .then(user => {
      if(!user){
        // req.flash('error', 'Invalid email or password.'); //using the connect-flash to flash data into our sessions storage
        return res.status(422).render('auth/login', {
          path: '/login',
          pageTitle: 'Login',
          errorMessage: 'Invalid email or password.',
          oldInput: {
            email: email,
            password: password,
          },
          validationErrors: []
        });
      }
      bcrypt.compare(password, user.password).then(doMatch=> {
        if(doMatch){
          req.session.isLoggedIn = true;
          req.session.user = user;
          return req.session.save(err => {
            console.log(err);
            res.redirect('/');
          });
        }else{
          // req.flash('error', 'Invalid email or password.'); //using the connect-flash to flash data into our sessions storage
          return res.status(422).render('auth/login', {
            path: '/login',
            pageTitle: 'Login',
            errorMessage: 'Invalid email or password.',
            oldInput: {
              email: email,
              password: password,
            },
            validationErrors: []
          });
        }
      }).catch(err => {
        console.log(err);
        res.redirect('/login');
      })
    })
    .catch(err => {
      console.log(err)
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error)
    });
};

exports.postSignup = (req, res, next) => {
  const name = req.body.name;
  const email = req.body.email;
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;
  const errors = validationResult(req);
  
  if(!errors.isEmpty()){
    return res.status(422).render('auth/signup', {
      path: '/signup',
      pageTitle: 'Signup',
      errorMessage: errors.array()[0].msg,
      oldInput: {
        name: name,
        email: email,
        password: password,
        confirmPassword: req.body.confirmPassword
      },
      validationErrors: errors.array()
    });
  }

  User.findOne({email: email}).then(userDoc => {
    if(userDoc){
      req.flash('error', 'E-mail exists already, please use a different e-mail');
      return res.redirect('/signup');
    }

    return bcrypt.hash(password, 12).then(hashedPassword => {
      const user = new User({email, password: hashedPassword, name, cart: { items: []}});
      return user.save();
    }).then(result => {
      res.redirect('/login');
      return transporter.sendMail({
        to: email,
        from: 'shop@node-complete.com',
        subject: 'Signup successful',
        html: '<h1>You account has been created successfully</h1>'
      })
    }).catch(err => {
      console.log(err)
    })

  }) .catch(err => {
    console.log(err)
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error)
  });
};

exports.postLogout = (req, res, next) => {
  req.session.destroy(err => {
    console.log(err);
    res.redirect('/');
  });
};

exports.getReset = (req, res, next) => {
  let message = req.flash('error');
  if(message.length > 0){
    message = message[0]
  }else{
    message = null
  }
  res.render('auth/reset', {
    path: '/reset',
    pageTitle: 'Reset Password',
    errorMessage: message
  });
}

exports.postReset = (req, res, next) => {
  crypto.randomBytes(32, (err, buffer) => {
    if(err){
      console.log(err);
      return res.redirect('/reset-password');
    }
    const token = buffer.toString('hex');
    User.findOne({email: req.body.email}).then(user => {
      if(!user){
        req.flash('error', 'No account with that email found');
        return res.redirect('/reset-password');
      }
      user.resetToken = token;
      user.resetTokenExpiration = Date.now() + 3600000 //an hour in milliseconds
      return user.save().then(result => {
        res.redirect('/');
        transporter.sendMail({
          to: req.body.email,
          from: 'shop@node-complete.com',
          subject: 'Reset Password',
          html: `
            <p>You requested a password reset</p>
            <p>Click this <a href="http://localhost:3000/reset-password/${token}">link</a> to set a new password. </p>
          `
        })
      })
    }) .catch(err => {
      console.log(err)
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error)
    });
  })
}

exports.getNewPassword = (req, res, next) => {
  const token = req.params.token;
  User.findOne({resetToken: token, resetTokenExpiration: {$gt: Date.now()}}).then(user => {
    let message = req.flash('error');
    if(message.length > 0){
      message = message[0]
    }else{
      message = null
    }
    res.render('auth/new-password', {
      path: '/new-password',
      pageTitle: 'Set Password',
      errorMessage: message,
      userId: user._id.toString(),
      passwordToken: token
    });
  }) .catch(err => {
    console.log(err)
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error)
  });
}

exports.postNewPassword = (req, res, next) => {
  const newPassword = req.body.password;
  const userId = req.body.userId;
  const passwordToken = req.body.passwordToken;
  let resetUser;

  User.findOne({resetToken: passwordToken, resetTokenExpiration: {$gt: Date.now()}, _id: userId}).then(user => {
    resetUser = user;
    return bcrypt.hash(newPassword, 12).then(hashedPassword => {
      resetUser.password = hashedPassword;
      resetUser.resetToken = undefined;
      resetTokenExpiration = undefined;
      return resetUser.save();
    }).then(result => {
      res.redirect('/login');
    })
  }) .catch(err => {
    console.log(err)
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error)
  });
}
