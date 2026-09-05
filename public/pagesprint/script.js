(() => {
  "use strict";
  const config = window.PAGESPRINT_CONFIG || {};
  const form = document.getElementById("project-brief");
  const status = document.getElementById("form-status");
  const contact = document.getElementById("booking-contact");
  const emailButton = document.getElementById("email-brief");
  const email = typeof config.contactEmail === "string" ? config.contactEmail.trim() : "";
  const validEmail = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) && !/[\r\n?#]/.test(email);
  const discord = typeof config.contactDiscord === "string" ? config.contactDiscord.trim() : "";
  let githubUrl = null;
  if (config.contactGitHubReady === true && typeof config.contactGitHubIssueUrl === "string") {
    try {
      const parsed = new URL(config.contactGitHubIssueUrl);
      if (parsed.protocol === "https:" && parsed.hostname === "github.com" && !parsed.username && !parsed.password && /^\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/issues\/new$/.test(parsed.pathname)) {
        // A public request must never contain private brief fields.
        const template = parsed.searchParams.get("template");
        parsed.search = "";
        parsed.hash = "";
        if (template && /^[A-Za-z0-9_.-]+\.ya?ml$/.test(template)) parsed.searchParams.set("template", template);
        parsed.searchParams.set("title", "PageSprint project request");
        githubUrl = parsed;
      }
    } catch { /* Invalid or unavailable contact URLs are not published. */ }
  }
  let discordUrl = null;
  if (discord) {
    try {
      const parsed = new URL(discord);
      if (parsed.protocol === "https:" && ["discord.com", "www.discord.com", "discord.gg"].includes(parsed.hostname) && !parsed.username && !parsed.password && !parsed.pathname.startsWith("/api/")) discordUrl = parsed;
    } catch { /* A plain Discord handle is displayed as text below. */ }
  }
  if (validEmail || discord || githubUrl) {
    contact.replaceChildren();
    if (githubUrl) {
      const link = document.createElement("a");
      link.href = githubUrl.href;
      link.textContent = "Open a public project request on GitHub ↗";
      link.className = "contact-link";
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      const note = document.createElement("p");
      note.textContent = "A GitHub account is required. Requests and replies are public. Share only a public project summary; leave out email addresses, private files, and credentials. Nothing from this brief is added to the request. You review and submit it yourself.";
      contact.append(link, note);
    }
    if (validEmail) {
      const link = document.createElement("a");
      link.href = `mailto:${email}`;
      link.textContent = email;
      link.className = "contact-link";
      contact.append(link);
      emailButton.hidden = false;
    }
    if (discord) {
      const item = document.createElement(discordUrl ? "a" : "p");
      item.className = "contact-link";
      if (discordUrl) {
        item.href = discordUrl.href;
        item.textContent = "Contact on Discord ↗";
        item.target = "_blank";
        item.rel = "noopener noreferrer";
      } else item.textContent = `Discord: ${discord}`;
      contact.append(item);
    }
  }
  const makeBrief = () => {
    const data = new FormData(form);
    return [
      "PAGESPRINT — PROJECT BRIEF",
      `Prepared: ${new Date().toISOString().slice(0, 10)}`,
      "",
      `Project: ${data.get("project").trim()}`,
      `Preferred contact: ${data.get("preferredContact").trim()}`,
      "",
      "WHAT THE PAGE SHOULD HELP PEOPLE DO",
      data.get("goal").trim(),
      "",
      "AUDIENCE",
      data.get("audience").trim(),
      "",
      "PROJECT DETAILS",
      data.get("details").trim(),
      "",
      "SCOPE ACKNOWLEDGED",
      "$150 USD for a custom one-page website, up to five sections, responsive layout, basic page title and search description, a source ZIP with README, and one round of revisions within the agreed scope.",
      "Client supplies up to 800 words, one logo, and up to five images they have permission to use.",
      "First draft within 24 hours after the complete brief and scope are accepted and required content/assets are available. Domain, hosting, paid assets, and ongoing maintenance are not included.",
      "This brief is a project inquiry. Downloading or sending it does not confirm a booking or collect payment."
    ].join("\n");
  };
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const brief = makeBrief();
    const file = new Blob([brief], {type: "text/plain;charset=utf-8"});
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = "pagesprint-project-brief.txt";
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = "Your brief download has started. No details were sent. Keep it for your records. If using GitHub, share only a public summary there; do not attach a brief containing private contact details.";
  });
  emailButton.addEventListener("click", () => {
    if (!validEmail || !form.reportValidity()) return;
    const subject = `PageSprint brief — ${new FormData(form).get("project").trim()}`;
    const uri = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(makeBrief())}`;
    if (uri.length > 7500) {
      status.textContent = "Your brief is too long for a reliable email link. Download the brief, then attach it in an email to the booking contact.";
      return;
    }
    window.location.href = uri;
    status.textContent = "An email draft was requested in your email app. Review it and send it yourself; this website has not sent your brief.";
  });
})();
