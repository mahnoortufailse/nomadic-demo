import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase()

    const bookings = await db.collection("bookings").find({ isPaid: true }).toArray()

    // Generate monthly bookings data - only paid bookings
    const monthlyData = bookings.reduce((acc: any, booking: any) => {
      const month = new Date(booking.bookingDate).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
      if (!acc[month]) {
        acc[month] = { month, bookings: 0, revenue: 0 }
      }
      acc[month].bookings += 1
      acc[month].revenue += booking.total
      return acc
    }, {})

    // Generate location stats data - only paid bookings
    const locationData = bookings.reduce((acc: any, booking: any) => {
      if (!acc[booking.location]) {
        acc[booking.location] = {
          location: booking.location,
          bookings: 0,
          revenue: 0,
        }
      }
      acc[booking.location].bookings += 1
      acc[booking.location].revenue += booking.total
      return acc
    }, {})

    // Calculate summary stats - only paid bookings
    const totalBookings = bookings.length
    const totalRevenue = bookings.reduce((sum: number, b: any) => sum + b.total, 0)

    const chartData = {
      monthlyBookings: Object.values(monthlyData),
      locationStats: Object.values(locationData),
      stats: {
        totalBookings,
        paidBookings: totalBookings,
        totalRevenue,
        pendingBookings: 0, // Remove pending orders logic
      },
    }

    return NextResponse.json(chartData, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    })
  } catch (error) {
    console.error("Error fetching chart data:", error)
    return NextResponse.json({ error: "Failed to fetch chart data" }, { status: 500 })
  }
}
