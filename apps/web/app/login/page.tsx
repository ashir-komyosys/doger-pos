"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginDto } from "@nodedr-restaurant/types";
import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { AlertCircle } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { useLogin } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { defaultHomeHref } from "@/lib/route-access";

export default function LoginPage() {
  const router = useRouter();
  const login = useLogin();
  // Set once the server says this account uses two-factor authentication.
  const [needsCode, setNeedsCode] = useState(false);
  // Shown inline under the form (a toast vanishes before it can be read).
  const [error, setError] = useState<string | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginDto>({ resolver: zodResolver(loginSchema) });

  const onSubmit = (dto: LoginDto) => {
    setError(null);
    login.mutate(dto, {
      onSuccess: ({ user }) => router.push(defaultHomeHref(user.roleName, user.permissions, NAV_ITEMS) ?? "/pos"),
      onError: (err) => {
        if (err instanceof ApiError && err.message === "TWO_FACTOR_REQUIRED") {
          setNeedsCode(true);
          return;
        }
        if (err instanceof ApiError && err.status >= 500) {
          setError("The server is having a problem right now. Please try again in a minute.");
        } else if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("Can't reach the server. Check your internet connection and try again.");
        }
      },
    });
  };

  return (
    <main className="min-h-dvh bg-[#E8D9CB] p-3 sm:p-6 lg:p-8">
      <div className="mx-auto grid min-h-[calc(100dvh-24px)] max-w-[1440px] overflow-hidden rounded-[30px] border border-[#E6D9C8] bg-[#FFFCF5] shadow-[0_24px_80px_rgba(69,43,40,0.14)] sm:min-h-[calc(100dvh-48px)] lg:grid-cols-2">
        <section className="relative hidden min-h-[680px] overflow-hidden bg-[#2B1812] lg:block">
          <Image src="/images/dogars-hero.png" alt="Freshly grilled Dogar's Fire & Flavour burger and BBQ" fill priority sizes="50vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#21120E]/90 via-[#21120E]/25 to-[#21120E]/10" />
          <Link href="/" className="absolute left-10 top-9 z-10 flex items-center gap-3 text-white">
            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/25 bg-white/10 text-[#FE8C00] backdrop-blur"><Logo size={34} className="rounded-full" /></span>
            <span className="flex flex-col leading-none"><strong className="text-lg font-black tracking-[-0.04em]">DOGAR&apos;S</strong><span className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.25em] text-[#FFC078]">Fire &amp; Flavour</span></span>
          </Link>
          <div className="absolute bottom-12 left-10 right-10 z-10 text-white xl:bottom-16 xl:left-14 xl:right-14">
            <span className="mb-5 block h-1 w-14 rounded-full bg-gradient-to-r from-[#FE8C00] to-[#FF3B00]" />
            <p className="max-w-xl text-4xl font-black leading-[1.08] tracking-[-0.04em] xl:text-5xl">Good food brings people together.</p>
            <p className="mt-4 max-w-md text-base leading-7 text-white/75">Sign in to keep service moving, from the first order to the last receipt.</p>
            <p className="mt-8 font-serif text-2xl italic text-[#FFE0B8]">Fire &amp; flavour, every day.</p>
          </div>
        </section>
        <section className="flex min-h-[calc(100dvh-24px)] items-center justify-center px-5 py-10 sm:px-10 lg:min-h-[680px] lg:px-12 xl:px-20">
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[420px]"
      >
        <div className="mb-10 flex flex-col items-center gap-2 text-center">
          <Link href="/">
            <Logo size={44} />
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Dogar&apos;s Fire & Flavour
          </h1>
          <p className="text-sm text-muted-foreground">Sign in to manage your restaurant</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="next"
              autoFocus
              className="h-11"
              placeholder="you@restaurant.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              
              autoComplete="current-password"
              enterKeyHint="go"
              className="h-11"
              placeholder="Your password"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          {needsCode && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="totp">Verification code</Label>
              <Input
                id="totp"
                inputMode="text"
                autoComplete="one-time-code"
                autoFocus
                placeholder="6-digit code or recovery code"
                {...register("totp")}
              />
              <p className="text-xs text-muted-foreground">
                Open your authenticator app, or use one of your recovery codes.
              </p>
              {errors.totp && <p className="text-xs text-destructive">{errors.totp.message}</p>}
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" className="mt-2 h-12 text-base" disabled={login.isPending}>
            {login.isPending ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          New restaurant?{" "}
          <Link href="/signup" className="font-medium text-foreground hover:underline">
            Create an account
          </Link>
        </p>
      </motion.div>
        </section>
      </div>
    </main>
  );
}
