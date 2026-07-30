"use client";

/**
 * Create / edit a meeting. One form for both, mirroring the TaskForm idiom
 * (react-hook-form + sonner) so meetings do not introduce a second mutation
 * shape.
 *
 * Sprint 12B: the edit half is new. `updateMeetingSchema` had existed since
 * Sprint 11 with no action behind it; `updateMeeting` now exists, so the same
 * field set that creates a meeting can amend one. `projectId` is create-only —
 * updateMeetingSchema omits it, because a meeting's outcomes, attendees and
 * activity all carry the project and moving the parent would orphan them.
 */
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createMeeting, updateMeeting } from "../actions";
import { MEETING_PROVIDERS, MEETING_TYPES, humanizeToken } from "../constants";

export type MeetingProjectOption = { projectId: string; projectName: string };

type FormValues = {
  projectId: string;
  title: string;
  meetingType: string;
  startTime: string;
  endTime: string;
  location: string;
  meetingUrl: string;
  provider: string;
  description: string;
  notes: string;
};

const SELECT_CLASS =
  "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 flex h-8 w-full rounded-lg border px-2.5 py-1 text-sm outline-none focus-visible:ring-3";

/** `datetime-local` wants local wall-clock time, not an ISO-Z string. */
function toLocalInputValue(value: Date | string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function notesText(notes: unknown): string {
  if (!notes) return "";
  if (typeof notes === "string") return notes;
  const text = (notes as { text?: unknown }).text;
  return typeof text === "string" ? text : "";
}

export function MeetingForm({
  projects,
  meeting,
  onSuccess,
}: Readonly<{
  /** Create targets. Ignored in edit mode — the project is fixed. */
  projects: MeetingProjectOption[];
  /** Present when editing; absent when creating. */
  meeting?: Record<string, any> | null;
  onSuccess: () => void | Promise<void>;
}>) {
  const [isPending, setIsPending] = useState(false);
  const isEdit = Boolean(meeting?.meetingId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      projectId: meeting?.projectId ?? projects[0]?.projectId ?? "",
      title: meeting?.title ?? "",
      meetingType: meeting?.meetingType ?? "internal_standup",
      startTime: toLocalInputValue(meeting?.startTime),
      endTime: toLocalInputValue(meeting?.endTime),
      location: meeting?.location ?? "",
      meetingUrl: meeting?.meetingUrl ?? "",
      provider: meeting?.provider ?? "",
      description: meeting?.description ?? "",
      notes: notesText(meeting?.notes),
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsPending(true);
    try {
      if (isEdit) {
        await updateMeeting(meeting!.meetingId, {
          title: values.title,
          meetingType: values.meetingType as never,
          startTime: values.startTime ? new Date(values.startTime) : undefined,
          endTime: values.endTime ? new Date(values.endTime) : undefined,
          location: values.location || undefined,
          meetingUrl: values.meetingUrl || undefined,
          provider: (values.provider || undefined) as never,
          description: values.description || undefined,
          notes: values.notes,
        });
        toast.success("Meeting updated");
      } else {
        await createMeeting({
          projectId: values.projectId,
          title: values.title,
          meetingType: values.meetingType as never,
          startTime: values.startTime ? new Date(values.startTime) : undefined,
          endTime: values.endTime ? new Date(values.endTime) : undefined,
          location: values.location || undefined,
          meetingUrl: values.meetingUrl || undefined,
          provider: (values.provider || undefined) as never,
          description: values.description || undefined,
          isPrivate: false,
          isConfidential: false,
        });
        toast.success("Meeting scheduled");
        reset({ ...values, title: "", description: "", startTime: "", endTime: "" });
      }
      await onSuccess();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save the meeting",
      );
    } finally {
      setIsPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="meeting-title">Title *</Label>
        <Input
          id="meeting-title"
          {...register("title", { required: "Title is required" })}
        />
        {errors.title && (
          <p className="text-destructive text-sm">{errors.title.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {!isEdit && (
          <div className="space-y-2">
            <Label htmlFor="meeting-project">Project *</Label>
            <select
              id="meeting-project"
              {...register("projectId", { required: true })}
              className={SELECT_CLASS}
            >
              {projects.map((project) => (
                <option key={project.projectId} value={project.projectId}>
                  {project.projectName}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="meeting-type">Type</Label>
          <select id="meeting-type" {...register("meetingType")} className={SELECT_CLASS}>
            {MEETING_TYPES.map((type) => (
              <option key={type} value={type}>
                {humanizeToken(type)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="meeting-start">Starts *</Label>
          {/* Required by the UI, not by createMeetingSchema. The read layer now
              sorts NULLS LAST (TD-12 closed), but a meeting with no start time
              cannot be filtered as upcoming or past, which is worse than
              requiring one here. */}
          <Input
            id="meeting-start"
            type="datetime-local"
            {...register("startTime", { required: "A start time is required" })}
          />
          {errors.startTime && (
            <p className="text-destructive text-sm">{errors.startTime.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="meeting-end">Ends</Label>
          <Input id="meeting-end" type="datetime-local" {...register("endTime")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="meeting-location">Location</Label>
          <Input id="meeting-location" {...register("location")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="meeting-provider">Provider</Label>
          <select id="meeting-provider" {...register("provider")} className={SELECT_CLASS}>
            <option value="">None</option>
            {MEETING_PROVIDERS.map((provider) => (
              <option key={provider} value={provider}>
                {humanizeToken(provider)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="meeting-url">Meeting URL</Label>
        <Input
          id="meeting-url"
          {...register("meetingUrl")}
          placeholder="https://meet.google.com/…"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="meeting-description">Description</Label>
        <Input id="meeting-description" {...register("description")} />
      </div>

      {isEdit && (
        <div className="space-y-2">
          <Label htmlFor="meeting-notes">Notes</Label>
          <textarea
            id="meeting-notes"
            rows={4}
            {...register("notes")}
            className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 flex w-full rounded-lg border px-2.5 py-1.5 text-sm outline-none focus-visible:ring-3"
            placeholder="Minutes, context, follow-ups…"
          />
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : isEdit ? "Save changes" : "Schedule meeting"}
        </Button>
      </div>
    </form>
  );
}
