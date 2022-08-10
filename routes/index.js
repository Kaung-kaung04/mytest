var express = require("express");
const Post = require("../models/Post");
var User = require("../models/User");
const multer = require("multer");
const Comment = require("../models/Comments");

const upload = multer({ dest: "public/images/profiles/" });

var router = express.Router();

console.log(User.compare);

/* GET home page. */
router.get("/", function (req, res, next) {
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
    if (err) throw err;
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
    ]).exec((err2, rtn2) => {
      if (err2) throw err2;
      const aryToPopulate = [];
      for (let i = 0; i < rtn2.length; i++) {
        let item = rtn2[i]._id;
        aryToPopulate.push(item);
      }
      console.log(aryToPopulate, "This is array to populate");
      Post.find({ _id: { $in: aryToPopulate }, private: false })
        .populate("author", "name profile")
        .exec((err3, rtn3) => {
          if (err3) throw err3;
          console.log(rtn, "checking likes!!!!!!!!!!");
          console.log(rtn2, "this is grouped post!!!!!!!!!!!!!!!!!!!!!!");
          console.log(rtn3, "This is the point");
          res.render("index1", {
            mostliked: rtn,
            mostcommented: rtn2,
            authors: rtn3,
          });
        });
    });
  });
});

router.get("/register", (req, res) => {
  res.render("register");
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
    if (err) throw err;
    console.log(rtn);
    res.redirect("/");
  });
});

router.get("/login", (req, res) => {
  res.render("login");
});

router.post("/login", (req, res) => {
  User.findOne({ email: req.body.email }, (err, rtn) => {
    if (err) throw err;
    if (rtn != null && User.compare(req.body.password, rtn.password)) {
      req.session.user = {
        name: rtn.name,
        id: rtn._id,
        email: rtn.email,
        profile: rtn.profile,
      };
      console.log(req.session, "session here!!!!!!!!!!!!!!!!!!!");
      res.redirect("/users");
    } else {
      res.redirect("/");
    }
  });
});

router.get("/logout", (req, res) => {
  req.session.destroy(function (err) {
    if (err) throw err;

    res.redirect("/");
  });
});

router.post("/duemailcheck", (req, res) => {
  User.findOne({ email: req.body.email }, (err, rtn) => {
    if (err) throw err;
    console.log(rtn, " duplicate test rtn");
    res.json({
      status: rtn != null ? true : false,
    });
  });
});

router.get("/allposts", (req, res) => {
  Post.find({ private: false })
    .populate("author", "name profile")
    .exec((err, rtn) => {
      if (err) throw err;
      console.log(rtn, "all posts");
      res.render("allposts", { posts: rtn });
    });
});

router.get("/postdetails/:id", (req, res) => {
  Post.findById(req.params.id)
    .populate("author", "_id name profile")
    .exec((err, rtn) => {
      if (err) throw err;
      Comment.find({ post: req.params.id })
        .populate("commenter", "name profile")
        .populate("author", "name profile")
        .select("created comment reply commenter author")
        .exec((err2, rtn2) => {
          if (err2) throw err2;
          let reactStatus;
          let favStatus;
          if (req.session.user) {
            reactStatus = rtn.like.filter(function (data) {
              return data.user == req.session.user.id;
            });
            User.findById(req.session.user.id, (err3, rtn3) => {
              if (err3) throw err3;
              favStatus = rtn3.favouriteB.filter(function (data) {
                return data.blogger == rtn.author._id.toString();
              });
              console.log(favStatus, "This is favStatus");
              res.render("postdetails", {
                post: rtn,
                comments: rtn2,
                reactStatus: reactStatus,
                favStatus: favStatus,
              });
            });
          } else {
            reactStatus = [];
            favStatus = [];
            res.render("postdetails", {
              post: rtn,
              comments: rtn2,
              reactStatus: reactStatus,
              favStatus: favStatus,
            });
          }
        });
    });
});

router.get("/test", (req, res) => {
  res.render("test");
});

module.exports = router;
