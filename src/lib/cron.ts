// Tâches planifiées (vercel.json) : Vercel appelle la route avec « Authorization: Bearer CRON_SECRET ».
export function cronAllowed(request: Request) {
  const secret = process.env.CRON_SECRET;
  return !!secret && request.headers.get("authorization") === `Bearer ${secret}`;
}
