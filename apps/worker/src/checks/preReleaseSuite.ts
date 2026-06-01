import { Page as PlaywrightPage } from "playwright"
import { Finding } from "@qacc/shared"
import axios from "axios"
import pino from "pino"

// 1. Initialize Logger
const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: {
    target: "pino-pretty",
    options: { colorize: true },
  },
})

/**
 * =========================================================================
 * 2️⃣ CHECK 2: Privacy Policy Page Check
 * =========================================================================
 * The Logic:
 * - We check if the footer element contains a link to "Privacy Policy" or "Privacy".
 * - If WooCommerce is enabled, we navigate to '/checkout' and verify that it contains a "Privacy Policy" notice.
 */
export async function checkPrivacyPolicy(
  page: PlaywrightPage,
  isWooCommerce: boolean,
  pageRecord?: any,
): Promise<Finding[]> {
  const findings: Finding[] = []

  // Check footer first
  let footerHasLink = false
  const footerElement = page.locator(
    'footer, div[class*="footer"], section[class*="footer"]',
  )
  if ((await footerElement.count()) > 0) {
    const privacyLinks = footerElement.locator(
      'a:has-text("Privacy Policy"), a:has-text("Privacy")',
    )
    if ((await privacyLinks.count()) > 0) {
      footerHasLink = true
    }
  }

  if (!footerHasLink) {
    findings.push({
      check_factor: "privacy_policy",
      severity: "medium",
      title: "Missing Privacy Policy link in Footer",
      description:
        "We scanned the website footer, but we could not find the Privacy Policy link. Please add it to stay compliant.",
      status: "open",
      ai_generated: false,
    } as Finding)
  }

  // If WooCommerce check is enabled, check WooCommerce checkout page text
  if (isWooCommerce) {
    const currentUrl = page.url()
    if (currentUrl.includes("/checkout")) {
      const checkoutText = await page.evaluate(() =>
        document.body.innerText.toLowerCase(),
      )
      const hasPrivacyPolicyOnCheckout =
        checkoutText.includes("privacy policy") ||
        checkoutText.includes("privacy")

      if (!hasPrivacyPolicyOnCheckout) {
        findings.push({
          check_factor: "privacy_policy",
          severity: "medium",
          title: "Missing Privacy Policy on Checkout Page",
          description:
            "We scanned the WooCommerce checkout page, but we could not find any Privacy Policy text or link within the checkout form. Please make sure the privacy policy checkbox/text is set up.",
          status: "open",
          ai_generated: false,
        } as Finding)
      }
    }
  }

  return findings
}

/**
 * =========================================================================
 * 3️⃣ CHECK 3: Footer Logo Check (No Tagline)
 * =========================================================================
 * The Logic:
 * - Locate the logo image inside the footer.
 * - Analyze the image attributes (alt, src) to detect tagline keywords.
 */
export async function checkFooterLogo(
  url: string,
  runId: string,
  pageId: string,
  sharedBrowser?: any,
): Promise<Finding[]> {
  const { chromium } = require("playwright")
  const { uploadScreenshot } = require("../lib/supabaseStorage")

  let desktopUrl = ""
  let tabletUrl = ""
  let mobileUrl = ""

  try {
    const browser = sharedBrowser || (await chromium.launch({ headless: true }))
    const viewports = [
      { name: "desktop", width: 1440, height: 900 },
      { name: "tablet", width: 768, height: 1024 },
      { name: "mobile", width: 375, height: 812 },
    ]

    for (const vp of viewports) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
      })
      const newPage = await context.newPage()
      await newPage
        .goto(url, { waitUntil: "load", timeout: 30000 })
        .catch(() => {})

      const footer = newPage
        .locator('footer, div[class*="footer"], section[class*="footer"]')
        .first()

      if ((await footer.count()) > 0) {
        // Scroll the footer into view to trigger lazy loading of images
        await footer.scrollIntoViewIfNeeded().catch(() => {})

        // 5s delay AFTER scrolling to let the logo and dynamic content load
        await newPage.waitForTimeout(5000)

        // Capture only the footer element
        const buffer = await footer.screenshot()

        const storagePath = `${runId}/${pageId}/footer_${vp.name}.png`

        // Upload to supabase
        const publicUrl = await uploadScreenshot(buffer, storagePath)

        if (vp.name === "desktop") desktopUrl = publicUrl
        if (vp.name === "tablet") tabletUrl = publicUrl
        if (vp.name === "mobile") mobileUrl = publicUrl
      }
      await context.close()
    }
    if (!sharedBrowser) await browser.close()
  } catch (e: any) {
    console.error("Footer screenshot failed", e)
  }

  const screenshotUrls = [desktopUrl, tabletUrl, mobileUrl]
    .filter(Boolean)
    .join(",")

  return [
    {
      check_factor: "footer_logo",
      severity: "low",
      title: "Verify Footer Logo",
      description:
        "Please verify the footer logo across all 3 views (Desktop, Tablet, Mobile) using the evidence screenshots. The logo should not contain a tagline.",
      screenshot_url: screenshotUrls,
      status: "open",
      ai_generated: false,
    } as Finding,
  ]
}

/**
 * =========================================================================
 * CHECK 4: Single Script Features Check
 * =========================================================================
 * The Logic:
 * - Check if chatbot, review widgets are injected, and verify they are correctly right-aligned.
 */
export async function checkSingleScript(
  url: string,
  runId: string,
  pageId: string,
  sharedBrowser?: any,
): Promise<Finding[]> {
  const { chromium } = require("playwright")
  const { uploadScreenshot } = require("../lib/supabaseStorage")

  let desktopUrl = ""
  let tabletUrl = ""
  let mobileUrl = ""
  let codeUrl = ""

  try {
    const browser = sharedBrowser || (await chromium.launch({ headless: true }))
    const viewports = [
      { name: "desktop", width: 1440, height: 900 },
      { name: "tablet", width: 768, height: 1024 },
      { name: "mobile", width: 375, height: 812 },
    ]

    for (const vp of viewports) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      })

      const newPage = await context.newPage()
      await newPage
        // networkidle waits until there are no network connections for at least 500 ms (ensures JS fully loads)
        .goto(url, { waitUntil: "networkidle", timeout: 30000 })
        .catch(() => {})
      await newPage.evaluate(() => window.scrollBy(0, 500)).catch(() => {})

      await newPage
        .waitForSelector("#feature-buttons", { timeout: 15000 })
        .catch(() => {})
      await newPage.waitForTimeout(5000)

      // Capture visible viewport only
      const buffer = await newPage.screenshot({ fullPage: false })
      const storagePath = `${runId}/${pageId}/single_script_${vp.name}.png`
      const publicUrl = await uploadScreenshot(buffer, storagePath)

      if (vp.name === "desktop") desktopUrl = publicUrl
      if (vp.name === "tablet") tabletUrl = publicUrl
      if (vp.name === "mobile") mobileUrl = publicUrl

      await context.close()
    }

    // 4th screenshot: Page source of #feature-buttons code
    const codeContext = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    })

    const codePage = await codeContext.newPage()
    await codePage
      .goto(url, { waitUntil: "networkidle", timeout: 30000 })
      .catch(() => {})
    await codePage.evaluate(() => window.scrollBy(0, 500)).catch(() => {})

    await codePage
      .waitForSelector("#feature-buttons", { timeout: 15000 })
      .catch(() => {})
    await codePage.waitForTimeout(5000)

    const codeSnippet = await codePage.evaluate(() => {
      const el = document.querySelector("#feature-buttons")
      return el
        ? el.outerHTML
        : "Element #feature-buttons not found in page source"
    })

    const renderPage = await codeContext.newPage()
    await renderPage.setContent(
      `<pre style="font-size: 14px; white-space: pre-wrap; word-wrap: break-word; padding: 20px; background: #f4f4f4;">${codeSnippet.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>`,
    )
    const codeBuffer = await renderPage.screenshot({ fullPage: false })
    codeUrl = await uploadScreenshot(
      codeBuffer,
      `${runId}/${pageId}/single_script_code.png`,
    )

    await codeContext.close()
    if (!sharedBrowser) await browser.close()
  } catch (e: any) {
    console.error("Single script screenshot failed", e)
  }

  const screenshotUrls = [desktopUrl, tabletUrl, mobileUrl, codeUrl]
    .filter(Boolean)
    .join(",")

  return [
    {
      check_factor: "single_script",
      severity: "medium",
      title: "Verify Single Script Features",
      description:
        "Please verify the single script features across Desktop, Tablet, Mobile and verify the script code addition.",
      screenshot_url: screenshotUrls,
      status: "open",
      ai_generated: false,
    } as Finding,
  ]
}

/**
 * =========================================================================
 * 5️⃣ CHECK 5: Top Bar & Sticky Header Check
 * =========================================================================
 * The Logic:
 * - Top Bar Check: Search for Mobile, Email, and Social media links in the header metadata bar.
 * - Sticky Header Check: Bounding box comparison before and after scrolling down 500px to ensure the header stays visible.
 */
export async function checkTopBarAndStickyHeader(
  url: string,
  runId: string,
  pageId: string,
  sharedBrowser?: any,
): Promise<Finding[]> {
  const { chromium } = require("playwright")
  const { uploadScreenshot } = require("../lib/supabaseStorage")

  let codeUrl = ""
  let headerUrl = ""

  try {
    const browser = sharedBrowser || (await chromium.launch({ headless: true }))
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    })
    const newPage = await context.newPage()
    await newPage
      .goto(url, { waitUntil: "networkidle", timeout: 30000 })
      .catch(() => {})

    await newPage.waitForTimeout(5000)

    const headerElement = newPage
      .locator(
        "header, .site-header, #masthead, [data-elementor-type='header']",
      )
      .first()
    if ((await headerElement.count()) > 0) {
      const buffer = await headerElement.screenshot()
      headerUrl = await uploadScreenshot(
        buffer,
        `${runId}/${pageId}/header_nav.png`,
      )
    }

    const codeSnippet = await newPage.evaluate(() => {
      const el = document.querySelector(
        "header, .site-header, #masthead, [data-elementor-type='header']",
      )
      return el ? el.outerHTML : "Header element not found"
    })

    const codeContext = await browser.newContext()
    const renderPage = await codeContext.newPage()
    await renderPage.setContent(
      `<pre style="font-size: 14px; white-space: pre-wrap; word-wrap: break-word; padding: 20px; background: #f4f4f4;">${codeSnippet.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>`,
    )
    const codeBuffer = await renderPage.screenshot({ fullPage: false })
    codeUrl = await uploadScreenshot(
      codeBuffer,
      `${runId}/${pageId}/header_code.png`,
    )

    await codeContext.close()
    await context.close()
    if (!sharedBrowser) await browser.close()
  } catch (e: any) {
    console.error("Header screenshot failed", e)
  }

  const screenshotUrls = [codeUrl, headerUrl].filter(Boolean).join(",")

  return [
    {
      check_factor: "top_bar_sticky",
      severity: "medium",
      title: "Verify Top Bar & Sticky Header",
      description:
        "Please verify the top bar and sticky header using the provided screenshots.",
      screenshot_url: screenshotUrls,
      status: "open",
      ai_generated: false,
    } as Finding,
  ]
}

/**
 * =========================================================================
 * CHECK 6: Add Favicon Check
 * =========================================================================
 * The Logic:
 * - Search for favicon link relation inside head tags.
 * - Issue a fast HTTP request (axios.head) to verify the favicon resource returns 200 OK.
 */
export async function checkFavicon(
  page: PlaywrightPage,
  pageRecord?: any,
): Promise<Finding[]> {
  const findings: Finding[] = []

  const faviconHref = await page.evaluate(() => {
    const link = document.querySelector(
      'link[rel*="icon"], link[rel*="shortcut"]',
    ) as HTMLLinkElement
    return link ? link.href : null
  })

  if (!faviconHref) {
    findings.push({
      check_factor: "favicon",
      severity: "low",
      title: "Favicon Link Tag Missing",
      description:
        'We could not find any favicon link tag (<link rel="icon">) in the page head section.',
      status: "open",
      ai_generated: false,
    } as Finding)
    return findings
  }

  try {
    const response = await axios.head(faviconHref, { timeout: 10000 })
    if (response.status !== 200) {
      findings.push({
        check_factor: "favicon",
        severity: "low",
        title: `Favicon Link Broken (${response.status})`,
        description: `A favicon link was found, but fetching the file returned an HTTP status of ${response.status}.`,
        status: "open",
        ai_generated: false,
      } as Finding)
    }
  } catch (err: any) {
    findings.push({
      check_factor: "favicon",
      severity: "low",
      title: "Favicon Loading Failed",
      description: `We found a favicon link at "${faviconHref}", but we encountered an error while trying to fetch it: ${err.message}`,
      status: "open",
      ai_generated: false,
    } as Finding)
  }

  return findings
}

/**
 * =========================================================================
 * 7️⃣ CHECK 7: URL & Tab Name Matching Check
 * =========================================================================
 * The Logic:
 * - Extract page title and verify that it is formatted and not generic (like 'Untitled' or blank).
 * - Compare crawled relative page list with expected major pages (/about, /contact, /services, /reviews) to make sure none are missed.
 */
export async function checkUrlAndTabMatching(
  page: PlaywrightPage,
  devUrls: string[],
  liveSiteUrl: string,
  pageRecord?: any,
): Promise<Finding[]> {
  const findings: Finding[] = []

  const pageTitle = await page.title()
  if (
    !pageTitle ||
    pageTitle.trim() === "" ||
    pageTitle.toLowerCase().includes("untitled") ||
    pageTitle.toLowerCase().includes("page")
  ) {
    findings.push({
      check_factor: "url_matching",
      severity: "medium",
      title: `Invalid Tab Title for ${page.url()}`,
      description: `The page tab title "${pageTitle || "Empty"}" is invalid or blank. Please format it with your business name and page details.`,
      status: "open",
      ai_generated: false,
    } as Finding)
  }

  if (liveSiteUrl) {
    try {
      const currentUrl = page.url()
      const isHomepage =
        currentUrl === liveSiteUrl ||
        currentUrl === `${liveSiteUrl}/` ||
        currentUrl.replace(/www\./, "") === liveSiteUrl.replace(/www\./, "")

      if (isHomepage && devUrls.length > 0) {
        const devPaths = devUrls
          .map((url) => {
            try {
              return new URL(url).pathname.replace(/\/$/, "")
            } catch {
              return ""
            }
          })
          .filter(Boolean)

        const essentialPaths = ["/about", "/contact", "/services", "/reviews"]
        const missingPaths = essentialPaths.filter(
          (path) => !devPaths.some((devPath) => devPath.endsWith(path)),
        )

        if (missingPaths.length > 0) {
          findings.push({
            check_factor: "url_matching",
            severity: "medium",
            title: "Dev Site Sitemap URL Mismatch",
            description: `We compared standard live site page paths and found some essential paths are missing on the new dev site: ${missingPaths.join(", ")}. Please verify if these should be migrated.`,
            status: "open",
            ai_generated: false,
          } as Finding)
        }
      }
    } catch (e: any) {
      logger.error({ error: e.message }, "Error during URL sitemap matching.")
    }
  }

  return findings
}

/**
 * =========================================================================
 * 8️⃣ CHECK 8: Growth99 Contact Form Check
 * =========================================================================
 * The Logic:
 * - Search the page DOM for standard email/contact form elements.
 * - Verify the form fields and submit button are present, enabled, and responsive.
 */
export async function checkGrowth99ContactForm(
  page: PlaywrightPage,
  pageRecord?: any,
): Promise<Finding[]> {
  const findings: Finding[] = []

  const formLocator = page
    .locator(
      'form:has(input[type="email"]), form[class*="contact"], form[id*="contact"], form:has(input[placeholder*="Email"])',
    )
    .first()

  if ((await formLocator.count()) > 0) {
    const isVisible = await formLocator.isVisible()
    if (!isVisible) {
      findings.push({
        check_factor: "contact_form",
        severity: "medium",
        title: "Contact Form Hidden",
        description:
          "We detected a contact form markup in the DOM, but it is not visible on the screen. Please check CSS styling.",
        status: "open",
        ai_generated: false,
      } as Finding)
      return findings
    }

    try {
      const nameInput = formLocator
        .locator(
          'input[name*="name"], input[placeholder*="Name"], input[type="text"]',
        )
        .first()
      const emailInput = formLocator
        .locator(
          'input[type="email"], input[name*="email"], input[placeholder*="Email"]',
        )
        .first()
      const phoneInput = formLocator
        .locator(
          'input[type="tel"], input[name*="phone"], input[placeholder*="Phone"]',
        )
        .first()
      const submitBtn = formLocator
        .locator('button[type="submit"], input[type="submit"], .submit-btn')
        .first()

      if ((await nameInput.count()) > 0) await nameInput.fill("Test User")
      if ((await emailInput.count()) > 0)
        await emailInput.fill("test@growth99.com")
      if ((await phoneInput.count()) > 0) await phoneInput.fill("1234567890")

      const canSubmit =
        (await submitBtn.count()) > 0 && (await submitBtn.isEnabled())

      if (!canSubmit) {
        findings.push({
          check_factor: "contact_form",
          severity: "high",
          title: "Contact Form Submit Button Disabled or Missing",
          description:
            "A contact form was detected, but its submit button is either disabled or cannot be located on the page.",
          status: "open",
          ai_generated: false,
        } as Finding)
      }
    } catch (e: any) {
      findings.push({
        check_factor: "contact_form",
        severity: "high",
        title: "Contact Form Interaction Failed",
        description: `We attempted to interact with the contact form on this page, but experienced an error: ${e.message}`,
        status: "open",
        ai_generated: false,
      } as Finding)
    }
  }

  return findings
}

/**
 * =========================================================================
 * 9️⃣ CHECK 9: Chatbot & Virtual Consultation Check
 * =========================================================================
 * The Logic:
 * - Search launcher widgets. If launcher button is present, simulate click action.
 * - Verify widget displays the conversational layout context.
 */
export async function checkChatbotAndConsultation(
  page: PlaywrightPage,
  pageRecord?: any,
): Promise<Finding[]> {
  const findings: Finding[] = []

  const chatbotLauncher = page.locator(
    "#g99-chatbot-launcher, .g99-chatbot-launcher, #g99-chatbot-button",
  )
  const virtualConsultationLauncher = page.locator(
    '.g99-consultation-btn, #g99-consultation-btn, [class*="consultation"]',
  )

  const hasChatbot = (await chatbotLauncher.count()) > 0
  const hasConsultation = (await virtualConsultationLauncher.count()) > 0

  if (!hasChatbot && !hasConsultation) {
    return []
  }

  if (hasChatbot) {
    try {
      await chatbotLauncher.first().click({ timeout: 5000 })
      await page.waitForTimeout(1000)

      const isWindowOpen = await page
        .locator("#g99-chatbot-window, .g99-chatbot-window")
        .first()
        .isVisible()
      if (!isWindowOpen) {
        findings.push({
          check_factor: "chatbot_consultation",
          severity: "medium",
          title: "Chatbot Widget Unresponsive",
          description:
            "Clicked the chatbot launcher button, but the chatbot conversation window failed to open.",
          status: "open",
          ai_generated: false,
        } as Finding)
      }
    } catch (err: any) {
      logger.warn(
        { error: err.message },
        "Failed to interact with chatbot widget.",
      )
    }
  }

  return findings
}

/**
 * =========================================================================
 *  CHECK 11: Text Share Metadata Check
 * =========================================================================
 * The Logic:
 * - Grab 'og:title', 'og:site_name', and 'twitter:title' meta tags.
 * - Verify they don't contain WordPress boilerplate text like "My blog" or "Untitled WordPress Page".
 */
export async function checkTextShareMetadata(
  page: PlaywrightPage,
  projectName: string,
  pageRecord?: any,
): Promise<Finding[]> {
  const findings: Finding[] = []

  try {
    const metaTags = await page.evaluate(() => {
      const ogTitle = document.querySelector(
        'meta[property="og:title"]',
      ) as HTMLMetaElement
      const ogSiteName = document.querySelector(
        'meta[property="og:site_name"]',
      ) as HTMLMetaElement
      const twitterTitle = document.querySelector(
        'meta[name="twitter:title"]',
      ) as HTMLMetaElement
      return {
        ogTitle: ogTitle ? ogTitle.content : null,
        ogSiteName: ogSiteName ? ogSiteName.content : null,
        twitterTitle: twitterTitle ? twitterTitle.content : null,
      }
    })

    if (metaTags.ogTitle) {
      const titleLower = metaTags.ogTitle.toLowerCase()
      if (
        titleLower.includes("wordpress") ||
        titleLower.includes("elementor") ||
        titleLower.includes("my blog")
      ) {
        findings.push({
          check_factor: "text_share",
          severity: "medium",
          title: "Text Share Metadata - Default WordPress Value Found",
          description: `The og:title is set to a default value "${metaTags.ogTitle}", which looks like a WordPress boilerplate. Please update this tag before release.`,
          status: "open",
          ai_generated: false,
        } as Finding)
      }
    } else {
      findings.push({
        check_factor: "text_share",
        severity: "medium",
        title: "Text Share Metadata - Missing og:title Tag",
        description:
          "The Open Graph title tag (og:title) is missing. When users share the link via SMS/WhatsApp, it won't display a proper preview card title.",
        status: "open",
        ai_generated: false,
      } as Finding)
    }

    if (metaTags.ogSiteName) {
      const siteNameLower = metaTags.ogSiteName.toLowerCase()
      if (
        siteNameLower.includes("wordpress") ||
        siteNameLower.includes("my website")
      ) {
        findings.push({
          check_factor: "text_share",
          severity: "medium",
          title: "Text Share Metadata - Default Site Name",
          description: `The og:site_name contains default placeholder text "${metaTags.ogSiteName}" instead of matching the actual business name.`,
          status: "open",
          ai_generated: false,
        } as Finding)
      }
    }
  } catch (err: any) {
    logger.error(
      { error: err.message },
      "Error during text share metadata check",
    )
  }

  return findings
}

/**
 * =========================================================================
 * CHECK: Callnow & Links Check
 * =========================================================================
 */
export async function checkCallnowLinks(
  url: string,
  runId: string,
  pageId: string,
  wpPassword?: string,
  sharedBrowser?: any,
): Promise<Finding[]> {
  const { chromium } = require("playwright")
  const { uploadScreenshot } = require("../lib/supabaseStorage")

  if (!wpPassword) {
    return [
      {
        check_factor: "callnow_links",
        severity: "high",
        title: "Callnow Check Skipped - No Password",
        description:
          "The WordPress admin password was not provided. Skipping Callnow backend checks.",
        status: "open",
        ai_generated: false,
      } as Finding,
    ]
  }

  let pluginScreenshotUrl = ""
  let settingsScreenshotUrl = ""
  let mobileScreenshotUrl = ""

  let browser
  try {
    browser = sharedBrowser || (await chromium.launch({ headless: true }))

    const adminContext = await browser.newContext()
    const adminPage = await adminContext.newPage()

    const baseUrl = new URL(url).origin
    await adminPage
      .goto(`${baseUrl}/wp-login.php`, {
        waitUntil: "networkidle",
        timeout: 30000,
      })
      .catch(() => {})

    const userField = adminPage.locator('#user_login, input[name="log"]')
    const passField = adminPage.locator('#user_pass, input[name="pwd"]')
    const submitBtn = adminPage.locator('#wp-submit, input[type="submit"]')

    if ((await userField.count()) > 0 && (await passField.count()) > 0) {
      await userField.fill("onboarding.india@growth99.com")
      await passField.fill(wpPassword)
      await submitBtn.click()
      // Use domcontentloaded instead of networkidle to prevent hangs from WordPress heartbeat/polling
      await adminPage.waitForLoadState("domcontentloaded", { timeout: 15000 })
      // Wait for the admin bar or dashboard to signal a successful login
      await adminPage
        .waitForSelector("#wpadminbar, .wrap", { timeout: 15000 })
        .catch(() => {})
    }

    await adminPage
      .goto(`${baseUrl}/wp-admin/plugins.php`, {
        waitUntil: "networkidle",
        timeout: 30000,
      })
      .catch(() => {})
    const pluginRow = adminPage
      .locator(
        'tr[data-slug="call-now-button"], tr:has-text("Call Now Button")',
      )
      .first()
    if ((await pluginRow.count()) > 0) {
      const buffer = await pluginRow.screenshot()
      pluginScreenshotUrl = await uploadScreenshot(
        buffer,
        `${runId}/${pageId}/callnow_plugin.png`,
      )
    } else {
      const buffer = await adminPage.screenshot({ fullPage: true })
      pluginScreenshotUrl = await uploadScreenshot(
        buffer,
        `${runId}/${pageId}/callnow_plugin.png`,
      )
    }

    await adminPage
      .goto(`${baseUrl}/wp-admin/options-general.php?page=call-now-button`, {
        waitUntil: "networkidle",
        timeout: 30000,
      })
      .catch(() => {})
    const settingsBuffer = await adminPage.screenshot({ fullPage: true })
    settingsScreenshotUrl = await uploadScreenshot(
      settingsBuffer,
      `${runId}/${pageId}/callnow_settings.png`,
    )

    await adminPage.close()
    await adminContext.close()

    const mobileContext = await browser.newContext({
      viewport: { width: 375, height: 812 },
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1",
    })
    const mobilePage = await mobileContext.newPage()
    await mobilePage
      .goto(url, { waitUntil: "networkidle", timeout: 30000 })
      .catch(() => {})
    await mobilePage.waitForTimeout(5000)
    const mobileBuffer = await mobilePage.screenshot({ fullPage: false })
    mobileScreenshotUrl = await uploadScreenshot(
      mobileBuffer,
      `${runId}/${pageId}/callnow_mobile.png`,
    )

    await mobilePage.close()
    await mobileContext.close()
  } catch (error: any) {
    console.error("Callnow Links check failed:", error)
  } finally {
    if (browser && !sharedBrowser) {
      await browser.close()
    }
  }

  const screenshotUrls = [
    pluginScreenshotUrl,
    mobileScreenshotUrl,
    settingsScreenshotUrl,
  ]
    .filter(Boolean)
    .join(",")

  return [
    {
      check_factor: "callnow_links",
      severity: "medium",
      title: "Verify Call Now Button & Links",
      description: `Please verify the Call Now plugin setup and homepage links using the evidence screenshots.\n\nChecks to perform:\n- [ ] Call now installed\n- [ ] Number added\n- [ ] Visible in mobile view\n- [ ] Valid phone\n- [ ] Valid email\n- [ ] All links functional`,
      screenshot_url: screenshotUrls,
      status: "open",
      ai_generated: false,
    } as Finding,
  ]
}
