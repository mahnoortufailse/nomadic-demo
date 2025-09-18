// import { Resend } from "resend";

// const resend = new Resend(process.env.RESEND_API_KEY!);

// export async function sendBookingConfirmation(booking: any) {
//   return resend.emails.send({
//     from: "Acme <onboarding@resend.dev>",
//     to: booking.email,
//     subject: "Booking Confirmation",
//     html: `<p>Thanks for booking with us, ${booking.name}!</p>`,
//   });
// }

// export async function sendAdminNotification(booking: any) {
//   return resend.emails.send({
//     from: "Acme <onboarding@resend.dev>",
//     to: "admin@yourdomain.com",
//     subject: "New Booking Received",
//     html: `<p>Booking confirmed for ${booking.name} on ${booking.bookingDate} at ${booking.location}.</p>`,
//   });
// }
import nodemailer from "nodemailer";
// Configure transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST, // e.g. "smtp.gmail.com"
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false, // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendBookingConfirmation(booking: any) {
  return transporter.sendMail({
    from: `"Acme Bookings" <${process.env.SMTP_USER}>`,
    to: booking.email,
    subject: "Your Booking Confirmation",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #4CAF50;">Booking Confirmation</h2>
        <p>Dear ${booking.name},</p>
        <p>Thank you for choosing <strong>Acme</strong>. We’re pleased to confirm your booking.</p>
        
        <table style="border-collapse: collapse; margin: 15px 0; width: 100%;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Date</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${booking.bookingDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Location</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${booking.location}</td>
          </tr>
        </table>

        <p>If you have any questions, feel free to reply to this email.</p>
        <p style="margin-top: 20px;">Best regards,<br><strong>Acme Bookings Team</strong></p>
      </div>
    `,
  });
}

export async function sendAdminNotification(booking: any) {
  return transporter.sendMail({
    from: `"Acme Notifications" <${process.env.SMTP_USER}>`,
    to: "admin@yourdomain.com",
    subject: "New Booking Received",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #333;">New Booking Notification</h2>
        <p>A new booking has been confirmed with the following details:</p>
        
        <table style="border-collapse: collapse; margin: 15px 0; width: 100%;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Name</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${booking.name}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Email</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${booking.email}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Date</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${booking.bookingDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Location</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${booking.location}</td>
          </tr>
        </table>

        <p style="margin-top: 20px;">Please log in to the admin panel for more details.</p>
        <p>– Acme Booking System</p>
      </div>
    `,
  });
}
