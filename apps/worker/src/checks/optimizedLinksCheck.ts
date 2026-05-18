import { Page as PlaywrightPage } from "playwright"
import { Finding } from "@qacc/shared"
import got from "got"
import pLimit from "p-limit"
import { supabase } from "../lib/supabase"
import pino from "pino"

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: {
    target: "pino-pretty",
    options: { colorize: true },
  },
})

export async function checkOptimizedLinks(
  page: PlaywrightPage,
  pageRecord: any,
): Promise<Finding[]> {
  // 1. Verify if this page is the very first page in the run to avoid duplicate checks!
  const { data: firstPage } = await supabase
    .from("pages")
    .select("id")
    .eq("run_id", pageRecord.run_id)
    .order("created_at", { ascending: true })
    .limit(1)
    .single()

  if (firstPage && pageRecord.id !== firstPage.id) {
    logger.info("Skipping dead link checker: Already run on the first page.")
    return []
  }

  logger.info(
    { runId: pageRecord.run_id },
    "Starting dead link check on the first page",
  )

  // 2. Get current base URL of the page we are auditing
  const currentPageUrl = page.url()

  // 3. Extract all anchor links from the loaded DOM
  const links = await page.$$eval("a[href]", (els) =>
    els.map((el) => ({
      href: (el as HTMLAnchorElement).href,
      text: el.textContent?.trim() || "No text content",
    })),
  )

  // 4. Filter for unique, valid HTTP/HTTPS URLs and clean them
  const uniqueLinks = Array.from(new Set(links.map((l) => l.href)))
    .filter((href) => href.startsWith("http"))
    .map((href) => links.find((l) => l.href === href)!)

  if (uniqueLinks.length === 0) return []

  const limit = pLimit(10) // Batch requests of 10 in parallel
  const brokenLinks: {
    url: string
    reason: string
    text: string
    statusCode?: number
  }[] = []

  const tasks = uniqueLinks.map((link) =>
    limit(async () => {
      const urlObject = new URL(link.href)
      const hash = urlObject.hash.replace("#", "")
      const baseUrl = link.href.split("#")[0]

      try {
        // Step A: Check base URL status using got.head first (lightweight)
        let response
        try {
          response = await got.head(baseUrl, {
            timeout: { request: 5000 },
            retry: { limit: 1 },
            followRedirect: true,
          })
        } catch (headErr) {
          // If HEAD fails (some servers block HEAD), try GET as fallback
          response = await got.get(baseUrl, {
            timeout: { request: 5000 },
            retry: { limit: 1 },
            followRedirect: true,
          })
        }

        // Step B: Deep Anchor element verification (If hash exists and it is an internal page link)
        if (hash && baseUrl.startsWith(currentPageUrl.split("#")[0])) {
          // Verify if element with ID exists in the current active Playwright Page DOM!
          const elementExists = (await page.locator(`#${hash}`).count()) > 0
          if (!elementExists) {
            brokenLinks.push({
              url: link.href,
              reason: `Broken Anchor Element (#${hash} not found in DOM)`,
              text: link.text,
              statusCode: response.statusCode,
            })
          }
        }
      } catch (error: any) {
        const statusCode = error.response?.statusCode || 0
        // Flag error if response code is 4xx or 5xx, or network failure (0)
        if (statusCode >= 400 || statusCode === 0) {
          brokenLinks.push({
            url: link.href,
            reason: `HTTP Error ${statusCode === 0 ? "Connection Failed" : statusCode}`,
            text: link.text,
            statusCode,
          })
        }
      }
    }),
  )

  // Run all check tasks concurrently!
  await Promise.all(tasks)

  if (brokenLinks.length === 0) return []

  const count = brokenLinks.length
  let severity: "medium" | "high" | "critical" = "medium"
  if (count >= 10) severity = "critical"
  else if (count >= 5) severity = "high"

  // Format all broken links in separate lines in the description
  const description =
    `The following dead or broken links were detected:\n\n` +
    brokenLinks
      .map(
        (l) =>
          `- **${l.url}**\n  * Reason: ${l.reason}\n  * Link Text: "${l.text}"`,
      )
      .join("\n\n")

  const contextText = brokenLinks
    .map((l) => `Link Text: "${l.text}" | URL: ${l.url}`)
    .join("\n")

  // Return a single consolidated general finding (screenshot_url is null!)
  return [
    {
      check_factor: "dead_links",
      severity,
      title: `${count} dead link${count > 1 ? "s" : ""} found`,
      description,
      context_text: contextText,
      screenshot_url: null, // No evidence screenshot
      status: "open",
      ai_generated: false,
    },
  ]
}
