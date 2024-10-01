//asyncHandler using promises
const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next))
    .catch((err) => next(err))
  }
}

export {asyncHandler}


//asyncHandler using try catch

/*const asyncHandler = () => {} //it will take function as a parameter for that
const asyncHandler = (fun) => {() => {}} // excute it further -> this can be written as
const asyncHandler = (fun) => async () => {}

const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next)
  } catch (error) {
    res.send(err.code || 5000).json({
      success: false,
      message: err.message
    })
  }
}*/