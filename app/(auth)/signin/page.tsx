"use client"

import { useState, useEffect } from "react"
import toast from "react-hot-toast"
import { useSession, signIn } from "next-auth/react"
import { redirect, useRouter } from "next/navigation"
import { type FieldValues, type SubmitHandler, useForm } from "react-hook-form"

export default function SignInPage() {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [showPassword, setShowPassword] = useState<boolean>(false)
  const [greeting, setGreeting] = useState<string>("Welcome")

  const { status } = useSession()
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FieldValues>({
    defaultValues: {
      email: "",
      password: "",
    },
  })

  // Set greeting based on time of day
  useEffect(() => {
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 12) {
      setGreeting("Good morning")
    } else if (hour >= 12 && hour < 18) {
      setGreeting("Good afternoon")
    } else {
      setGreeting("Good evening")
    }
  }, [])

  const handleSignIn: SubmitHandler<FieldValues> = (data) => {
    setIsSubmitting(true)
    signIn("credentials", {
      ...data,
      redirect: false,
    })
      .then((callback) => {
        if (callback?.ok && callback?.error === undefined) {
          toast.success("Logged in successfully!")
          router.refresh()
        }

        if (callback?.error) {
          toast.error(callback.error)
        }
      })
      .finally(() => {
        setIsSubmitting(false)
      })
  }

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    )
  }

  if (status === "authenticated") {
    return redirect("/")
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Left side - Sign In Form */}
      <div className="flex w-[600px] flex-col justify-center p-4 md:p-10">
        <div className="mx-auto w-full max-w-lg">
          <div className="mb-10">
            <h1 className="text-4xl font-bold text-center">{greeting}</h1>
            <p className="mt-3 text-xl text-gray-600 text-center">Sign in to access your account</p>
          </div>

          <div className="rounded-xl border bg-white p-8 shadow-lg">
            <form onSubmit={handleSubmit(handleSignIn)} className="space-y-6">
              <div className="space-y-3">
                <label htmlFor="email" className="block text-base font-medium text-gray-700">
                  Email Address
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <svg
                      className="h-5 w-5 text-gray-400"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                      <polyline points="22,6 12,13 2,6"></polyline>
                    </svg>
                  </div>
                  <input
                    id="email"
                    type="email"
                    className={`w-full rounded-lg border px-3 py-3 pl-10 text-base outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500 ${
                      errors?.email ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="name@example.com"
                    {...register("email", {
                      required: "Email is required",
                    })}
                  />
                </div>
                {errors?.email && (
                  <p className="text-sm text-red-500">
                    {typeof errors.email.message === "string" ? errors.email.message : "Invalid email"}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-base font-medium text-gray-700">
                    Password
                  </label>
                  <a href="/forgot-password" className="text-sm font-medium text-blue-600 hover:underline">
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <svg
                      className="h-5 w-5 text-gray-400"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className={`w-full rounded-lg border px-3 py-3 pl-10 pr-10 text-base outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500 ${
                      errors?.password ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="••••••••"
                    {...register("password", {
                      required: "Password is required",
                    })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <svg
                        className="h-5 w-5"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                      </svg>
                    ) : (
                      <svg
                        className="h-5 w-5"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    )}
                  </button>
                </div>
                {errors?.password && (
                  <p className="text-sm text-red-500">
                    {typeof errors.password.message === "string" ? errors.password.message : "Invalid password"}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-blue-600 px-4 py-3 text-center text-base font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Signing in..." : "Sign in"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
