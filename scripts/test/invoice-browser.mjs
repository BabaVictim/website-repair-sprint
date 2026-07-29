import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import jsQR from "jsqr";
import { PNG } from "pngjs";
import puppeteer from "puppeteer-core";

const targetUrl =
  process.env.INVOICE_TEST_URL ??
  "http://localhost:3000/invoice/";
const siteUrl = new URL("../", targetUrl).href;
const projectUrl = new URL("project/", targetUrl).href;
const chromiumPath = process.env.CHROMIUM_PATH ?? "/snap/bin/chromium";
const screenshotsDirectory = new URL("../../.screenshots/", import.meta.url);
const customAddress = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa";
const projectAddress = "bc1qptn9jxrw5ltaus7gpze6kn96d0nlqfmj3u8c2q";
const preflightRequestUrl =
  "https://github.com/BabaVictim/website-repair-sprint/issues/new?template=preflight-request.yml";

function decodeQrDataUrl(dataUrl) {
  const encoded = dataUrl.split(",", 2)[1];
  assert.ok(encoded, "QR image should be a base64 data URL");

  const png = PNG.sync.read(Buffer.from(encoded, "base64"));
  const pixels = new Uint8ClampedArray(
    png.data.buffer,
    png.data.byteOffset,
    png.data.byteLength,
  );
  const decoded = jsQR(pixels, png.width, png.height);

  assert.ok(decoded, "an independent decoder should read the generated QR");
  return { decoded: decoded.data, png };
}

function firstNonBackgroundPixel(png) {
  const [backgroundRed, backgroundGreen, backgroundBlue] = [
    png.data[0],
    png.data[1],
    png.data[2],
  ];

  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const index = (y * png.width + x) * 4;
      if (
        png.data[index] !== backgroundRed ||
        png.data[index + 1] !== backgroundGreen ||
        png.data[index + 2] !== backgroundBlue
      ) {
        return { x, y };
      }
    }
  }

  throw new Error("QR image contains no foreground modules");
}

mkdirSync(screenshotsDirectory, { recursive: true });

const browser = await puppeteer.launch({
  args: ["--no-sandbox", "--disable-gpu"],
  executablePath: chromiumPath,
  headless: true,
});

try {
  const page = await browser.newPage();
  const browserErrors = [];
  const failedResponses = [];
  const requestDetails = [];
  const requestedUrls = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      browserErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("request", (request) => {
    requestedUrls.push(request.url());
    requestDetails.push({
      method: request.method(),
      postData: request.postData(),
      url: request.url(),
    });
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      failedResponses.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.setViewport({ deviceScaleFactor: 1, height: 1100, width: 1440 });
  await page.goto(targetUrl, { waitUntil: "networkidle0" });

  assert.equal(await page.$eval("#invoice-address", (input) => input.value), "");
  const initialClientStorage = await page.evaluate(() => ({
    cookie: document.cookie,
    local: Object.entries(window.localStorage).filter(
      ([key]) => !key.startsWith("__next"),
    ),
    session: Object.entries(window.sessionStorage).filter(
      ([key]) => !key.startsWith("__next"),
    ),
  }));
  const requestsBeforeDraft = requestDetails.length;

  await page.type("#invoice-address", customAddress);
  await page.type("#invoice-amount", "0.1");
  await page.type("#invoice-label", "Alice & Bob");
  await page.type("#invoice-message", "Thanks €!");
  await page.click(".generate-button");
  await page.waitForSelector(".invoice-output.has-result");

  const expectedUri =
    `bitcoin:${customAddress}` +
    "?amount=0.1&label=Alice%20%26%20Bob&message=Thanks%20%E2%82%AC%21";
  const visibleUri = await page.$eval(
    "#generated-uri",
    (textarea) => textarea.value,
  );
  const walletHref = await page.$eval(
    '.output-actions a[href^="bitcoin:"]',
    (anchor) => anchor.getAttribute("href"),
  );
  const qrDataUrl = await page.$eval(".qr-frame img", (image) => image.src);
  const qrResult = decodeQrDataUrl(qrDataUrl);
  const summaryText = await page.$eval(
    ".request-summary",
    (element) => element.textContent ?? "",
  );

  assert.equal(visibleUri, expectedUri);
  assert.equal(walletHref, expectedUri);
  assert.equal(qrResult.decoded, expectedUri);
  assert.match(summaryText, /0\.1 BTC/);
  assert.match(summaryText, /10,000,000 sats/);
  assert.match(summaryText, /Alice & Bob/);
  assert.equal(
    await page.evaluate(() => document.activeElement?.textContent?.trim()),
    "Verify before sharing",
    "focus should move to the verification heading",
  );
  assert.equal(
    await page.$eval(".print-uri", (element) => element.textContent),
    expectedUri,
    "the printable static URI should match the interactive value",
  );
  assert.equal(
    await page.$eval(".print-uri", (element) =>
      getComputedStyle(element).display,
    ),
    "none",
    "the print-only URI should not duplicate the on-screen URI",
  );
  assert.deepEqual(
    firstNonBackgroundPixel(qrResult.png),
    { x: 24, y: 24 },
    "QR should preserve a four-module quiet zone at six pixels per module",
  );
  const draftRequests = requestDetails.slice(requestsBeforeDraft);
  assert.ok(
    draftRequests.every(
      (request) =>
        request.method === "GET" &&
        !request.postData &&
        (request.url.includes("/_next/static/") ||
          new URL(request.url).pathname.startsWith("/assets/") ||
          request.url.endsWith("/favicon.ico") ||
          request.url.startsWith("data:") ||
          request.url.startsWith("blob:")),
    ),
    `drafting must not upload data or call an application endpoint: ${JSON.stringify(draftRequests)}`,
  );

  await page.screenshot({
    fullPage: true,
    path: new URL("invoice-result-desktop.png", screenshotsDirectory).pathname,
  });

  await page.emulateMediaType("print");
  assert.equal(
    await page.$eval("#generated-uri", (element) =>
      getComputedStyle(element).display,
    ),
    "none",
  );
  assert.notEqual(
    await page.$eval(".print-uri", (element) =>
      getComputedStyle(element).display,
    ),
    "none",
  );
  assert.notEqual(
    await page.$eval(".print-warning", (element) =>
      getComputedStyle(element).display,
    ),
    "none",
  );
  await page.emulateMediaType("screen");

  await page.type("#invoice-message", " changed");
  await page.waitForFunction(
    () => !document.querySelector(".invoice-output.has-result"),
  );
  await page.select("#invoice-unit", "sats");
  assert.equal(
    await page.$eval("#invoice-amount", (input) => input.value),
    "",
    "changing the unit must clear an existing numeric amount",
  );
  assert.match(
    await page.$eval(".form-message", (element) => element.textContent ?? ""),
    /Amount cleared because the unit changed/,
  );

  await page.goto(targetUrl, { waitUntil: "networkidle0" });
  await page.type("#invoice-address", "mrCDrCybB6J1vRfbwM5hemdJz73FwDBC8r");
  await page.click(".generate-button");
  await page.waitForSelector(".form-error");
  assert.match(
    await page.$eval(".form-error", (element) => element.textContent ?? ""),
    /valid standard Bitcoin mainnet address/,
  );
  assert.equal(
    await page.evaluate(() => document.activeElement?.id),
    "invoice-address",
    "validation errors should focus the failing field",
  );
  assert.equal(
    await page.$eval("#invoice-address", (input) =>
      input.getAttribute("aria-invalid"),
    ),
    "true",
  );

  await page.goto(projectUrl, { waitUntil: "networkidle0" });
  await page.waitForFunction(
    () => document.querySelector('input[value="project"]')?.checked,
  );
  await page.select("#invoice-unit", "sats");
  await page.type("#invoice-amount", "1000");
  await page.click(".generate-button");
  await page.waitForSelector(".invoice-output.has-result");

  const projectUri = await page.$eval(
    "#generated-uri",
    (textarea) => textarea.value,
  );
  assert.equal(
    projectUri,
    `bitcoin:${projectAddress}?amount=0.00001`,
  );
  assert.equal(
    decodeQrDataUrl(
      await page.$eval(".qr-frame img", (image) => image.src),
    ).decoded,
    projectUri,
  );
  assert.deepEqual(
    await page.evaluate(() => ({
      cookie: document.cookie,
      local: Object.entries(window.localStorage).filter(
        ([key]) => !key.startsWith("__next"),
      ),
      session: Object.entries(window.sessionStorage).filter(
        ([key]) => !key.startsWith("__next"),
      ),
    })),
    initialClientStorage,
    "using the builder must not change cookies or persistent browser storage",
  );

  await page.setViewport({ deviceScaleFactor: 2, height: 844, width: 390 });
  await page.screenshot({
    fullPage: true,
    path: new URL("invoice-result-mobile.png", screenshotsDirectory).pathname,
  });

  await page.goto(siteUrl, { waitUntil: "networkidle0" });
  assert.match(
    await page.$eval("h1", (element) => element.textContent ?? ""),
    /Find the broken parts first/,
  );
  assert.ok(
    (await page.$$eval(
      `a[href="${preflightRequestUrl}"]`,
      (elements) => elements.length,
    )) >= 3,
    "the paid preflight request should be reachable from multiple primary locations",
  );
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    true,
    "the service page should not overflow a narrow viewport",
  );
  const serviceOffers = await page.$$eval(
    'script[type="application/ld+json"]',
    (scripts) =>
      scripts
        .map((script) => JSON.parse(script.textContent ?? "{}"))
        .find((entry) => entry["@type"] === "Service")?.offers,
  );
  assert.deepEqual(
    serviceOffers.map((offer) => [offer.name, offer.price]),
    [
      ["Public Website Preflight Report", "49"],
      ["48-hour Website Repair Sprint", "300"],
    ],
    "structured data should publish both exact paid offers",
  );
  await page.screenshot({
    fullPage: true,
    path: new URL("service-home-mobile.png", screenshotsDirectory).pathname,
  });

  const origin = new URL(targetUrl).origin;
  assert.deepEqual(
    requestedUrls.filter(
      (url) =>
        !url.startsWith(origin) &&
        !url.startsWith("data:") &&
        !url.startsWith("blob:"),
    ),
    [],
    "the builder should make no third-party network requests",
  );
  assert.deepEqual(
    failedResponses.filter((response) => !response.endsWith("/favicon.ico")),
    [],
    "page resources should load without HTTP errors",
  );
  assert.deepEqual(
    browserErrors.filter(
      (message) =>
        !message.startsWith(
          "Failed to load resource: the server responded with a status of 404",
        ),
    ),
    [],
    "the browser should report no application errors",
  );

  console.log(
    "Browser checks passed: exact URI/QR parity, validation/focus, project support, both paid offers, mobile layout, and no draft-data or third-party requests.",
  );
} finally {
  await browser.close();
}
