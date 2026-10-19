import dbConnect from "@/lib/db";
import Item from "@/models/Item";

export const GET = async (req) => {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("unique");
    const bill = searchParams.get("bill", "false");
    await dbConnect();
    let res = null;
    if (id == "true") {
      if (bill == "true") {
        res = await Item.aggregate([
          {
            $sort: { date: -1, _id: -1 },
          },
          {
            $group: {
              _id: {
                itemname: "$itemname",
                itemperbox: "$itemperbox",
              },
              doc: { $first: "$$ROOT" },
              totalBox: { $sum: "$box" },
            },
          },
          {
            $set: {
              "doc.box": "$totalBox",
            },
          },
          {
            $replaceRoot: {
              newRoot: "$doc",
            },
          },
          {
            $sort: { date: -1 },
          },
        ]);
      } else {
        res = await Item.aggregate([
          {
            $sort: { date: -1, _id: -1 },
          },
          {
            $group: {
              _id: "$itemname",
              doc: { $first: "$$ROOT" },
            },
          },
          {
            $replaceRoot: {
              newRoot: "$doc",
            },
          },
          {
            $sort: { date: -1 },
          },
        ]);
      }
    } else {
      res = await Item.find({}).sort({ date: -1 });
    }
    return Response.json(
      {
        message: "Data retrieved successfully",
        success: true,
        data: res,
      },
      { status: 200 },
    );
  } catch (e) {
    console.log(e);
    return Response.json(
      { message: "Internal Server error", success: false },
      { status: 500 },
    );
  }
};
export const POST = async (req) => {
  try {
    const { itemname, quantity, box, itemperbox, originalrate, date } = await req.json();
    if (!String(itemname || "").trim()) {
      return Response.json({ message: "Product name is required.", success: false }, { status: 400 });
    }
    await dbConnect();
    const res = await Item.create({
      itemname: String(itemname).trim(),
      box: Number(box ?? quantity ?? 0),
      itemperbox: Number(itemperbox || 0),
      originalrate: Number(originalrate || 0),
      date: date ? new Date(date) : new Date(),
    });
    return Response.json(
      { message: "Item added successfully.", success: true, data: res },
      { status: 200 },
    );
  } catch (e) {
    return Response.json(
      { message: "Internal Server Error", success: false },
      { status: 500 },
    );
  }
};
export const PUT = async (req) => {
  try {
    const { id, box, quantity } = await req.json();
    if (!id || !Number.isFinite(Number(box ?? quantity)) || Number(box ?? quantity) < 0) {
      return Response.json({ message: "A product ID and non-negative box quantity are required.", success: false }, { status: 400 });
    }
    await dbConnect();
    const res = await Item.findByIdAndUpdate(id, { box: Number(box ?? quantity) }, { new: true, runValidators: true });
    if (!res) {
      return Response.json(
        { message: "Item Not found", success: false },
        { status: 404 },
      );
    }
    return Response.json({ message: "Stock updated successfully.", success: true, data: res }, { status: 200 });
  } catch (e) {
    console.log(e);
    return Response.json(
      { message: "Internal Server Error", success: false },
      { status: 500 },
    );
  }
};
export const DELETE = async (req) => {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  try {
    await dbConnect();
    const res = await Item.findByIdAndDelete(id);
    if (!res) {
      return Response.json(
        { message: "Item Not found", success: false },
        { status: 404 },
      );
    }
    return Response.json(
      { message: "Item deleted successfully.", success: true, data: res },
      { status: 200 },
    );
  } catch (e) {
    return Response.json(
      { message: "Internal Server Error", success: false },
      { status: 500 },
    );
  }
};
