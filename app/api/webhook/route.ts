//@ts-check
import { type NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { sendBookingConfirmation, sendAdminNotification } from "@/lib/email";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    console.log(body);
    const signature = request.headers.get("stripe-signature")!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const db = await getDatabase();

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.metadata?.bookingId) {
          // Mark booking as paid
          await db.collection("bookings").updateOne(
            { _id: new ObjectId(session.metadata.bookingId) },
            {
              $set: {
                isPaid: true,
                stripePaymentIntentId: session.payment_intent,
                updatedAt: new Date(),
              },
            }
          );

          // Create date/location lock
          const booking = await db.collection("bookings").findOne({
            _id: new ObjectId(session.metadata.bookingId),
          });

          if (booking) {
            await db.collection("dateLocationLocks").updateOne(
              { date: booking.bookingDate },
              {
                $set: {
                  date: booking.bookingDate,
                  lockedLocation: booking.location,
                  createdAt: new Date(),
                },
              },
              { upsert: true }
            );
            await db.collection("bookings").updateOne(
              { _id: new ObjectId(booking._id) },
              {
                $set: {
                  status: "confirmed", // or "paid-confirmed"
                  updatedAt: new Date(),
                },
              }
            );
            try {
              await sendBookingConfirmation(booking);
              await sendAdminNotification(booking);
              console.log("Confirmation emails sent for booking:", booking._id);
            } catch (emailError) {
              console.error(
                "Failed to send emails for booking:",
                booking._id,
                emailError
              );
              // Don't fail the webhook if email fails
            }

            console.log("Booking confirmed:", booking._id);
          }
        }
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.metadata?.bookingId) {
          // Optionally clean up expired bookings
          console.log("Checkout session expired:", session.metadata.bookingId);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
