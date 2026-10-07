const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const u = require('../controllers/userController');

router.use(protect, authorize('admin'));

router.get('/overview', u.overview);
router.get('/', u.getUsers);
router.put('/:id/role', u.setRole);
router.delete('/:id', u.deleteUser);

module.exports = router;
