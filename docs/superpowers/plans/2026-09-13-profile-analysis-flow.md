# Profile Analysis Flow Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make profile analysis reachable after entering or loading evidence and keep the radar/career flow usable.

**Architecture:** Reuse the existing Stats/Data Input views and `analyseProfile()` request. Add a direct Data Input action, navigate demo data to Stats, and preserve the existing local-storage/backend flow.

**Tech Stack:** Vanilla JavaScript, HTML/CSS, Chrome storage, existing FastAPI API.

**Spec:** Latest user bug report in this task.

## Global Constraints

- Preserve the existing Manifest V3 extension, overlay, mascot, and backend endpoints.
- Do not add endpoints, frameworks, providers, or unrelated UI.
- Do not commit.

### Task 1: Restore profile-analysis access

**Files:**
- Modify: `extension/menu.html`
- Modify: `extension/content.js`

- [x] Add an Analyse profile button to Data Input, bind it to the existing `analyseProfile()` function, navigate analysis to Stats, and navigate demo-data completion to Stats with explicit status feedback.
- [x] Keep demo scores valid for the existing evidence validator by retaining the existing score fallback when actual-test values are absent.
- [x] Verify JavaScript syntax with `node --check extension/content.js`.
