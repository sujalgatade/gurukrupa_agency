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
  // Open-box pieces are stored separately so box counts always stay whole.
  looseQty: {
    type: Number,
    default: 0,
    min: 0,
  },
  looseDate: {
    type: Date,
    default: null,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  originalrate: {
    type: Number,
    default: 0,
  },
  purchaseRatePerBox: {
    type: Number,
    default: 0,
  },
  purchaseId: { type: mongoose.Schema.Types.ObjectId, ref: "Purchase" },
  purchaseItemIndex: { type: Number },
  itemperbox: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// During Next.js hot reload, Mongoose can keep the old Item model in memory.
// Rebuild it if that cached schema cannot persist the open-box stock fields.
const cachedItemModel = mongoose.models.Item;
if (
  cachedItemModel &&
  (!cachedItemModel.schema.path("looseQty") || !cachedItemModel.schema.path("looseDate"))
) {
  mongoose.deleteModel("Item");
}

const Item = mongoose.models.Item || mongoose.model("Item", itemSchema);
export default Item;
