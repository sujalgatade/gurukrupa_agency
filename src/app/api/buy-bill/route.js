import dbConnect from "@/lib/db";
import Item from "@/models/Item";

export const POST = async (req) => {
  const data = await req.json();
  await dbConnect()
  const item=Item.insertMany(data.items)
  return Response.json(
    {
      success: true,
      message: "Bill added successfully",
      data: item,
    },
    {
      status: 201,
    },
  );
};
