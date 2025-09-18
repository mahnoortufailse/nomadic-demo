//@ts-nocheck
"use client"

import type React from "react"

import { useState, useEffect, useCallback, useRef } from "react"
import toast from "react-hot-toast"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { MapPin, Users, Plus, Minus, Check, X, Loader2, Calendar, Shield } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import Image from "next/image"
import { calculateBookingPrice, fetchPricingSettings } from "@/lib/pricing"
import type { BookingFormData, Settings } from "@/lib/types"

const DEFAULT_SETTINGS = {
  tentPrice: 1297.8, // Base price for weekdays and multiple tents
  wadiSurcharge: 250,
  vatRate: 0.05,
  addOnPrices: {
    charcoal: 60,
    firewood: 75,
    portableToilet: 200,
  },
  customAddOns: [],
}

export default function BookingPage() {
  const [adults, setAdults] = useState(2)
  const [children, setChildren] = useState(0)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loadingSettings, setLoadingSettings] = useState(true)
  const [dateConstraints, setDateConstraints] = useState<{
    lockedLocation: string | null
    totalTents: number
    remainingCapacity: number
    availableLocations: string[]
  }>({
    lockedLocation: null,
    totalTents: 0,
    remainingCapacity: 10,
    availableLocations: ["Desert", "Mountain", "Wadi"],
  })
  const [checkingConstraints, setCheckingConstraints] = useState(false)
  const isUserInteracting = useRef(false)
  const refreshTimeoutRef = useRef<NodeJS.Timeout>()
  const interactionTimeoutRef = useRef<NodeJS.Timeout>()
  const isRefreshing = useRef(false)

  const [formData, setFormData] = useState<BookingFormData>({
    customerName: "",
    customerEmail: "",
    customerPhone: "+971",
    bookingDate: "",
    location: "Desert",
    numberOfTents: 1,
    adults: 2,
    children: 0,
    sleepingArrangements: [{ tentNumber: 1, arrangement: "all-singles" }],
    addOns: {
      charcoal: false,
      firewood: false,
      portableToilet: false,
    },
    hasChildren: false,
    notes: "",
  })

  const [selectedCustomAddOns, setSelectedCustomAddOns] = useState<string[]>([])
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [pricing, setPricing] = useState(
    calculateBookingPrice(1, "Desert", formData.addOns, false, [], DEFAULT_SETTINGS, formData.bookingDate),
  )
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const [locationMessage, setLocationMessage] = useState("")

  const campingImages = [
    {
      src: "/desert-camping-with-tents-under-starry-sky.jpg",
      alt: "Desert camping with tents under starry sky",
    },
    {
      src: "/desert-landscape-with-sand-dunes-and-warm-golden-l.jpg",
      alt: "Desert landscape with sand dunes",
    },
    {
      src: "/wadi-valley-camping-with-water-pools-and-palm-tree.jpg",
      alt: "Wadi valley camping with water pools",
    },
    {
      src: "/mountain-camping-with-rocky-peaks-and-tents.jpg",
      alt: "Mountain camping with rocky peaks",
    },
    {
      src: "/desert-landscape-with-sand-dunes-and-warm-golden-l.jpg",
      alt: "Private event camping setup",
    },
  ]

  useEffect(() => {
    const loadSettings = async () => {
      if (isRefreshing.current) return

      try {
        setLoadingSettings(true)
        isRefreshing.current = true
        const settingsData = await fetchPricingSettings()
        setSettings(settingsData)
      } catch (error) {
        console.error("Failed to load settings:", error)
      } finally {
        setLoadingSettings(false)
        isRefreshing.current = false
      }
    }
    loadSettings()
  }, [])

  const refreshSettings = useCallback(async () => {
    if (!isUserInteracting.current && !isRefreshing.current) {
      console.log("[v0] Refreshing settings - user not interacting")
      try {
        isRefreshing.current = true
        const settingsData = await fetchPricingSettings()
        setSettings(settingsData)
      } catch (error) {
        console.error("Failed to refresh settings:", error)
      } finally {
        isRefreshing.current = false
      }
    } else {
      console.log("[v0] Skipping refresh - user is interacting or already refreshing")
    }
  }, [])

  useEffect(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
    }

    const scheduleRefresh = () => {
      refreshTimeoutRef.current = setTimeout(() => {
        refreshSettings()
        scheduleRefresh()
      }, 30000)
    }

    scheduleRefresh()

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
    }
  }, [refreshSettings])

  const minDate = new Date()
  minDate.setDate(minDate.getDate() + 2)

  useEffect(() => {
    if (!settings) return

    const customAddOnsWithSelection = (settings.customAddOns || []).map((addon) => ({
      ...addon,
      selected: selectedCustomAddOns.includes(addon.id),
    }))

    const newPricing = calculateBookingPrice(
      formData.numberOfTents,
      formData.location,
      formData.addOns,
      formData.hasChildren,
      customAddOnsWithSelection,
      settings,
      formData.bookingDate,
    )
    setPricing(newPricing)
  }, [
    formData.numberOfTents,
    formData.location,
    formData.addOns,
    formData.hasChildren,
    selectedCustomAddOns,
    settings,
    formData.bookingDate,
  ])

  const setUserInteracting = useCallback((interacting: boolean, duration = 5000) => {
    console.log(`[v0] Setting user interaction: ${interacting}`)
    isUserInteracting.current = interacting

    if (interactionTimeoutRef.current) {
      clearTimeout(interactionTimeoutRef.current)
    }

    if (interacting) {
      interactionTimeoutRef.current = setTimeout(() => {
        console.log("[v0] User interaction timeout - setting to false")
        isUserInteracting.current = false
      }, duration)
    }
  }, [])

  const checkDateConstraints = async (dateString: string) => {
    setCheckingConstraints(true)
    try {
      console.log("[v0] Checking constraints for date:", dateString)
      const response = await fetch(`/api/date-constraints?date=${dateString}`)
      const data = await response.json()
      console.log("[v0] API response:", data)

      if (data.lockedLocation) {
        console.log("[v0] Date is locked to location:", data.lockedLocation)
        setDateConstraints({
          lockedLocation: data.lockedLocation,
          totalTents: data.totalTents,
          remainingCapacity: data.remainingCapacity || 0,
          availableLocations: [data.lockedLocation], // Only locked location
        })

        console.log("[v0] Auto-setting location to:", data.lockedLocation)
        setFormData((prev) => ({
          ...prev,
          location: data.lockedLocation as "Desert" | "Mountain" | "Wadi",
        }))

        if (data.remainingCapacity <= 0) {
          setLocationMessage(`This date is fully booked (10 tents maximum per day)`)
        } else {
          setLocationMessage(
            `This date is reserved for ${data.lockedLocation} location only (${data.remainingCapacity} tent${data.remainingCapacity === 1 ? "" : "s"} remaining)`,
          )
        }
      } else {
        console.log("[v0] Date is available for all locations")
        setDateConstraints({
          lockedLocation: null,
          totalTents: 0,
          remainingCapacity: 10,
          availableLocations: ["Desert", "Mountain", "Wadi"],
        })
        setLocationMessage("")
      }
    } catch (error) {
      console.error("[v0] Error checking date constraints:", error)
      setDateConstraints({
        lockedLocation: null,
        totalTents: 0,
        remainingCapacity: 10,
        availableLocations: ["Desert", "Mountain", "Wadi"],
      })
      setLocationMessage("")
    } finally {
      setCheckingConstraints(false)
    }
  }

  const handleDateSelect = (date: Date | undefined) => {
    setUserInteracting(true)
    setSelectedDate(date)
    const dateString = date ? date.toISOString().split("T")[0] : ""
    setFormData((prev) => ({
      ...prev,
      bookingDate: dateString,
    }))
    setTouched((prev) => ({ ...prev, bookingDate: true }))

    if (date) {
      const newErrors = { ...errors }
      delete newErrors.bookingDate
      setErrors(newErrors)
      checkDateConstraints(dateString)
    } else {
      setDateConstraints({
        lockedLocation: null,
        totalTents: 0,
        remainingCapacity: 10,
        availableLocations: ["Desert", "Mountain", "Wadi"],
      })
    }
  }

  const handleTentChange = (increment: boolean) => {
    setUserInteracting(true)
    const newCount = increment ? formData.numberOfTents + 1 : formData.numberOfTents - 1

    const maxTentsPerBooking = 5
    const maxAllowed = Math.min(maxTentsPerBooking, dateConstraints.remainingCapacity || 10)

    if (increment && newCount > maxAllowed) {
      if (dateConstraints.remainingCapacity && dateConstraints.remainingCapacity < maxTentsPerBooking) {
        toast.error(
          `Only ${dateConstraints.remainingCapacity} tent${dateConstraints.remainingCapacity === 1 ? "" : "s"} are available for this specific date.`,
        )
      } else {
        toast.error(`Maximum ${maxTentsPerBooking} tents per booking`)
      }
      return
    }

    if (newCount >= 1 && (increment ? newCount <= maxAllowed : true)) {
      setFormData((prev) => {
        const newArrangements = Array.from({ length: newCount }, (_, i) => ({
          tentNumber: i + 1,
          arrangement: prev.sleepingArrangements[i]?.arrangement || ("all-singles" as const),
        }))

        return {
          ...prev,
          numberOfTents: newCount,
          sleepingArrangements: newArrangements,
        }
      })
      setTouched((prev) => ({ ...prev, numberOfTents: true }))

      if (formData.location === "Wadi") {
        const newErrors = { ...errors }
        if (newCount < 2) {
          newErrors.numberOfTents = "Wadi location requires at least 2 tents"
        } else {
          delete newErrors.numberOfTents
        }
        setErrors(newErrors)
      }
    }
  }

  const handleAdultsChange = (increment: boolean) => {
    setUserInteracting(true, 3000)
    const newCount = increment ? adults + 1 : adults - 1
    const totalPeople = newCount + children
    const requiredCapacity = formData.numberOfTents * 4

    if (increment && totalPeople > requiredCapacity) {
      toast.error(
        `You selected ${formData.numberOfTents} tent${formData.numberOfTents === 1 ? "" : "s"}, each tent accommodates 4 people including children.`,
      )
      return
    }

    if (newCount >= 1 && newCount <= 20) {
      setAdults(newCount)
      setFormData((prev) => ({ ...prev, adults: newCount }))
    }
  }

  const handleChildrenChange = (increment: boolean) => {
    setUserInteracting(true, 3000)
    const newCount = increment ? children + 1 : children - 1
    const totalPeople = adults + newCount
    const requiredCapacity = formData.numberOfTents * 4

    if (increment && totalPeople > requiredCapacity) {
      toast.error(
        `You selected ${formData.numberOfTents} tent${formData.numberOfTents === 1 ? "" : "s"}, each tent accommodates 4 people including children.`,
      )
      return
    }

    if (newCount >= 0 && newCount <= 10) {
      setChildren(newCount)
      setFormData((prev) => ({
        ...prev,
        children: newCount,
        hasChildren: newCount > 0,
        addOns: {
          ...prev.addOns,
          portableToilet: newCount > 0 ? true : prev.addOns.portableToilet,
        },
      }))
    }
  }

  const handleSleepingArrangementChange = (tentNumber: number, arrangement: "all-singles" | "two-doubles" | "mix") => {
    setFormData((prev) => ({
      ...prev,
      sleepingArrangements: prev.sleepingArrangements.map((arr) =>
        arr.tentNumber === tentNumber ? { ...arr, arrangement } : arr,
      ),
    }))
  }

  const handleInputChange = (field: string, value: string) => {
    console.log(`[v0] Input changed - ${field}:`, value)

    setFormData((prev) => ({ ...prev, [field]: value }))
    setTouched((prev) => ({ ...prev, [field]: true }))

    const fetchDateConstraints = async (dateString: string) => {
      try {
        const response = await fetch(`/api/date-constraints?date=${dateString}`)
        const data = await response.json()
        setDateConstraints(data)
      } catch (error) {
        console.error("Error fetching date constraints:", error)
      }
    }

    if (field === "bookingDate" && value) {
      console.log("[v0] Date selected, checking constraints for:", value)
      const selectedDate = new Date(value)
      setSelectedDate(selectedDate)
      fetchDateConstraints(value)
    }

    if (typeof value === "string") {
      validateField(field, value)
    }
  }

  const handleAddOnChange = (addOn: keyof typeof formData.addOns, checked: boolean) => {
    setUserInteracting(true)
    setFormData((prev) => ({
      ...prev,
      addOns: { ...prev.addOns, [addOn]: checked },
    }))
  }

  const handleCustomAddOnChange = (addOnId: string, checked: boolean) => {
    setUserInteracting(true)
    setSelectedCustomAddOns((prev) => (checked ? [...prev, addOnId] : prev.filter((id) => id !== addOnId)))
  }

  const validateField = (field: string, value: string) => {
    const newErrors = { ...errors }

    switch (field) {
      case "customerName":
        if (!value.trim()) {
          newErrors.customerName = "Name is required"
        } else {
          delete newErrors.customerName
        }
        break
      case "customerEmail":
        if (!value.trim()) {
          newErrors.customerEmail = "Email is required"
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          newErrors.customerEmail = "Please enter a valid email address"
        } else {
          delete newErrors.customerEmail
        }
        break
      case "customerPhone":
        if (!value.startsWith("+971") || value.length < 12) {
          newErrors.customerPhone = "Valid UAE phone number required (+971501234567)"
        } else {
          delete newErrors.customerPhone
        }
        break
      case "bookingDate":
        if (!value) {
          newErrors.bookingDate = "Booking date is required"
        } else {
          const selectedDate = new Date(value)
          const minDate = new Date()
          minDate.setDate(minDate.getDate() + 2)

          if (selectedDate < minDate) {
            newErrors.bookingDate = "Booking must be at least 2 days in advance"
            toast.error("Please select a date at least 2 days from today")
          } else {
            delete newErrors.bookingDate
          }
        }
        break
      case "numberOfTents":
        if (formData.location === "Wadi" && formData.numberOfTents < 2) {
          newErrors.numberOfTents = "Wadi location requires at least 2 tents"
          toast.error("Wadi location requires minimum 2 tents")
        } else {
          delete newErrors.numberOfTents
        }
        break
    }

    setErrors(newErrors)
  }

  const handleBlur = (field: string, value: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
    validateField(field, value)
    setUserInteracting(true, 2000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const newErrors: Record<string, string> = {}

    if (!formData.customerName.trim()) {
      newErrors.customerName = "Name is required"
    }

    if (!formData.customerEmail.trim()) {
      newErrors.customerEmail = "Email is required"
    } else if (!/\S+@\S+\.\S+/.test(formData.customerEmail)) {
      newErrors.customerEmail = "Please enter a valid email address"
    }

    if (!formData.customerPhone.trim()) {
      newErrors.customerPhone = "Phone number is required"
    } else if (!formData.customerPhone.startsWith("+971")) {
      newErrors.customerPhone = "Phone number must start with +971"
    }

    if (!formData.bookingDate) {
      newErrors.bookingDate = "Booking date is required"
    } else {
      const selectedDate = new Date(formData.bookingDate)
      const minDate = new Date()
      minDate.setDate(minDate.getDate() + 2)

      if (selectedDate < minDate) {
        newErrors.bookingDate = "Booking must be at least 2 days in advance"
      }
    }

    if (formData.location === "Wadi" && formData.numberOfTents < 2) {
      newErrors.numberOfTents = "Wadi location requires at least 2 tents"
    }

    if (formData.numberOfTents > 5) {
      newErrors.numberOfTents = "For larger bookings or special requests, please enquire directly with our team."
    }

    setErrors(newErrors)

    if (Object.keys(newErrors).length > 0) {
      const firstError = Object.values(newErrors)[0]
      toast.error(firstError)

      // Find first error field and scroll to it
      const firstErrorField = Object.keys(newErrors)[0]
      if (firstErrorField) {
        const element =
          document.querySelector(`[name="${firstErrorField}"]`) || document.querySelector(`#${firstErrorField}`)
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" })
        }
      }
      return
    }

    if (formData.numberOfTents > 5) {
      toast.info("For larger bookings or special requests, please enquire directly with our team.")
      return
    }

    setIsLoading(true)

    // Show loading toast
    const loadingToast = toast.loading("Processing your booking...")

    try {
      const bookingData = {
        ...formData,
        selectedCustomAddOns,
      }

      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create booking")
      }

      const { bookingId } = await response.json()

      const checkoutResponse = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          ...formData,
          selectedCustomAddOns,
          pricing,
        }),
      })

      if (!checkoutResponse.ok) {
        throw new Error("Failed to create checkout session")
      }

      const { url } = await checkoutResponse.json()

      // Dismiss loading toast and show success
      toast.dismiss(loadingToast)
      toast.success("Booking created! Redirecting to payment...")

      // Add a small delay to show the success message
      setTimeout(() => {
        window.location.href = url
      }, 1500)
    } catch (error) {
      console.error("Booking error:", error)

      // Dismiss loading toast and show error
      toast.dismiss(loadingToast)
      const errorMessage = error instanceof Error ? error.message : "Booking failed. Please try again."
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleManualRefresh = async () => {
    console.log("[v0] Manual refresh triggered")
    isUserInteracting.current = false
    await refreshSettings()
  }

  useEffect(() => {
    return () => {
      if (interactionTimeoutRef.current) {
        clearTimeout(interactionTimeoutRef.current)
      }
    }
  }, [])

  if (loadingSettings) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FBF9D9] via-[#E6CFA9] to-[#D3B88C] flex items-center justify-center">
        <div className="text-center animate-fade-in-up">
          <div className="relative">
            <Loader2 className="w-12 h-12 animate-spin text-[#3C2317] mx-auto mb-6" />
            <div className="absolute inset-0 w-12 h-12 border-4 border-[#3C2317]/20 rounded-full animate-pulse mx-auto"></div>
          </div>
          <p className="text-[#3C2317] text-lg font-medium">Loading your premium camping experience...</p>
        </div>
      </div>
    )
  }

  const handleLocationChange = (location: string) => {
    console.log("[v0] Location changed to:", location)
    setFormData((prev) => ({ ...prev, location }))
    setTouched((prev) => ({ ...prev, location: true }))

    if (location === "Wadi") {
      if (formData.numberOfTents < 2 && dateConstraints.remainingCapacity >= 2) {
        setErrors((prev) => ({
          ...prev,
          numberOfTents: "Wadi location requires at least 2 tents",
        }))
        setTouched((prev) => ({ ...prev, numberOfTents: true }))
        toast.error("Wadi location requires minimum 2 tents")
      }
    } else if (location !== "Wadi") {
      // Clear Wadi-specific errors when switching away from Wadi
      setErrors((prev) => {
        const newErrors = { ...prev }
        if (prev.numberOfTents === "Wadi location requires at least 2 tents") {
          delete newErrors.numberOfTents
        }
        if (prev.location?.includes("Wadi location requires minimum 2 tents")) {
          delete newErrors.location
        }
        return newErrors
      })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FBF9D9] via-[#E6CFA9] to-[#D3B88C]">
      <nav className="bg-[#3C2317]/90 backdrop-blur-md border-b border-[#3C2317]/50 shadow-lg sticky top-0 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 sm:py-3">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2 group">
              <div className="relative">
                <Image
                  src="/logo.png"
                  alt="NOMADIC"
                  width={120}
                  height={40}
                  className="h-8 sm:h-10 w-auto group-hover:scale-105 transition-all duration-300"
                />
              </div>
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="mb-6 sm:mb-8 animate-fade-in-up">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="lg:col-span-3">
              <div className="relative h-[250px] sm:h-[300px] md:h-[400px] rounded-xl overflow-hidden shadow-xl group">
                <Image
                  src={
                    campingImages[currentImageIndex].src ||
                    "/placeholder.svg?height=400&width=800&query=luxury desert camping" ||
                    "/placeholder.svg" ||
                    "/placeholder.svg" ||
                    "/placeholder.svg" ||
                    "/placeholder.svg" ||
                    "/placeholder.svg" ||
                    "/placeholder.svg" ||
                    "/placeholder.svg" ||
                    "/placeholder.svg" ||
                    "/placeholder.svg" ||
                    "/placeholder.svg" ||
                    "/placeholder.svg" ||
                    "/placeholder.svg" ||
                    "/placeholder.svg" ||
                    "/placeholder.svg" ||
                    "/placeholder.svg" ||
                    "/placeholder.svg" ||
                    "/placeholder.svg" ||
                    "/placeholder.svg"
                  }
                  alt={campingImages[currentImageIndex].alt}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#3C2317]/40 via-transparent to-transparent"></div>

                <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4 text-[#FBF9D9]">
                  <div className="flex items-center space-x-1 mb-1"></div>
                  <p className="text-xs opacity-90 max-w-xs">{campingImages[currentImageIndex].alt}</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
              {campingImages.slice(1, 5).map((image, index) => (
                <div
                  key={index}
                  className="relative h-[60px] sm:h-[70px] md:h-[95px] rounded-lg overflow-hidden shadow-md cursor-pointer group transition-all duration-300 hover:shadow-xl hover:scale-105"
                  onClick={() => setCurrentImageIndex(index + 1)}
                >
                  <Image
                    src={image.src || "/placeholder.svg?height=95&width=200&query=camping scene"}
                    alt={image.alt}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-[#3C2317]/20 group-hover:bg-[#3C2317]/10 transition-colors duration-300"></div>
                  {currentImageIndex === index + 1 && (
                    <div className="absolute inset-0 border-2 border-[#D3B88C] rounded-lg"></div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="text-center lg:text-left mb-4 sm:mb-6">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#3C2317] mb-2 sm:mb-3 text-balance">
              Nomadic Premium Camping
            </h1>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-3 sm:mb-4">
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 sm:gap-3 mb-2 sm:mb-3 lg:mb-0">
                <div className="flex items-center space-x-1 text-[#3C2317]/80">
                  <MapPin className="w-4 h-4 text-[#D3B88C]" />
                  <span className="text-sm font-medium">Desert • Wadi • Mountain</span>
                </div>
                <div className="flex items-center space-x-1 text-[#3C2317]/80">
                  <Shield className="w-4 h-4 text-[#D3B88C]" />
                  <span className="text-sm font-medium">Private & Secure</span>
                </div>
              </div>
            </div>
            <p className="text-sm sm:text-base text-[#3C2317]/80 max-w-2xl text-pretty mx-auto lg:mx-0">
              Experience the UAE's most luxurious camping adventure with premium amenities, breathtaking locations, and
              unforgettable memories under the stars.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <Card className="border-[#D3B88C]/50 shadow-lg hover:shadow-xl transition-all duration-300 bg-[#FBF9D9]/80 backdrop-blur-sm !pt-0">
              <CardHeader className="bg-gradient-to-r from-[#D3B88C]/20 to-[#E6CFA9]/20 border-b border-[#D3B88C]/50 h-12 py-3">
                <CardTitle className="text-[#3C2317] flex items-center space-x-2 text-lg">
                  <Users className="w-5 h-5 text-[#3C2317]" />
                  <span>Booking Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-6">
                {/* Number of Tents */}
                <div>
                  <Label className="text-[#3C2317] mb-2 block font-medium">Number of Tents *</Label>
                  <div className="text-xs text-[#3C2317]/70 mb-3 text-center  p-2 rounded-lg">
                    Each tent accommodates up to 4 guests
                  </div>
                  <div className="flex items-center justify-center space-x-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={() => handleTentChange(false)}
                      disabled={formData.numberOfTents <= 1}
                      className="border-2 border-[#D3B88C] hover:border-[#3C2317] cursor-pointer hover:bg-[#D3B88C] transition-all duration-300 h-10 w-10 rounded-xl"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-[#3C2317] mb-1">{formData.numberOfTents}</div>
                      <div className="text-xs text-[#3C2317]/70">{formData.numberOfTents === 1 ? "tent" : "tents"}</div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={() => handleTentChange(true)}
                      disabled={formData.numberOfTents >= 5}
                      className="border-2 border-[#D3B88C] hover:border-[#3C2317] hover:bg-[#D3B88C] cursor-pointer transition-all duration-300 h-10 w-10 rounded-xl"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {errors.numberOfTents && touched.numberOfTents && (
                    <p className="text-sm text-red-600 mt-2 flex items-center justify-center space-x-1">
                      <X className="w-3 h-3" />
                      <span>{errors.numberOfTents}</span>
                    </p>
                  )}
                  {formData.numberOfTents >= 5 && (
                    <p className="text-xs text-[#3C2317]/80 mt-2 text-center font-medium">
                      For larger bookings or special requests, please enquire directly with our team.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 !py-7">
                  {/* Adults */}
                  <div>
                    <Label className="text-[#3C2317] mb-2 block font-medium">Adults *</Label>
                    <div className="flex items-center justify-center space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAdultsChange(false)}
                        disabled={adults <= 1}
                        className="border-2 border-[#D3B88C] hover:border-[#3C2317] cursor-pointer transition-all duration-300 h-8 w-8 rounded-lg hover:bg-[#D3B88C]"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <div className="text-center min-w-[60px]">
                        <div className="text-lg font-bold text-[#3C2317]">{adults}</div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAdultsChange(true)}
                        disabled={adults >= 20 || adults + children >= formData.numberOfTents * 4}
                        className="border-2 border-[#D3B88C] hover:border-[#3C2317] cursor-pointer hover:bg-[#D3B88C] transition-all duration-300 h-8 w-8 rounded-lg"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Children */}
                  <div>
                    <Label className="text-[#3C2317] mb-2 block font-medium">
                      Children <span className="text-xs text-[#3C2317]/70">(under 12)</span>
                    </Label>
                    <div className="flex items-center justify-center space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleChildrenChange(false)}
                        disabled={children <= 0}
                        className="border-2 border-[#D3B88C] hover:border-[#3C2317] cursor-pointer transition-all duration-300 h-8 w-8 rounded-lg hover:bg-[#D3B88C]"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <div className="text-center min-w-[60px]">
                        <div className="text-lg font-bold text-[#3C2317]">{children}</div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleChildrenChange(true)}
                        disabled={children >= 10 || adults + children >= formData.numberOfTents * 4}
                        className="border-2 border-[#D3B88C] hover:border-[#3C2317] cursor-pointer hover:bg-[#D3B88C] transition-all duration-300 h-8 w-8 rounded-lg"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    {children > 0 && (
                      <p className="text-xs text-green-600 mt-1 text-center font-medium">
                        Free portable toilet included!
                      </p>
                    )}
                  </div>
                </div>

                {formData.numberOfTents > 0 && (
                  <div>
                    <Label className="text-[#3C2317] mb-3 block font-medium">Sleeping Arrangements</Label>
                    <div className="text-xs text-[#3C2317]/60 mb-3">
                      Configure how guests will sleep in each tent (max 4 guests per tent)
                    </div>
                    <div className="space-y-3">
                      {formData.sleepingArrangements.map((arrangement) => (
                        <div
                          key={arrangement.tentNumber}
                          className="flex items-center justify-between p-3 bg-[#E6CFA9]/30 rounded-xl"
                        >
                          <span className="text-[#3C2317] font-medium text-sm">Tent {arrangement.tentNumber}</span>
                          <Select
                            value={arrangement.arrangement}
                            onValueChange={(value: "all-singles" | "two-doubles" | "mix") =>
                              handleSleepingArrangementChange(arrangement.tentNumber, value)
                            }
                          >
                            <SelectTrigger className="w-40 border border-[#D3B88C] focus:border-[#3C2317] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all-singles">4 single beds</SelectItem>
                              <SelectItem value="two-doubles">2 double beds (4 guests)</SelectItem>
                              <SelectItem value="mix">1 double + 2 singles (4 guests)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-[#D3B88C]/50 shadow-lg hover:shadow-xl transition-all duration-300 bg-[#FBF9D9]/80 backdrop-blur-sm !pt-0">
              <CardHeader className="bg-gradient-to-r from-[#D3B88C]/20 to-[#E6CFA9]/20 border-b border-[#D3B88C]/50 h-12 py-3">
                <CardTitle className="text-[#3C2317] flex items-center space-x-2 text-lg">
                  <Calendar className="w-5 h-5 text-[#3C2317]" />
                  <span>Choose your perfect date</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="mb-3">
                  <Label htmlFor="bookingDate" className="text-[#3C2317] font-medium mb-2 block">
                    Select Date *
                  </Label>
                </div>

                <Input
                  id="bookingDate"
                  type="date"
                  value={formData.bookingDate}
                  onChange={(e) => {
                    handleInputChange("bookingDate", e.target.value)
                    if (e.target.value) {
                      setSelectedDate(new Date(e.target.value))
                      validateField("bookingDate", e.target.value)
                    }
                  }}
                  onBlur={(e) => handleBlur("bookingDate", e.target.value)}
                  min={minDate.toISOString().split("T")[0]}
                  className={cn(
                    "border-2 border-[#D3B88C] focus:border-[#3C2317] focus:ring-2 focus:ring-[#3C2317]/20 transition-all duration-300 h-10 sm:h-12 rounded-xl cursor-pointer",
                    errors.bookingDate && touched.bookingDate && "border-red-500 focus:border-red-500",
                  )}
                />

                {errors.bookingDate && touched.bookingDate && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700 flex items-center space-x-2">
                      <X className="w-4 h-4 flex-shrink-0" />
                      <span>{errors.bookingDate}</span>
                    </p>
                  </div>
                )}

                <div className="mt-2 ">
                  <p className="text-xs text-blue-700 flex items-center space-x-2">
                    <Shield className="w-3 h-3 flex-shrink-0 text-blue-600" />
                    <span>Minimum 2 days advance booking required for premium preparation</span>
                  </p>
                </div>
                {formData.bookingDate && dateConstraints.remainingCapacity !== undefined && (
                  <div className="mt-2">
                    {dateConstraints.remainingCapacity > 0 ? (
                      <div className="flex items-center space-x-2 text-sm">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-green-700">
                          {dateConstraints.remainingCapacity} tent{dateConstraints.remainingCapacity === 1 ? "" : "s"}{" "}
                          available (10 max per day)
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 text-sm">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span className="text-red-700">Fully booked (10 tents maximum per day)</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <form className="space-y-4 sm:space-y-6">
              <Card className="border-[#D3B88C]/50 shadow-lg hover:shadow-xl transition-all duration-300 bg-[#FBF9D9]/80 backdrop-blur-sm !pt-0">
                <CardHeader className="bg-gradient-to-r from-[#D3B88C]/20 to-[#E6CFA9]/20 border-b border-[#D3B88C]/50  h-12 py-3">
                  <CardTitle className="text-[#3C2317] text-lg">Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-4">
                  <div>
                    <Label htmlFor="customerName" className="text-[#3C2317] mb-2 block font-medium">
                      Full Name *
                    </Label>
                    <Input
                      id="customerName"
                      value={formData.customerName}
                      onChange={(e) => handleInputChange("customerName", e.target.value)}
                      onBlur={(e) => handleBlur("customerName", e.target.value)}
                      className={cn(
                        "border-2 border-[#D3B88C] focus:border-[#3C2317] focus:ring-2 focus:ring-[#3C2317]/20 transition-all duration-300 h-9 sm:h-10 rounded-xl",
                        errors.customerName && touched.customerName && "border-red-500 focus:border-red-500",
                      )}
                      placeholder="Enter your full name"
                    />
                    {errors.customerName && touched.customerName && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-700 flex items-center space-x-2">
                          <X className="w-4 h-4 flex-shrink-0" />
                          <span>{errors.customerName}</span>
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="customerEmail" className="text-[#3C2317] mb-2 block font-medium">
                      Email Address *
                    </Label>
                    <Input
                      id="customerEmail"
                      type="email"
                      value={formData.customerEmail}
                      onChange={(e) => handleInputChange("customerEmail", e.target.value)}
                      onBlur={(e) => handleBlur("customerEmail", e.target.value)}
                      className={cn(
                        "border-2 border-[#D3B88C] focus:border-[#3C2317] focus:ring-2 focus:ring-[#3C2317]/20 transition-all duration-300 h-9 sm:h-10 rounded-xl",
                        errors.customerEmail && touched.customerEmail && "border-red-500 focus:border-red-500",
                      )}
                      placeholder="your.email@example.com"
                    />
                    {errors.customerEmail && touched.customerEmail && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-700 flex items-center space-x-2">
                          <X className="w-4 h-4 flex-shrink-0" />
                          <span>{errors.customerEmail}</span>
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="customerPhone" className="text-[#3C2317] mb-2 block font-medium">
                      Phone Number *
                    </Label>
                    <Input
                      id="customerPhone"
                      value={formData.customerPhone}
                      onChange={(e) => handleInputChange("customerPhone", e.target.value)}
                      onBlur={(e) => handleBlur("customerPhone", e.target.value)}
                      placeholder="+971501234567"
                      className={cn(
                        "border-2 border-[#D3B88C] focus:border-[#3C2317] focus:ring-2 focus:ring-[#3C2317]/20 transition-all duration-300 h-9 sm:h-10 rounded-xl",
                        errors.customerPhone && touched.customerPhone && "border-red-500 focus:border-red-500",
                      )}
                    />
                    {errors.customerPhone && touched.customerPhone && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-700 flex items-center space-x-2">
                          <X className="w-4 h-4 flex-shrink-0" />
                          <span>{errors.customerPhone}</span>
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-[#D3B88C]/50 shadow-lg hover:shadow-xl transition-all duration-300 bg-[#FBF9D9]/80 backdrop-blur-sm !pt-0">
                <CardHeader className="bg-gradient-to-r from-[#D3B88C]/20 to-[#E6CFA9]/20 border-b border-[#D3B88C]/50  h-12 py-3">
                  <CardTitle className="text-[#3C2317] text-lg">Location & Setup</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-[#3C2317] font-semibold text-sm">
                      Location *
                    </Label>
                    {locationMessage && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-amber-800 text-sm">{locationMessage}</p>
                      </div>
                    )}

                    <Select
                      value={formData.location}
                      onValueChange={(value: "Desert" | "Mountain" | "Wadi") => {
                        console.log("[v0] Location selection attempted:", value)
                        console.log("[v0] Available locations:", dateConstraints.availableLocations)
                        console.log("[v0] Locked location:", dateConstraints.lockedLocation)

                        if (dateConstraints.lockedLocation && value !== dateConstraints.lockedLocation) {
                          console.log("[v0] Preventing location change - date is locked")
                          setLocationMessage(
                            `This date is reserved for ${dateConstraints.lockedLocation} location only. Please select a different date to book ${value}.`,
                          )
                          return
                        }

                        handleInputChange("location", value)
                        validateField("numberOfTents", formData.numberOfTents.toString())
                        setLocationMessage("")
                      }}
                      disabled={checkingConstraints}
                    >
                      <SelectTrigger className="border-2 border-[#D3B88C] focus:border-[#3C2317] focus:ring-2 focus:ring-[#3C2317]/20 transition-all duration-300 h-10 sm:h-12 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem
                          value="Desert"
                          disabled={dateConstraints.lockedLocation && dateConstraints.lockedLocation !== "Desert"}
                        >
                          🏜️ Desert
                          {dateConstraints.lockedLocation && dateConstraints.lockedLocation !== "Desert" && (
                            <span className="text-xs text-gray-500 ml-2">(Not available for this date)</span>
                          )}
                        </SelectItem>
                        <SelectItem value="Mountain" disabled>
                          ⛰️ Mountain (Coming Soon)
                        </SelectItem>
                        <SelectItem
                          value="Wadi"
                          disabled={dateConstraints.lockedLocation && dateConstraints.lockedLocation !== "Wadi"}
                        >
                          🌊 Wadi
                          <span className="text-xs text-amber-600 ml-2">(min. 2 tents required)</span>
                          {dateConstraints.lockedLocation && dateConstraints.lockedLocation !== "Wadi" && (
                            <span className="text-xs text-gray-500 ml-2">(Not available for this date)</span>
                          )}
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    {formData.location === "Wadi" && (
                      <div className="space-y-2">
                        <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <div className="text-sm">
                              <span className="font-medium text-blue-800">Premium Wadi Location</span>
                              <p className="text-blue-700 mt-1">
                                Scenic valley setting with enhanced privacy • Requires minimum 2 tents • Additional 250
                                AED surcharge
                              </p>
                            </div>
                          </div>
                        </div>

                        {dateConstraints.remainingCapacity < 2 && (
                          <div className="p-3 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-lg">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
                              <span className="text-sm font-medium text-red-800">
                                Wadi requires 2 tents and on this date max {dateConstraints.remainingCapacity} tent
                                {dateConstraints.remainingCapacity === 1 ? "" : "s"} you can book, so choose another
                                date for this place
                              </span>
                            </div>
                          </div>
                        )}

                        {formData.numberOfTents < 2 && dateConstraints.remainingCapacity >= 2 && (
                          <div className="p-3 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-lg">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
                              <span className="text-sm font-medium text-red-800">
                                Please select at least 2 tents for Wadi location
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {formData.location === "Desert" && (
                      <div className="mt-2 p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-amber-500 rounded-full flex-shrink-0"></div>
                          <span className="text-sm font-medium text-amber-800">
                            Classic Desert Experience • No additional surcharge
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-[#D3B88C]/50 shadow-lg hover:shadow-xl transition-all duration-300 bg-[#FBF9D9]/80 backdrop-blur-sm !pt-0">
                <CardHeader className="bg-gradient-to-r from-[#D3B88C]/20 to-[#E6CFA9]/20 border-b border-[#D3B88C]/50  h-12 py-3">
                  <CardTitle className="text-[#3C2317] text-lg">Premium Add-ons</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-1">
                  <div className="grid gap-1">
                    {/* Charcoal Add-on */}
                    <div className="flex items-start space-x-3 p-3 rounded-xl hover:bg-[#E6CFA9]/50 transition-all duration-300 border border-transparent hover:border-[#D3B88C]/30">
                      <Checkbox
                        id="charcoal"
                        checked={formData.addOns.charcoal}
                        onCheckedChange={(checked) => handleAddOnChange("charcoal", checked as boolean)}
                        className="border-2 border-[#3C2317] data-[state=checked]:bg-[#3C2317] data-[state=checked]:border-[#3C2317] h-4 w-4 mt-0.5 flex-shrink-0 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <Label htmlFor="charcoal" className="text-[#3C2317] font-medium text-sm cursor-pointer">
                            Premium Charcoal
                          </Label>
                          <span className="text-[#3C2317] font-bold text-sm whitespace-nowrap ml-2">
                            AED {settings?.addOnPrices?.charcoal || 60}
                          </span>
                        </div>
                        <p className="text-xs text-[#3C2317]/80 mt-1">High-quality charcoal for perfect grilling</p>
                      </div>
                    </div>

                    {/* Firewood Add-on */}
                    <div className="flex items-start space-x-3 p-3 rounded-xl hover:bg-[#E6CFA9]/50 transition-all duration-300 border border-transparent hover:border-[#D3B88C]/30">
                      <Checkbox
                        id="firewood"
                        checked={formData.addOns.firewood}
                        onCheckedChange={(checked) => handleAddOnChange("firewood", checked as boolean)}
                        className="border-2 border-[#3C2317] data-[state=checked]:bg-[#3C2317] data-[state=checked]:border-[#3C2317] h-4 w-4 mt-0.5 flex-shrink-0 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <Label htmlFor="firewood" className="text-[#3C2317] font-medium text-sm cursor-pointer">
                            Premium Firewood
                          </Label>
                          <span className="text-[#3C2317] font-bold text-sm whitespace-nowrap ml-2">
                            AED {settings?.addOnPrices?.firewood || 75}
                          </span>
                        </div>
                        <p className="text-xs text-[#3C2317]/80 mt-1">Seasoned wood for cozy campfires</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-3 rounded-xl hover:bg-[#E6CFA9]/50 transition-all duration-300 border border-transparent hover:border-[#D3B88C]/30">
                      <Checkbox
                        id="portableToilet"
                        checked={formData.addOns.portableToilet}
                        onCheckedChange={(checked) => handleAddOnChange("portableToilet", checked as boolean)}
                        className="border-2 border-[#3C2317] data-[state=checked]:bg-[#3C2317] data-[state=checked]:border-[#3C2317] h-4 w-4 mt-0.5 flex-shrink-0 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <Label htmlFor="portableToilet" className="text-[#3C2317] font-medium text-sm cursor-pointer">
                            Portable Camping Toilet
                          </Label>
                          <span className="text-[#3C2317] font-bold text-sm whitespace-nowrap ml-2">
                            {formData.hasChildren
                              ? "FREE with children"
                              : `AED ${settings?.addOnPrices?.portableToilet || 200}`}
                          </span>
                        </div>
                        <p className="text-xs text-[#3C2317]/80 mt-1">Private, clean facilities for your comfort</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {settings?.customAddOns && settings.customAddOns.length > 0 && (
                <Card className="border-[#D3B88C]/50 shadow-lg hover:shadow-xl transition-all duration-300 bg-[#FBF9D9]/80 backdrop-blur-sm !pt-0">
                  <CardHeader className="bg-gradient-to-r from-[#D3B88C]/20 to-[#E6CFA9]/20 border-b border-[#D3B88C]/50  h-12 py-3">
                    <CardTitle className="text-[#3C2317] flex items-center justify-between text-lg">
                      <span>Exclusive Services</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleManualRefresh}
                        disabled={loadingSettings}
                        className="text-[#3C2317] hover:text-[#3C2317]/80 hover:bg-[#3C2317]/10 p-1"
                      >
                        {loadingSettings ? <Loader2 className="w-3 h-3 animate-spin" /> : "Refresh"}
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-1">
                    {settings.customAddOns.map((addon) => (
                      <div
                        key={addon.id}
                        className="flex items-start space-x-3 p-3 rounded-xl hover:bg-[#E6CFA9]/50 transition-all duration-300 border border-transparent hover:border-[#D3B88C]/30"
                      >
                        <Checkbox
                          id={`custom-${addon.id}`}
                          checked={selectedCustomAddOns.includes(addon.id)}
                          onCheckedChange={(checked) => handleCustomAddOnChange(addon.id, checked as boolean)}
                          className="border-2 border-[#3C2317] data-[state=checked]:bg-[#3C2317] data-[state=checked]:border-[#3C2317] h-4 w-4 mt-0.5 flex-shrink-0 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1">
                            <Label
                              htmlFor={`custom-${addon.id}`}
                              className="text-[#3C2317] font-medium text-sm cursor-pointer"
                            >
                              {addon.name}
                            </Label>
                            <span className="text-[#3C2317] font-bold text-sm whitespace-nowrap ml-2">
                              AED {addon.price}
                            </span>
                          </div>
                          {addon.description && <p className="text-xs text-[#3C2317]/80 mt-1">{addon.description}</p>}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <Card className="border-[#D3B88C]/50 shadow-lg hover:shadow-xl transition-all duration-300 bg-[#FBF9D9]/80 backdrop-blur-sm !pt-0">
                <CardHeader className="bg-gradient-to-r from-[#D3B88C]/20 to-[#E6CFA9]/20 border-b border-[#D3B88C]/50  h-12 py-3">
                  <CardTitle className="text-[#3C2317] text-lg">Special Requests</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  <Label htmlFor="notes" className="text-[#3C2317] mb-2 block font-medium">
                    Additional Notes
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder="Any special requests, dietary requirements, or celebration details..."
                    value={formData.notes}
                    onChange={(e) => handleInputChange("notes", e.target.value)}
                    rows={3}
                    className="border-2 border-[#D3B88C] focus:border-[#3C2317] focus:ring-2 focus:ring-[#3C2317]/20 transition-all duration-300 rounded-xl resize-none text-sm"
                  />
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-2 gap-3 sm:gap-4">
                <Card className="border-[#D3B88C]/50 shadow-lg bg-gradient-to-br from-[#FBF9D9] to-[#E6CFA9] !py-0">
                  <CardHeader className="bg-gradient-to-r from-[#D3B88C]/20 to-[#E6CFA9]/20 border-b border-[#D3B88C]  h-12 py-3">
                    <CardTitle className="text-[#3C2317] flex items-center text-lg">
                      <Check className="w-4 h-4 mr-2" />
                      Premium Inclusions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <ul className="space-y-2 text-[#3C2317] text-sm">
                      <li className="flex items-start space-x-2">
                        <Check className="w-4 h-4 mt-0.5 text-[#3C2317] flex-shrink-0" />
                        <span>Luxury tent setup for up to 4 persons</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <Check className="w-4 h-4 mt-0.5 text-[#3C2317] flex-shrink-0" />
                        <span>Premium bedding & sleeping pillows</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <Check className="w-4 h-4 mt-0.5 text-[#3C2317] flex-shrink-0" />
                        <span>Winter bedding set & blankets</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <Check className="w-4 h-4 mt-0.5 text-[#3C2317] flex-shrink-0" />
                        <span>Professional fire pit setup</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <Check className="w-4 h-4 mt-0.5 text-[#3C2317] flex-shrink-0" />
                        <span>Safety equipment & fire extinguisher</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <Check className="w-4 h-4 mt-0.5 text-[#3C2317] flex-shrink-0" />
                        <span>Comfortable foldable furniture</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <Check className="w-4 h-4 mt-0.5 text-[#3C2317] flex-shrink-0" />
                        <span>Complete cooking equipment & utensils</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <Check className="w-4 h-4 mt-0.5 text-[#3C2317] flex-shrink-0" />
                        <span>Ambient lighting & power solutions</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border-[#D3B88C]/50 shadow-lg bg-gradient-to-br from-[#FBF9D9] to-[#E6CFA9] !py-0">
                  <CardHeader className="bg-gradient-to-r from-[#D3B88C]/20 to-[#E6CFA9]/20 border-b border-[#D3B88C]  h-12 py-3">
                    <CardTitle className="text-[#3C2317] flex items-center text-lg">
                      <X className="w-4 h-4 mr-2" />
                      Not Included
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <ul className="space-y-2 text-[#3C2317] text-sm">
                      <li className="flex items-start space-x-2">
                        <X className="w-4 h-4 mt-0.5 text-[#3C2317] flex-shrink-0" />
                        <span>Food & beverages (bring your favorites)</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <X className="w-4 h-4 mt-0.5 text-[#3C2317] flex-shrink-0" />
                        <span>Fuel & charcoal (available as add-ons)</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <X className="w-4 h-4 mt-0.5 text-[#3C2317] flex-shrink-0" />
                        <span>Personal toiletries & towels</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <X className="w-4 h-4 mt-0.5 text-[#3C2317] flex-shrink-0" />
                        <span>Transportation to location</span>
                      </li>
                    </ul>
                    <div className="mt-4 p-3 bg-[#E6CFA9] rounded-xl">
                      <p className="text-xs text-[#3C2317] font-medium">
                        💡 Pro Tip: We welcome you to bring your own food and drinks for a personalized experience!
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </form>
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-16 sm:top-20 border-[#D3B88C]/50 shadow-2xl bg-gradient-to-br from-[#FBF9D9]/95 to-[#E6CFA9]/95 backdrop-blur-md overflow-hidden !pt-0 transform hover:scale-[1.02] transition-all duration-300">
              <CardHeader className="bg-gradient-to-r from-[#3C2317] to-[#5D4037] text-[#FBF9D9] p-4 sm:p-6 relative overflow-hidden">
                <div className="relative z-10">
                  <CardTitle className="text-xl font-bold flex items-center space-x-2">
                    <span>Booking Summary</span>
                  </CardTitle>
                  <p className="text-[#FBF9D9]/90 text-sm">Your luxury camping experience</p>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex justify-between items-center p-4 bg-gradient-to-r from-[#E6CFA9]/40 to-[#D3B88C]/30 rounded-xl border border-[#D3B88C]/30 shadow-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-[#3C2317] rounded-full flex items-center justify-center">
                        <span className="text-[#FBF9D9] text-xs font-bold">{formData.numberOfTents}</span>
                      </div>
                      <div>
                        <span className="text-[#3C2317] font-semibold text-sm">
                          {formData.numberOfTents} Tent{formData.numberOfTents > 1 ? "s" : ""}
                        </span>
                        <p className="text-[#3C2317]/70 text-xs">{formData.location} Location</p>
                      </div>
                    </div>
                    <span className="font-bold text-[#3C2317] text-lg">AED {pricing.tentPrice.toFixed(2)}</span>
                  </div>

                  {formData.location === "Wadi" && formData.numberOfTents < 2 && (
                    <div className="mt-3 p-4 bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-400 rounded-lg shadow-sm">
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-red-600 text-sm font-bold">!</span>
                        </div>
                        <div>
                          <p className="text-red-800 font-semibold text-sm">Wadi Location Requirement</p>
                          <p className="text-red-700 text-xs mt-1 leading-relaxed">
                            Minimum 2 tents required for Wadi bookings due to logistics and safety requirements
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {formData.location === "Wadi" && (
                    <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-blue-800 font-medium text-sm">Wadi Premium Location</span>
                        </div>
                        <span className="text-blue-900 font-semibold text-sm">
                          +AED {settings?.wadiSurcharge || 250}
                        </span>
                      </div>
                      <p className="text-blue-700 text-xs mt-1">
                        Includes exclusive desert location access and enhanced amenities
                      </p>
                    </div>
                  )}

                  {pricing.addOnsCost > 0 && (
                    <div className="flex justify-between items-center text-sm p-3 bg-gradient-to-r from-[#E6CFA9]/20 to-[#D3B88C]/20 rounded-lg border border-[#D3B88C]/20">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-[#3C2317] rounded-full"></div>
                        <span className="text-[#3C2317]/80 font-medium">Premium Add-ons</span>
                      </div>
                      <span className="text-[#3C2317] font-semibold">AED {pricing.addOnsCost.toFixed(2)}</span>
                    </div>
                  )}

                  {pricing.customAddOnsCost > 0 && (
                    <div className="flex justify-between items-center text-sm p-3 bg-gradient-to-r from-[#E6CFA9]/20 to-[#D3B88C]/20 rounded-lg border border-[#D3B88C]/20">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-[#D3B88C] rounded-full"></div>
                        <span className="text-[#3C2317]/80 font-medium">Exclusive Services</span>
                      </div>
                      <span className="text-[#3C2317] font-semibold">AED {pricing.customAddOnsCost.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="border-t border-[#D3B88C] pt-3 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[#3C2317] font-medium text-sm">Subtotal</span>
                      <span className="text-[#3C2317] font-bold text-sm">AED {pricing.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-[#3C2317]/80">VAT ({((settings?.vatRate || 0.05) * 100).toFixed(0)}%)</span>
                      <span className="text-[#3C2317] font-medium">AED {pricing.vat.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="border-t-2 border-[#3C2317]/20 pt-3">
                    <div className="flex justify-between text-lg font-bold p-3 bg-gradient-to-r from-[#3C2317]/10 to-[#5D4037]/10 rounded-xl">
                      <span className="text-[#3C2317]">Total</span>
                      <span className="text-[#3C2317]">AED {pricing.total.toFixed(2)}</span>
                    </div>
                  </div>

                  <Button
                    onClick={handleSubmit}
                    type="submit"
                    className="w-full bg-gradient-to-r from-[#3C2317] to-[#5D4037] hover:from-[#3C2317]/90 hover:to-[#5D4037]/90 text-[#FBF9D9] font-bold py-3 text-base shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 cursor-pointer"
                    size="lg"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Processing...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Shield className="w-4 h-4" />
                        <span>Reserve Your Adventure</span>
                      </div>
                    )}
                  </Button>
                </div>

                <div className="text-center">
                  <p className="text-xs text-[#3C2317]/80 mb-3">
                    🔒 Secure payment powered by Stripe. You will be redirected to complete your payment safely.
                  </p>
                </div>

                <div className="bg-gradient-to-r from-[#E6CFA9]/50 to-[#D3B88C]/20 p-4 rounded-xl border border-[#3C2317]/10">
                  <h4 className="font-bold text-[#3C2317] mb-3 text-base">Pricing Guide</h4>
                  <ul className="text-sm text-[#3C2317]/80 space-y-1">
                    <li className="flex justify-between">
                      <span>Weekdays (Mon-Thu):</span>
                      <span className="font-medium">AED 1297.80 + VAT</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Weekends (Fri-Sun):</span>
                      <span className="font-medium">AED 1497.80 + VAT</span>
                    </li>
                    <li className="flex justify-between">
                      <span>2+ tents (any day):</span>
                      <span className="font-medium">AED 1297.80 each + VAT</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Wadi surcharge:</span>
                      <span className="font-medium">AED {settings?.wadiSurcharge || 250}</span>
                    </li>
                    <li className="flex justify-between text-[#3C2317]">
                      <span>Children bonus:</span>
                      <span className="font-medium">FREE portable toilet</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
