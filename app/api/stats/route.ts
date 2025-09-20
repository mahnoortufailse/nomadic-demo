import { NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"

export async function GET() {
  try {
    const db = await getDatabase()
    const allBookings = await db.collection("bookings").find({}).toArray()
    const paidBookings = allBookings.filter((b) => b.isPaid === true)

    const stats = {
      totalBookings: paidBookings.length,
      paidBookings: paidBookings.length,
      totalRevenue: paidBookings.reduce((sum, b) => sum + (b.total || 0), 0),
      pendingBookings: allBookings.filter((b) => b.isPaid === false).length,
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Error fetching stats:", error)
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    )
  }
}