"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, apiRequest, NetworkError } from "../lib/api";
import { getRoleHome } from "../lib/routing";
import type { LoginResponse } from "../lib/types";
import { useAuth } from "./auth-provider";

type FormState = {
  email: string;
  password: string;
};

const initialState: FormState = {
  email: "",
  password: "",
};

export function LoginForm() {
  const router = useRouter();
  const { setSession } = useAuth();
  const [form, setForm] = useState<FormState>(initialState);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload = await apiRequest<LoginResponse>("/auth/login", {
        method: "POST",
        body: {
          email: form.email,
          password: form.password,
        },
      });

      setSession(payload.token, payload.user);
      router.replace(getRoleHome(payload.user.role));
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else if (error instanceof NetworkError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(
          "Login failed because the backend could not be reached. Check NEXT_PUBLIC_API_BASE_URL and FRONTEND_ORIGINS.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="panel stack" onSubmit={handleSubmit}>
      <div className="stack form-header">
        <h2 className="section-title">Email and password</h2>
        <p className="status-note">
          The backend trims whitespace and lowercases the email before it checks
          the credentials.
        </p>
      </div>

      <label className="field">
        <span className="field-label">Email</span>
        <input
          className="field-input"
          type="email"
          name="email"
          value={form.email}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              email: event.target.value,
            }))
          }
          autoComplete="email"
          placeholder="teacher@example.com"
          required
        />
      </label>

      <label className="field">
        <span className="field-label">Password</span>
        <input
          className="field-input"
          type="password"
          name="password"
          value={form.password}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              password: event.target.value,
            }))
          }
          autoComplete="current-password"
          placeholder="Enter your password"
          required
        />
      </label>

      {errorMessage ? (
        <p className="form-error" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <button className="button form-submit" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
