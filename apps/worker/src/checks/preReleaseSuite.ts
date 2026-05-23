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
 * 1️⃣ CHECK 1: Paid Media Check
 * =========================================================================
 * The Logic:
 * - We check if the project has 'has_paid_media' turned on.
 * - If yes, we make a call to the Basecamp API using 'basecamp_token'.
 * - We fetch the project bucket's Message Board or To-Do lists.
 * - We search for any To-Do item or Message containing words: "Google Ads", "Facebook Ads", "Campaign Started", "Paid Media".
 * - If we find that a campaign is active or created, we pass it!
 * - If we don't find it, we return a run-level finding so that the QA knows they need to ask.
 * - Tagging: "@Pankhila Kamble @Trixie Kate please provide details if campaign created..."
 */
export async function checkPaidMedia(
  page: PlaywrightPage,
  run: any,
  projectSettings: {
    has_paid_media?: boolean
    basecamp_token?: string
    basecamp_account_id?: string | number
    basecamp_project_id?: string | number
  },
): Promise<Finding[]> {
  const {
    has_paid_media,
    basecamp_token,
    basecamp_account_id,
    basecamp_project_id,
  } = projectSettings

  if (!basecamp_token || !basecamp_account_id || !basecamp_project_id) {
    logger.warn(
      "Basecamp integration settings are missing credentials for Paid Media check.",
    )
    return [
      {
        check_factor: "paid_media",
        severity: "medium",
        title: "Paid Media Check - Missing Basecamp Credentials",
        description:
          "Basecamp integration details are not set up properly, so we could not verify Paid Media details automatically.",
        status: "open",
        ai_generated: false,
      } as Finding,
    ]
  }

  const headers = {
    Authorization: `Bearer ${basecamp_token}`,
    "User-Agent": "QACC (raees.nazeem@growth99.com)",
    "Content-Type": "application/json",
    Accept: "application/json",
  }

  try {
    // Fetch project bucket details
    const bucketUrl = `https://3.basecampapi.com/${basecamp_account_id}/buckets/${basecamp_project_id}.json`
    const bucketResponse = await axios.get(bucketUrl, { headers })
    const bucketData = bucketResponse.data

    const keywords = [
      "google ads",
      "facebook ads",
      "campaign started",
      "paid media",
    ]
    let foundCampaign = false
    let matchedItem = ""

    // Scan Message Board Tool
    const messageBoardTool = bucketData.dock?.find(
      (tool: any) =>
        tool.title === "Message Board" ||
        tool.url?.includes("/message_boards/"),
    )

    if (messageBoardTool) {
      const messagesUrl = messageBoardTool.url.replace(
        ".json",
        "/messages.json",
      )
      const messagesResponse = await axios.get(messagesUrl, { headers })
      const messages = messagesResponse.data || []

      for (const msg of messages) {
        const textToScan =
          `${msg.subject || ""} ${msg.title || ""} ${msg.excerpt || ""}`.toLowerCase()
        if (keywords.some((keyword) => textToScan.includes(keyword))) {
          foundCampaign = true
          matchedItem = `Message Board post: "${msg.subject || msg.title}"`
          break
        }
      }
    }

    // Scan To-Do Tool (if not found on the Message Board yet)
    if (!foundCampaign) {
      const todosTool = bucketData.dock?.find(
        (tool: any) => tool.type === "todoset" || tool.title === "To-dos",
      )

      if (todosTool) {
        const listsUrl = todosTool.url.replace(".json", "/todolists.json")
        const listsResponse = await axios.get(listsUrl, { headers })
        const lists = listsResponse.data || []

        for (const list of lists) {
          const listTitle = (list.name || "").toLowerCase()
          if (keywords.some((keyword) => listTitle.includes(keyword))) {
            foundCampaign = true
            matchedItem = `To-Do List: "${list.name}"`
            break
          }

          if (list.todos_url) {
            const todosResponse = await axios.get(list.todos_url, { headers })
            const todos = todosResponse.data || []
            for (const todo of todos) {
              const todoContent =
                `${todo.content || ""} ${todo.description || ""}`.toLowerCase()
              if (keywords.some((keyword) => todoContent.includes(keyword))) {
                foundCampaign = true
                matchedItem = `To-Do Item: "${todo.content}"`
                break
              }
            }
          }
          if (foundCampaign) break
        }
      }
    }

    const findings: Finding[] = []

    if (foundCampaign) {
      logger.info({ matchedItem }, "Paid Media Campaign found!")
      findings.push({
        check_factor: "paid_media",
        severity: "low",
        title: "QA - Paid Media Campaign Active",
        description: `Verified: A Paid Media campaign was successfully found on Basecamp! Matched ${matchedItem}.`,
        status: "open",
        ai_generated: false,
      } as Finding)
    } else {
      logger.info("Paid Media Campaign NOT found in Basecamp.")
      findings.push({
        check_factor: "paid_media",
        severity: "high",
        title: "QA - Paid Media Campaign Not Found",
        description: `We checked the Basecamp project but could not find an active or created Google/Facebook Ads campaign. @Pankhila Kamble @Trixie Kate please provide details if campaign created for Google and Facebook ADS and all services created under campaign`,
        status: "open",
        ai_generated: false,
      } as Finding)
    }

    return findings
  } catch (error: any) {
    logger.error({ error: error.message }, "Error in Basecamp Paid Media check")
    return [
      {
        check_factor: "paid_media",
        severity: "medium",
        title: "QA - Paid Media Check Error",
        description: `Failed to fetch details from Basecamp: ${error.message}. @Pankhila Kamble @Trixie Kate please provide details if campaign created for Google and Facebook ADS and all services created under campaign`,
        status: "open",
        ai_generated: false,
      } as Finding,
    ]
  }
}

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
  page: PlaywrightPage,
  pageRecord?: any,
): Promise<Finding[]> {
  const findings: Finding[] = []

  const footerLogo = page
    .locator('footer img[src*="logo"], footer img[alt*="logo"]')
    .first()

  if ((await footerLogo.count()) > 0) {
    try {
      const altText = (
        (await footerLogo.getAttribute("alt")) || ""
      ).toLowerCase()
      const srcUrl = (
        (await footerLogo.getAttribute("src")) || ""
      ).toLowerCase()

      let taglineDetected = false
      if (
        altText.includes("tagline") ||
        srcUrl.includes("tagline") ||
        altText.split(" ").length > 3
      ) {
        taglineDetected = true
      }

      if (taglineDetected) {
        findings.push({
          check_factor: "footer_logo",
          severity: "low",
          title: "Footer logo contains tagline",
          description:
            "Our AI scan detected that the footer logo has tagline text or generic long description. Please use the brand new logo with NO tagline as per pre-release guidelines.",
          status: "open",
          ai_generated: true,
        } as Finding)
      }
    } catch (e: any) {
      logger.warn(
        { error: e.message },
        "Could not analyze footer logo screenshot.",
      )
    }
  } else {
    findings.push({
      check_factor: "footer_logo",
      severity: "low",
      title: "Footer Logo Not Found",
      description:
        "Could not find a clear logo image inside the footer element to verify tagline guidelines.",
      status: "open",
      ai_generated: false,
    } as Finding)
  }

  return findings
}

/**
 * =========================================================================
 * 4️⃣ CHECK 4: Single Script Features Check
 * =========================================================================
 * The Logic:
 * - Inspect loaded script tags and verify presence of "growth99" or "g99".
 * - Check if chatbot, review widgets are injected, and verify they are correctly right-aligned.
 */
export async function checkSingleScript(
  page: PlaywrightPage,
  pageRecord?: any,
): Promise<Finding[]> {
  const findings: Finding[] = []

  const scripts = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("script"))
      .map((s) => s.src)
      .filter(Boolean)
  })

  const hasGrowth99Script = scripts.some(
    (src) => src.includes("growth99") || src.includes("g99"),
  )

  if (!hasGrowth99Script) {
    findings.push({
      check_factor: "single_script",
      severity: "medium",
      title: "Single Script Integration Issue - Tag Missing",
      description:
        "Single script tag was not found in the HTML source code. Please inject the Growth99 integration script tag.",
      status: "open",
      ai_generated: false,
    } as Finding)
    return findings
  }

  const widgetsData = await page.evaluate(() => {
    const chatbot = document.querySelector(
      "#g99-chatbot-widget, .g99-chatbot-widget, #g99-chatbot-launcher",
    )
    const reviews = document.querySelector(
      ".g99-reviews-widget, #g99-reviews-widget",
    )
    const bookNow = document.querySelector(".g99-book-now, #g99-book-now")

    const getAlignment = (el: Element | null) => {
      if (!el) return null
      const rect = el.getBoundingClientRect()
      return rect.left > window.innerWidth / 2 ? "right" : "left"
    }

    return {
      hasChatbot: !!chatbot,
      chatbotAlignment: getAlignment(chatbot),
      hasReviews: !!reviews,
      hasBookNow: !!bookNow,
    }
  })

  if (!widgetsData.hasChatbot) {
    findings.push({
      check_factor: "single_script",
      severity: "medium",
      title: "Single Script Integration - Chatbot Widget Missing",
      description:
        "The Growth99 single script is loaded, but the chatbot widget element was not detected in the DOM.",
      status: "open",
      ai_generated: false,
    } as Finding)
  } else if (widgetsData.chatbotAlignment !== "right") {
    findings.push({
      check_factor: "single_script",
      severity: "medium",
      title: "Single Script Integration - Incorrect Chatbot Alignment",
      description:
        "The floating chatbot widget is not positioned on the right side of the screen. Standard layout requires it to be on the right side.",
      status: "open",
      ai_generated: false,
    } as Finding)
  }

  return findings
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
  page: PlaywrightPage,
  pageRecord?: any,
): Promise<Finding[]> {
  const findings: Finding[] = []

  const topBar = page.locator(
    ".topbar, .top-bar, #topbar, #top-bar, header .meta-bar, .header-top",
  )
  let topBarText = ""
  let hasPhone = false
  let hasEmail = false
  let hasSocial = false

  if ((await topBar.count()) > 0) {
    topBarText = await topBar.innerText()
    const phoneRegex = /(\+?\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/
    hasPhone =
      phoneRegex.test(topBarText) ||
      (await topBar.locator('a[href^="tel:"]').count()) > 0

    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
    hasEmail =
      emailRegex.test(topBarText) ||
      (await topBar.locator('a[href^="mailto:"]').count()) > 0

    const socialLinks = topBar.locator(
      'a[href*="facebook.com"], a[href*="instagram.com"], a[href*="twitter.com"], a[href*="linkedin.com"]',
    )
    hasSocial = (await socialLinks.count()) > 0
  }

  if (!topBarText) {
    findings.push({
      check_factor: "top_bar_sticky",
      severity: "medium",
      title: "Top Bar Section Missing",
      description:
        "We could not locate the top bar section on the page header. Please ensure it contains critical contact information.",
      status: "open",
      ai_generated: false,
    } as Finding)
  } else {
    if (!hasPhone) {
      findings.push({
        check_factor: "top_bar_sticky",
        severity: "medium",
        title: "Top Bar - Missing Phone Number",
        description:
          "The top bar is present, but no valid business mobile or phone number was found.",
        status: "open",
        ai_generated: false,
      } as Finding)
    }
    if (!hasEmail) {
      findings.push({
        check_factor: "top_bar_sticky",
        severity: "medium",
        title: "Top Bar - Missing Email Address",
        description:
          "The top bar is present, but no valid business email address was found.",
        status: "open",
        ai_generated: false,
      } as Finding)
    }
    if (!hasSocial) {
      findings.push({
        check_factor: "top_bar_sticky",
        severity: "low",
        title: "Top Bar - Missing Social Media Links",
        description:
          "We found no links to social media accounts (Facebook, Instagram, etc.) inside the top bar.",
        status: "open",
        ai_generated: false,
      } as Finding)
    }
  }

  // Sticky Header Check
  const header = page.locator("header, #masthead, .site-header").first()
  if ((await header.count()) > 0) {
    try {
      const boxBefore = await header.boundingBox()
      if (boxBefore) {
        const initialY = boxBefore.y

        await page.evaluate(() => window.scrollTo(0, 500))
        await page.waitForTimeout(500)

        const boxAfter = await header.boundingBox()
        const scrolledY = boxAfter ? boxAfter.y : -1

        const headerPosition = await header.evaluate((el) => {
          const style = window.getComputedStyle(el)
          return style.position
        })

        const isSticky =
          headerPosition === "fixed" ||
          headerPosition === "sticky" ||
          scrolledY >= initialY

        if (!isSticky) {
          findings.push({
            check_factor: "top_bar_sticky",
            severity: "medium",
            title: "Header is NOT Sticky on Scroll",
            description:
              "When the page scrolls down by 500px, the main header scrolls out of view. Pre-release guidelines require a sticky/fixed header.",
            status: "open",
            ai_generated: false,
          } as Finding)
        }
      }
    } catch (e: any) {
      logger.warn(
        { error: e.message },
        "Error checking header sticky property.",
      )
    } finally {
      await page.evaluate(() => window.scrollTo(0, 0))
    }
  }

  return findings
}

/**
 * =========================================================================
 * 6️⃣ CHECK 6: Add Favicon Check
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
 * 🔟 CHECK 🔟: Text Share Metadata Check
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
