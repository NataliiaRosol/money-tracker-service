// inline styles and tables only: many email clients strip <style> and don't support flex/grid.
// `link` is our own URL (frontend origin + base64url token), so it needs no HTML escaping
export function verificationEmailHtml(link: string, ttlHours: number) {
    return `<!doctype html>
<html lang="uk">
  <body style="margin:0;padding:24px;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:8px;">
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 16px;font-size:22px;">Підтвердіть email</h1>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.5;">
                  Натисніть кнопку нижче, щоб підтвердити адресу для Money Tracker.
                </p>
                <a href="${link}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;">
                  Підтвердити email
                </a>
                <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#71717a;">
                  Посилання дійсне ${ttlHours} год. Якщо ви не реєструвалися в Money Tracker і не змінювали email — просто проігноруйте цей лист.
                </p>
                <p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#a1a1aa;word-break:break-all;">
                  Якщо кнопка не працює, скопіюйте посилання в браузер:<br>${link}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
