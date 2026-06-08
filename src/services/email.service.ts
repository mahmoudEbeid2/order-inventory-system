import nodemailer from "nodemailer";
import { logger } from "../utils/logger.js";
import path from "path";
import fs from "fs";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "sandbox.smtp.mailtrap.io",
  port: Number(process.env.EMAIL_PORT) || 587,
  auth: {
    user: process.env.EMAIL_USERNAME || "",
    pass: process.env.EMAIL_PASSWORD || "",
  },
});

export const emailService = {
  async sendOrderConfirmation(to: string, order: any, pdfPath: string): Promise<void> {
    const pdfName = path.basename(pdfPath);
    const port = process.env.PORT || 3000;
    const downloadUrl = `http://localhost:${port}/uploads/${pdfName}`;

    // Read the email view template
    const templatePath = path.resolve(process.cwd(), "src/views/email-template.html");
    let htmlContent = "";
    try {
      htmlContent = fs.readFileSync(templatePath, "utf-8");
    } catch (err: any) {
      logger.error(`Failed to read email template at ${templatePath}:`, err);
      // Fallback html in case the file reading fails
      htmlContent = `<p>Thank you for your order. Order ID: ${order.id}</p>`;
    }

    // Generate table rows for items
    const itemsRows = (order.items || []).map((item: any) => {
      const itemSubtotal = (item.quantity * Number(item.priceAtPurchase)).toFixed(2);
      const priceFormatted = Number(item.priceAtPurchase).toFixed(2);
      return `
        <tr>
          <td>
            <strong>${item.product.name}</strong><br/>
            <span style="font-size: 11px; color: #9ca3af;">SKU: ${item.product.sku}</span>
          </td>
          <td class="number">${item.quantity}</td>
          <td class="number">$${priceFormatted}</td>
          <td class="number">$${itemSubtotal}</td>
        </tr>
      `;
    }).join("");

    // Replace placeholders in the HTML template
    htmlContent = htmlContent
      .replace(/\{\{customerName\}\}/g, order.user?.name || "Customer")
      .replace(/\{\{orderId\}\}/g, order.id)
      .replace(/\{\{orderDate\}\}/g, new Date(order.createdAt).toLocaleDateString())
      .replace(/\{\{itemsRows\}\}/g, itemsRows)
      .replace(/\{\{totalAmount\}\}/g, Number(order.totalAmount).toFixed(2))
      .replace(/\{\{downloadUrl\}\}/g, downloadUrl);

    const mailOptions = {
      from: '"Order & Inventory System" <noreply@orderinventory.com>',
      to,
      subject: `Order Confirmation - #${order.id}`,
      html: htmlContent,
      attachments: [
        {
          filename: pdfName,
          path: pdfPath,
        },
      ],
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      logger.info(`Email sent successfully: ${info.messageId} for Order #${order.id} to ${to}`);
    } catch (error) {
      logger.error(`Failed to send order confirmation email for Order #${order.id}:`, error);
      throw error; // Let BullMQ retry the job
    }
  },
};

