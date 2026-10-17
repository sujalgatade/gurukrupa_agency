import mongoose, { Schema } from "mongoose";

const itemSchema = new Schema({
  itemname: {
    type: String,
    required: true,
  },
  box: {
    type: Number,
    default: 0,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  originalrate: {
    type: Number,
    default: 0,
  },
  itemperbox: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});
const Item = mongoose.models.Item || mongoose.model("Item", itemSchema);
export default Item;
