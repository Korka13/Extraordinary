var mongoose = require("mongoose");

// Facts schema
var factSchema = new mongoose.Schema({
    title: String,
    image: String,
    imageId: String,
    description: String,
    category: String,
    created: {type: Date, default: Date.now},
    author: {
         id: {
             type: mongoose.Schema.Types.ObjectId,
             ref: "User"
            },
         username: String
        },
    comments: [
        {
            type: mongoose.Schema.ObjectId,
            ref: "Comment"
        }
    ]
});
module.exports = mongoose.model("Fact", factSchema);