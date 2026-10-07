# Packaging CleanScope for the Microsoft Store

This document describes the steps to package and submit CleanScope as an MSIX package. **CleanScope has not been submitted to the Microsoft Store** — this is a guide only.

## Prerequisites

1. A [Microsoft Partner Center](https://partner.microsoft.com/dashboard) developer account (paid one-time registration for individuals/companies).
2. A reserved application name / identity in Partner Center.
3. Windows 10/11 machine with the Windows SDK (for `MakeAppx`, `SignTool`) or Visual Studio with MSIX packaging tools.
4. A code-signing certificate accepted by the Store (Partner Center can provide a free Store-associated certificate for Store distribution).

## Recommended path: MSIX from the Tauri / WiX / cargo-packager pipeline

Tauri 2 can produce Windows installers (MSI / NSIS). For Store distribution you typically convert or rebuild as **MSIX**:

### Option A — Partner Center packaging (simplest for a PoC)

1. Build a release binary / MSI via `npm run tauri build` (or the GitHub Release workflow).
2. In Partner Center → your app → **Packages**, follow the guided flow to upload an MSIX or use the packaging UI.
3. If you only have an unpackaged `.exe`, use the [MSIX Packaging Tool](https://learn.microsoft.com/windows/msix/packaging-tool/tool-overview) to capture an MSIX.

### Option B — Manual MSIX

1. Produce a release build of CleanScope.
2. Author an `AppxManifest.xml` with:
   - Identity `Name`, `Publisher`, `Version` matching Partner Center
   - `Application` entry pointing at `CleanScope.exe`
   - Capability declarations kept minimal (CleanScope does not need broad `broadFileSystemAccess` if all FS work stays in the Rust allowlist — prefer not requesting unnecessary capabilities)
3. Pack with `MakeAppx pack /d <payload-dir> /p CleanScope.msix`.
4. Sign with `SignTool` using your Store or enterprise certificate.
5. Upload the `.msix` (or `.msixupload`) in Partner Center.

## Store submission checklist

- [ ] Age rating / questionnaire completed
- [ ] Privacy policy URL (required if the app phones home — CleanScope’s Alerts panel calls a configurable API)
- [ ] Screenshots for Store listing (desktop 1366×768 or current Store sizes)
- [ ] Package tested on a clean Windows VM
- [ ] Declare internet client capability only if Alerts / telemetry remain enabled in the Store build
- [ ] Submission reviewed — expect certification feedback on file-system behavior for “cleaner” apps

## Notes for cleaner / security utilities

Microsoft scrutinizes system utilities that delete files. CleanScope’s design choices help certification:

- Allowlisted roots only
- Trash / Recycle Bin instead of permanent delete
- Dry-run default + confirmation dialog

Still expect questions about what is scanned and how users consent.

## Status

Not submitted. This repository only documents the path.
