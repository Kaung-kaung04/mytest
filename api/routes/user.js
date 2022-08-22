const router = require("express").Router();
const User = require("../../models/User");
const Post = require("../../models/Post");
const Comment = require("../../models/Comments");
const auth = require("../middleware/check-auth");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const fs = require("fs");

const upload = multer({ dest: "public/images/uploads" });

router.get("/", auth, function (req, res, next) {
  const decode = jwt.verify(req.headers.token, "techApi001");
  Post.countDocuments({ author: decode.id }, (err, rtn) => {
    if (err) {
      res.status(500).json({
        message: "Internal server error",
        error: err,
      });
    } else {
      Post.countDocuments({ "like.user": { $in: decode.id } }, (err2, rtn2) => {
        if (err2) {
          res.status(500).json({
            message: "Internal server error",
            error: err2,
          });
        } else {
          User.findById(decode.id)
            .select("favouriteB")
            .exec((err3, rtn3) => {
              if (err3) {
                res.status(500).json({
                  message: "Internal server error",
                  error: err3,
                });
              } else {
                Comment.countDocuments(
                  { commenter: decode.id },
                  (err4, rtn4) => {
                    if (err4) {
                      res.status(500).json({
                        message: "Internal server error",
                        error: err4,
                      });
                    } else {
                      res.status(200).json({
                        postCount: rtn,
                        likedCount: rtn2,
                        favCount: rtn3,
                        commentCount: rtn4,
                      });
                    }
                  }
                );
              }
            });
        }
      });
    }
  });
});

router.post("/postadd", auth, upload.single("photo"), (req, res, next) => {
  const decode = jwt.verify(req.headers.token, "techApi001");
  let post = new Post();
  post.title = req.body.title;
  post.content = req.body.content;
  post.author = decode.id;
  post.created = Date.now();
  post.updated = Date.now();
  console.log(req.file, "this is req,file");
  if (req.file) {
    post.image = "/images/uploads/" + req.file.filename;
  }
  post.save((err, rtn) => {
    if (err) {
      res.status(500).json({
        message: "Internal server error",
        error: err,
      });
    } else {
      console.log(rtn, "this is rtn");
      res.status(201).json({
        message: "Post created",
        posts: rtn,
      });
    }
  });
});

router.get("/myposts", auth, (req, res) => {
  const decode = jwt.verify(req.headers.token, "techApi001");
  Post.find({ author: decode.id })
    .populate("author")
    .exec((err, rtn) => {
      if (err) {
        res.status(500).json({
          message: "Internal server error",
          error: err,
        });
      } else {
        console.log(rtn, "thisone");
        res.status(200).json({
          message: "postlist",
          posts: rtn,
        });
      }
    });
});

router.get("/postdetails/:id", auth, (req, res) => {
  const decode = jwt.verify(req.headers.token, "techApi001");
  Post.findOne({ _id: req.params.id, author: decode.id })
    .populate("author")
    .exec((err, rtn) => {
      if (err) {
        res.status(500).json({
          message: "Internal server error",
          error: err,
        });
      } else {
        if (rtn != null) {
          Comment.find({ post: req.params.id })
            .populate("commenter", "name profile")
            .populate("author", "name profile")
            .select("comment reply author created profile")
            .exec((err2, rtn2) => {
              console.log(rtn, "posts!!!!!");
              console.log(rtn2, "select!!!!!!");
              if (err2) {
                res.status(500).json({
                  message: "Internal server error",
                  error: err2,
                });
              } else {
                res
                  .status(200)
                  .json({ message: "postdetails", post: rtn, comments: rtn2 });
              }
            });
        } else {
          res.status(401).json({
            message: "You cannot access this",
          });
        }
      }
    });
});

router.patch("/postupdate", auth, upload.single("photo"), (req, res) => {
  const decode = jwt.verify(req.headers.token, "techApi001");
  let update = {
    title: req.body.title,
    content: req.body.content,
    updated: Date.now(),
  };
  if (req.file) {
    update.image = "/images/uploads/" + req.file.filename;
    Post.findById(req.body.id)
      .select("image")
      .exec((err, rtn) => {
        if (err) {
          res.status(500).json({
            message: "Internal server error",
            error: err,
          });
        } else {
          fs.unlink("public" + rtn.image, (err2) => {
            console.log(rtn.image, "THis is img !!!!!!!");
            if (err2) {
              res.status(500).json({
                message: "Internal server error",
                error: err2,
              });
            }
          });
        }
      });
  }
  Post.findOneAndUpdate(
    { _id: req.body.id, author: decode.id },
    { $set: update },
    (err, rtn) => {
      if (err) {
        res.status(500).json({
          message: "Internal server error",
        });
      } else {
        console.log(rtn);
        res.status(200).json({
          message: "postupdate",
          update: rtn,
        });
      }
    }
  );
});

router.delete("/postdelete/:id", auth, (req, res) => {
  const decode = jwt.verify(req.headers.token, "techApi001");
  Post.findOneAndDelete(
    { _id: req.params.id, author: decode.id },
    (err, rtn) => {
      if (err) {
        res.status(500).json({
          message: "Internal server error",
        });
      } else {
        Comment.deleteMany(
          { post: req.params.id, author: decode.id },
          (err2, rtn2) => {
            if (err2) {
              res.status(500).json({
                message: "Internal server error",
                error: err2,
              });
            } else {
              fs.unlink("public" + rtn.image, (err3) => {
                if (err3) {
                  res.status(500).json({
                    message: "Internal server error",
                    error: err3,
                  });
                } else {
                  res.status(200).json({
                    message: "post deleted",
                    delete: rtn,
                  });
                }
              });
            }
          }
        );
      }
    }
  );
});

router.post("/givecomment", auth, (req, res) => {
  const decode = jwt.verify(req.headers.token, "techApi001");
  const comment = new Comment();
  comment.author = req.body.author;
  comment.post = req.body.post;
  comment.comment = req.body.comment;
  comment.commenter = decode.id;
  comment.created = Date.now();
  comment.updated = Date.now();
  comment.save((err, rtn) => {
    console.log(rtn);
    if (err) {
      res.status(500).json({
        message: "Internal Server error",
        error: err,
      });
    } else {
      res.status(201).json({
        message: "Comment created successfully",
        comment: rtn,
      });
    }
  });
});

router.patch("/giveReply", auth, (req, res) => {
  const update = {
    reply: req.body.reply,
    updated: Date.now(),
  };
  console.log(req.body, update);
  Comment.findByIdAndUpdate(req.body.comment, { $set: update }, (err, rtn) => {
    if (err) {
      res.status(500).json({
        message: "Internal Server error",
        error: err,
      });
    } else {
      res.status(200).json({
        message: "reply created",
        reply: rtn,
      });
    }
  });
});

router.post("/givelike", auth, (req, res) => {
  const decode = jwt.verify(req.headers.token, "techApi001");
  if (req.body.action == "like") {
    Post.findByIdAndUpdate(
      req.body.pid,
      { $push: { like: { user: decode.id } } },
      (err, rtn) => {
        if (err) {
          res.status(500).json({
            status: "Internal server error",
            error: err,
          });
        } else {
          console.log(rtn);
          res.status(200).json({
            message: "liked successfully",
          });
        }
      }
    );
  } else {
    Post.findById(req.body.pid, (err, rtn) => {
      if (err) {
        res.status(500).json({
          status: "Internal server error",
          error: err,
        });
      } else {
        const likelist = rtn.like.filter(function (data) {
          return data.user != decode.id;
        });
        Post.findByIdAndUpdate(
          req.body.pid,
          { $set: { like: likelist } },
          (err2, rtn2) => {
            if (err2) {
              res.status(500).json({
                status: "Internal server error",
                error: err2,
              });
            } else {
              res.status(200).json({
                message: "unliked successfully",
              });
            }
          }
        );
      }
    });
  }
});

router.post("/givefav", auth, (req, res) => {
  const decode = jwt.verify(req.headers.token, "techApi001");
  if (req.body.action == "fav") {
    User.findByIdAndUpdate(
      decode.id,
      { $push: { favouriteB: { blogger: req.body.aid } } },
      (err, rtn) => {
        if (err) {
          res.status(500).json({
            status: "Internal server error",
            error: err,
          });
        } else {
          res.status(200).json({
            message: "favourited successfully",
          });
        }
      }
    );
  } else {
    User.findById(decode.id, (err, rtn) => {
      if (err) {
        res.status(500).json({
          status: "Internal server error",
          error: err,
        });
      } else {
        let bloggerList = rtn.favouriteB.filter(function (data) {
          return data.blogger != req.body.aid;
        });
        User.findByIdAndUpdate(
          decode.id,
          { $set: { favouriteB: bloggerList } },
          (err2, rtn2) => {
            if (err2) {
              res.status(500).json({
                status: "Internal server error",
                error: err2,
              });
            } else {
              res.status(200).json({
                message: "unfavourited successfully",
              });
            }
          }
        );
      }
    });
  }
});

router.get("/favbloglist", auth, (req, res) => {
  const decode = jwt.verify(req.headers.token, "techApi001");
  User.findById(decode.id, (err, rtn) => {
    if (err) {
      res.status(500).json({
        status: "Internal server error",
        error: err,
      });
    } else {
      let favlist = [];
      rtn.favouriteB.forEach((element) => {
        favlist.push(element.blogger);
      });
      Post.find({ author: { $in: favlist }, private: false })
        .populate("author")
        .exec((err2, rtn2) => {
          if (err2) {
            res.status(500).json({
              status: "Internal server error",
              error: err2,
            });
          } else {
            res.status(200).json({
              message: "favbloglist",
              posts: rtn2,
            });
          }
        });
    }
  });
});

module.exports = router;
