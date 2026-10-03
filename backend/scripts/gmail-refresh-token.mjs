// One-time helper: gets the GMAIL_REFRESH_TOKEN that src/lib/mailer.ts uses
// to send password-reset emails through the Gmail API.
//
// 1. Put GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET (from a "Desktop app" OAuth
//    client in Google Cloud Console) in backend/.env.
// 2. From backend/, run:  npm run gmail:token
// 3. Open the printed link, sign in as GMAIL_USER (the shop's Gmail) and
//    allow access. The refresh token is printed here — copy it into
//    backend/.env and the host's (e.g. Render's) environment variables.
import "dotenv/config";
import http from "node:http";

const PORT = 5555;
const REDIRECT_URI = `http://127.0.0.1:${PORT}`;
const SCOPE = "https://www.googleapis.com/auth/gmail.send";

const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET } = process.env;
if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET) {
  console.error("Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in backend/.env first.");
  process.exit(1);
}

const authUrl =
  "https://accounts.google.com/o/oauth2/v2/auth?" +
  new URLSearchParams({
    client_id: GMAIL_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPE,
    // offline + consent makes Google return a refresh token every time.
    access_type: "offline",
    prompt: "consent",
  });

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", REDIRECT_URI);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  if (!code && !error) {
    res.writeHead(404).end();
    return;
  }

  if (error) {
    res.end(`Google returned an error: ${error}. You can close this tab.`);
    console.error(`\nGoogle returned an error: ${error}`);
    server.close();
    return;
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: GMAIL_CLIENT_ID,
      client_secret: GMAIL_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });
  const tokens = await tokenRes.json();

  if (!tokens.refresh_token) {
    res.end("No refresh token received — see the terminal. You can close this tab.");
    console.error("\nNo refresh token received:", tokens);
  } else {
    res.end("Done! Go back to the terminal and copy the refresh token. You can close this tab.");
    console.log("\nAdd this line to backend/.env (and to Render's environment variables):\n");
    console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}\n`);
  }
  server.close();
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("Open this link in your browser and sign in as the shop's Gmail:\n");
  console.log(authUrl + "\n");
  console.log("Waiting for Google to redirect back...");
});
