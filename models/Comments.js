const { Schema, model }  = require("mongoose");


const CommentSchema = new Schema({
  post: {
    type: Schema.Types.ObjectId,
    ref: "Posts",
  },
  comment: {
    type: String,
    required: true,
  },
  reply: {
    type: String,
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: "userinfo",
  },
  commenter: {
    type: Schema.Types.ObjectId,
    ref: "userinfo",
  },

  created: {
    type: Date,
    default: Date.now(),
  },
  updated: {
    type: Date,
    default: Date.now(),
  },
});

module.exports = model("Comments", CommentSchema);
