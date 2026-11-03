import dbConnect from "@/lib/db";
import Item from "@/models/Item";

export const GET = async (req) => {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("unique");
    const bill = searchParams.get("bill", "false");
    const stockHistory = searchParams.get("stockHistory") === "true";
    await dbConnect();
    let res = null;
    if (id == "true") {
      if (bill == "true") {
        const lots = await Item.find({}).sort({ date: -1, _id: -1 }).lean();
        const grouped = new Map();
        for (const lot of lots) {
          const unitsPerBox = Math.max(0, Number(lot.itemperbox || 0));
          const rawBoxes = Math.max(0, Number(lot.box || 0));
          const fullBoxes = Math.floor(rawBoxes + 0.000001);
          const legacyLoose = unitsPerBox
            ? Math.round((rawBoxes - fullBoxes) * unitsPerBox)
            : 0;
          const key = `${String(lot.itemname || "").trim().toLocaleLowerCase("en-IN")}::${unitsPerBox}`;
          if (!grouped.has(key)) {
            grouped.set(key, { ...lot, box: 0, looseQty: 0 });
          }
          const product = grouped.get(key);
          product.box += fullBoxes;
          product.looseQty += Math.max(0, Number(lot.looseQty || 0)) + legacyLoose;
        }
        res = [...grouped.values()].map((product) => ({
          ...product,
          box: Number(product.box || 0),
          looseQty: Number(product.looseQty || 0),
        }));
        res.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
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
      res = await Item.find({}).sort({ date: -1, _id: -1 }).lean();
      if (stockHistory) {
        res = res.map((lot) => {
          const rawBoxes = Number(lot.box || 0);
          const fractionalLoose = rawBoxes % 1 > 0.000001 && Number(lot.itemperbox || 0) > 0;
          const hasLooseStock = Number(lot.looseQty || 0) > 0 || fractionalLoose;
          return hasLooseStock ? { ...lot, looseDate: lot.date ?? null } : lot;
        });
      }
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
