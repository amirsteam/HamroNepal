/**
 * Starting the news job (.github/workflows/ingest.yml) on GitHub from the
 * dashboard, so a full run happens now instead of at the next scheduled time.
 * A serverless request can't run it itself: a full run takes minutes.
 */

import { config } from "../config";
import { HttpError } from "../lib/http";

export const WORKFLOW_FILE = "ingest.yml";

export function canDispatchIngest(): boolean {
  return !!(config.github.token && config.github.repo);
}

/** Ask GitHub to start the news job. Throws an HttpError with a Nepali message on failure. */
export async function dispatchIngest(maxDrafts: number): Promise<void> {
  const { token, repo, ref } = config.github;
  let res: Response;
  try {
    res = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/${WORKFLOW_FILE}/dispatches`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ref, inputs: { max: String(maxDrafts) } }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new HttpError(502, "GitHub सम्म पुग्न सकिएन। केही बेरपछि फेरि प्रयास गर्नुहोस्।");
  }
  if (res.status === 204) return;
  const detail = (await res.text().catch(() => "")).slice(0, 200);
  console.warn(`[ingest] GitHub dispatch failed: HTTP ${res.status} ${detail}`);
  if (res.status === 401 || res.status === 403 || res.status === 404) {
    throw new HttpError(502, "GitHub टोकन वा रिपोको नाम मिलेन (GITHUB_DISPATCH_TOKEN / GITHUB_REPO जाँच गर्नुहोस्)।");
  }
  throw new HttpError(502, `GitHub ले काम सुरु गरेन (HTTP ${res.status})।`);
}
