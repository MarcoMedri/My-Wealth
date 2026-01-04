# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of My Wealth seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### How to Report

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please send an email to: **security@marcomedri.com** (or create a private security advisory on GitHub)

You can also report a vulnerability through GitHub's private vulnerability reporting:
1. Go to the [Security tab](https://github.com/MarcoMedri/My-Wealth/security)
2. Click "Report a vulnerability"
3. Fill in the details

### What to Include

Please include the following information in your report:
- Type of vulnerability (e.g., data exposure, code injection, etc.)
- Full paths of source file(s) related to the vulnerability
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Depends on severity (Critical: 7 days, High: 30 days, Medium/Low: 90 days)

### Safe Harbor

We will not take legal action against you or suspend your access to My Wealth if you:
- Make a good faith effort to avoid privacy violations and disruptions to others
- Only interact with accounts you own or have explicit permission to access
- Do not exploit a security issue for purposes beyond demonstrating the vulnerability
- Report the vulnerability as soon as possible

## Security Best Practices for Users

### Local Data Security

My Wealth stores all your financial data locally on your machine. To keep your data secure:

1. **Choose a secure vault location**: Store your vault folder in a location with appropriate file permissions
2. **Enable FileVault (macOS) or BitLocker (Windows)**: Encrypt your entire disk for additional protection
3. **Regular backups**: Keep backups of your vault folder in a secure, encrypted location
4. **Don't share your vault**: Never share your vault folder or commit it to version control

### Application Security

- Always download My Wealth from the [official releases page](https://github.com/MarcoMedri/My-Wealth/releases)
- Verify the integrity of downloaded files when possible
- Keep the application updated to the latest version

## Architecture Security Notes

- **No cloud sync**: All data stays on your local machine
- **No analytics**: We don't collect any usage data
- **No network requests for financial data**: Only external calls are for real-time stock prices (Yahoo Finance API)
- **Automatic backups**: The app creates rotating backups to protect against data corruption
