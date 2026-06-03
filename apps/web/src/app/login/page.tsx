"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Leaf, ArrowRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import apiClient from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [digits, setDigits] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const sendOtp = useMutation({
    mutationFn: (p: string) => apiClient.post("/auth/request-otp", { phone: p }),
    onSuccess: (_: unknown, p: string) => {
      setPhone(p);
      setStep("otp");
      setError("");
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { error?: { message?: string } } } };
      setError(err?.response?.data?.error?.message ?? "Failed to send OTP");
    },
  });

  const verifyOtp = useMutation({
    mutationFn: ({ phone, code }: { phone: string; code: string }) =>
      apiClient.post("/auth/verify-otp", { phone, code }),
    onSuccess: (res: {
      data: { data: { accessToken: string; refreshToken: string; user: { role: string; name: string } } };
    }) => {
      const { accessToken, refreshToken, user } = res.data.data;
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("user", JSON.stringify(user));
      document.cookie = `accessToken=${accessToken}; path=/; max-age=86400`;
      document.cookie = `userRole=${user.role}; path=/; max-age=86400`;
      if (user.role === 'admin') router.push('/admin/dashboard');
      else if (user.role === 'warehouse_mgr') router.push('/warehouse/dashboard');
      else { setError('This portal is for admin and warehouse managers only. Please use the mobile app.'); return; }
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { error?: { message?: string } } } };
      setError(err?.response?.data?.error?.message ?? "Invalid OTP");
    },
  });

  const normalizedPhone = `+91${digits.replace(/\D/g, '')}`;

  return (
    <div className="min-h-screen flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex w-[420px] bg-gray-900 flex-col justify-between p-10 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-12">
            <div className="w-8 h-8 bg-green-600 rounded flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-semibold text-lg">FieldSprout</span>
          </div>
          <h1 className="text-white text-4xl font-light leading-tight mb-4">
            Seed distribution,
            <br />
            simplified.
          </h1>
          <p className="text-gray-400 text-base leading-relaxed">
            Manage field reps, track orders, and monitor stock across all your warehouses.
          </p>
        </div>
        <div className="space-y-3">
          {[
            "Track 300+ field reps in real time",
            "Approve orders with one click",
            "Monitor stock across all warehouses",
          ].map((f) => (
            <div key={f} className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0" />
              <span className="text-gray-400 text-sm">{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-green-600 rounded flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-lg">FieldSprout</span>
          </div>

          <Card className="animate-slide-up">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold">
                {step === "phone" ? "Sign in" : "Enter OTP"}
              </CardTitle>
              <CardDescription>
                {step === "phone"
                  ? "Enter your registered mobile number"
                  : `Code sent to ${phone}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
                  {error}
                </div>
              )}

              {step === "phone" ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendOtp.mutate(normalizedPhone);
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="phone">Mobile Number</Label>
                    <div className="flex">
                      <div className="flex items-center px-3 border border-r-0 border-input rounded-l-md bg-muted text-sm text-muted-foreground font-medium">
                        +91
                      </div>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="98765 43210"
                        value={digits}
                        onChange={(e) => {
                          setDigits(e.target.value.replace(/\D/g, "").slice(0, 10));
                          setError("");
                        }}
                        className="rounded-l-none"
                        autoFocus
                        maxLength={10}
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={sendOtp.isPending || digits.length < 10}
                  >
                    {sendOtp.isPending ? (
                      "Sending..."
                    ) : (
                      <>
                        <span>Send OTP</span>
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    verifyOtp.mutate({ phone, code });
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="otp">6-digit OTP</Label>
                    <Input
                      id="otp"
                      type="tel"
                      placeholder="000000"
                      maxLength={6}
                      autoFocus
                      value={code}
                      onChange={(e) => {
                        setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                        setError("");
                      }}
                      className="text-center text-xl tracking-[0.5em] font-mono"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={verifyOtp.isPending || code.length < 6}
                  >
                    {verifyOtp.isPending ? (
                      "Verifying..."
                    ) : (
                      <>
                        <Lock className="mr-2 h-4 w-4" />
                        <span>Verify &amp; Sign In</span>
                      </>
                    )}
                  </Button>
                  <div className="flex items-center justify-between">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setStep("phone");
                        setError("");
                      }}
                    >
                      ← Back
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => sendOtp.mutate(phone)}
                    >
                      Resend OTP
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            For authorised users only · FieldSprout v1.0
          </p>
        </div>
      </div>
    </div>
  );
}
