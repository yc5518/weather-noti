const router = require('express').Router();
// const swaggerUi = require('swagger-ui-express');
// const verifyToken = require('../middleware/verifyToken');
// const userController = require('../controller/userController');
const authController = require('../controller/authController');
// const routeController = require('../controller/routeController');
// const swaggerDocument = require('../swagger.json');

// router.use('/api-docs', swaggerUi.serve);
// router.get('/api-docs', swaggerUi.setup(swaggerDocument));

// APIs that do NOT require authentication
router.route('/register')
  .post(authController.new);

// router.route('/login')
//   .post(authController.login);

// // APIs that require authentication
// router.route('/me')
//   .get(verifyToken, userController.view)
//   .patch(verifyToken, userController.update)
//   .put(verifyToken, userController.update);

// router.route('/route')
//   .post(verifyToken, routeController.new)
//   .get(verifyToken, routeController.index);

// router.route('/route/:route_id')
//   .put(verifyToken, routeController.update)
//   .get(verifyToken, routeController.view)
//   .delete(verifyToken, routeController.delete);

// Export API routes
module.exports = router;
