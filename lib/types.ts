export interface Booking {
  _id?: string
  customerName: string
  customerEmail: string
  customerPhone: string
  bookingDate: Date
  location: "Desert" | "Mountain" | "Wadi"
  numberOfTents: number
  adults: number
  children: number
  sleepingArrangements: Array<{
    tentNumber: number
    arrangement: "all-singles" | "two-doubles" | "mix" | "custom"
    customArrangement?: string
  }>
  addOns: {
    charcoal: boolean
    firewood: boolean
    portableToilet: boolean
  }
  hasChildren: boolean
  notes?: string
  subtotal: number
  vat: number
  total: number
  stripeSessionId?: string
  stripePaymentIntentId?: string
  isPaid: boolean
  selectedCustomAddOns?: string[]
  createdAt: Date
  updatedAt: Date
}

export interface DateLocationLock {
  _id?: string
  date: Date
  lockedLocation: "Desert" | "Mountain" | "Wadi"
  createdAt: Date
}

export interface Settings {
  _id?: string
  tentPrices: {
    singleTent: number
    multipleTents: number
  }
  addOnPrices: {
    charcoal: number
    firewood: number
    portableToilet: number
  }
  customAddOns?: Array<{
    id: string
    name: string
    price: number
    description?: string
    isActive?: boolean
  }>
  wadiSurcharge: number
  vatRate: number
  discounts: {
    code: string
    percentage: number
    isActive: boolean
  }[]
  businessRules?: {
    maxTentsPerBooking: number
    minAdvanceBookingDays: number
    wadiMinTents: number
    portableToiletFreeWithChildren: boolean
  }
  updatedAt: Date
}

export interface BookingFormData {
  customerName: string
  customerEmail: string
  customerPhone: string
  bookingDate: string
  location: "Desert" | "Mountain" | "Wadi"
  numberOfTents: number
  adults: number
  children: number
  sleepingArrangements: Array<{
    tentNumber: number
    arrangement: "all-singles" | "two-doubles" | "mix" | "custom"
    customArrangement?: string
  }>
  addOns: {
    charcoal: boolean
    firewood: boolean
    portableToilet: boolean
  }
  hasChildren: boolean
  notes?: string
}

export interface User {
  _id?: string
  username: string
  email: string
  password: string
  role: "admin"
  createdAt: Date
}
