// Runs once when a Next.js server instance boots, before it handles requests.
//
// Vercel's Node runtime defaults to UTC. The calendar computes appointment
// times and positions using the runtime's local timezone, so a UTC server
// rendered everything ~10h off from the AEST browser — producing wrong times
// in the initial HTML and a React hydration mismatch on every load. Pinning
// the process timezone to the salon's zone aligns all server-side date math
// with the client. (Node honours a runtime change to process.env.TZ.)
export function register() {
  process.env.TZ = "Australia/Sydney";
}
