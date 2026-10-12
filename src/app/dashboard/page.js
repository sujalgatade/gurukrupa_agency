"use client"
const Home = () => {
  const menu = [
    {
      name: "Bill",
      icon: "M304 112L192 112C183.2 112 176 119.2 176 128L176 512C176 520.8 183.2 528 192 528L448 528C456.8 528 464 520.8 464 512L464 272L376 272C336.2 272 304 239.8 304 200L304 112zM444.1 224L352 131.9L352 200C352 213.3 362.7 224 376 224L444.1 224zM128 128C128 92.7 156.7 64 192 64L325.5 64C342.5 64 358.8 70.7 370.8 82.7L493.3 205.3C505.3 217.3 512 233.6 512 250.6L512 512C512 547.3 483.3 576 448 576L192 576C156.7 576 128 547.3 128 512L128 128z",
      href: "/dashboard/bill",
    },
    {
      name: "Orders",
      icon: "M96 144C87.2 144 80 151.2 80 160L80 448C80 456.8 87.2 464 96 464L99.3 464C109.7 427.1 143.7 400 184 400C224.3 400 258.2 427.1 268.7 464L371.3 464C376.2 446.6 386.4 431.3 400 420.1L400 160C400 151.2 392.8 144 384 144L96 144zM99.3 512L96 512C60.7 512 32 483.3 32 448L32 160C32 124.7 60.7 96 96 96L384 96C419.3 96 448 124.7 448 160L448 192L503.4 192C520.4 192 536.7 198.7 548.7 210.7L589.3 251.3C601.3 263.3 608 279.6 608 296.6L608 448C608 483.3 579.3 512 544 512L540.7 512C530.3 548.9 496.3 576 456 576C415.7 576 381.8 548.9 371.3 512L268.7 512C258.3 548.9 224.3 576 184 576C143.7 576 109.8 548.9 99.3 512zM448 320L560 320L560 296.6C560 292.4 558.3 288.3 555.3 285.3L514.7 244.7C511.7 240 507.6 240 503.4 240L448 240L448 320zM448 368L448 400.4C450.6 400.2 453.3 400 456 400C496.3 400 530.2 427.1 540.7 464L544 464C552.8 464 560 456.8 560 448L560 368L448 368zM184 528C206.1 528 224 510.1 224 488C224 465.9 206.1 448 184 448C161.9 448 144 465.9 144 488C144 510.1 161.9 528 184 528zM456 528C478.1 528 496 510.1 496 488C496 465.9 478.1 448 456 448C433.9 448 416 465.9 416 488C416 510.1 433.9 528 456 528z",
      href: "/dashboard/orders",
    },
    {
      name: "Billing History",
      icon: "M528 320C528 434.9 434.9 528 320 528C205.1 528 112 434.9 112 320C112 205.1 205.1 112 320 112C434.9 112 528 205.1 528 320zM64 320C64 461.4 178.6 576 320 576C461.4 576 576 461.4 576 320C576 178.6 461.4 64 320 64C178.6 64 64 178.6 64 320zM296 184L296 320C296 328 300 335.5 306.7 340L402.7 404C413.7 411.4 428.6 408.4 436 397.3C443.4 386.2 440.4 371.4 429.3 364L344 307.2L344 184C344 170.7 333.3 160 320 160C306.7 160 296 170.7 296 184z",
      href: "/dashboard/billinghistory",
    },
    {
      name: "Payment",
      icon: "M308 96c6.627 0 12-5.373 12-12V44c0-6.627-5.373-12-12-12H12C5.373 32 0 37.373 0 44v44.748c0 6.627 5.373 12 12 12h85.28c27.308 0 48.261 9.958 60.97 27.252H12c-6.627 0-12 5.373-12 12v40c0 6.627 5.373 12 12 12h158.757c-6.217 36.086-32.961 58.632-74.757 58.632H12c-6.627 0-12 5.373-12 12v53.012c0 3.349 1.4 6.546 3.861 8.818l165.052 152.356a12.001 12.001 0 0 0 8.139 3.182h82.562c10.924 0 16.166-13.408 8.139-20.818L116.871 319.906c76.499-2.34 131.144-53.395 138.318-127.906H308c6.627 0 12-5.373 12-12v-40c0-6.627-5.373-12-12-12h-58.69c-3.486-11.541-8.28-22.246-14.252-32H308z",
      href: "/dashboard/payment",
    },
    {
      name: "Stock",
      icon: "M160 144C151.2 144 144 151.2 144 160L144 480C144 488.8 151.2 496 160 496L480 496C488.8 496 496 488.8 496 480L496 160C496 151.2 488.8 144 480 144L160 144zM96 160C96 124.7 124.7 96 160 96L480 96C515.3 96 544 124.7 544 160L544 480C544 515.3 515.3 544 480 544L160 544C124.7 544 96 515.3 96 480L96 160zM320 192C333.3 192 344 202.7 344 216L344 424C344 437.3 333.3 448 320 448C306.7 448 296 437.3 296 424L296 216C296 202.7 306.7 192 320 192zM224 288C237.3 288 248 298.7 248 312L248 424C248 437.3 237.3 448 224 448C210.7 448 200 437.3 200 424L200 312C200 298.7 210.7 288 224 288zM392 376C392 362.7 402.7 352 416 352C429.3 352 440 362.7 440 376L440 424C440 437.3 429.3 448 416 448C402.7 448 392 437.3 392 424L392 376z",
      href: "/dashboard/stock",
    },
    {
      name: "Clients",
      icon: "M320 256C355.3 256 384 227.3 384 192C384 156.7 355.3 128 320 128C284.7 128 256 156.7 256 192C256 227.3 284.7 256 320 256zM320 80C381.9 80 432 130.1 432 192C432 253.9 381.9 304 320 304C258.1 304 208 253.9 208 192C208 130.1 258.1 80 320 80zM296 400C238.6 400 192 446.6 192 504L192 520C192 533.3 181.3 544 168 544C154.7 544 144 533.3 144 520L144 504C144 420.1 212.1 352 296 352L344 352C427.9 352 496 420.1 496 504L496 520C496 533.3 485.3 544 472 544C458.7 544 448 533.3 448 520L448 504C448 446.6 401.4 400 344 400L296 400zM431.4 306.8C443.1 295.5 453 282.4 460.8 268C466.7 270.6 473.2 272 480 272C506.5 272 528 250.5 528 224C528 197.5 506.5 176 480 176L479.2 176C477.6 159.4 473.4 143.6 467.1 128.9C471.3 128.3 475.7 128 480 128C533 128 576 171 576 224C576 277 533 320 480 320C462.3 320 445.7 315.2 431.4 306.8zM160 128C164.4 128 168.7 128.3 172.9 128.9C170.6 144.4 160 160 160 176L160 176C133.5 176 112 197.5 112 224C112 250.5 133.5 272 160 272C166.8 272 173.3 270.6 179.2 268C187 282.4 196.9 295.5 208.6 306.8C194.4 315.2 177.8 320 160 320C107 320 64 277 64 224C64 171 107 128 160 128zM149.3 368C134.2 384.3 121.8 403 112.8 423.6C74.8 439.1 48 476.4 48 520C48 533.3 37.3 544 24 544C10.7 544 0 533.3 0 520C0 436.9 66.6 369.4 149.3 368zM527.2 423.6C518.2 403 505.7 384.2 490.7 368C573.4 369.4 640 436.9 616 520C602.7 533.3 592 544 592 520C592 476.4 565.2 439.1 527.2 423.6z",
      href: "/dashboard/client",
    },
    {
      name: "Booking",
      icon: "M480 576L192 576C139 576 96 533 96 480L96 160C96 107 139 64 192 64L496 64C522.5 64 544 85.5 544 112L544 400C544 420.9 530.6 438.7 512 445.3L512 512C529.7 512 544 526.3 544 544C544 561.7 529.7 576 512 576L480 576zM192 448C174.3 448 160 462.3 160 480C160 497.7 174.3 512 192 512L448 512L448 448L192 448zM224 216C224 229.3 234.7 240 248 240L424 240C437.3 240 448 229.3 448 216C448 202.7 437.3 192 424 192L248 192C234.7 192 224 202.7 224 216zM248 288C234.7 288 224 298.7 224 312C224 325.3 234.7 336 248 336L424 336C437.3 336 448 325.3 448 312C448 298.7 437.3 288 424 288L248 288z",
      href: "",
    },
  ];

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-950 text-white">
      {/* Background decoration */}
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
        {/* Header */}
        <header className="mb-8 flex flex-col gap-5 border-b border-white/10 pb-7 sm:mb-10 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-300/30 bg-amber-400/10 text-amber-300 sm:h-14 sm:w-14">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-7 w-7 sm:h-8 sm:w-8"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 20V9l8-5 8 5v11M2 20h20M8 20v-6h8v6M8 10h.01M16 10h.01"
                />
              </svg>
            </div>

            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">
                Business Management
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Gurukrupa Agency
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 sm:self-auto">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-xs font-medium text-emerald-300 sm:text-sm">
              Business Dashboard
            </span>
          </div>
        </header>

        {/* Welcome section */}
        <section className="mb-8 sm:mb-10">
          <p className="mb-2 text-sm font-medium text-amber-300">
            YOUR WORKSPACE
          </p>

          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
            Welcome back!
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
            Manage your billing, orders, inventory, customers, and payments
            from one convenient place.
          </p>
        </section>

        {/* Module heading */}
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-white sm:text-xl">
              Business Modules
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              Select a module to get started
            </p>
          </div>

          <span className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300">
            {menu.length} modules
          </span>
        </div>

        {/* Responsive module cards */}
        <main className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
          {menu.map((item) => {
            const isAvailable = Boolean(item.href);

            return (
              <a
                key={item.name}
                href={item.href || undefined}
                aria-disabled={!isAvailable}
                onClick={(event) => {
                  if (!isAvailable) {
                    event.preventDefault();
                  }
                }}
                className={`group relative flex min-h-36 items-center gap-4 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-lg shadow-black/10 transition-all duration-300 sm:min-h-40 sm:flex-col sm:items-start sm:justify-between sm:p-6 ${
                  isAvailable
                    ? "cursor-pointer hover:-translate-y-1 hover:border-amber-300/50 hover:bg-slate-900 hover:shadow-xl hover:shadow-amber-950/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                    : "cursor-not-allowed opacity-60"
                }`}
              >
                {/* Hover accent */}
                <div className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-amber-300 transition-transform duration-300 group-hover:scale-x-100" />

                {/* Icon */}
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-amber-300/20 bg-amber-300/10 text-amber-300 transition-colors duration-300 group-hover:bg-amber-300 group-hover:text-slate-950 sm:h-14 sm:w-14">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 640 640"
                    className="h-6 w-6 sm:h-7 sm:w-7"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d={item.icon} />
                  </svg>
                </div>

                {/* Card text */}
                <div className="min-w-0 flex-1 sm:w-full sm:flex-none">
                  <h4 className="text-base font-semibold text-white transition-colors group-hover:text-amber-200 sm:text-lg">
                    {item.name}
                  </h4>

                  <p className="mt-1 text-sm leading-5 text-slate-400">
                    {item.name === "Bill" && "Create and manage bills"}
                    {item.name === "Orders" && "Track customer orders"}
                    {item.name === "Billing History" && "Review previous bills"}
                    {item.name === "Payment" && "Manage business payments"}
                    {item.name === "Stock" && "Monitor inventory levels"}
                    {item.name === "Clients" && "Manage customer details"}
                    {item.name === "Booking" && "Manage bookings and records"}
                  </p>
                </div>

                {/* Arrow / availability */}
                <div className="ml-auto shrink-0 text-slate-500 transition-all duration-300 group-hover:translate-x-1 group-hover:text-amber-300 sm:absolute sm:bottom-6 sm:right-6">
                  {isAvailable ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="h-5 w-5"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 12h14m-6-6 6 6-6 6"
                      />
                    </svg>
                  ) : (
                    <span className="text-xs">Coming soon</span>
                  )}
                </div>
              </a>
            );
          })}
        </main>

        {/* Footer */}
        <footer className="mt-10 border-t border-white/10 pt-5 text-center sm:mt-14">
          <p className="text-xs text-slate-500 sm:text-sm">
            © {new Date().getFullYear()} Gurukrupa Agency. All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Home;
