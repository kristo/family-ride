// Powiadomienia e-mail dla właściciela serwisu (Resend REST API, bez dodatkowej zależności).
// Bez RESEND_API_KEY / NOTIFY_EMAIL_TO funkcja nic nie robi, więc lokalny dev nie wysyła maili.
// Błędy są tylko logowane - powiadomienie nie może zepsuć zapisu użytkownika.

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function notifyOwner(subject: string, lines: string[]): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_EMAIL_TO;
  if (!apiKey || !to) {
    return;
  }

  const from = process.env.NOTIFY_EMAIL_FROM || "Family Ride <onboarding@resend.dev>";

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: to.split(",").map((item) => item.trim()).filter(Boolean),
        subject,
        text: lines.join("\n"),
        html: lines.map((line) => `<p>${escapeHtml(line)}</p>`).join(""),
      }),
    });

    if (!response.ok) {
      console.error("notifyOwner: Resend odpowiedział", response.status, await response.text());
    }
  } catch (error) {
    console.error("notifyOwner: nie udało się wysłać maila", error);
  }
}
