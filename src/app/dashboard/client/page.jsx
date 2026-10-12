"use client";

import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Users,
  UserRoundPlus,
  Search,
  Building2,
  Phone,
  MapPin,
  ReceiptText,
  Plus,
  X,
  Save,
  RefreshCw,
  UserRound,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
  ContactRound,
  ShieldCheck,
} from "lucide-react";

export default function ClientDetails() {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const emptyClient = {
    clientname: "",
    address: "",
    gstNumber: "",
    phone: "",
  };

  const [client, setClient] = useState(emptyClient);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data } = await axios.get("/api/client");

      if (data.success) {
        setClients(Array.isArray(data.data) ? data.data : []);
      } else {
        setError(data.message || "Unable to load clients.");
      }
    } catch (err) {
      console.error("Error fetching clients:", err);
      setError("Unable to load clients. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const filteredClients = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return clients;

    return clients.filter((item) =>
      [
        item.clientname,
        item.address,
        item.gstNumber,
        item.phone,
      ].some((value) => String(value ?? "").toLowerCase().includes(query))
    );
  }, [clients, search]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setClient((previous) => ({
      ...previous,
      [name]: name === "gstNumber" ? value.toUpperCase() : value,
    }));

    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const cleanedClient = {
      clientname: client.clientname.trim(),
      address: client.address.trim(),
      gstNumber: client.gstNumber.trim().toUpperCase(),
      phone: client.phone.trim(),
    };

    if (
      !cleanedClient.clientname ||
      !cleanedClient.address ||
      !cleanedClient.gstNumber ||
      !cleanedClient.phone
    ) {
      setError("Please complete all client details before saving.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await axios.post("/api/client", cleanedClient);

      if (res.data.success) {
        setClient(emptyClient);
        setShowForm(false);
        setSuccess("Client added successfully.");
        await fetchClients();
      } else {
        setError(res.data.message || "Unable to add this client.");
      }
    } catch (err) {
      console.error("Error adding client:", err);
      setError(
        err.response?.data?.message || "Unable to save client. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setClient(emptyClient);
    setError("");
  };

  return (
    <main className="min-h-screen bg-[#080e1c] px-3 py-5 text-slate-100 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-700/70 bg-gradient-to-br from-[#17243b] via-[#111b2e] to-[#0d1424] p-5 shadow-2xl shadow-black/20 sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/10 text-amber-400 shadow-lg shadow-amber-950/20">
                <Users size={29} strokeWidth={1.8} />
              </div>

              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">
                    Customer Management
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-slate-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Client directory
                  </span>
                </div>

                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  Client Details
                </h1>

                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
                  Manage your customer information, GST details, contact
                  numbers, and business addresses in one place.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={fetchClients}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-800/80 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  size={16}
                  className={loading ? "animate-spin" : ""}
                />
                Refresh
              </button>

              {!showForm && (
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setSuccess("");
                    setShowForm(true);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-amber-950/20 transition hover:bg-amber-300 active:scale-[0.98]"
                >
                  <Plus size={18} strokeWidth={2.5} />
                  Add New Client
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Summary Cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-700/70 bg-[#111a2b] p-5 transition hover:border-amber-400/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">
                  Total Clients
                </p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-white">
                  {loading ? "—" : clients.length}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Registered customers
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
                <Users size={23} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700/70 bg-[#111a2b] p-5 transition hover:border-blue-400/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">
                  Search Results
                </p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-white">
                  {loading ? "—" : filteredClients.length}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Clients matching your search
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-400/10 text-blue-300">
                <Search size={23} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700/70 bg-[#111a2b] p-5 transition hover:border-emerald-400/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">
                  Directory Status
                </p>
                <p className="mt-2 text-xl font-bold text-white">
                  {loading ? "Loading" : error ? "Needs attention" : "Ready"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Client data availability
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
                <ShieldCheck size={23} />
              </div>
            </div>
          </div>
        </section>

        {/* Feedback */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-200"
          >
            <AlertCircle size={19} className="mt-0.5 shrink-0" />
            <div className="flex-1">{error}</div>
            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss error"
              className="rounded-lg p-1 text-rose-200 transition hover:bg-rose-400/10"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="flex items-center gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-200"
          >
            <CheckCircle2 size={19} className="shrink-0" />
            <span className="flex-1">{success}</span>
            <button
              type="button"
              onClick={() => setSuccess("")}
              aria-label="Dismiss message"
              className="rounded-lg p-1 transition hover:bg-emerald-400/10"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Add Client Form */}
        {showForm && (
          <section className="overflow-hidden rounded-2xl border border-amber-400/20 bg-[#111a2b] shadow-xl shadow-black/10">
            <div className="flex items-center justify-between gap-3 border-b border-slate-700/70 bg-gradient-to-r from-amber-400/10 to-transparent px-5 py-5 sm:px-7">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
                  <UserRoundPlus size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    Add New Client
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Enter the customer's business and contact information.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeForm}
                disabled={submitting}
                aria-label="Close form"
                className="rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-slate-300 transition hover:border-slate-500 hover:bg-slate-700 disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 p-5 sm:p-7">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="clientname"
                    className="mb-2 block text-sm font-semibold text-slate-200"
                  >
                    Client Name <span className="text-amber-400">*</span>
                  </label>
                  <div className="relative">
                    <UserRound
                      size={17}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                    />
                    <input
                      id="clientname"
                      type="text"
                      name="clientname"
                      value={client.clientname}
                      onChange={handleChange}
                      placeholder="Enter client or business name"
                      autoComplete="organization"
                      required
                      className="w-full rounded-xl border border-slate-700 bg-[#0b1220] py-3 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-amber-400/70 focus:ring-2 focus:ring-amber-400/10"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="gstNumber"
                    className="mb-2 block text-sm font-semibold text-slate-200"
                  >
                    GST Number <span className="text-amber-400">*</span>
                  </label>
                  <div className="relative">
                    <ReceiptText
                      size={17}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                    />
                    <input
                      id="gstNumber"
                      type="text"
                      name="gstNumber"
                      value={client.gstNumber}
                      onChange={handleChange}
                      placeholder="Enter GSTIN"
                      autoComplete="off"
                      required
                      className="w-full rounded-xl border border-slate-700 bg-[#0b1220] py-3 pl-10 pr-4 text-sm uppercase text-white outline-none transition placeholder:text-slate-600 focus:border-amber-400/70 focus:ring-2 focus:ring-amber-400/10"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="phone"
                    className="mb-2 block text-sm font-semibold text-slate-200"
                  >
                    Phone Number <span className="text-amber-400">*</span>
                  </label>
                  <div className="relative">
                    <Phone
                      size={17}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                    />
                    <input
                      id="phone"
                      type="tel"
                      name="phone"
                      value={client.phone}
                      onChange={handleChange}
                      placeholder="Enter contact number"
                      autoComplete="tel"
                      required
                      className="w-full rounded-xl border border-slate-700 bg-[#0b1220] py-3 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-amber-400/70 focus:ring-2 focus:ring-amber-400/10"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="address"
                    className="mb-2 block text-sm font-semibold text-slate-200"
                  >
                    Business Address <span className="text-amber-400">*</span>
                  </label>
                  <div className="relative">
                    <MapPin
                      size={17}
                      className="pointer-events-none absolute left-3.5 top-4 text-slate-500"
                    />
                    <textarea
                      id="address"
                      name="address"
                      value={client.address}
                      onChange={handleChange}
                      placeholder="Enter complete business address"
                      rows={3}
                      autoComplete="street-address"
                      required
                      className="w-full resize-y rounded-xl border border-slate-700 bg-[#0b1220] py-3 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-amber-400/70 focus:ring-2 focus:ring-amber-400/10"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-700/70 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-700 disabled:opacity-50"
                >
                  <X size={17} />
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? (
                    <LoaderCircle size={18} className="animate-spin" />
                  ) : (
                    <Save size={18} />
                  )}
                  {submitting ? "Saving Client..." : "Save Client"}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Client Directory */}
        <section className="overflow-hidden rounded-2xl border border-slate-700/70 bg-[#111a2b] shadow-xl shadow-black/10">
          <div className="flex flex-col gap-4 border-b border-slate-700/70 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
                <ContactRound size={22} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  Client Directory
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Browse and search your registered clients.
                </p>
              </div>
            </div>

            <div className="relative w-full lg:max-w-sm">
              <Search
                size={18}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, GST, phone, address..."
                aria-label="Search clients"
                className="w-full rounded-xl border border-slate-700 bg-[#0b1220] py-3 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/10"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-5 py-12 text-center">
              <LoaderCircle
                size={34}
                className="animate-spin text-amber-400"
              />
              <p className="mt-4 text-sm font-semibold text-slate-200">
                Loading client directory
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Please wait while we fetch your client details.
              </p>
            </div>
          ) : clients.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center px-5 py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800/80 text-amber-400">
                <Building2 size={30} />
              </div>
              <h3 className="mt-5 text-lg font-bold text-white">
                No clients yet
              </h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">
                Your client directory is empty. Add your first client to keep
                business contact details organized.
              </p>
              {!showForm && (
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setSuccess("");
                    setShowForm(true);
                  }}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-300"
                >
                  <Plus size={18} />
                  Add Your First Client
                </button>
              )}
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <Search size={30} className="mx-auto text-slate-600" />
              <h3 className="mt-4 font-semibold text-white">
                No matching clients
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                Try a different name, phone number, GST number, or address.
              </p>
              <button
                type="button"
                onClick={() => setSearch("")}
                className="mt-4 rounded-lg px-4 py-2 text-sm font-semibold text-amber-400 transition hover:bg-amber-400/10"
              >
                Clear search
              </button>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[760px] text-left">
                  <thead>
                    <tr className="border-b border-slate-700/70 bg-[#0d1525]">
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                        #
                      </th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                        Client
                      </th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                        Address
                      </th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                        GST Number
                      </th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                        Phone
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-800">
                    {filteredClients.map((c, index) => (
                      <tr
                        key={c._id || `${c.clientname}-${c.phone}-${index}`}
                        className="transition hover:bg-slate-800/40"
                      >
                        <td className="px-6 py-5 text-sm text-slate-500">
                          {String(index + 1).padStart(2, "0")}
                        </td>

                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/10 bg-amber-400/10 text-sm font-bold text-amber-300">
                              {(c.clientname || "C").trim().charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="max-w-48 truncate text-sm font-semibold text-white">
                                {c.clientname || "Unnamed client"}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                Registered client
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="max-w-64 px-6 py-5">
                          <div className="flex items-start gap-2 text-sm leading-5 text-slate-400">
                            <MapPin
                              size={15}
                              className="mt-0.5 shrink-0 text-slate-500"
                            />
                            <span className="line-clamp-2">
                              {c.address || "—"}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <span className="inline-flex max-w-40 items-center gap-1.5 break-all rounded-lg border border-slate-700 bg-slate-800/70 px-2.5 py-1.5 text-xs font-medium text-slate-300">
                            <ReceiptText
                              size={13}
                              className="shrink-0 text-amber-400"
                            />
                            {c.gstNumber || "—"}
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2 text-sm text-slate-300">
                            <Phone
                              size={15}
                              className="shrink-0 text-emerald-400"
                            />
                            <span>{c.phone || "—"}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile client cards */}
              <div className="grid grid-cols-1 gap-3 p-4 md:hidden">
                {filteredClients.map((c, index) => (
                  <article
                    key={c._id || `${c.clientname}-${c.phone}-${index}`}
                    className="rounded-2xl border border-slate-700/80 bg-[#0d1525] p-4 transition hover:border-amber-400/30"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10 text-lg font-bold text-amber-300">
                        {(c.clientname || "C").trim().charAt(0).toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="break-words text-sm font-bold text-white">
                            {c.clientname || "Unnamed client"}
                          </h3>
                          <span className="shrink-0 rounded-md bg-slate-800 px-2 py-1 text-[10px] font-semibold text-slate-400">
                            #{String(index + 1).padStart(2, "0")}
                          </span>
                        </div>
                        <p className="mt-1 break-all text-xs text-slate-500">
                          GST: {c.gstNumber || "—"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3 border-t border-slate-800 pt-4">
                      <div className="flex items-start gap-2.5">
                        <MapPin
                          size={16}
                          className="mt-0.5 shrink-0 text-amber-400"
                        />
                        <p className="break-words text-sm leading-5 text-slate-400">
                          {c.address || "No address provided"}
                        </p>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <Phone size={16} className="text-emerald-400" />
                        <p className="text-sm text-slate-300">
                          {c.phone || "No phone provided"}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {/* Footer */}
              <div className="flex flex-col gap-2 border-t border-slate-700/70 bg-[#0d1525]/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <p className="text-xs text-slate-500">
                  Showing{" "}
                  <span className="font-semibold text-slate-300">
                    {filteredClients.length}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-slate-300">
                    {clients.length}
                  </span>{" "}
                  clients
                </p>

                <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                  <ShieldCheck size={14} className="text-emerald-400" />
                  Client directory
                </span>
              </div>
            </>
          )}
        </section>

        <footer className="pb-2 text-center text-xs text-slate-600">
          Gurukrupa Agency · Client Management
        </footer>
      </div>
    </main>
  );
}
