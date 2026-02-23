// Deploy permissive Firestore rules for development
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(__dirname, "../.env.local") });

const projectId = process.env.FIREBASE_PROJECT_ID!;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL!;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")!;

// Use Google Auth to get an access token, then call the Firestore Rules API
import { GoogleAuth } from "google-auth-library";

async function deployRules() {
  const auth = new GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });

  const client = await auth.getClient();
  const token = await client.getAccessToken();

  const rules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`;

  const response = await fetch(
    `https://firebaserules.googleapis.com/v1/projects/${projectId}/rulesets`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: {
          files: [{ name: "firestore.rules", content: rules }],
        },
      }),
    }
  );

  const ruleset = await response.json();

  if (!response.ok) {
    console.error("Failed to create ruleset:", ruleset);
    return;
  }

  console.log("Ruleset created:", ruleset.name);

  // Release the ruleset
  const releaseResponse = await fetch(
    `https://firebaserules.googleapis.com/v1/projects/${projectId}/releases`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `projects/${projectId}/releases/cloud.firestore`,
        rulesetName: ruleset.name,
      }),
    }
  );

  // If release exists, update it instead
  if (releaseResponse.status === 409) {
    const updateResponse = await fetch(
      `https://firebaserules.googleapis.com/v1/projects/${projectId}/releases/cloud.firestore`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          release: {
            name: `projects/${projectId}/releases/cloud.firestore`,
            rulesetName: ruleset.name,
          },
        }),
      }
    );
    const updateResult = await updateResponse.json();
    console.log("Rules updated:", updateResult);
  } else {
    const releaseResult = await releaseResponse.json();
    console.log("Rules released:", releaseResult);
  }
}

deployRules().catch(console.error);
