# MSG91 OTP Delivery Issue — Support Ticket Details

**Date:** 2026-07-13
**Account:** MSG91 account currently labelled "vitaliq" in the dashboard (confirmed this is the correct account for LocalsIndia — label is just a naming mistake, not a wrong account)
**Product affected:** LocalsIndia (localsindia.com) — phone/OTP login

---

## Summary

Our OTP template (`LocalIndia_OTP`) is Active and DLT-verified, and sending a test message via the MSG91 dashboard's **"Test DLT"** button works and delivers successfully. However, every call to the same template through MSG91's **API** (`POST https://control.msg91.com/api/v5/otp`) fails during delivery with:

> **"Template ID Missing or Invalid Template"**

This happens 100% of the time via the API, regardless of how the request is formatted — we tested multiple parameter variations (see below) and every single one fails the same way. The API itself returns `{"type":"success"}` synchronously (HTTP 200) and issues a `request_id`, but the message then shows up in the account's **Failed Logs** a few seconds later with the "Template ID Missing or Invalid Template" error.

This means: **template resolution works fine through the dashboard's internal test path, but not through the public API**, for this same account/template/sender combination.

---

## Template details

| Field | Value |
|---|---|
| Template name | `LocalIndia_OTP` |
| Template ID | `6a397a20d362af077a07ff52` |
| DLT Template ID (DLT_TE_ID) | `1207178187852629647` |
| Sender ID | `LCLIND` |
| Status | Active, v1.0, Verified by DLT |
| Template content | `Your LocalIndia OTP is ##var##. Valid for 10 minutes. Do not share.` |

## API endpoint we call

```
POST https://control.msg91.com/api/v5/otp
Header: authkey: <account auth key — same one configured on our backend, on file with MSG91>
Body (form-urlencoded):
  mobile=<10-digit mobile with 91 country code prefix>
  template_id=6a397a20d362af077a07ff52
  otp=<6-digit code>
  otp_expiry=10
  sender=LCLIND
  DLT_TE_ID=1207178187852629647
```

---

## What we tested (all failed identically via API, all succeeded via dashboard "Test DLT")

| # | Request ID | Variation tested | Result |
|---|---|---|---|
| 1 | `36676d724a66544a74673878` | Original request from our production backend | Failed — Template ID Missing or Invalid Template |
| 2 | `36676d724f78353157374767` | Original request from our production backend | Failed — Template ID Missing or Invalid Template |
| 3 | `36676d72504d444245716163` | Original request from our production backend | Failed — Template ID Missing or Invalid Template |
| 4 | `36676d733050385638645851` | Manual replica of the exact same request (outside our backend, direct API call) | Failed — Template ID Missing or Invalid Template |
| 5 | `36676d736c4d707573496944` | `template_id` set to the DLT Template ID value instead; `sender` omitted | Failed — Template ID Missing or Invalid Template |
| 6 | `36676d736c4d344b33524548` | Original `template_id`; `sender` omitted | Failed — Template ID Missing or Invalid Template |
| 7 | `36676d737161494f6f4e4e51` | `template_id` set to the DLT Template ID value; `sender=LCLIND` included | Failed — Template ID Missing or Invalid Template |
| 8 | `36676d73754255784d6e706d` | Original `template_id` + `DLT_TE_ID`; `sender=LCLIND` included; mobile number **without** the `91` country-code prefix | Failed — Template ID Missing or Invalid Template |

We also independently verified (outside the app) that:
- The auth key configured is correct for this account (not a different/wrong account's key).
- The exact `template_id` and `DLT_TE_ID` values match character-for-character what's shown in the dashboard (checked byte-for-byte, no hidden whitespace).
- Nothing has changed in our integration code or Azure configuration recently — this template was working before and nothing on our side was modified.

---

## What we need from support

Please check why this specific template/sender/DLT combination fails template resolution specifically through the `/api/v5/otp` endpoint, while the dashboard's internal "Test DLT" path resolves it correctly. This looks like a linkage issue between the account's API layer and its DLT template registry for this particular template — something only MSG91-side account/engineering access can diagnose.

**Contact info given in MSG91's own failure-notification email:** `07316914364`

---

## Status on our end (for our own reference — not for MSG91)

- All Azure/backend configuration confirmed correct and unchanged (`MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID`, `MSG91_DLT_TEMPLATE_ID`, sender all match dashboard exactly).
- **We will NOT enable `OTP_DEBUG=true` on production** — the site is live with real users, and doing so would expose any user's real OTP in the API response (account-takeover risk). Testing the OTP-delivery step specifically must wait for MSG91 to resolve this, or be done against a local/dev backend only.
- Everything else in the new password-based login/signup/forgot-password flow (built 2026-07-12/13) is fully implemented, tested (72 backend tests, live smoke test against a local server), and deployed. The only broken piece is real SMS delivery via MSG91, which is entirely external to our code.
