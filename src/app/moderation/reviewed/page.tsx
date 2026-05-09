import { redirect } from "next/navigation";

export default function ReviewedModerationPage() {
  redirect("/moderation?status=REVIEWED");
}
