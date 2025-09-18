//@ts-nocheck
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  MapPin,
  Calendar,
  Users,
  Mail,
  Star,
  Shield,
} from "lucide-react";
import Link from "next/link";
import type { Booking } from "@/lib/types";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import Image from "next/image";

export default function BookingSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionId) {
      fetchBookingDetails();
    }
  }, [sessionId]);

  const fetchBookingDetails = async () => {
    try {
      const response = await fetch(
        `/api/booking-success?session_id=${sessionId}`
      );
      if (response.ok) {
        const data = await response.json();
        setBooking(data.booking);
      }
    } catch (error) {
      console.error("Error fetching booking details:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FBF9D9] via-[#E6CFA9] to-[#D3B88C] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3C2317] mx-auto mb-4"></div>
          <p className="text-[#3C2317]">Loading your booking details...</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FBF9D9] via-[#E6CFA9] to-[#D3B88C] flex items-center justify-center">
        <Card className="max-w-md border-[#D3B88C]/50 bg-[#FBF9D9]/80 backdrop-blur-sm">
          <CardContent className="text-center p-6">
            <p className="text-[#3C2317] mb-4">
              Unable to load booking details
            </p>
            <Button
              asChild
              className="bg-gradient-to-r from-[#3C2317] to-[#5D4037] hover:from-[#3C2317]/90 hover:to-[#5D4037]/90 text-[#FBF9D9]"
            >
              <Link href="/">Return Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-[#3C2317]/90 backdrop-blur-md border-b border-[#3C2317]/50 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-4 group">
              <Image
                src="/logo.png"
                alt="NOMADIC"
                width={140}
                height={45}
                className="h-10 w-auto"
              />
            </Link>
           
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-full flex justify-center">
            <div className="w-96">
              <DotLottieReact src="/tent.lottie" loop autoplay />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-[#3C2317] mb-4">
            Booking <span className="text-[#D3B88C]">Confirmed!</span>
          </h1>
          <p className="text-lg text-[#3C2317]/80">
            Thank you for choosing Nomadic. Your desert adventure is booked and
            confirmed.
          </p>
        </div>

        {/* Booking Details */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border-[#D3B88C]/50 shadow-xl bg-[#FBF9D9]/80 backdrop-blur-sm !py-0">
            <CardHeader className="bg-gradient-to-r from-[#D3B88C]/20 to-[#E6CFA9]/20 border-b border-[#D3B88C]/50  h-12 py-3">
              <CardTitle className="text-[#3C2317] text-xl">
                Booking Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-[#3C2317]" />
                <div>
                  <p className="font-medium text-[#3C2317]">Date</p>
                  <p className="text-[#3C2317]/80">
                    {new Date(booking.bookingDate).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <MapPin className="w-5 h-5 text-[#3C2317]" />
                <div>
                  <p className="font-medium text-[#3C2317]">Location</p>
                  <p className="text-[#3C2317]/80">{booking.location}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-[#3C2317]" />
                <div>
                  <p className="font-medium text-[#3C2317]">Tents</p>
                  <p className="text-[#3C2317]/80">
                    {booking.numberOfTents} tent
                    {booking.numberOfTents > 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              {(booking.addOns.charcoal ||
                booking.addOns.firewood ||
                booking.addOns.portableToilet) && (
                <div>
                  <p className="font-medium text-[#3C2317] mb-2">Add-ons</p>
                  <ul className="text-[#3C2317]/80 space-y-1">
                    {booking.addOns.charcoal && <li>• Premium Charcoal</li>}
                    {booking.addOns.firewood && <li>• Premium Firewood</li>}
                    {booking.addOns.portableToilet && (
                      <li>• Luxury Portable Toilet</li>
                    )}
                  </ul>
                </div>
              )}

              {booking.notes && (
                <div>
                  <p className="font-medium text-[#3C2317]">Special Requests</p>
                  <p className="text-[#3C2317]/80">{booking.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-[#D3B88C]/50 shadow-xl bg-[#FBF9D9]/80 backdrop-blur-sm !py-0">
            <CardHeader className="bg-gradient-to-r from-[#D3B88C]/20 to-[#E6CFA9]/20 border-b border-[#D3B88C]/50  h-12 py-3">
              <CardTitle className="text-[#3C2317] text-xl">
                Payment Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#3C2317]">Subtotal</span>
                  <span className="text-[#3C2317]">
                    AED {booking.subtotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-[#3C2317]/80">
                  <span>VAT (5%)</span>
                  <span>AED {booking.vat.toFixed(2)}</span>
                </div>
                <div className="border-t border-[#D3B88C] pt-2">
                  <div className="flex justify-between text-lg font-bold text-[#3C2317]">
                    <span>Total Paid</span>
                    <span>AED {booking.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-[#84cc16]/20 to-[#65a30d]/20 p-4 rounded-xl border border-[#84cc16]/30">
  <div className="flex items-center space-x-2">
    <CheckCircle className="w-5 h-5 text-[#3f6212]" />
    <span className="font-medium text-[#365314]">
      Payment Successful
    </span>
  </div>
</div>
            </CardContent>
          </Card>
        </div>

        {/* Next Steps */}
        <Card className="mt-8 border-[#D3B88C]/50 shadow-xl bg-[#FBF9D9]/80 backdrop-blur-sm !py-0">
          <CardHeader className="bg-gradient-to-r from-[#D3B88C]/20 to-[#E6CFA9]/20 border-b border-[#D3B88C]/50  h-12 py-3">
            <CardTitle className="text-[#3C2317] text-xl">
              What Happens Next?
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start space-x-3">
              <Mail className="w-5 h-5 text-[#3C2317] mt-1" />
              <div>
                <p className="font-medium text-[#3C2317]">Confirmation Email</p>
                <p className="text-[#3C2317]/80">
                  You'll receive a detailed confirmation email at{" "}
                  <span className="font-medium">{booking.customerEmail}</span>{" "}
                  within the next few minutes.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Calendar className="w-5 h-5 text-[#3C2317] mt-1" />
              <div>
                <p className="font-medium text-[#3C2317]">Pre-Trip Contact</p>
                <p className="text-[#3C2317]/80">
                  Our team will contact you 24-48 hours before your trip with
                  final details and meeting instructions.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Shield className="w-5 h-5 text-[#3C2317] mt-1" />
              <div>
                <p className="font-medium text-[#3C2317]">Adventure Day</p>
                <p className="text-[#3C2317]/80">
                  Arrive at the designated meeting point and get ready for an
                  unforgettable desert experience!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <Button
            asChild
            size="lg"
            className="bg-gradient-to-r from-[#3C2317] to-[#5D4037] hover:from-[#3C2317]/90 hover:to-[#5D4037]/90 text-[#FBF9D9] font-bold py-4 text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            <Link href="/">Return Home</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="border-2 border-[#D3B88C] hover:border-[#3C2317] hover:bg-[#3C2317]/5 text-[#3C2317] transition-all duration-300 hover:text-[#3C2317]"
          >
            <Link href="/">Book Another Trip</Link>
          </Button>
        </div>

        {/* Conversion Tracking */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Google Analytics conversion tracking
              if (typeof gtag !== 'undefined') {
                gtag('event', 'purchase', {
                  transaction_id: '${booking._id}',
                  value: ${booking.total},
                  currency: 'AED',
                  items: [{
                    item_id: 'camping-${booking.location.toLowerCase()}',
                    item_name: 'Desert Camping - ${booking.location}',
                    category: 'Camping',
                    quantity: ${booking.numberOfTents},
                    price: ${booking.total}
                  }]
                });
              }
              
              // Facebook Pixel conversion tracking
              if (typeof fbq !== 'undefined') {
                fbq('track', 'Purchase', {
                  value: ${booking.total},
                  currency: 'AED',
                  content_ids: ['camping-${booking.location.toLowerCase()}'],
                  content_type: 'product'
                });
              }
            `,
          }}
        />
      </div>
    </div>
  );
}
