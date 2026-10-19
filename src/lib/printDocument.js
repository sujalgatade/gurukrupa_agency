const waitForImages = async (element) => {
    await Promise.all(
        [...element.querySelectorAll("img")].map(async (image) => {
            if (!image.complete) {
                await new Promise((resolve) => {
                    image.addEventListener("load", resolve, { once: true });
                    image.addEventListener("error", resolve, { once: true });
                });
            }

            if (image.decode) {
                await image.decode().catch(() => {});
            }
        }),
    );
};

const printDocument = async ({ invoiceData, originalElement, month, pageSize = "a4" }) => {
    if (!originalElement) return;

    let stagingArea;

    try {
        const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
            import("html2canvas"),
            import("jspdf"),
        ]);

        const format = String(pageSize || "a4").toLowerCase();
        const pdf = new jsPDF({ unit: "mm", format, orientation: "portrait" });
        const pageWidthMm = pdf.internal.pageSize.getWidth();
        const pageHeightMm = pdf.internal.pageSize.getHeight();
        const marginMm = 12.7;
        const contentWidthMm = pageWidthMm - marginMm * 2;
        const contentHeightMm = pageHeightMm - marginMm * 2;
        const contentWidthPx = Math.round((contentWidthMm * 96) / 25.4);
        const invoicePages = originalElement.matches(".invoice-print-page")
            ? [originalElement]
            : [...originalElement.querySelectorAll(".invoice-print-page")];

        if (!invoicePages.length) {
            throw new Error("No invoice pages were found to export.");
        }

        // Keep the working copy out of sight. html2canvas reveals this container
        // only inside its temporary cloned document while it renders each invoice.
        stagingArea = document.createElement("div");
        stagingArea.dataset.invoicePdfStaging = "true";
        stagingArea.setAttribute("aria-hidden", "true");
        Object.assign(stagingArea.style, {
            position: "fixed",
            left: "0",
            top: "0",
            zIndex: "2147483647",
            width: `${contentWidthPx}px`,
            visibility: "hidden",
            pointerEvents: "none",
            background: "#fff",
        });
        document.body.appendChild(stagingArea);

        let hasAddedPage = false;

        for (const sourcePage of invoicePages) {
            const invoice = sourcePage.cloneNode(true);
            Object.assign(invoice.style, {
                display: "block",
                position: "relative",
                boxSizing: "border-box",
                width: `${contentWidthPx}px`,
                minWidth: `${contentWidthPx}px`,
                maxWidth: "none",
                margin: "0",
                padding: "16px",
                background: "#fff",
                color: "#000",
                fontFamily: "Arial, sans-serif",
                pageBreakBefore: "auto",
                breakBefore: "auto",
            });
            invoice.querySelectorAll("*").forEach((element) => {
                element.style.color = "#000";
            });
            stagingArea.appendChild(invoice);

            try {
                await waitForImages(invoice);
                if (document.fonts?.ready) await document.fonts.ready;

                const pageRect = invoice.getBoundingClientRect();
                const canvas = await html2canvas(invoice, {
                    backgroundColor: "#ffffff",
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    width: contentWidthPx,
                    windowWidth: contentWidthPx,
                    windowHeight: Math.max(window.innerHeight, Math.ceil(pageRect.height)),
                    scrollX: 0,
                    scrollY: 0,
                    onclone: (clonedDocument) => {
                        const clonedStagingArea = clonedDocument.querySelector(
                            '[data-invoice-pdf-staging="true"]',
                        );
                        clonedStagingArea?.style.setProperty("visibility", "visible", "important");
                    },
                });

                const millimetersPerCanvasPixel = contentWidthMm / canvas.width;
                const productCount = invoice.querySelectorAll("tbody tr").length;

                // Short invoices (up to eight products) stay together, including
                // totals and notes. Scale only as much as needed to fit the page.
                if (productCount <= 8) {
                    if (hasAddedPage) pdf.addPage(format, "portrait");

                    const naturalHeightMm = canvas.height * millimetersPerCanvasPixel;
                    const fitScale = Math.min(1, contentHeightMm / naturalHeightMm);
                    const imageWidthMm = contentWidthMm * fitScale;
                    const imageHeightMm = naturalHeightMm * fitScale;
                    const imageX = marginMm + (contentWidthMm - imageWidthMm) / 2;

                    pdf.addImage(
                        canvas.toDataURL("image/jpeg", 0.94),
                        "JPEG",
                        imageX,
                        marginMm,
                        imageWidthMm,
                        imageHeightMm,
                        undefined,
                        "FAST",
                    );
                    hasAddedPage = true;
                    canvas.width = 0;
                    canvas.height = 0;
                    continue;
                }

                const maxSliceHeightPx = Math.max(
                    1,
                    Math.floor(contentHeightMm / millimetersPerCanvasPixel),
                );
                const canvasScale = canvas.width / pageRect.width;
                const rowBottoms = [...invoice.querySelectorAll("tr")]
                    .map((row) => (row.getBoundingClientRect().bottom - pageRect.top) * canvasScale)
                    .filter((bottom) => bottom > 0 && bottom < canvas.height)
                    .sort((a, b) => a - b);

                let offsetY = 0;
                while (offsetY < canvas.height) {
                    const targetEnd = Math.min(offsetY + maxSliceHeightPx, canvas.height);
                    let sliceEnd = targetEnd;

                    if (targetEnd < canvas.height) {
                        const earliestUsefulBreak = offsetY + maxSliceHeightPx * 0.65;
                        const rowBreaks = rowBottoms.filter(
                            (bottom) => bottom >= earliestUsefulBreak && bottom <= targetEnd,
                        );
                        if (rowBreaks.length) sliceEnd = Math.floor(rowBreaks[rowBreaks.length - 1]);
                    }

                    const sliceHeightPx = Math.max(1, sliceEnd - offsetY);
                    const pageCanvas = document.createElement("canvas");
                    pageCanvas.width = canvas.width;
                    pageCanvas.height = sliceHeightPx;
                    const context = pageCanvas.getContext("2d");
                    context.fillStyle = "#fff";
                    context.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
                    context.drawImage(
                        canvas,
                        0,
                        offsetY,
                        canvas.width,
                        sliceHeightPx,
                        0,
                        0,
                        canvas.width,
                        sliceHeightPx,
                    );

                    if (hasAddedPage) pdf.addPage(format, "portrait");
                    const renderedHeightMm = sliceHeightPx * millimetersPerCanvasPixel;
                    pdf.addImage(
                        pageCanvas.toDataURL("image/jpeg", 0.94),
                        "JPEG",
                        marginMm,
                        marginMm,
                        contentWidthMm,
                        renderedHeightMm,
                        undefined,
                        "FAST",
                    );
                    hasAddedPage = true;
                    pageCanvas.width = 0;
                    pageCanvas.height = 0;
                    offsetY = sliceEnd;
                }

                canvas.width = 0;
                canvas.height = 0;
            } finally {
                invoice.remove();
            }
        }

        const filename = `invoice-${invoiceData ? invoiceData.invoiceNumber : month}.pdf`;
        pdf.save(filename);
    } catch (err) {
        console.error("PDF Error:", err);
    } finally {
        stagingArea?.remove();
    }
};

export default printDocument;
