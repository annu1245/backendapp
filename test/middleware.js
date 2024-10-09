function register2(req, res) {
  // operations
}
const register1 = function (req, res) {
  // operations
};
const register3 = asyncHandler(function (req, res) {
  // error_operation_1
  // error_operation_2
  // error_operation_3
  // error_operation_4
});

function asyncHandler(cb_controller) {
  const fn = (req, res, next) => {
    try {
      cb_controller(req, res);
    } catch (error) {
      next(error)
      /*res.status(error.statuCode).json({
        success: false,
        message: err.message
      })*/
    }
  };
  return fn;
}

/*function asyncHandler(req, res, next) {
  return function (req, res) {
    // error_operation_1
    // error_operation_2
    // error_operation_3
    // error_operation_4
  };
}*/

register1(1, 2);
register2(1, 2);
