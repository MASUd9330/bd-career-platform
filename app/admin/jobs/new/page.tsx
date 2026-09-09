"use client";

import { useState } from "react";

export default function NewJobPage() {
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("saving");

    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());

    try {
      const res = await fetch("/api/admin/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");

      setStatus("done");
      setMessage(`Saved! View at /jobs/${data.slug}`);
      e.currentTarget.reset();
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Unknown error");
    }
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Add Job Manually</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Title" name="title" required />
        <Field label="Organization Name" name="organizationName" required />
        <Field label="Vacancy (number)" name="vacancy" type="number" />
        <Field label="Education / Qualification" name="education" />
        <Field label="Job Location" name="jobLocation" />
        <Field label="Salary (text)" name="salaryText" placeholder="e.g. Tk 22,000-53,060" />
        <Field label="Application Deadline" name="applicationDeadline" type="date" />
        <Field label="Application URL" name="applicationUrl" type="url" />
        <Field label="Official Source URL" name="sourceUrl" type="url" required />

        <div>
          <label className="block text-sm font-medium mb-1">Summary / Description</label>
          <textarea
            name="excerpt"
            rows={4}
            className="w-full border rounded-md p-2"
            placeholder="Short summary in Bangla or English"
          />
        </div>

        <button
          type="submit"
          disabled={status === "saving"}
          className="bg-blue-600 text-white px-5 py-2 rounded-md disabled:opacity-50"
        >
          {status === "saving" ? "Saving..." : "Publish Job"}
        </button>

        {message && (
          <p className={status === "error" ? "text-red-600" : "text-green-700"}>{message}</p>
        )}
      </form>
    </main>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        name={name}
        required={required}
        placeholder={placeholder}
        className="w-full border rounded-md p-2"
      />
    </div>
  );
}
