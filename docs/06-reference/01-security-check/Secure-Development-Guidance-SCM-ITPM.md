# Secure Development Guidance — Derived from SCM / ITPM Security Scans
# 企業應用開發安全指引 — 源自 SCM / ITPM 保安掃描結果

**Source documents / 資料來源**

| Report | Scanner | Date | Scope |
|---|---|---|---|
| SCM_ITPM_Web_Scanning_Report | Qualys WAS (detection sources: Qualys, Burp, Bugcrowd) | 30 Jul 2026 | Web applications **RAPO-ITPM**, **RAPO-SCM** |
| SCM_ITPM_Infra_Scanning_Report | Rapid7 InsightVM (site APsite12) | 29 Jul 2026 | 2 hosts — 13.75.34.162, 20.189.109.97 (Microsoft Windows / Azure App Service) |

Prepared for: Chris Lai, Manager — Data Architecture & Intelligence, Ricoh Asia Pacific Operations Limited
Purpose: allow development teams to address these risk categories **during development**, rather than discovering them at the pre-go-live scan.

---

## 1. Scan results at a glance / 掃描結果概覽

### 1.1 Web application scan (Qualys WAS)

- **45 vulnerabilities**, **0 sensitive contents**, **106 information gathered** across 2 web applications.
- Severity distribution (Qualys Level 1–5, 5 = most severe):

| Web application | Level 5 | Level 4 | Level 3 | Level 2 | Level 1 | Sensitive contents | Information gathered |
|---|---|---|---|---|---|---|---|
| RAPO-ITPM | 0 | 0 | 26 | 7 | 1 | 0 | 52 |
| RAPO-SCM | 1 | 0 | 4 | 3 | 3 | 0 | 54 |

- Findings are mapped to **OWASP Top 10 2025**, **CWE** and **WASC**.

### 1.2 Infrastructure scan (Rapid7 InsightVM)

- 2 systems scanned, both active. **No critical vulnerabilities were reported.**
- 3 severe vulnerability types + 2 moderate vulnerability types; **10 vulnerability instances, all in the Network category**.
- Most common findings (4 occurrences each): `certificate-common-name-mismatch`, `ssl-weak-message-authentication-code-algorithms`, `ssl-static-key-ciphers`.
- Highest risk: **`certificate-common-name-mismatch`, risk score 3,179**; each host carries a risk score of 2,186.
- Services found: HTTP and HTTPS on both systems. Ports involved: **443** and **8172** (Web Deploy / SCM management port).

> **Key observation / 重點觀察**
> None of the 45 web findings is a classic SQL Injection or RCE. Every single one falls into four families — **configuration, transport security, session handling, and data exposure**. These are exactly the categories that are cheap to fix during development and expensive to fix at go-live.

---

## 2. Risk categories to watch during development

### A. Transport & certificate security (highest frequency)

| Risk | Finding in the reports | Severity |
|---|---|---|
| HTTP link works, no redirect to HTTPS | `150263 Insecure Transport` | Confirmed Vulnerability — Level 3 |
| Password form served over HTTP | `150150 HTML form containing password field(s) is served over HTTP` (×3) | Confirmed Vulnerability — Level 3 |
| HSTS not implemented | `150135 HTTP Strict Transport Security (HSTS) not implemented` | Information Gathered — Level 1 |
| Certificate CN / SAN does not match host | `certificate-common-name-mismatch` (4 instances: :443 and :8172 on both hosts) | Severe |
| Weak MAC cipher suites (MD5 / SHA1) | `ssl-weak-message-authentication-code-algorithms` (4 instances) | Severe |
| Static-key ciphers — no Forward Secrecy | `ssl-static-key-ciphers` (4 instances, `TLS_RSA_WITH_*`) | Moderate |
| No strong cipher supported at all | `ssl-only-weak-ciphers` (port 8172 on both hosts) | Moderate |

**Report evidence.** The certificates presented are Azure platform certificates — `Subject CN *.azurewebsites.net` on :443 and `Subject CN waws-prod-hk1-031/081.publish.azurewebsites.windows.net` on :8172 — none of which match the scanned target name. Rapid7's remediation: generate a new certificate whose CN reflects the actual hostname, signed by a CA trusted by both client and server.

**Development actions**
- Listen and respond over HTTPS only; redirect any non-HTTPS request with 301/302; emit `Strict-Transport-Security`.
- Disable SSLv2, SSLv3, TLS 1.0 and TLS 1.1 — use TLS 1.2 or above. Recommended cipher configuration from the report:
  `ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!3DES:!MD5:!PSK:!SHA1:!DSS`
- Bind a **custom domain with your own certificate**; do not expose the default platform hostname.
- Restrict or close the **management port 8172** — it carries both the worst TLS configuration and the IIS DoS finding.

### B. Cookie & session management (largest share of confirmed vulnerabilities)

| Risk | Finding | Severity |
|---|---|---|
| Session cookie without `Secure` | `150120` | Confirmed — Level 3 |
| Session cookie without `HttpOnly` | `150121` | Confirmed — Level 3 |
| Cookie without `Secure` / `HttpOnly` | `150122`, `150123` | Confirmed — Level 2 |
| Session ID not regenerated after login | `150129 Insufficient Session Protection/Regeneration` | Confirmed — Level 2 |
| Predictable cookie values | `150319 Weak Cookies in Use` | Information Gathered — Level 2 |
| Cookie without `SameSite` | `150277` | Information Gathered — Level 1 |
| Data held in local / session storage | `150806` | Information Gathered — Level 1 |

**Report evidence.** Qualys states that cookies without `HttpOnly` can be read by JavaScript, so cross-site scripting can steal the session cookie and lead to *user impersonation or compromise of the application account*. For `150129`, the remediation is explicit: invalidate the session after successful authentication and regenerate the session ID value. For `150319`, session IDs should use a **CSPRNG with a size of at least 128 bits**, each session ID unique.

### C. Credential handling — the only Level 5 finding

**`150052 Password is present in HTTP traffic unrelated to the login page` — Potential Vulnerability, Level 5 (RAPO-SCM).**

The scan's authentication password appeared in a request or response outside the authentication process. Qualys' remediation: transfer the password only during authentication; store it hashed with a strong algorithm that includes a salt or a mechanism such as **PBKDF2**; if a value must be transferred outside authentication, use a **strong pseudo-random token** instead of the password or its hash; and carry all authenticated traffic over HTTPS/HSTS.

Related findings:
- `150112 Sensitive form field has not disabled autocomplete` (×2, Level 2) — add `autocomplete="off"`; because browsers no longer honour it for password fields, enforce strong password rules in the application.
- `150837 Missing Brute Force Protection Mechanism` (Level 1) — lock accounts typically after 3–5 unsuccessful attempts, with time-based unlock, self-service unlock, or administrator unlock.

### D. Sensitive data exposure — the largest single issue by count

**`150602 Credit Card Number Pattern Identified In HTML` — 24 instances, Potential Vulnerability Level 3.** The response content matches the credit card number pattern **and the number has a correct checksum**. Qualys' remediation: review the content to determine whether it could be masked or removed.

Also in this family:
- `150375 PII Fields Found` (×2, Level 2) — improper handling of PII can lead to loss of reputation and enables more focused future attacks.
- `150226 Pages Collecting Sensitive Information`
- `150210 Information Disclosure via Response Header` (×2, Level 3) — `Server`, `X-Powered-By`, `X-AspNetVersion`, `X-AspNetMvcVersion` allow fingerprinting; the report states these headers *are not necessary for production sites and should be disabled*.
- `150004 Predictable Resource Location Via Forced Browsing` (×3, Level 2) — review the disclosed files; remove them or apply access controls.
- `150054 Email Addresses Collected`, `150228 Subdomains Found During Crawling`

### E. Security response headers — cheapest to fix, most often missed

| Header | Finding | Severity |
|---|---|---|
| `Content-Security-Policy` not implemented | `150206` (×2) | Information Gathered — Level 2 |
| `X-Content-Type-Options` missing | `150202` | Information Gathered — Level 2 |
| `Referrer-Policy` missing | `150208` | Information Gathered — Level 2 |
| `Permissions-Policy` missing | `150248` | Information Gathered — Level 2 |
| `Cache-Control` misconfigured | `150249` (×2) | Information Gathered — Level 2 |
| `X-Frame-Options` missing | `150245` | Information Gathered — Level 1 |
| Cross-frame scripting protection missing | `531006` | Information Gathered — Level 1 |
| Clickjacking protection | `150082` | Information Gathered — Level 1 |

`150249` is triggered when the `Cache-Control` directive is set to `public` or `max-age` exceeds 86400 — for sensitive resources this can lead to information leakage. For `531006`, the report recommends framebusting or a `Content-Security-Policy` with `frame-ancestors` set to `self`, which also defends against clickjacking.

### F. Injection & output encoding

- `150084 Unencoded characters` (×4, Potential Vulnerability Level 1) — **CWE-79**, **OWASP A05: 2025 Injection**, **WASC-22 Improper Output Handling**, CVSS v3 base 3.1. The application reflects single quotes, double quotes and angle brackets. The observed case: the `callbackUrl` parameter on `/api/auth/callback/credentials`, where a `<script>` payload was reflected into a JSON response.
- `150938 Possible DOM XSS` (×2) — a connection exists between source and sink that may lead to DOM XSS.

Qualys' remediation is context-dependent encoding: *"a double quote might be encoded as `&quot;` when displayed in a text node, but as `%22` when placed in the value of an href attribute."*

### G. Third-party and external dependencies

- `150845 Business logic abuse potential due to presence of external domains detected` (×2) — external domains introduce risk of data exfiltration, phishing, or compromise of application integrity, arising from inadequate validation and reliance on unsecured external services. Remediation: audit the external domains your application accesses.
- `150176 In-scope JavaScript Libraries Detected`, `150608 Third Party Infrastructure and Tracking`

### H. Platform components & exposed ports

`http-iis-0035 NT IIS Malformed HTTP Request Header DoS Vulnerability` — **CVE-1999-0867 / MS99-029 / BID 579**, severity Severe, present on **port 8172 of both hosts**. A flood of specially formed HTTP request headers makes IIS consume all available memory and hang.

The transferable lesson is the pattern, not this specific CVE: any externally reachable management interface or unpatched platform component will be flagged. Treat "component version + externally exposed port" as a reviewable item in IaC and code review.

Note also the general HTTP service issue raised by InsightVM: **BASIC authentication** base64-encodes the cleartext user ID and password, so authentication data must be carried over HTTPS.

---

## 3. Definition of Done — Security Checklist (English)

Apply to every user story / sprint before it is considered done.

### Transport & Certificates
1. Application listens on HTTPS only; all non-HTTPS requests are redirected with 301/302.
2. `Strict-Transport-Security` (HSTS) header is issued on all responses.
3. TLS 1.2 or above only; SSLv2/v3 and TLS 1.0/1.1 disabled.
4. Cipher suites limited to ECDHE key exchange with AEAD (GCM / CHACHA20-POLY1305); MD5, SHA1, RC4, 3DES, DES, static-RSA key exchange and NULL/EXPORT ciphers disabled.
5. TLS certificate CN and SAN match the actual public hostname; a custom domain with an organisation-owned certificate is bound (no default platform hostname exposed).
6. Management / deployment ports (e.g. 8172 Web Deploy, SCM, FTP) are closed externally or IP-restricted.

### Session & Cookies
7. Every cookie sets `Secure`, `HttpOnly` and an explicit `SameSite` attribute.
8. Session ID is regenerated and the pre-login session invalidated immediately after successful authentication.
9. Session IDs are generated with a CSPRNG of at least 128 bits and are unique per session.
10. No credentials, tokens or personal data are persisted in localStorage or sessionStorage.

### Authentication & Credentials
11. Passwords appear only in the authentication request; they are never reflected, echoed or reused in any other request or response.
12. Passwords are stored using a salted strong hash (e.g. PBKDF2 or equivalent); a strong pseudo-random token is used wherever a credential value would otherwise travel outside authentication.
13. Any form containing a password field is served exclusively over HTTPS.
14. Brute-force protection is implemented (account lockout after 3–5 failed attempts, with a defined unlock path).
15. Sensitive form fields set `autocomplete="off"`, and the application enforces strong password rules.

### Data Protection
16. API and page responses mask card numbers, identity numbers and other PII by default (e.g. last four digits only); masking happens server-side, not in the browser.
17. Test and demo data contain no checksum-valid credit card numbers or real personal data.
18. `Server`, `X-Powered-By`, `X-AspNetVersion`, `X-AspNetMvcVersion` and equivalent fingerprinting headers are removed.
19. No backup files, configuration files, directory listings or other guessable resources are reachable by forced browsing.

### Security Headers
20. `Content-Security-Policy` is implemented, including `frame-ancestors 'self'`.
21. `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` and `X-Frame-Options` are all present.
22. Sensitive pages and API responses use `Cache-Control: no-store, private`; no sensitive resource is `public` or carries `max-age` above 86400.

### Injection & Output Encoding
23. All reflected output is encoded according to its output context (HTML text node, attribute, URL, JavaScript, JSON).
24. Redirect and callback parameters (e.g. `callbackUrl`, `returnUrl`) are validated against an allow-list.
25. Client-side code avoids dangerous sinks (`innerHTML`, `eval`, `document.write`) and untrusted source-to-sink paths.

### Dependencies & Platform
26. External domains and third-party scripts are inventoried and minimised; Subresource Integrity is applied where scripts are loaded from a third party; CSP `script-src` / `connect-src` are allow-listed.
27. Platform components, runtimes and libraries are on supported, patched versions; externally exposed ports are reviewed as part of infrastructure-as-code review.
28. A security scan (SAST/DAST or the equivalent Qualys/InsightVM profile) is run against the feature branch, and no new Confirmed Vulnerability at Level 3 or above is introduced.

---

## 4. 完成定義安全檢查清單（中文對照）

**傳輸與憑證**
1. 應用只監聽 HTTPS；所有非 HTTPS 請求以 301/302 導向。
2. 所有回應送出 `Strict-Transport-Security`（HSTS）標頭。
3. 僅使用 TLS 1.2 或以上；停用 SSLv2/v3 與 TLS 1.0/1.1。
4. Cipher suite 僅保留 ECDHE 金鑰交換 + AEAD（GCM / CHACHA20-POLY1305）；停用 MD5、SHA1、RC4、3DES、DES、靜態 RSA 金鑰交換與 NULL/EXPORT。
5. 憑證 CN 與 SAN 與實際對外主機名一致；已綁定自訂網域與機構自有憑證，不暴露平台預設網域。
6. 管理／部署埠（如 8172 Web Deploy、SCM、FTP）對外關閉或設 IP 限制。

**Session 與 Cookie**

7. 所有 cookie 設定 `Secure`、`HttpOnly` 及明確的 `SameSite`。
8. 認證成功後立即重新產生 Session ID 並失效登入前的 session。
9. Session ID 以 CSPRNG 產生、長度至少 128 bits、每個 session 唯一。
10. 不在 localStorage / sessionStorage 儲存憑證、token 或個人資料。

**認證與密碼**

11. 密碼只出現在認證請求中，不得在其他任何 request/response 中反射、回傳或重用。
12. 密碼以加 salt 的強雜湊（如 PBKDF2 或同等機制）儲存；若必須在非認證流程傳遞，改用強隨機 token。
13. 含密碼欄位的表單一律只透過 HTTPS 提供。
14. 已實作防暴力破解（3–5 次失敗後鎖定帳號，並提供明確解鎖途徑）。
15. 敏感表單欄位設定 `autocomplete="off"`，並由應用端強制密碼複雜度規則。

**資料保護**

16. API 與頁面回應預設遮罩卡號、身分證號及其他個人資料（如只回末四碼），遮罩在伺服器端完成而非瀏覽器端。
17. 測試與示範資料不含通過 checksum 檢查的信用卡號或真實個人資料。
18. 已移除 `Server`、`X-Powered-By`、`X-AspNetVersion`、`X-AspNetMvcVersion` 等指紋辨識標頭。
19. 沒有可被強制瀏覽猜到的備份檔、設定檔、目錄列表或其他資源。

**安全性標頭**

20. 已實作 `Content-Security-Policy`，包含 `frame-ancestors 'self'`。
21. `X-Content-Type-Options: nosniff`、`Referrer-Policy`、`Permissions-Policy`、`X-Frame-Options` 全部存在。
22. 敏感頁面與 API 回應使用 `Cache-Control: no-store, private`；敏感資源不得為 `public` 或 `max-age` 超過 86400。

**注入與輸出編碼**

23. 所有反射輸出依輸出上下文（HTML 文字節點、屬性、URL、JavaScript、JSON）進行對應編碼。
24. 導向與 callback 參數（如 `callbackUrl`、`returnUrl`）以白名單驗證。
25. 前端避免危險 sink（`innerHTML`、`eval`、`document.write`）與不受信任的 source-to-sink 路徑。

**相依與平台**

26. 已盤點並最小化外部網域與第三方腳本；第三方腳本加上 SRI；CSP 的 `script-src` / `connect-src` 採白名單。
27. 平台元件、執行環境與函式庫維持在受支援且已修補的版本；對外開放埠納入 IaC 審查。
28. 功能分支已執行安全掃描（SAST/DAST 或同等的 Qualys／InsightVM 掃描設定），且未引入新的 Level 3 以上 Confirmed Vulnerability。

---

## 5. Complete findings index

### 5.1 Web application — vulnerabilities and potential vulnerabilities

| QID | Finding | Severity | Count |
|---|---|---|---|
| 150052 | Password is present in HTTP traffic unrelated to the login page | Potential Vulnerability — Level 5 | 1 |
| 150120 | Session Cookie (Authentication Related) Does Not Contain The "secure" Attribute | Confirmed — Level 3 | 1 |
| 150121 | Session Cookie (Authentication Related) Does Not Contain The "HTTPOnly" Attribute | Confirmed — Level 3 | 1 |
| 150150 | HTML form containing password field(s) is served over HTTP | Confirmed — Level 3 | 3 |
| 150263 | Insecure Transport | Confirmed — Level 3 | 1 |
| 150602 | Credit Card Number Pattern Identified In HTML | Potential Vulnerability — Level 3 | 24 |
| 150004 | Predictable Resource Location Via Forced Browsing | Confirmed — Level 2 | 3 |
| 150112 | Sensitive form field has not disabled autocomplete | Confirmed — Level 2 | 2 |
| 150122 | Cookie Does Not Contain The "secure" Attribute | Confirmed — Level 2 | 2 |
| 150123 | Cookie Does Not Contain The "HTTPOnly" Attribute | Confirmed — Level 2 | 2 |
| 150129 | Insufficient Session Protection/Regeneration | Confirmed — Level 2 | 1 |
| 150084 | Unencoded characters (CWE-79 / OWASP A05:2025 Injection / WASC-22) | Potential Vulnerability — Level 1 | 4 |

### 5.2 Web application — notable information-gathered items with security impact

| QID | Finding | Level |
|---|---|---|
| 150210 | Information Disclosure via Response Header | 3 |
| 150202 | Missing header: X-Content-Type-Options | 2 |
| 150206 | Content-Security-Policy Not Implemented | 2 |
| 150208 | Missing header: Referrer-Policy | 2 |
| 150248 | Missing header: Permissions-Policy | 2 |
| 150249 | Misconfigured Header: Cache-Control | 2 |
| 150319 | Weak Cookies in Use | 2 |
| 150375 | PII Fields Found | 2 |
| 150019 | Server Returned Unexpected Response | 2 |
| 150082 | Protection against Clickjacking | 1 |
| 150135 | HTTP Strict Transport Security (HSTS) not implemented | 1 |
| 150226 | Pages Collecting Sensitive Information | 1 |
| 150228 | Subdomains Found During Crawling | 1 |
| 150245 | Missing header: X-Frame-Options | 1 |
| 150277 | Cookie without SameSite attribute | 1 |
| 150608 | Third Party Infrastructure and Tracking | 1 |
| 150806 | Local Storage or Session Storage Found | 1 |
| 150837 | Missing Brute Force Protection Mechanism | 1 |
| 150845 | Business logic abuse potential due to presence of external domains detected | 1 |
| 150938 | Possible DOM XSS | 1 |
| 531006 | Cross Frame Scripting Protection Missing | 1 |

### 5.3 Infrastructure findings

| ID | Finding | Severity | Instances |
|---|---|---|---|
| certificate-common-name-mismatch | X.509 Certificate Subject CN Does Not Match the Entity Name | Severe | 4 |
| http-iis-0035 | NT IIS Malformed HTTP Request Header DoS Vulnerability (CVE-1999-0867 / MS99-029) | Severe | 2 |
| ssl-weak-message-authentication-code-algorithms | TLS/SSL Weak Message Authentication Code Cipher Suites | Severe | 4 |
| ssl-static-key-ciphers | TLS/SSL Server Supports The Use of Static Key Ciphers | Moderate | 4 |
| ssl-only-weak-ciphers | TLS/SSL Server Does Not Support Any Strong Cipher Algorithms | Moderate | 2 |

---

*Compiled from the SCM_ITPM_Web_Scanning_Report (Qualys WAS, 30 Jul 2026) and SCM_ITPM_Infra_Scanning_Report (Rapid7 InsightVM, 29 Jul 2026). Both source reports are marked confidential — handle this document accordingly.*
