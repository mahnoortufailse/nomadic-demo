import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date")

    if (!date) {
      return NextResponse.json({ error: "Date parameter is required" }, { status: 400 })
    }

    const db = await getDatabase()
    const bookingDate = new Date(date)

    const existingBookings = await db
      .collection("bookings")
      .find({
        bookingDate: bookingDate,
        isPaid: true, // Only count paid bookings
      })
      .toArray()

    if (existingBookings.length > 0) {
      const lockedLocation = existingBookings[0].location
      const totalTents = existingBookings.reduce((sum, booking) => sum + booking.numberOfTents, 0)

      return NextResponse.json({
        lockedLocation,
        totalTents,
        remainingCapacity: 10 - totalTents, // Add remaining capacity info
        availableLocations: [lockedLocation], // Only show the locked location
      })
    }

    return NextResponse.json({
      lockedLocation: null,
      totalTents: 0,
      remainingCapacity: 10, // Full capacity available
      availableLocations: ["Desert", "Mountain", "Wadi"], // All locations available
    })
  } catch (error) {
    console.error("Error checking date constraints:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { date, location, tents } = await request.json()

    if (!date || !location || !tents) {
      return NextResponse.json({ error: "Date, location, and tents are required" }, { status: 400 })
    }

    const db = await getDatabase()
    const bookingDate = new Date(date)

    const existingBookings = await db
      .collection("bookings")
      .find({
        bookingDate: bookingDate,
        isPaid: true, // Only count paid bookings
      })
      .toArray()

    const lockedLocation = existingBookings.length > 0 ? existingBookings[0].location : location
    const totalTents = existingBookings.reduce((sum, booking) => sum + booking.numberOfTents, 0)

    // Update or create date location lock
    await db.collection("dateLocationLocks").updateOne(
      { date: bookingDate },
      {
        $set: {
          lockedLocation,
          totalTents, // Store actual total from bookings
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    )

    return NextResponse.json({
      success: true,
      lockedLocation,
      totalTents,
      remainingCapacity: 10 - totalTents, // Add remaining capacity info
    })
  } catch (error) {
    console.error("Error updating date constraints:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
