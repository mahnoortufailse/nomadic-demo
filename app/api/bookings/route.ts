//@ts-nocheck
import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import type { Booking, BookingFormData } from "@/lib/types"
import { calculateBookingPrice, fetchPricingSettings } from "@/lib/pricing"

export async function POST(request: NextRequest) {
  try {
    const data: BookingFormData & { selectedCustomAddOns?: string[] } = await request.json()

    // Validate required fields
    if (
      !data.customerName ||
      !data.customerEmail ||
      !data.customerPhone ||
      !data.bookingDate ||
      !data.location ||
      !data.numberOfTents ||
      !data.adults || // Added missing adults field validation
      data.children === undefined ||
      data.children === null || // Fixed children validation to allow 0
      !data.sleepingArrangements // Added missing sleepingArrangements field validation
    ) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (data.numberOfTents < 1 || data.numberOfTents > 5) {
      return NextResponse.json({ error: "Number of tents must be between 1 and 5 per booking" }, { status: 400 })
    }

    if (data.location === "Wadi" && data.numberOfTents < 2) {
      return NextResponse.json({ error: "Wadi location requires at least 2 tents" }, { status: 400 })
    }

    // Validate phone number (+971)
    if (!data.customerPhone.startsWith("+971")) {
      return NextResponse.json({ error: "Phone number must start with +971" }, { status: 400 })
    }

    // Validate booking date (minimum today + 2)
    const bookingDate = new Date(data.bookingDate)
    const minDate = new Date()
    minDate.setDate(minDate.getDate() + 2)

    if (bookingDate < minDate) {
      return NextResponse.json({ error: "Booking date must be at least 2 days from today" }, { status: 400 })
    }

    const db = await getDatabase()

    const dateString = bookingDate.toISOString().split("T")[0]
    const existingBookingsForDate = await db
      .collection("bookings")
      .find({
        bookingDate: bookingDate,
        isPaid: true, // Only count paid bookings for availability
      })
      .toArray()

    const totalExistingTents = existingBookingsForDate.reduce((sum, booking) => sum + booking.numberOfTents, 0)

    if (totalExistingTents + data.numberOfTents > 10) {
      const remainingCapacity = 10 - totalExistingTents
      if (remainingCapacity <= 0) {
        return NextResponse.json(
          {
            error: "This date is fully booked (10 tents maximum per day)",
          },
          { status: 400 },
        )
      } else {
        return NextResponse.json(
          {
            error: `Only ${remainingCapacity} tent${remainingCapacity === 1 ? "" : "s"} available for this date (10 tents maximum per day)`,
          },
          { status: 400 },
        )
      }
    }

    let lockedLocation = null

    if (existingBookingsForDate.length > 0) {
      lockedLocation = existingBookingsForDate[0].location

      // Validate location consistency
      const allSameLocation = existingBookingsForDate.every((booking) => booking.location === lockedLocation)
      if (!allSameLocation) {
        return NextResponse.json({ error: "Internal error: Inconsistent location data for this date" }, { status: 500 })
      }

      // Validate location matches
      if (data.location !== lockedLocation) {
        return NextResponse.json(
          {
            error: `This date is already booked for ${lockedLocation} location. All bookings for the same date must be in the same location.`,
          },
          { status: 400 },
        )
      }
    }

    const settings = await fetchPricingSettings()

    const customAddOnsWithSelection = (settings.customAddOns || []).map((addon: any) => ({
      ...addon,
      selected: data.selectedCustomAddOns?.includes(addon.id) || false,
    }))

    // Calculate pricing with current settings
    const pricing = calculateBookingPrice(
      data.numberOfTents,
      data.location,
      data.addOns,
      data.hasChildren,
      customAddOnsWithSelection,
      settings,
    )

    // Create booking
    const booking: Omit<Booking, "_id"> = {
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      bookingDate,
      location: data.location,
      numberOfTents: data.numberOfTents,
      adults: data.adults, // Added missing adults field
      children: data.children, // Added missing children field
      sleepingArrangements: data.sleepingArrangements, // Added missing sleepingArrangements field
      addOns: data.addOns,
      hasChildren: data.hasChildren,
      notes: data.notes,
      subtotal: pricing.subtotal,
      vat: pricing.vat,
      total: pricing.total,
      selectedCustomAddOns: data.selectedCustomAddOns || [],
      isPaid: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.collection("bookings").insertOne(booking)

    if (!lockedLocation) {
      // First booking for this date - create lock
      await db.collection("dateLocationLocks").updateOne(
        { date: bookingDate },
        {
          $set: {
            lockedLocation: data.location,
            totalTents: data.numberOfTents, // Track total tents for this date
            updatedAt: new Date(),
          },
        },
        { upsert: true },
      )
    } else {
      await db.collection("dateLocationLocks").updateOne(
        { date: bookingDate },
        {
          $set: {
            totalTents: totalExistingTents + data.numberOfTents,
            updatedAt: new Date(),
          },
        },
      )
    }

    return NextResponse.json({
      bookingId: result.insertedId,
      pricing,
    })
  } catch (error) {
    console.error("Error creating booking:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const search = searchParams.get("search") || ""
    const location = searchParams.get("location") || ""
    const isPaid = searchParams.get("isPaid")

    const db = await getDatabase()

    // Build filter
    const filter: any = {}

    if (search) {
      filter.$or = [
        { customerName: { $regex: search, $options: "i" } },
        { customerEmail: { $regex: search, $options: "i" } },
        { customerPhone: { $regex: search, $options: "i" } },
      ]
    }

    if (location) {
      filter.location = location
    }

    if (isPaid !== null) {
      filter.isPaid = isPaid === "true"
    } else {
      // Default to only paid bookings for orders page
      filter.isPaid = true
    }

    const skip = (page - 1) * limit

    const [bookings, total] = await Promise.all([
      db.collection("bookings").find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      db.collection("bookings").countDocuments(filter),
    ])

    return NextResponse.json({
      bookings,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching bookings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
