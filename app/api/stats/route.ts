import { NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"

export async function GET() {
  try {
    const db = await getDatabase()
    const allBookings = await db.collection("bookings").find({}).toArray()
    const paidBookings = allBookings.filter((b: any) => b.isPaid === true)

    // Calculate stats - only count paid bookings
    const totalBookings = paidBookings.length
    const totalRevenue = paidBookings.reduce((sum: number, b: any) => sum + (b.total || 0), 0)

    const stats = {
      totalBookings,
      paidBookings: totalBookings, // Same as totalBookings now
      totalRevenue,
      pendingBookings: 0, // Remove pending orders logic
    }

    return NextResponse.json(stats, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    })
  } catch (error) {
    console.error("Error fetching stats:", error)
    return NextResponse.json(
      {
        totalBookings: 0,
        paidBookings: 0,
        totalRevenue: 0,
        pendingBookings: 0,
      },
      { status: 200 },
    )
  }
}
