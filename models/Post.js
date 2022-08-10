const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const PostSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  image: {
    type: String,
  },
  like: [
    {
      user: {
        type: Schema.Types.ObjectId,
        ref: "userinfo",
      },
    },
  ],
  author: {
    type: Schema.Types.ObjectId,
    ref: "userinfo",
  },
  created: {
    type: Date,
    default: Date.now(),
  },
  updated: {
    type: Date,
    defult: Date.now(),
  },
  private: {
    type: Boolean,
    required: true,
    default: false,
  },
});

module.exports = mongoose.model("Posts", PostSchema);
