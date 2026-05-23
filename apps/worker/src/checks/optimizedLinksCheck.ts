import { Page as PlaywrightPage } from "playwright"
import { Finding } from "@qacc/shared"
import got from "got"
import pLimit from "p-limit"
import pino from "pino"

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: {
    target: "pino-pretty",
    options: { colorize: true },
  },
})

// Global caches — keyed by runId so they survive across multiple jobs in a single run
const runCheckedLinks = new Map<string, Set<string>>()
const runReportedBroken = new Map<string, Set<string>>()
const runStartedSite = new Map<string, boolean>()
const runBrokenLinks = new Map<
  string,
  { url: string; reason: string; text: string; statusCode?: number }[]
>()

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
}

const IGNORED_EXTENSIONS =
  /\.(pdf|jpg|jpeg|png|gif|svg|zip|mp4|webp|mp3|ico|css|js|woff|woff2|ttf|eot)$/i

/**
 * Fast HTTP check for dead links
 */
async function isLinkBroken(
  url: string,
): Promise<{ broken: boolean; statusCode: number }> {
  try {
    const response = await got.head(url, {
      timeout: { request: 10000 },
      retry: { limit: 0 },
      followRedirect: true,
      throwHttpErrors: false,
      headers: BROWSER_HEADERS,
    })

    if (response.statusCode >= 400) {
      const getResponse = await got.get(url, {
        timeout: { request: 10000 },
        retry: { limit: 0 },
        followRedirect: true,
        throwHttpErrors: false,
        headers: BROWSER_HEADERS,
      })
      return {
        broken: getResponse.statusCode >= 400,
        statusCode: getResponse.statusCode,
      }
    }

    return { broken: false, statusCode: response.statusCode }
  } catch (error: any) {
    return { broken: true, statusCode: 0 }
  }
}

export async function checkOptimizedLinks(
  page: PlaywrightPage,
  pageRecord: any,
  updateProgress?: (progress: number, step: string) => Promise<void>,
): Promise<Finding[]> {
  const runId = pageRecord.run_id || "default_run"

  if (!runCheckedLinks.has(runId)) runCheckedLinks.set(runId, new Set())
  if (!runReportedBroken.has(runId)) runReportedBroken.set(runId, new Set())
  if (!runBrokenLinks.has(runId)) runBrokenLinks.set(runId, [])

  const checkedLinks = runCheckedLinks.get(runId)!
  const reportedBroken = runReportedBroken.get(runId)!
  const brokenLinks = runBrokenLinks.get(runId)!

  const currentPageUrl = page.url()
  const siteOrigin = new URL(currentPageUrl).origin

  // Guarantee this massive 500+ page scan only executes on the FIRST page job of the run
  if (runStartedSite.get(runId)) {
    logger.info({ runId }, "Deep spider already ran for this run — skipping")
    return []
  }
  runStartedSite.set(runId, true)

  logger.info(
    { runId, siteOrigin },
    "Starting deep Playwright SPA dead link spider",
  )

  const visitedPages = new Set<string>()
  const pageQueue: string[] = []

  const startUrl = currentPageUrl.split("#")[0]
  visitedPages.add(startUrl)
  pageQueue.push(startUrl)

  const MAX_PAGES = 600
  let totalPagesScraped = 0

  const spiderLimit = pLimit(3) // Run 3 headless tabs concurrently
  const checkLimit = pLimit(20) // Check 20 HTTP links concurrently
  const context = page.context()

  while (pageQueue.length > 0 && totalPagesScraped < MAX_PAGES) {
    const batch = pageQueue.splice(0, 3)
    totalPagesScraped += batch.length

    logger.info(
      { runId, totalPagesScraped, queueRemaining: pageQueue.length },
      "Playwright spider batch",
    )

    // Broadcast real-time progress to the UI
    if (updateProgress) {
      await updateProgress(
        90,
        `Deep Spider: Crawled ${totalPagesScraped} pages (${pageQueue.length} remaining)... [${brokenLinks.length} dead links found]`,
      ).catch(() => {})
    }

    await Promise.all(
      batch.map((scrapeUrl) =>
        spiderLimit(async () => {
          const spiderPage = await context.newPage()

          // DO NOT block stylesheets — React needs them to hydrate properly
          await spiderPage.route("**/*", (route) => {
            const type = route.request().resourceType()
            if (["image", "media", "font"].includes(type)) {
              route.abort()
            } else {
              route.continue()
            }
          })

          try {
            // Use domcontentloaded for speed, safely catch timeouts
            await spiderPage
              .goto(scrapeUrl, {
                waitUntil: "domcontentloaded",
                timeout: 20000,
              })
              .catch(() => {})

            // Give React SPA an extra moment to mount before grabbing links
            await spiderPage.waitForTimeout(1500).catch(() => {})

            // Safely evaluate so execution context errors don't crash the entire spider
            const pageLinks = await spiderPage
              .$$eval("a[href]", (els) =>
                els.map((el) => ({
                  href: (el as HTMLAnchorElement).href,
                  text: el.textContent?.trim() || "No text content",
                })),
              )
              .catch(() => [] as { href: string; text: string }[])

            const linkTasks = pageLinks.map((link) =>
              checkLimit(async () => {
                let fullUrl: string
                try {
                  fullUrl = new URL(link.href, scrapeUrl).toString()
                } catch {
                  return
                }

                const baseUrl = fullUrl.split("#")[0]
                if (!baseUrl.startsWith("http")) return
                if (IGNORED_EXTENSIONS.test(baseUrl)) return

                // --- SPIDER QUEUE ---
                if (
                  baseUrl.startsWith(siteOrigin) &&
                  !visitedPages.has(baseUrl)
                ) {
                  visitedPages.add(baseUrl)
                  pageQueue.push(baseUrl)
                }

                // --- DEAD LINK HTTP CHECK ---
                if (checkedLinks.has(baseUrl)) return
                checkedLinks.add(baseUrl)

                const { broken, statusCode } = await isLinkBroken(baseUrl)

                if (broken && !reportedBroken.has(baseUrl)) {
                  reportedBroken.add(baseUrl)
                  brokenLinks.push({
                    url: baseUrl,
                    reason: `HTTP Error ${statusCode === 0 ? "Connection Failed" : statusCode}`,
                    text: link.text,
                    statusCode,
                  })
                  logger.warn({ url: baseUrl, statusCode }, "Broken link found")
                }
              }),
            )

            await Promise.all(linkTasks)
          } catch (err) {
            // Ignore fatal navigation errors for a single page
          } finally {
            await spiderPage.close()
          }
        }),
      ),
    )
  }

  logger.info(
    { runId, totalPagesScraped, brokenFound: brokenLinks.length },
    "Playwright deep spider finished",
  )

  if (updateProgress) {
    await updateProgress(
      95,
      "Deep Spider: Compiling final dead link report...",
    ).catch(() => {})
  }

  if (brokenLinks.length === 0) return []

  const count = brokenLinks.length
  let severity: "medium" | "high" | "critical" = "medium"
  if (count >= 10) severity = "critical"
  else if (count >= 5) severity = "high"

  const description =
    `The following dead or broken links were detected during a deep site-wide scan (${totalPagesScraped} pages crawled):\n\n` +
    brokenLinks
      .map(
        (l) =>
          `- **${l.url}**\n  * Reason: ${l.reason}\n  * Link Text: "${l.text}"`,
      )
      .join("\n\n")

  const contextText = brokenLinks
    .map((l) => `Link Text: "${l.text}" | URL: ${l.url}`)
    .join("\n")

  return [
    {
      check_factor: "dead_links",
      severity,
      title: `${count} dead link${count > 1 ? "s" : ""} found site-wide`,
      description,
      context_text: contextText,
      screenshot_url: null,
      status: "open",
      ai_generated: false,
    },
  ]
}
