"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkPrivacyPolicy = checkPrivacyPolicy;
exports.checkFooterLogo = checkFooterLogo;
exports.checkSingleScript = checkSingleScript;
exports.checkTopBarAndStickyHeader = checkTopBarAndStickyHeader;
exports.checkFavicon = checkFavicon;
exports.checkUrlAndTabMatching = checkUrlAndTabMatching;
exports.checkGrowth99ContactForm = checkGrowth99ContactForm;
exports.checkChatbotAndConsultation = checkChatbotAndConsultation;
exports.checkTextShareMetadata = checkTextShareMetadata;
exports.checkCallnowLinks = checkCallnowLinks;
var axios_1 = require("axios");
var pino_1 = require("pino");
// 1. Initialize Logger
var logger = (0, pino_1.default)({
    level: process.env.LOG_LEVEL || "info",
    transport: {
        target: "pino-pretty",
        options: { colorize: true },
    },
});
/**
 * =========================================================================
 * 2️⃣ CHECK 2: Privacy Policy Page Check
 * =========================================================================
 * The Logic:
 * - We check if the footer element contains a link to "Privacy Policy" or "Privacy".
 * - If WooCommerce is enabled, we navigate to '/checkout' and verify that it contains a "Privacy Policy" notice.
 */
function checkPrivacyPolicy(page, isWooCommerce, pageRecord) {
    return __awaiter(this, void 0, void 0, function () {
        var findings, footerHasLink, footerElement, privacyLinks, currentUrl, checkoutText, hasPrivacyPolicyOnCheckout;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    findings = [];
                    footerHasLink = false;
                    footerElement = page.locator('footer, div[class*="footer"], section[class*="footer"]');
                    return [4 /*yield*/, footerElement.count()];
                case 1:
                    if (!((_a.sent()) > 0)) return [3 /*break*/, 3];
                    privacyLinks = footerElement.locator('a:has-text("Privacy Policy"), a:has-text("Privacy")');
                    return [4 /*yield*/, privacyLinks.count()];
                case 2:
                    if ((_a.sent()) > 0) {
                        footerHasLink = true;
                    }
                    _a.label = 3;
                case 3:
                    if (!footerHasLink) {
                        findings.push({
                            check_factor: "privacy_policy",
                            severity: "medium",
                            title: "Missing Privacy Policy link in Footer",
                            description: "We scanned the website footer, but we could not find the Privacy Policy link. Please add it to stay compliant.",
                            status: "open",
                            ai_generated: false,
                        });
                    }
                    if (!isWooCommerce) return [3 /*break*/, 5];
                    currentUrl = page.url();
                    if (!currentUrl.includes("/checkout")) return [3 /*break*/, 5];
                    return [4 /*yield*/, page.evaluate(function () {
                            return document.body.innerText.toLowerCase();
                        })];
                case 4:
                    checkoutText = _a.sent();
                    hasPrivacyPolicyOnCheckout = checkoutText.includes("privacy policy") ||
                        checkoutText.includes("privacy");
                    if (!hasPrivacyPolicyOnCheckout) {
                        findings.push({
                            check_factor: "privacy_policy",
                            severity: "medium",
                            title: "Missing Privacy Policy on Checkout Page",
                            description: "We scanned the WooCommerce checkout page, but we could not find any Privacy Policy text or link within the checkout form. Please make sure the privacy policy checkbox/text is set up.",
                            status: "open",
                            ai_generated: false,
                        });
                    }
                    _a.label = 5;
                case 5: return [2 /*return*/, findings];
            }
        });
    });
}
/**
 * =========================================================================
 * 3️⃣ CHECK 3: Footer Logo Check (No Tagline)
 * =========================================================================
 * The Logic:
 * - Locate the logo image inside the footer.
 * - Analyze the image attributes (alt, src) to detect tagline keywords.
 */
function checkFooterLogo(url, runId, pageId) {
    return __awaiter(this, void 0, void 0, function () {
        var chromium, uploadScreenshot, desktopUrl, tabletUrl, mobileUrl, browser, viewports, _i, viewports_1, vp, context, newPage, footer, buffer, storagePath, publicUrl, e_1, screenshotUrls;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    chromium = require("playwright").chromium;
                    uploadScreenshot = require("../lib/supabaseStorage").uploadScreenshot;
                    desktopUrl = "";
                    tabletUrl = "";
                    mobileUrl = "";
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 17, , 18]);
                    return [4 /*yield*/, chromium.launch({ headless: true })];
                case 2:
                    browser = _a.sent();
                    viewports = [
                        { name: "desktop", width: 1440, height: 900 },
                        { name: "tablet", width: 768, height: 1024 },
                        { name: "mobile", width: 375, height: 812 },
                    ];
                    _i = 0, viewports_1 = viewports;
                    _a.label = 3;
                case 3:
                    if (!(_i < viewports_1.length)) return [3 /*break*/, 15];
                    vp = viewports_1[_i];
                    return [4 /*yield*/, browser.newContext({
                            viewport: { width: vp.width, height: vp.height },
                        })];
                case 4:
                    context = _a.sent();
                    return [4 /*yield*/, context.newPage()];
                case 5:
                    newPage = _a.sent();
                    return [4 /*yield*/, newPage
                            .goto(url, { waitUntil: "load", timeout: 30000 })
                            .catch(function () { })];
                case 6:
                    _a.sent();
                    footer = newPage
                        .locator('footer, div[class*="footer"], section[class*="footer"]')
                        .first();
                    return [4 /*yield*/, footer.count()];
                case 7:
                    if (!((_a.sent()) > 0)) return [3 /*break*/, 12];
                    // Scroll the footer into view to trigger lazy loading of images
                    return [4 /*yield*/, footer.scrollIntoViewIfNeeded().catch(function () { })
                        // 5s delay AFTER scrolling to let the logo and dynamic content load
                    ];
                case 8:
                    // Scroll the footer into view to trigger lazy loading of images
                    _a.sent();
                    // 5s delay AFTER scrolling to let the logo and dynamic content load
                    return [4 /*yield*/, newPage.waitForTimeout(5000)
                        // Capture only the footer element
                    ];
                case 9:
                    // 5s delay AFTER scrolling to let the logo and dynamic content load
                    _a.sent();
                    return [4 /*yield*/, footer.screenshot()];
                case 10:
                    buffer = _a.sent();
                    storagePath = "".concat(runId, "/").concat(pageId, "/footer_").concat(vp.name, ".png");
                    return [4 /*yield*/, uploadScreenshot(buffer, storagePath)];
                case 11:
                    publicUrl = _a.sent();
                    if (vp.name === "desktop")
                        desktopUrl = publicUrl;
                    if (vp.name === "tablet")
                        tabletUrl = publicUrl;
                    if (vp.name === "mobile")
                        mobileUrl = publicUrl;
                    _a.label = 12;
                case 12: return [4 /*yield*/, context.close()];
                case 13:
                    _a.sent();
                    _a.label = 14;
                case 14:
                    _i++;
                    return [3 /*break*/, 3];
                case 15: return [4 /*yield*/, browser.close()];
                case 16:
                    _a.sent();
                    return [3 /*break*/, 18];
                case 17:
                    e_1 = _a.sent();
                    console.error("Footer screenshot failed", e_1);
                    return [3 /*break*/, 18];
                case 18:
                    screenshotUrls = [desktopUrl, tabletUrl, mobileUrl]
                        .filter(Boolean)
                        .join(",");
                    return [2 /*return*/, [
                            {
                                check_factor: "footer_logo",
                                severity: "low",
                                title: "Verify Footer Logo",
                                description: "Please verify the footer logo across all 3 views (Desktop, Tablet, Mobile) using the evidence screenshots. The logo should not contain a tagline.",
                                screenshot_url: screenshotUrls,
                                status: "open",
                                ai_generated: false,
                            },
                        ]];
            }
        });
    });
}
/**
 * =========================================================================
 * CHECK 4: Single Script Features Check
 * =========================================================================
 * The Logic:
 * - Check if chatbot, review widgets are injected, and verify they are correctly right-aligned.
 */
function checkSingleScript(url, runId, pageId) {
    return __awaiter(this, void 0, void 0, function () {
        var chromium, uploadScreenshot, desktopUrl, tabletUrl, mobileUrl, codeUrl, browser, viewports, _i, viewports_2, vp, context, newPage, buffer, storagePath, publicUrl, codeContext, codePage, codeSnippet, renderPage, codeBuffer, e_2, screenshotUrls;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    chromium = require("playwright").chromium;
                    uploadScreenshot = require("../lib/supabaseStorage").uploadScreenshot;
                    desktopUrl = "";
                    tabletUrl = "";
                    mobileUrl = "";
                    codeUrl = "";
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 24, , 25]);
                    return [4 /*yield*/, chromium.launch({ headless: true })];
                case 2:
                    browser = _a.sent();
                    viewports = [
                        { name: "desktop", width: 1440, height: 900 },
                        { name: "tablet", width: 768, height: 1024 },
                        { name: "mobile", width: 375, height: 812 },
                    ];
                    _i = 0, viewports_2 = viewports;
                    _a.label = 3;
                case 3:
                    if (!(_i < viewports_2.length)) return [3 /*break*/, 12];
                    vp = viewports_2[_i];
                    return [4 /*yield*/, browser.newContext({
                            viewport: { width: vp.width, height: vp.height },
                        })];
                case 4:
                    context = _a.sent();
                    return [4 /*yield*/, context.newPage()];
                case 5:
                    newPage = _a.sent();
                    return [4 /*yield*/, newPage
                            // networkidle waits until there are no network connections for at least 500 ms (ensures JS fully loads)
                            .goto(url, { waitUntil: "networkidle", timeout: 30000 })
                            .catch(function () { })
                        // Wait an extra 5 seconds just in case there are slow CSS animations triggered by the JS
                    ];
                case 6:
                    _a.sent();
                    // Wait an extra 5 seconds just in case there are slow CSS animations triggered by the JS
                    return [4 /*yield*/, newPage.waitForTimeout(5000)
                        // Capture visible viewport only
                    ];
                case 7:
                    // Wait an extra 5 seconds just in case there are slow CSS animations triggered by the JS
                    _a.sent();
                    return [4 /*yield*/, newPage.screenshot({ fullPage: false })];
                case 8:
                    buffer = _a.sent();
                    storagePath = "".concat(runId, "/").concat(pageId, "/single_script_").concat(vp.name, ".png");
                    return [4 /*yield*/, uploadScreenshot(buffer, storagePath)];
                case 9:
                    publicUrl = _a.sent();
                    if (vp.name === "desktop")
                        desktopUrl = publicUrl;
                    if (vp.name === "tablet")
                        tabletUrl = publicUrl;
                    if (vp.name === "mobile")
                        mobileUrl = publicUrl;
                    return [4 /*yield*/, context.close()];
                case 10:
                    _a.sent();
                    _a.label = 11;
                case 11:
                    _i++;
                    return [3 /*break*/, 3];
                case 12: return [4 /*yield*/, browser.newContext()];
                case 13:
                    codeContext = _a.sent();
                    return [4 /*yield*/, codeContext.newPage()];
                case 14:
                    codePage = _a.sent();
                    return [4 /*yield*/, codePage
                            .goto(url, { waitUntil: "networkidle", timeout: 30000 })
                            .catch(function () { })
                        // Wait an extra 5 seconds for the JS injection to occur before evaluating
                    ];
                case 15:
                    _a.sent();
                    // Wait an extra 5 seconds for the JS injection to occur before evaluating
                    return [4 /*yield*/, codePage.waitForTimeout(5000)];
                case 16:
                    // Wait an extra 5 seconds for the JS injection to occur before evaluating
                    _a.sent();
                    return [4 /*yield*/, codePage.evaluate(function () {
                            var el = document.querySelector("#feature-buttons");
                            return el
                                ? el.outerHTML
                                : "Element #feature-buttons not found in page source";
                        })];
                case 17:
                    codeSnippet = _a.sent();
                    return [4 /*yield*/, codeContext.newPage()];
                case 18:
                    renderPage = _a.sent();
                    return [4 /*yield*/, renderPage.setContent("<pre style=\"font-size: 14px; white-space: pre-wrap; word-wrap: break-word; padding: 20px; background: #f4f4f4;\">".concat(codeSnippet.replace(/</g, "&lt;").replace(/>/g, "&gt;"), "</pre>"))];
                case 19:
                    _a.sent();
                    return [4 /*yield*/, renderPage.screenshot({ fullPage: false })];
                case 20:
                    codeBuffer = _a.sent();
                    return [4 /*yield*/, uploadScreenshot(codeBuffer, "".concat(runId, "/").concat(pageId, "/single_script_code.png"))];
                case 21:
                    codeUrl = _a.sent();
                    return [4 /*yield*/, codeContext.close()];
                case 22:
                    _a.sent();
                    return [4 /*yield*/, browser.close()];
                case 23:
                    _a.sent();
                    return [3 /*break*/, 25];
                case 24:
                    e_2 = _a.sent();
                    console.error("Single script screenshot failed", e_2);
                    return [3 /*break*/, 25];
                case 25:
                    screenshotUrls = [desktopUrl, tabletUrl, mobileUrl, codeUrl]
                        .filter(Boolean)
                        .join(",");
                    return [2 /*return*/, [
                            {
                                check_factor: "single_script",
                                severity: "medium",
                                title: "Verify Single Script Features",
                                description: "Please verify the single script features across Desktop, Tablet, Mobile and verify the script code addition.",
                                screenshot_url: screenshotUrls,
                                status: "open",
                                ai_generated: false,
                            },
                        ]];
            }
        });
    });
}
/**
 * =========================================================================
 * 5️⃣ CHECK 5: Top Bar & Sticky Header Check
 * =========================================================================
 * The Logic:
 * - Top Bar Check: Search for Mobile, Email, and Social media links in the header metadata bar.
 * - Sticky Header Check: Bounding box comparison before and after scrolling down 500px to ensure the header stays visible.
 */
function checkTopBarAndStickyHeader(url, runId, pageId) {
    return __awaiter(this, void 0, void 0, function () {
        var chromium, uploadScreenshot, codeUrl, headerUrl, browser, context, newPage, headerElement, buffer, codeSnippet, codeContext, renderPage, codeBuffer, e_3, screenshotUrls;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    chromium = require("playwright").chromium;
                    uploadScreenshot = require("../lib/supabaseStorage").uploadScreenshot;
                    codeUrl = "";
                    headerUrl = "";
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 20, , 21]);
                    return [4 /*yield*/, chromium.launch({ headless: true })];
                case 2:
                    browser = _a.sent();
                    return [4 /*yield*/, browser.newContext({
                            viewport: { width: 1440, height: 900 },
                        })];
                case 3:
                    context = _a.sent();
                    return [4 /*yield*/, context.newPage()];
                case 4:
                    newPage = _a.sent();
                    return [4 /*yield*/, newPage
                            .goto(url, { waitUntil: "networkidle", timeout: 30000 })
                            .catch(function () { })];
                case 5:
                    _a.sent();
                    return [4 /*yield*/, newPage.waitForTimeout(5000)];
                case 6:
                    _a.sent();
                    headerElement = newPage
                        .locator("header, .site-header, #masthead, [data-elementor-type='header']")
                        .first();
                    return [4 /*yield*/, headerElement.count()];
                case 7:
                    if (!((_a.sent()) > 0)) return [3 /*break*/, 10];
                    return [4 /*yield*/, headerElement.screenshot()];
                case 8:
                    buffer = _a.sent();
                    return [4 /*yield*/, uploadScreenshot(buffer, "".concat(runId, "/").concat(pageId, "/header_nav.png"))];
                case 9:
                    headerUrl = _a.sent();
                    _a.label = 10;
                case 10: return [4 /*yield*/, newPage.evaluate(function () {
                        var el = document.querySelector("header, .site-header, #masthead, [data-elementor-type='header']");
                        return el ? el.outerHTML : "Header element not found";
                    })];
                case 11:
                    codeSnippet = _a.sent();
                    return [4 /*yield*/, browser.newContext()];
                case 12:
                    codeContext = _a.sent();
                    return [4 /*yield*/, codeContext.newPage()];
                case 13:
                    renderPage = _a.sent();
                    return [4 /*yield*/, renderPage.setContent("<pre style=\"font-size: 14px; white-space: pre-wrap; word-wrap: break-word; padding: 20px; background: #f4f4f4;\">".concat(codeSnippet.replace(/</g, "&lt;").replace(/>/g, "&gt;"), "</pre>"))];
                case 14:
                    _a.sent();
                    return [4 /*yield*/, renderPage.screenshot({ fullPage: false })];
                case 15:
                    codeBuffer = _a.sent();
                    return [4 /*yield*/, uploadScreenshot(codeBuffer, "".concat(runId, "/").concat(pageId, "/header_code.png"))];
                case 16:
                    codeUrl = _a.sent();
                    return [4 /*yield*/, codeContext.close()];
                case 17:
                    _a.sent();
                    return [4 /*yield*/, context.close()];
                case 18:
                    _a.sent();
                    return [4 /*yield*/, browser.close()];
                case 19:
                    _a.sent();
                    return [3 /*break*/, 21];
                case 20:
                    e_3 = _a.sent();
                    console.error("Header screenshot failed", e_3);
                    return [3 /*break*/, 21];
                case 21:
                    screenshotUrls = [codeUrl, headerUrl].filter(Boolean).join(",");
                    return [2 /*return*/, [
                            {
                                check_factor: "top_bar_sticky",
                                severity: "medium",
                                title: "Verify Top Bar & Sticky Header",
                                description: "Please verify the top bar and sticky header using the provided screenshots.",
                                screenshot_url: screenshotUrls,
                                status: "open",
                                ai_generated: false,
                            },
                        ]];
            }
        });
    });
}
/**
 * =========================================================================
 * CHECK 6: Add Favicon Check
 * =========================================================================
 * The Logic:
 * - Search for favicon link relation inside head tags.
 * - Issue a fast HTTP request (axios.head) to verify the favicon resource returns 200 OK.
 */
function checkFavicon(page, pageRecord) {
    return __awaiter(this, void 0, void 0, function () {
        var findings, faviconHref, response, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    findings = [];
                    return [4 /*yield*/, page.evaluate(function () {
                            var link = document.querySelector('link[rel*="icon"], link[rel*="shortcut"]');
                            return link ? link.href : null;
                        })];
                case 1:
                    faviconHref = _a.sent();
                    if (!faviconHref) {
                        findings.push({
                            check_factor: "favicon",
                            severity: "low",
                            title: "Favicon Link Tag Missing",
                            description: 'We could not find any favicon link tag (<link rel="icon">) in the page head section.',
                            status: "open",
                            ai_generated: false,
                        });
                        return [2 /*return*/, findings];
                    }
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, axios_1.default.head(faviconHref, { timeout: 10000 })];
                case 3:
                    response = _a.sent();
                    if (response.status !== 200) {
                        findings.push({
                            check_factor: "favicon",
                            severity: "low",
                            title: "Favicon Link Broken (".concat(response.status, ")"),
                            description: "A favicon link was found, but fetching the file returned an HTTP status of ".concat(response.status, "."),
                            status: "open",
                            ai_generated: false,
                        });
                    }
                    return [3 /*break*/, 5];
                case 4:
                    err_1 = _a.sent();
                    findings.push({
                        check_factor: "favicon",
                        severity: "low",
                        title: "Favicon Loading Failed",
                        description: "We found a favicon link at \"".concat(faviconHref, "\", but we encountered an error while trying to fetch it: ").concat(err_1.message),
                        status: "open",
                        ai_generated: false,
                    });
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/, findings];
            }
        });
    });
}
/**
 * =========================================================================
 * 7️⃣ CHECK 7: URL & Tab Name Matching Check
 * =========================================================================
 * The Logic:
 * - Extract page title and verify that it is formatted and not generic (like 'Untitled' or blank).
 * - Compare crawled relative page list with expected major pages (/about, /contact, /services, /reviews) to make sure none are missed.
 */
function checkUrlAndTabMatching(page, devUrls, liveSiteUrl, pageRecord) {
    return __awaiter(this, void 0, void 0, function () {
        var findings, pageTitle, currentUrl, isHomepage, devPaths_1, essentialPaths, missingPaths;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    findings = [];
                    return [4 /*yield*/, page.title()];
                case 1:
                    pageTitle = _a.sent();
                    if (!pageTitle ||
                        pageTitle.trim() === "" ||
                        pageTitle.toLowerCase().includes("untitled") ||
                        pageTitle.toLowerCase().includes("page")) {
                        findings.push({
                            check_factor: "url_matching",
                            severity: "medium",
                            title: "Invalid Tab Title for ".concat(page.url()),
                            description: "The page tab title \"".concat(pageTitle || "Empty", "\" is invalid or blank. Please format it with your business name and page details."),
                            status: "open",
                            ai_generated: false,
                        });
                    }
                    if (liveSiteUrl) {
                        try {
                            currentUrl = page.url();
                            isHomepage = currentUrl === liveSiteUrl ||
                                currentUrl === "".concat(liveSiteUrl, "/") ||
                                currentUrl.replace(/www\./, "") === liveSiteUrl.replace(/www\./, "");
                            if (isHomepage && devUrls.length > 0) {
                                devPaths_1 = devUrls
                                    .map(function (url) {
                                    try {
                                        return new URL(url).pathname.replace(/\/$/, "");
                                    }
                                    catch (_a) {
                                        return "";
                                    }
                                })
                                    .filter(Boolean);
                                essentialPaths = ["/about", "/contact", "/services", "/reviews"];
                                missingPaths = essentialPaths.filter(function (path) { return !devPaths_1.some(function (devPath) { return devPath.endsWith(path); }); });
                                if (missingPaths.length > 0) {
                                    findings.push({
                                        check_factor: "url_matching",
                                        severity: "medium",
                                        title: "Dev Site Sitemap URL Mismatch",
                                        description: "We compared standard live site page paths and found some essential paths are missing on the new dev site: ".concat(missingPaths.join(", "), ". Please verify if these should be migrated."),
                                        status: "open",
                                        ai_generated: false,
                                    });
                                }
                            }
                        }
                        catch (e) {
                            logger.error({ error: e.message }, "Error during URL sitemap matching.");
                        }
                    }
                    return [2 /*return*/, findings];
            }
        });
    });
}
/**
 * =========================================================================
 * 8️⃣ CHECK 8: Growth99 Contact Form Check
 * =========================================================================
 * The Logic:
 * - Search the page DOM for standard email/contact form elements.
 * - Verify the form fields and submit button are present, enabled, and responsive.
 */
function checkGrowth99ContactForm(page, pageRecord) {
    return __awaiter(this, void 0, void 0, function () {
        var findings, formLocator, isVisible, nameInput, emailInput, phoneInput, submitBtn, canSubmit, _a, e_4;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    findings = [];
                    formLocator = page
                        .locator('form:has(input[type="email"]), form[class*="contact"], form[id*="contact"], form:has(input[placeholder*="Email"])')
                        .first();
                    return [4 /*yield*/, formLocator.count()];
                case 1:
                    if (!((_b.sent()) > 0)) return [3 /*break*/, 17];
                    return [4 /*yield*/, formLocator.isVisible()];
                case 2:
                    isVisible = _b.sent();
                    if (!isVisible) {
                        findings.push({
                            check_factor: "contact_form",
                            severity: "medium",
                            title: "Contact Form Hidden",
                            description: "We detected a contact form markup in the DOM, but it is not visible on the screen. Please check CSS styling.",
                            status: "open",
                            ai_generated: false,
                        });
                        return [2 /*return*/, findings];
                    }
                    _b.label = 3;
                case 3:
                    _b.trys.push([3, 16, , 17]);
                    nameInput = formLocator
                        .locator('input[name*="name"], input[placeholder*="Name"], input[type="text"]')
                        .first();
                    emailInput = formLocator
                        .locator('input[type="email"], input[name*="email"], input[placeholder*="Email"]')
                        .first();
                    phoneInput = formLocator
                        .locator('input[type="tel"], input[name*="phone"], input[placeholder*="Phone"]')
                        .first();
                    submitBtn = formLocator
                        .locator('button[type="submit"], input[type="submit"], .submit-btn')
                        .first();
                    return [4 /*yield*/, nameInput.count()];
                case 4:
                    if (!((_b.sent()) > 0)) return [3 /*break*/, 6];
                    return [4 /*yield*/, nameInput.fill("Test User")];
                case 5:
                    _b.sent();
                    _b.label = 6;
                case 6: return [4 /*yield*/, emailInput.count()];
                case 7:
                    if (!((_b.sent()) > 0)) return [3 /*break*/, 9];
                    return [4 /*yield*/, emailInput.fill("test@growth99.com")];
                case 8:
                    _b.sent();
                    _b.label = 9;
                case 9: return [4 /*yield*/, phoneInput.count()];
                case 10:
                    if (!((_b.sent()) > 0)) return [3 /*break*/, 12];
                    return [4 /*yield*/, phoneInput.fill("1234567890")];
                case 11:
                    _b.sent();
                    _b.label = 12;
                case 12: return [4 /*yield*/, submitBtn.count()];
                case 13:
                    _a = (_b.sent()) > 0;
                    if (!_a) return [3 /*break*/, 15];
                    return [4 /*yield*/, submitBtn.isEnabled()];
                case 14:
                    _a = (_b.sent());
                    _b.label = 15;
                case 15:
                    canSubmit = _a;
                    if (!canSubmit) {
                        findings.push({
                            check_factor: "contact_form",
                            severity: "high",
                            title: "Contact Form Submit Button Disabled or Missing",
                            description: "A contact form was detected, but its submit button is either disabled or cannot be located on the page.",
                            status: "open",
                            ai_generated: false,
                        });
                    }
                    return [3 /*break*/, 17];
                case 16:
                    e_4 = _b.sent();
                    findings.push({
                        check_factor: "contact_form",
                        severity: "high",
                        title: "Contact Form Interaction Failed",
                        description: "We attempted to interact with the contact form on this page, but experienced an error: ".concat(e_4.message),
                        status: "open",
                        ai_generated: false,
                    });
                    return [3 /*break*/, 17];
                case 17: return [2 /*return*/, findings];
            }
        });
    });
}
/**
 * =========================================================================
 * 9️⃣ CHECK 9: Chatbot & Virtual Consultation Check
 * =========================================================================
 * The Logic:
 * - Search launcher widgets. If launcher button is present, simulate click action.
 * - Verify widget displays the conversational layout context.
 */
function checkChatbotAndConsultation(page, pageRecord) {
    return __awaiter(this, void 0, void 0, function () {
        var findings, chatbotLauncher, virtualConsultationLauncher, hasChatbot, hasConsultation, isWindowOpen, err_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    findings = [];
                    chatbotLauncher = page.locator("#g99-chatbot-launcher, .g99-chatbot-launcher, #g99-chatbot-button");
                    virtualConsultationLauncher = page.locator('.g99-consultation-btn, #g99-consultation-btn, [class*="consultation"]');
                    return [4 /*yield*/, chatbotLauncher.count()];
                case 1:
                    hasChatbot = (_a.sent()) > 0;
                    return [4 /*yield*/, virtualConsultationLauncher.count()];
                case 2:
                    hasConsultation = (_a.sent()) > 0;
                    if (!hasChatbot && !hasConsultation) {
                        return [2 /*return*/, []];
                    }
                    if (!hasChatbot) return [3 /*break*/, 8];
                    _a.label = 3;
                case 3:
                    _a.trys.push([3, 7, , 8]);
                    return [4 /*yield*/, chatbotLauncher.first().click({ timeout: 5000 })];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, page.waitForTimeout(1000)];
                case 5:
                    _a.sent();
                    return [4 /*yield*/, page
                            .locator("#g99-chatbot-window, .g99-chatbot-window")
                            .first()
                            .isVisible()];
                case 6:
                    isWindowOpen = _a.sent();
                    if (!isWindowOpen) {
                        findings.push({
                            check_factor: "chatbot_consultation",
                            severity: "medium",
                            title: "Chatbot Widget Unresponsive",
                            description: "Clicked the chatbot launcher button, but the chatbot conversation window failed to open.",
                            status: "open",
                            ai_generated: false,
                        });
                    }
                    return [3 /*break*/, 8];
                case 7:
                    err_2 = _a.sent();
                    logger.warn({ error: err_2.message }, "Failed to interact with chatbot widget.");
                    return [3 /*break*/, 8];
                case 8: return [2 /*return*/, findings];
            }
        });
    });
}
/**
 * =========================================================================
 *  CHECK 11: Text Share Metadata Check
 * =========================================================================
 * The Logic:
 * - Grab 'og:title', 'og:site_name', and 'twitter:title' meta tags.
 * - Verify they don't contain WordPress boilerplate text like "My blog" or "Untitled WordPress Page".
 */
function checkTextShareMetadata(page, projectName, pageRecord) {
    return __awaiter(this, void 0, void 0, function () {
        var findings, metaTags, titleLower, siteNameLower, err_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    findings = [];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, page.evaluate(function () {
                            var ogTitle = document.querySelector('meta[property="og:title"]');
                            var ogSiteName = document.querySelector('meta[property="og:site_name"]');
                            var twitterTitle = document.querySelector('meta[name="twitter:title"]');
                            return {
                                ogTitle: ogTitle ? ogTitle.content : null,
                                ogSiteName: ogSiteName ? ogSiteName.content : null,
                                twitterTitle: twitterTitle ? twitterTitle.content : null,
                            };
                        })];
                case 2:
                    metaTags = _a.sent();
                    if (metaTags.ogTitle) {
                        titleLower = metaTags.ogTitle.toLowerCase();
                        if (titleLower.includes("wordpress") ||
                            titleLower.includes("elementor") ||
                            titleLower.includes("my blog")) {
                            findings.push({
                                check_factor: "text_share",
                                severity: "medium",
                                title: "Text Share Metadata - Default WordPress Value Found",
                                description: "The og:title is set to a default value \"".concat(metaTags.ogTitle, "\", which looks like a WordPress boilerplate. Please update this tag before release."),
                                status: "open",
                                ai_generated: false,
                            });
                        }
                    }
                    else {
                        findings.push({
                            check_factor: "text_share",
                            severity: "medium",
                            title: "Text Share Metadata - Missing og:title Tag",
                            description: "The Open Graph title tag (og:title) is missing. When users share the link via SMS/WhatsApp, it won't display a proper preview card title.",
                            status: "open",
                            ai_generated: false,
                        });
                    }
                    if (metaTags.ogSiteName) {
                        siteNameLower = metaTags.ogSiteName.toLowerCase();
                        if (siteNameLower.includes("wordpress") ||
                            siteNameLower.includes("my website")) {
                            findings.push({
                                check_factor: "text_share",
                                severity: "medium",
                                title: "Text Share Metadata - Default Site Name",
                                description: "The og:site_name contains default placeholder text \"".concat(metaTags.ogSiteName, "\" instead of matching the actual business name."),
                                status: "open",
                                ai_generated: false,
                            });
                        }
                    }
                    return [3 /*break*/, 4];
                case 3:
                    err_3 = _a.sent();
                    logger.error({ error: err_3.message }, "Error during text share metadata check");
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/, findings];
            }
        });
    });
}
/**
 * =========================================================================
 * CHECK: Callnow & Links Check
 * =========================================================================
 */
function checkCallnowLinks(url, runId, pageId, wpPassword) {
    return __awaiter(this, void 0, void 0, function () {
        var chromium, uploadScreenshot, pluginScreenshotUrl, settingsScreenshotUrl, mobileScreenshotUrl, browser, adminContext, adminPage, baseUrl, userField, passField, submitBtn, _a, pluginRow, buffer, buffer, settingsBuffer, mobileContext, mobilePage, mobileBuffer, error_1, screenshotUrls;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    chromium = require("playwright").chromium;
                    uploadScreenshot = require("../lib/supabaseStorage").uploadScreenshot;
                    if (!wpPassword) {
                        return [2 /*return*/, [
                                {
                                    check_factor: "callnow_links",
                                    severity: "high",
                                    title: "Callnow Check Skipped - No Password",
                                    description: "The WordPress admin password was not provided. Skipping Callnow backend checks.",
                                    status: "open",
                                    ai_generated: false,
                                },
                            ]];
                    }
                    pluginScreenshotUrl = "";
                    settingsScreenshotUrl = "";
                    mobileScreenshotUrl = "";
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 36, 37, 40]);
                    return [4 /*yield*/, chromium.launch({ headless: true })];
                case 2:
                    browser = _b.sent();
                    return [4 /*yield*/, browser.newContext()];
                case 3:
                    adminContext = _b.sent();
                    return [4 /*yield*/, adminContext.newPage()];
                case 4:
                    adminPage = _b.sent();
                    baseUrl = new URL(url).origin;
                    return [4 /*yield*/, adminPage
                            .goto("".concat(baseUrl, "/wp-login.php"), {
                            waitUntil: "networkidle",
                            timeout: 30000,
                        })
                            .catch(function () { })];
                case 5:
                    _b.sent();
                    userField = adminPage.locator('#user_login, input[name="log"]');
                    passField = adminPage.locator('#user_pass, input[name="pwd"]');
                    submitBtn = adminPage.locator('#wp-submit, input[type="submit"]');
                    return [4 /*yield*/, userField.count()];
                case 6:
                    _a = (_b.sent()) > 0;
                    if (!_a) return [3 /*break*/, 8];
                    return [4 /*yield*/, passField.count()];
                case 7:
                    _a = (_b.sent()) > 0;
                    _b.label = 8;
                case 8:
                    if (!_a) return [3 /*break*/, 14];
                    return [4 /*yield*/, userField.fill("onboarding.india@growth99.com")];
                case 9:
                    _b.sent();
                    return [4 /*yield*/, passField.fill(wpPassword)];
                case 10:
                    _b.sent();
                    return [4 /*yield*/, submitBtn.click()
                        // Use domcontentloaded instead of networkidle to prevent hangs from WordPress heartbeat/polling
                    ];
                case 11:
                    _b.sent();
                    // Use domcontentloaded instead of networkidle to prevent hangs from WordPress heartbeat/polling
                    return [4 /*yield*/, adminPage.waitForLoadState("domcontentloaded", { timeout: 15000 })
                        // Wait for the admin bar or dashboard to signal a successful login
                    ];
                case 12:
                    // Use domcontentloaded instead of networkidle to prevent hangs from WordPress heartbeat/polling
                    _b.sent();
                    // Wait for the admin bar or dashboard to signal a successful login
                    return [4 /*yield*/, adminPage
                            .waitForSelector("#wpadminbar, .wrap", { timeout: 15000 })
                            .catch(function () { })];
                case 13:
                    // Wait for the admin bar or dashboard to signal a successful login
                    _b.sent();
                    _b.label = 14;
                case 14: return [4 /*yield*/, adminPage
                        .goto("".concat(baseUrl, "/wp-admin/plugins.php"), {
                        waitUntil: "networkidle",
                        timeout: 30000,
                    })
                        .catch(function () { })];
                case 15:
                    _b.sent();
                    pluginRow = adminPage
                        .locator('tr[data-slug="call-now-button"], tr:has-text("Call Now Button")')
                        .first();
                    return [4 /*yield*/, pluginRow.count()];
                case 16:
                    if (!((_b.sent()) > 0)) return [3 /*break*/, 19];
                    return [4 /*yield*/, pluginRow.screenshot()];
                case 17:
                    buffer = _b.sent();
                    return [4 /*yield*/, uploadScreenshot(buffer, "".concat(runId, "/").concat(pageId, "/callnow_plugin.png"))];
                case 18:
                    pluginScreenshotUrl = _b.sent();
                    return [3 /*break*/, 22];
                case 19: return [4 /*yield*/, adminPage.screenshot({ fullPage: true })];
                case 20:
                    buffer = _b.sent();
                    return [4 /*yield*/, uploadScreenshot(buffer, "".concat(runId, "/").concat(pageId, "/callnow_plugin.png"))];
                case 21:
                    pluginScreenshotUrl = _b.sent();
                    _b.label = 22;
                case 22: return [4 /*yield*/, adminPage
                        .goto("".concat(baseUrl, "/wp-admin/options-general.php?page=call-now-button"), {
                        waitUntil: "networkidle",
                        timeout: 30000,
                    })
                        .catch(function () { })];
                case 23:
                    _b.sent();
                    return [4 /*yield*/, adminPage.screenshot({ fullPage: true })];
                case 24:
                    settingsBuffer = _b.sent();
                    return [4 /*yield*/, uploadScreenshot(settingsBuffer, "".concat(runId, "/").concat(pageId, "/callnow_settings.png"))];
                case 25:
                    settingsScreenshotUrl = _b.sent();
                    return [4 /*yield*/, adminPage.close()];
                case 26:
                    _b.sent();
                    return [4 /*yield*/, adminContext.close()];
                case 27:
                    _b.sent();
                    return [4 /*yield*/, browser.newContext({
                            viewport: { width: 375, height: 812 },
                            userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1",
                        })];
                case 28:
                    mobileContext = _b.sent();
                    return [4 /*yield*/, mobileContext.newPage()];
                case 29:
                    mobilePage = _b.sent();
                    return [4 /*yield*/, mobilePage
                            .goto(url, { waitUntil: "networkidle", timeout: 30000 })
                            .catch(function () { })];
                case 30:
                    _b.sent();
                    return [4 /*yield*/, mobilePage.waitForTimeout(5000)];
                case 31:
                    _b.sent();
                    return [4 /*yield*/, mobilePage.screenshot({ fullPage: false })];
                case 32:
                    mobileBuffer = _b.sent();
                    return [4 /*yield*/, uploadScreenshot(mobileBuffer, "".concat(runId, "/").concat(pageId, "/callnow_mobile.png"))];
                case 33:
                    mobileScreenshotUrl = _b.sent();
                    return [4 /*yield*/, mobilePage.close()];
                case 34:
                    _b.sent();
                    return [4 /*yield*/, mobileContext.close()];
                case 35:
                    _b.sent();
                    return [3 /*break*/, 40];
                case 36:
                    error_1 = _b.sent();
                    console.error("Callnow Links check failed:", error_1);
                    return [3 /*break*/, 40];
                case 37:
                    if (!browser) return [3 /*break*/, 39];
                    return [4 /*yield*/, browser.close()];
                case 38:
                    _b.sent();
                    _b.label = 39;
                case 39: return [7 /*endfinally*/];
                case 40:
                    screenshotUrls = [
                        pluginScreenshotUrl,
                        mobileScreenshotUrl,
                        settingsScreenshotUrl,
                    ]
                        .filter(Boolean)
                        .join(",");
                    return [2 /*return*/, [
                            {
                                check_factor: "callnow_links",
                                severity: "medium",
                                title: "Verify Call Now Button & Links",
                                description: "Please verify the Call Now plugin setup and homepage links using the evidence screenshots.\n\nChecks to perform:\n- [ ] Call now installed\n- [ ] Number added\n- [ ] Visible in mobile view\n- [ ] Valid phone\n- [ ] Valid email\n- [ ] All links functional",
                                screenshot_url: screenshotUrls,
                                status: "open",
                                ai_generated: false,
                            },
                        ]];
            }
        });
    });
}
