const router = require("express").Router();
const User = require("../../models/User");
const Post = require("../../models/Post");
const Comment = require("../../models/Comments");
const multer = require("multer");
const jwt = require("jsonwebtoken");

const upload = multer({ dest: "public/images/profiles/" });

router.get("/", (req, res) => {
  Post.aggregate([
    {
      $match: { private: false, like: { $exists: true, $not: { $size: 0 } } },
    },
    {
      $project: {
        title: 1,
        image: 1,
        author: 1,
        content: 1,
        like: 1,
        length: { $size: { $ifNull: ["$like", []] } },
      },
    },
    {
      $lookup: {
        from: "userinfos",
        localField: "author",
        foreignField: "_id",
        as: "author",
      },
    },
    { $sort: { length: -1 } },
    { $limit: 6 },
  ]).exec((err, rtn) => {
    if (err) {
      res.status(500).json({
        message: "Internal server error",
        error: err,
      });
    }
    Comment.aggregate([
      {
        $group: {
          _id: "$post",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      {
        $lookup: {
          from: "posts",
          localField: "_id",
          foreignField: "_id",
          as: "post",
        },
      },
      {
        $lookup: {
          from: "userinfos",
          localField: "post.author",
          foreignField: "_id",
          as: "author",
        },
      },
    ]).exec((err2, rtn2) => {
      if (err2) {
        res.status(500).json({
          message: "Internal server error",
          error: err2,
        });
      }
      console.log(rtn, "checking likes!!!!!!!!!!");
      console.log(rtn2, "this is grouped post!!!!!!!!!!!!!!!!!!!!!!");
      res.status(200).json({
        message: "mostliked and mostcommented data",
        mostlike: rtn,
      });
    });
  });
});

router.get("/allposts", (req, res) => {
  Post.find()
    .populate("author", "name profile")
    .exec((err, rtn) => {
      if (err) {
        res.status(500).json({
          message: "Internal server error",
          error: err,
        });
      } else {
        res.status(200).json({
          message: "All posts",
          posts: rtn,
        });
      }
    });
});

router.get("/postdetails/:id", (req, res) => {
  Post.findById(req.params.id)
    .populate("author", "_id name profile")
    .exec((err, rtn) => {
      if (err) {
        res.status(500).json({
          message: "Internal server error",
          error: err,
        });
      } else {
        Comment.find({ post: req.params.id })
          .populate("commenter", "name profile")
          .populate("author", "name profile")
          .select("created comment reply commenter author")
          .exec((err2, rtn2) => {
            if (err2) {
              res.status(500).json({
                message: "Internal server error",
                error: err2,
              });
            } else {
              let reactStatus;
              let favStatus;
              try{
                const decode = jwt.verify(req.headers.token, "techApi001");
                reactStatus = rtn.like.filter(function (data) {
                  return data.user == decode.id;
                });
                User.findById(decode.id, (err3, rtn3) => {
                  if (err3) {
                    res.status(500).json({
                      message: "Internal server error",
                      error: err3,
                    });
                  } else {
                    favStatus = rtn3.favouriteB.filter(function (data) {
                      return data.blogger == rtn.author._id.toString();
                    });
                    res.status(200).json({
                      message: "postdetails",
                      post: rtn,
                      comments: rtn2,
                      reactStatus: reactStatus,
                      favStatus: favStatus,
                    });
                  }
                });
              } catch {
                reactStatus = [];
                favStatus = [];
                res.status(200).json({
                  message: "postdetails",
                  post: rtn,
                  comments: rtn2,
                  reactStatus: reactStatus,
                  favStatus: favStatus,
                });
              }
            }
          });
      }
    });
});

router.post("/register", upload.single("profile"), (req, res) => {
  const user = new User();
  user.name = req.body.uname;
  user.email = req.body.uemail;
  user.password = req.body.pwd;
  if (req.file) {
    user.profile = "/images/profiles/" + req.file.filename;
  } else {
    user.profile = "https://placeimg.com/192/192/people";
  }
  console.log(req.file);
  user.save((err, rtn) => {
    if (err) {
      res.status(500).json({
        message: "Intermal server error",
        error: err,
      });
    } else {
      res.status(201).json({
        message: "User account created",
        user: rtn,
      });
    }
  });
});

router.post("/login", (req, res) => {
  User.findOne({ email: req.body.email }, (err, rtn) => {
    if (err) {
      res.status(500).json({
        message: "Internal server error",
        error: err,
      });
    } else {
      if (rtn != null && User.compare(req.body.password, rtn.password)) {
        const token = jwt.sign({ name: rtn.name, id: rtn._id }, "techApi001", {
          expiresIn: "2h",
        });
        res.status(200).json({
          message: "Account login success",
          token: token,
        });
      }
    }
  });
});

router.post("/duemailcheck", (req, res) => {
  User.findOne({ email: req.body.email }, (err, rtn) => {
    if (err) {
      res.status(500).json({
        message: "Internal server error",
        error: err
      })
    } else {
    res.status(200).json({
      status: rtn != null ? true : false,
    });
  }
  });
});

module.exports = router;
