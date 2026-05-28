"use server";

import { redirect } from "next/navigation";
import { lookupAppUser, markItemComplete, submitAnswer } from "@parvaordo/core";
import { getAuthedUser } from "@/src/lib/auth";

/**
 * Complete the current wizard item and advance to the next step. For questions,
 * the answer is saved first (and is required — you can't advance unanswered).
 */
export async function advanceAction(formData: FormData): Promise<void> {
  const authed = await getAuthedUser();
  if (!authed) redirect("/login");

  const identity = await lookupAppUser(authed.email);
  if (!identity?.parishId) redirect("/");

  const lessonId = String(formData.get("lessonId") ?? "");
  const itemId = String(formData.get("itemId") ?? "");
  const kind = String(formData.get("kind") ?? "");
  const step = Number(formData.get("step") ?? 0);

  if (kind === "question") {
    const text = String(formData.get("text") ?? "").trim();
    if (!text) {
      // No answer — bounce back to the same step without completing.
      redirect(`/ocia/lessons/${lessonId}?step=${step}`);
    }
    await submitAnswer({
      parishId: identity.parishId,
      studentId: identity.userId,
      itemId,
      text,
    });
  }

  await markItemComplete({ parishId: identity.parishId, studentId: identity.userId, itemId });
  redirect(`/ocia/lessons/${lessonId}?step=${step + 1}`);
}
