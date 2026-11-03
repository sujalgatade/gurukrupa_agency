import dbConnect from "@/lib/db";
import Client from "@/models/Client";
import mongoose from "mongoose";

export const GET = async (req) => {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    try {
        await dbConnect();
        if (id) {
            const res = await Client.findById(id);
            if (!res) {
                return Response.json(
                    {
                        success: false,
                        message: "Client not found",
                    },
                    { status: 404 }
                );
            }
            return Response.json(
                {
                    message: "Client fetched successfully",
                    success: true,
                    data: res,
                },
                { status: 200 }
            );
        }
        const includeArchived = searchParams.get("includeArchived") === "true";
        const res = await Client.find(includeArchived ? {} : { isDeleted: { $ne: true } });
        return Response.json(
            {
                message: "Clients fetched successfully",
                success: true,
                data: res,
            },
            { status: 200 }
        );
    } catch (error) {
        return Response.json(
            { success: false, message: "Internal Server Error" },
            { status: 500 }
        );
    }
};
export const POST = async (req) => {
    try {
        const { clientname, address, gstNumber, phone, openingBalance, creditLimit } = await req.json();
        if (!String(clientname || "").trim() || !String(address || "").trim()) {
            return Response.json({ success: false, message: "Client name and address are required." }, { status: 400 });
        }
        const opening = Number(openingBalance || 0);
        const limit = Number(creditLimit || 0);
        if (!Number.isFinite(opening) || opening < 0 || !Number.isFinite(limit) || limit < 0) {
            return Response.json({ success: false, message: "Opening balance and credit limit must be non-negative amounts." }, { status: 400 });
        }
        await dbConnect();
        const cleanedName = String(clientname).trim();
        const cleanedAddress = String(address).trim();
        const client = await Client.findOne({ clientname: cleanedName, address: cleanedAddress, isDeleted: { $ne: true } });
        if (client) {
            return Response.json(
                {
                    success: false,
                    message: "Client already exists",
                },
                {
                    status: 400,
                }
            );
        }
        const newClient = new Client({ clientname: cleanedName, address: cleanedAddress, gstNumber: String(gstNumber || "").trim().toUpperCase(), phone: String(phone || "").trim(), openingBalance: opening, creditLimit: limit });
        await newClient.save();
        return Response.json(
            {
                success: true,
                message: "Client added successfully",
                data: newClient,
            },
            {
                status: 201,
            }
        );
    } catch (error) {
        console.log(error);
        return Response.json(
            { success: false, message: "Internal Server Error" },
            { status: 500 }
        );
    }
};
export const PATCH = async (req) => {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!mongoose.isValidObjectId(id)) {
        return Response.json({ success: false, message: "Choose a valid client." }, { status: 400 });
    }
    try {
        const input = await req.json();
        const clientname = String(input.clientname || "").trim();
        const address = String(input.address || "").trim();
        const gstNumber = String(input.gstNumber || "").trim().toUpperCase();
        const phone = String(input.phone || "").trim();
        const openingBalance = Number(input.openingBalance || 0);
        const creditLimit = Number(input.creditLimit || 0);
        if (!clientname || !address) {
            return Response.json({ success: false, message: "Client name and address are required." }, { status: 400 });
        }
        if (!Number.isFinite(openingBalance) || openingBalance < 0 || !Number.isFinite(creditLimit) || creditLimit < 0) {
            return Response.json({ success: false, message: "Opening balance and credit limit must be non-negative amounts." }, { status: 400 });
        }

        await dbConnect();
        const client = await Client.findOne({ _id: id, isDeleted: { $ne: true } });
        if (!client) return Response.json({ success: false, message: "Client not found." }, { status: 404 });
        if (openingBalance + 0.005 < Number(client.openingBalancePaid || 0)) {
            return Response.json({ success: false, message: "Opening balance cannot be lower than payments already received." }, { status: 409 });
        }
        const duplicate = await Client.exists({
            _id: { $ne: client._id },
            clientname,
            address,
            isDeleted: { $ne: true },
        });
        if (duplicate) return Response.json({ success: false, message: "Another client already has this name and address." }, { status: 409 });

        client.clientname = clientname;
        client.address = address;
        client.gstNumber = gstNumber;
        client.phone = phone;
        client.openingBalance = openingBalance;
        client.creditLimit = creditLimit;
        await client.save();
        return Response.json({ success: true, message: "Client updated successfully.", data: client });
    } catch (error) {
        console.error("Client update failed:", error);
        return Response.json({ success: false, message: "Unable to update this client." }, { status: 500 });
    }
};
export const DELETE = async (req) => {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!mongoose.isValidObjectId(id)) {
        return Response.json({ success: false, message: "Choose a valid client." }, { status: 400 });
    }
    try {
        const input = await req.json().catch(() => ({}));
        if (input.confirm !== true) {
            return Response.json({ success: false, message: "Confirm client deletion first." }, { status: 400 });
        }
        await dbConnect();
        const client = await Client.findOne({ _id: id, isDeleted: { $ne: true } });
        if (!client) {
            return Response.json({ success: false, message: "Client not found" }, { status: 404 });
        }
        client.isDeleted = true;
        client.deletedAt = new Date();
        await client.save();
        return Response.json(
            {
                success: true,
                message: "Client removed from the active directory. Bills and account history are preserved.",
                data: client,
            },
            { status: 200 }
        );
    } catch (error) {
        return Response.json(
            { success: false, message: "Internal Server Error" },
            { status: 500 }
        );
    }
};
