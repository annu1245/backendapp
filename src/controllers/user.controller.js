import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/user.model.js';
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({validateBeforeSave: false});

    return {accessToken, refreshToken};

  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating access and refresh token")
  }
}

const registerUser = asyncHandler( async (req, res) => {
  // get user details from frontend
  // validate all field -> empty check
  // check if user already exists : username || email
  // check for images, check avatar 
  // upload it to cloudinary, avatar
  // create user object -> create entry in db -> 
  // (it will return every field inclucding password and we don't wants to return password then need to exclude them)
  // remove password and refreshtoken field from response
  // check for user creation
  // send the response

  const {fullName, userName, email, password} = req.body;

  if (
    [fullName, userName, email, password].some((field) => field?.trim() == "")
  ) {
    throw new ApiError(400, "All fields are requied")
  }

  const existedUser = await User.findOne({
    $or: [{ userName }, { email }]
  })

  if (existedUser) {
    throw new ApiError(409, "User with username or email already exists");
  }
  const avatarLocalPath = req.files?.avatar[0]?.path;

  let coverImageLocalPath;
  if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
    coverImageLocalPath = req.files?.coverImage[0]?.path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError (400, "Avatar file is required");
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    userName: userName.toLowerCase(),
  })

  // deselect password and refreshtoken
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  )

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering user");
  }

  return res.status(201).json(
    new ApiResponse(200, createdUser, "User registered Successfully")
  )


})

const loginUser = asyncHandler( async (req, res) => {
  //get req data
  //validate username and email
  //find the user
  //password check
  //access and refresh token
  //set cookies

  const {userName, email, password} = req.body;
  
  if (!userName && !email) {
    throw new ApiError(400, "username or email is required");
  }
  
  const user = await User.findOne({
    $or: [{userName}, {email}]
  })

  if(!user) {
    throw new ApiError(404, "user not exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if(!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user?._id)

  const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

  //cookies can't be modified from frontend only backend can modify cookies
  const options = {
    httpOnly: true,
    secure: true
  }

  return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
          new ApiResponse(
            200,
            {
              user: loggedInUser, accessToken, refreshToken
            },
            "User logged in successfully"
          )
        )
})

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined
      }
    },
    {
      new: true
    }
  )
  const options = {
    httpOnly: true,
    secure: true
  }

  return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "user logged out"))


})

const refreshAccessToken = asyncHandler(async (req, res) => {
  //get the refresh token from cookies
  //verify that token is valid using secret key
  //get the user id from that valid key
  //remove the refresh token from that user
  //generate new access and refresh token
  //store it on db and clients cookie
  //send response

  const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken

  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
  
    const user = await User.findById(decodedToken?._id);
  
    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }
  
    if (decodedToken !== user?.refreshToken) {
      throw new ApiError(401, "Refreshtoke  is expired or used")
    }
  
    const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id);
  
    const options = {
      httpOnly: true,
      secure: true
    }
  
    return res
          .status(200)
          .cookie("accessToken", accessToken, options)
          .cookie("refreshToken", newRefreshToken, options)
          .json(
            new ApiResponse(200, 
              {accessToken, refreshToken: newRefreshToken},
              "Access Token refreshed"
            )
          )
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid fresh token");
  }
})


export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken
 }