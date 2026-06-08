import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";


export const generateInvoicePDF = (order: any): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const uploadsDir = path.resolve(process.cwd(), "uploads");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const fileName = `invoice-${order.id}.pdf`;
      const filePath = path.join(uploadsDir, fileName);

      // Create PDF Document with default margins
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      // 1. Header Accent Bar
      doc.rect(0, 0, 595.28, 15).fill("#4f46e5");

      // 2. Company Info & Status Badge
      doc.fillColor("#1f2937").fontSize(18).font("Helvetica-Bold").text("ORDER & INVENTORY SYSTEM", 50, 40);
      doc.fontSize(8).font("Helvetica").fillColor("#9ca3af").text("NOREPLY@ORDERINVENTORY.COM | WWW.ORDERINVENTORY.COM", 50, 62);

      // PAID Status Badge
      doc.rect(465, 40, 80, 22).fill("#d1fae5");
      doc.fillColor("#065f46").fontSize(9).font("Helvetica-Bold").text("PAID", 465, 46, { width: 80, align: "center" });

      // Divider Line
      doc.moveTo(50, 85).lineTo(545, 85).strokeColor("#e5e7eb").lineWidth(1).stroke();

      // 3. Billing & Invoice details Grid
      doc.fillColor("#9ca3af").fontSize(8).font("Helvetica-Bold").text("BILL TO", 50, 105);
      doc.fillColor("#1f2937").fontSize(11).font("Helvetica-Bold").text(order.user.name, 50, 118);
      doc.fillColor("#4b5563").fontSize(9).font("Helvetica").text(order.user.email, 50, 132);

      doc.fillColor("#9ca3af").fontSize(8).font("Helvetica-Bold").text("INVOICE DETAILS", 350, 105);
      doc.fillColor("#4b5563").fontSize(9).font("Helvetica").text("Invoice Number:", 350, 118);
      doc.fillColor("#1f2937").fontSize(9).font("Helvetica-Bold").text(`#${order.id.slice(0, 8).toUpperCase()}`, 440, 118);
      doc.fillColor("#4b5563").fontSize(9).font("Helvetica").text("Date:", 350, 132);
      doc.fillColor("#1f2937").fontSize(9).font("Helvetica-Bold").text(new Date(order.createdAt).toLocaleDateString(), 440, 132);

      // 4. Items Table Header
      const tableTopY = 175;
      doc.rect(50, tableTopY, 495, 22).fill("#f3f4f6");
      doc.fillColor("#374151").fontSize(8).font("Helvetica-Bold");
      doc.text("ITEM DESCRIPTION", 60, tableTopY + 7, { width: 220 });
      doc.text("QTY", 280, tableTopY + 7, { width: 50, align: "right" });
      doc.text("UNIT PRICE", 340, tableTopY + 7, { width: 100, align: "right" });
      doc.text("AMOUNT", 450, tableTopY + 7, { width: 85, align: "right" });

      // 5. Items Rows
      let currentY = tableTopY + 30;
      order.items.forEach((item: any) => {
        const itemSubtotal = (item.quantity * Number(item.priceAtPurchase)).toFixed(2);
        const priceFormatted = Number(item.priceAtPurchase).toFixed(2);

        // Product Name and SKU
        doc.fillColor("#1f2937").fontSize(9).font("Helvetica-Bold").text(item.product.name, 60, currentY);
        doc.fillColor("#9ca3af").fontSize(7).font("Helvetica").text(`SKU: ${item.product.sku}`, 60, currentY + 11);

        // Details
        doc.fillColor("#374151").fontSize(9).font("Helvetica").text(item.quantity.toString(), 280, currentY + 4, { width: 50, align: "right" });
        doc.text(`$${priceFormatted}`, 340, currentY + 4, { width: 100, align: "right" });
        doc.fillColor("#1f2937").font("Helvetica-Bold").text(`$${itemSubtotal}`, 450, currentY + 4, { width: 85, align: "right" });

        currentY += 32;
        // Draw thin border line between items
        doc.moveTo(50, currentY - 5).lineTo(545, currentY - 5).strokeColor("#f3f4f6").lineWidth(0.5).stroke();
      });

      // 6. Summary block
      currentY += 15;
      doc.rect(340, currentY, 205, 30).fill("#f5f3ff");
      doc.fillColor("#4f46e5").fontSize(9).font("Helvetica-Bold").text("Total Paid:", 355, currentY + 10);
      doc.fillColor("#4f46e5").fontSize(12).font("Helvetica-Bold").text(`$${Number(order.totalAmount).toFixed(2)}`, 400, currentY + 9, { width: 130, align: "right" });

      // 7. Footer
      doc.fillColor("#9ca3af").fontSize(8).font("Helvetica").text("Thank you for your order! If you have any questions, please contact support.", 50, 750, { align: "center", width: 495 });

      doc.end();

      stream.on("finish", () => {
        resolve(filePath);
      });

      stream.on("error", (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
};
