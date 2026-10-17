import dbConnect from "@/lib/db";
import Bill from "@/models/Bill";
import Client from "@/models/Client";
import Item from "@/models/Item";
export const GET = async (req) => {
  const { searchParams } = new URL(req.url);
  const client = searchParams.get("client");
  const id = searchParams.get("id");
  const monthParam = searchParams.get("month");
  const yearParam = searchParams.get("year");
  const today = searchParams.get("today");
  const paymentStatus = searchParams.get("paymentStatus");
  try {
    await dbConnect();
    if (client) {
      const res = await Bill.find({
        client,
      }).populate("client");
      return Response.json(
        {
          message: "Bills fetched successfully",
          success: true,
          data: res,
        },
        { status: 200 },
      );
    }
    if (id) {
      const res = await Bill.findById(id).populate("client");
      if (!res) {
        return Response.json(
          {
            success: false,
            message: "Bill not found",
          },
          { status: 404 },
        );
      }
      return Response.json(
        {
          message: "Bill fetched successfully",
          success: true,
          data: res,
        },
        { status: 200 },
      );
    }
    if (monthParam && yearParam) {
      const month = parseInt(monthParam) - 1; // JS Date months are 0-indexed
      const year = parseInt(yearParam);

      const start = new Date(year, month, 1); // first day of the month
      const end = new Date(year, month + 1, 1); // first day of next month
      const res = await Bill.find({
        issueDate: {
          $gte: start,
          $lt: end,
        },
      }).populate("client");
      if (!res || res.length === 0) {
        return Response.json(
          {
            success: false,
            message: "No bills found for this month",
          },
          { status: 404 },
        );
      }
      return Response.json(
        {
          message: "Bills fetched successfully",
          success: true,
          data: res,
        },
        { status: 200 },
      );
    }
    if (today) {
      const targetDate = new Date(); // current date as a Date object
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0); // 00:00:00.000

      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999); // 23:59:59.999

      const res = await Bill.find({
        issueDate: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
      }).populate("client");
      if (!res || res.length === 0) {
        return Response.json(
          {
            success: false,
            message: "No bills found for this date",
          },
          { status: 404 },
        );
      }
      return Response.json(
        {
          message: "Bills fetched successfully",
          success: true,
          data: res,
        },
        { status: 200 },
      );
    }
    if (paymentStatus) {
      const isPaid = paymentStatus === "paid";
      const res = await Bill.find({ isPaid }).populate("client");
      if (!res || res.length === 0) {
        return Response.json(
          {
            success: false,
            message: "No bills found for this payment status",
          },
          { status: 404 },
        );
      }
      return Response.json(
        {
          message: "Bills fetched successfully",
          success: true,
          data: res,
        },
        { status: 200 },
      );
    }
    const res = await Bill.find({}).sort({ createdAt: -1 }).populate("client");
    return Response.json(
      {
        message: "Bills fetched successfully",
        success: true,
        data: res,
      },
      { status: 200 },
    );
  } catch (error) {
    console.log(error);
    return Response.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 },
    );
  }
};
export const POST = async (req) => {
  const {
    client,
    invoiceNumber,
    issueDate,
    items,
    subtotal,
    tax,
    total,
    isPaid,
    taxRate,
  } = await req.json();

  try {
    await dbConnect();
    const bill = await Bill.findOne({ invoiceNumber });
    if (bill) {
      return Response.json(
        {
          success: false,
          message: "Bill with this invoice number already exists",
        },
        {
          status: 400,
        },
      );
    }
    let profit = 0;
    for (const element of items) {
      let temp = element.boxQty;
      const res = await Item.find({
        itemname: element.itemname,
        itemperbox: element.quantity,
      }).sort({ date: 1, _id: 1 });

      for (const ele of res) {
        if (temp <= 0) break;

        const deduct = Math.min(ele.box, temp);

        profit +=
          (element.originalRate - ele.originalrate) * element.quantity * deduct;

        ele.box -= deduct;
        temp -= deduct;

        await ele.save();
      }
    }
    // await Item.deleteMany({ box: 0 });
    const newBill = new Bill({
      client,
      invoiceNumber,
      issueDate,
      items,
      subtotal,
      tax,
      total,
      isPaid,
      taxRate,
      profit,
    });
    await newBill.save();
    return Response.json(
      {
        success: true,
        message: "Bill added successfully",
        data: newBill,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.log(error);
    return Response.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 },
    );
  }
};
export const PUT = async (req) => {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return Response.json(
      { success: false, message: "Bill ID is required" },
      { status: 400 },
    );
  }
  try {
    await dbConnect();
    const res = await Bill.findByIdAndUpdate(
      id,
      { isPaid: true },
      { new: true },
    );
    if (!res) {
      return Response.json(
        { success: false, message: "Bill not found" },
        { status: 404 },
      );
    }
    return Response.json(
      {
        success: true,
        message: "Bill updated successfully",
        data: res,
      },
      { status: 200 },
    );
  } catch (error) {
    console.log(error);
    return Response.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 },
    );
  }
};
