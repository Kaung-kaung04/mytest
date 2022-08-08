var express = require("express");
var router = express.Router();
const multer = require("multer");

const Post = require("../models/Post");
const Comment = require("../models/Comments");
const User = require("../models/User");
const session = require("express-session");
const bcrypt = require("bcryptjs");

const upload = multer({ dest: "public/images/uploads" });
const uploadProfile = multer({ dest: "public/images/profiles" });

const auth = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.redirect("/login");
  }
};

/* GET users listing. */
router.get("/", function (req, res, next) {
  Post.countDocuments({ author: req.session.user.id }, (err, rtn) => {
    if (err) throw err;
    Post.countDocuments(
      { "like.user": { $in: req.session.user.id } },
      (err2, rtn2) => {
        if (err2) throw err2;
        User.findById(req.session.user.id)
          .select("favouriteB")
          .exec((err3, rtn3) => {
            if (err3) throw err3;
            Comment.countDocuments(
              { commenter: req.session.user.id },
              (err4, rtn4) => {
                if (err4) throw err4;
                res.render("user/index", {
                  postCount: rtn,
                  likedCount: rtn2,
                  favCount: rtn3,
                  commentCount: rtn4,
                });
              }
            );
          });
      }
    );
  });
});

router.get("/postadd", auth, function (req, res) {
  res.render("user/postadd");
});

router.post("/postadd", auth, upload.single("photo"), (req, res, next) => {
  let post = new Post();
  post.title = req.body.title;
  post.content = req.body.content;
  post.author = req.session.user.id;
  post.created = Date.now();
  post.created = Date.now();
  console.log(req.file, "this is req,file");
  if (req.file) {
    post.image = "/images/uploads/" + req.file.filename;
  }
  post.save((err, rtn) => {
    if (err) throw err;
    console.log(rtn, "this is rtn");
    res.redirect("/");
  });
});

router.get("/myposts", auth, (req, res) => {
  Post.find({ author: req.session.user.id })
    .populate("author")
    .exec((err, rtn) => {
      if (err) throw err;
      console.log(rtn, "thisone");
      res.render("user/postlist", { posts: rtn });
    });
});

router.get("/postupdate/:id", auth, (req, res) => {
  Post.findOne(
    { _id: req.params.id, author: req.session.user.id },
    (err, rtn) => {
      if (err) throw err;
      if (rtn != null) res.render("user/postupdate", { post: rtn });
      else res.redirect("/users/myposts");
    }
  );
});

router.post("/postupdate", auth, upload.single("photo"), (req, res) => {
  let update = {
    title: req.body.title,
    content: req.body.content,
    updated: Date.now(),
  };
  if (req.file) {
    update.image = "/images/uploads/" + req.file.filename;
  }
  Post.findOneAndUpdate(
    { _id: req.body.id, author: req.session.user.id },
    { $set: update },
    (err, rtn) => {
      if (err) throw err;
      res.redirect("/users/myposts");
    }
  );
});

router.get("/postdelete/:id", (req, res) => {
  Post.findOneAndDelete(
    { _id: req.params.id, author: req.session.user.id },
    (err, rtn) => {
      if (err) throw err;
      Comment.deleteMany(
        { post: req.params.id, author: req.session.user.id },
        (err2, rtn2) => {
          if (err2) throw err2;
          res.redirect("/users/myposts");
        }
      );
    }
  );
});

router.post("/givecomment", auth, (req, res) => {
  const comment = new Comment();
  comment.author = req.body.author;
  comment.post = req.body.post;
  comment.comment = req.body.comment;
  comment.commenter = req.session.user.id;
  comment.created = Date.now();
  comment.updated = Date.now();
  comment.save((err, rtn) => {
    console.log(rtn);
    if (err) {
      res.json({
        status: "error",
      });
    } else {
      res.json({
        status: true,
      });
    }
  });
});

router.get("/postdetails/:id", auth, (req, res) => {
  Post.findById(req.params.id, (err, rtn) => {
    if (err) throw err;
    Comment.find({ post: req.params.id })
      .populate("commenter", "name profile")
      .select("comment reply author created profile")
      .exec((err2, rtn2) => {
        console.log(rtn, "posts!!!!!");
        console.log(rtn2, "select!!!!!!");
        if (err2) throw err2;
        res.render("user/postdetails", { post: rtn, comments: rtn2 });
      });
  });
});

router.get("/profile", auth, (req, res) => {
  User.findById(req.session.user.id, (err, rtn) => {
    if (err) throw err;
    console.log(rtn);
    res.render("user/profile", { user: rtn });
  });
});

router.post("/pfupdate", auth, uploadProfile.single("profile"), (req, res) => {
  const update = {
    name: req.body.uname,
    email: req.body.uemail,
  };
  if (req.file) {
    update.profile = "/images/profiles/" + req.file.filename;
  }
  User.findByIdAndUpdate(req.session.user.id, { $set: update }, (err, rtn) => {
    if (err) throw err;

    req.session.user = {
      name: req.body.uname,
      id: rtn._id,
      email: req.body.uemail,
    };
    if (req.file) {
      req.session.user.profile = "/images/profiles/" + req.file.filename;
    } else {
      req.session.user.profile = rtn.profile;
    }
    console.log(req.session.user, "This is updated session");
    res.redirect("/");
  });
});

router.post("/giveReply", auth, (req, res) => {
  const update = {
    reply: req.body.reply,
    updated: Date.now(),
  };
  console.log(req.body, update);
  Comment.findByIdAndUpdate(req.body.comment, { $set: update }, (err, rtn) => {
    if (err) {
      res.json({
        status: "error",
      });
    } else {
      console.log(rtn);
      res.json({
        status: true,
      });
    }
  });
});

router.get("/pwreset", auth, (req, res) => {
  res.render("user/pwreset");
});

router.post("/pwreset", auth, (req, res) => {
  User.findById(req.session.user.id, (err, rtn) => {
    if (err) throw err;
    console.log(rtn.password, "hashed password here!!!");

    const match = User.compare(req.body.password, rtn.password);

    console.log(
      req.body.password,
      match,
      "~~~~~~~~~~~~!!!!!!!!!!!!!!!!!~~~~~~~~~~~"
    );
    if (match) {
      res.render("user/newpassword");
    } else {
      res.redirect("/");
    }
  });
});

// router.post("/newpassword", auth, (req, res) => {
//   const update = {
//     password: req.body.password,
//   };
//   User.findByIdAndUpdate(req.session.user.id, { $set: update }, (err, rtn) => {
//     if (err) throw err;
//     console.log(rtn, "Password Changed")
//     console.log(req.body.password);
//     res.json({ status: true });
//   });
// });

router.post("/newpassword", auth, (req, res) => {
  const hashedPassword = bcrypt.hashSync(
    req.body.password,
    bcrypt.genSaltSync(8),
    null
  );
  User.findByIdAndUpdate(
    req.session.user.id,
    { $set: { password: hashedPassword } },
    (err, rtn) => {
      if (err) throw err;
      console.log(rtn, "This is hashed password");
      res.json({
        status: true,
      });
    }
  );
});

router.post("/givelike", auth, (req, res) => {
  if (req.body.action == "like") {
    Post.findByIdAndUpdate(
      req.body.pid,
      { $push: { like: { user: req.session.user.id } } },
      (err, rtn) => {
        if (err) {
          res.json({
            status: "error",
          });
        } else {
          console.log(rtn);
          res.json({ status: true });
        }
      }
    );
  } else {
    Post.findById(req.body.pid, (err, rtn) => {
      if (err) {
        res.json({
          status: "error",
        });
      } else {
        const likelist = rtn.like.filter(function (data) {
          return data.user != req.session.user.id;
        });
        Post.findByIdAndUpdate(
          req.body.pid,
          { $set: { like: likelist } },
          (err2, rtn2) => {
            if (err) {
              res.json({
                status: "error",
              });
            } else {
              res.json({ status: true });
            }
          }
        );
      }
    });
  }
});

router.post("/givefav", auth, (req, res) => {
  if (req.body.action == "fav") {
    User.findByIdAndUpdate(
      req.session.user.id,
      { $push: { favouriteB: { blogger: req.body.aid } } },
      (err, rtn) => {
        if (err) {
          res.json({
            status: "error",
          });
        } else {
          res.json({
            status: true,
          });
        }
      }
    );
  } else {
    User.findById(req.session.user.id, (err, rtn) => {
      if (err) {
        res.json({
          status: "error",
        });
      } else {
        let bloggerList = rtn.favouriteB.filter(function (data) {
          return data.blogger != req.body.aid;
        });
        User.findByIdAndUpdate(
          req.session.user.id,
          { $set: { favouriteB: bloggerList } },
          (err2, rtn2) => {
            if (err2) {
              res.json({
                status: "error",
              });
            } else {
              res.json({
                status: true,
              });
            }
          }
        );
      }
    });
  }
});

router.get("/favbloglist", auth, (req, res) => {
  User.findById(req.session.user.id, (err, rtn) => {
    if (err) throw err;
    let favlist = [];
    rtn.favouriteB.forEach((element) => {
      favlist.push(element.blogger);
    });
    Post.find({ author: { $in: favlist }, private: false })
      .populate("author")
      .exec((err2, rtn2) => {
        if (err2) throw err2;
        res.render("user/favbloglist", { posts: rtn2 });
      });
  });
});

router.get("/giveprivate/:id", auth, (req, res) => {
  Post.findOneAndUpdate(
    {_id: req.params.id, author: req.session.user.id},
    { $set: { private: true } },
    (err, rtn) => {
      if (err) {
        res.json({ status: "error" });
      } else {
        res.json({ status: true });
      }
    }
  );
});

router.get("/givePublic/:id", auth, (req, res) => {
  Post.findOneAndUpdate(
    {_id: req.params.id, author: req.session.user.id},
    {$set: {private: false}},
    (err, rtn) => {
      if (err) {
        res.json({ status: "error" });
      } else {
        res.json({ status: true });
      }
    }
  )
})

module.exports = router;
