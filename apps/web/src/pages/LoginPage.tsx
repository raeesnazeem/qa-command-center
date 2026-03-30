import React from 'react'
import { SignIn } from '@clerk/react'

export const LoginPage = () => {
  return (
    <div className="min-h-screen bg-navy flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-white">QACC</h1>
        <p className="text-slate-300 mt-2">QA Command Center</p>
      </div>
      <SignIn
        appearance={{
          elements: {
            rootBox: 'mx-auto',
            card: 'shadow-xl',
          },
        }}
        routing="path"
        path="/login"
        signUpUrl="/register"
        afterSignInUrl="/dashboard"
      />
    </div>
  )
}
