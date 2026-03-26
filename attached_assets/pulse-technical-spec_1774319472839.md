# Pulse — Content Hub
## Technical Specification v1.0

---

## 1. Project Overview

A personal content intelligence dashboard that ingests content from YouTube channels, Spotify podcasts, Gmail newsletter emails, and blogs/Substacks. It automatically transcribes audio/video, generates AI-powered summaries, organizes everything into a browsable library, and provides an AI chat interface for querying the content database.

**Single user. Personal use only. No multi-user auth required in v1.**

---

## 2. Content Sources

The user will provide ~10 sources per type (~40 total) at setup. Four source types:

| Source Type | Data Retrieved |
|---|---|
| YouTube channel | Video title, publish date, auto-captions/transcript, video URL |
| Spotify podcast | Episode title, publish date, audio URL, show notes, transcript (via 3rd party) |
| Gmail newsletter | Email subject, sender, date, full body text, Gmail message URL |
| Blog / Substack | Post title, publish date, full article body text, post URL |

---

## 3. Ingestion & Polling

- Poll all active sources every **24 hours**
- **First run**: pull content from the last **14 days** only
- **Subsequent runs**: pull only content published since the last successful check
- **Paused sources**: skip entirely; do not fetch new content, do not delete existing content
- **Deduplication**: before storing, check if the item's unique ID (YouTube video ID, Spotify episode ID, Gmail message ID, post URL) already exists; skip if so

### Source-specific notes

**YouTube**: Use the YouTube Data API v3 for metadata and captions. Prefer auto-generated captions. If captions are unavailable, fall back to AssemblyAI or Whisper.

**Spotify**: Use Spotify Web API for episode metadata. Audio transcription is mandatory — show notes alone are not acceptable for summarization. Use AssemblyAI (primary) or OpenAI Whisper (fallback).

**Gmail**: Connect via Gmail API with OAuth 2.0, one-time token storage. Poll a designated inbox for new emails. Retrieve full email body (HTML or plain text).

**Blog / Substack**: Use RSS feeds where available (Substack exposes RSS by default). For non-RSS blogs, scrape the article body, stripping nav/footer/boilerplate.

---

## 4. Transcription

| Source | Approach |
|---|---|
| YouTube | Auto-captions first; fall back to AssemblyAI or Whisper if unavailable |
| Spotify | AssemblyAI (primary) or Whisper (fallback) — transcription is required |
| Gmail | No transcription needed — use email body text directly |
| Blog / Substack | No transcription needed — use scraped article text directly |

**Recommended service**: AssemblyAI — supports async transcription from audio URL, no need to download files first, ~$0.37/hr of audio.

---

## 5. AI Summarization

### Format
Each content item gets an AI-generated summary stored at ingestion time:
- **TL;DR**: 2–3 sentence overview
- **Key Takeaways**: 5–8 substantive bullet points — full sentences with specific detail, not vague labels
- **Notable Quotes / Moments** *(optional)*: 1–2 direct quotes or standout moments, omit if not applicable

### Model
Anthropic API — `claude-sonnet-4-5` or latest available Sonnet-class model.

### Default Prompt
Store as a configurable string so the user can edit it without a code change:

```
You are a research assistant presenting a digestible form of the content for a busy professional. Err on the side of including more information rather than less - it is important to try to present all of the important information in each piece of content.

The content below is a [transcript / article / newsletter].

Write your response in this format:

Key Takeaways:
- [Full-sentence takeaway with specific detail]
- [Repeat for as many bullets as necessary to fully capture the information]

Rules:
- Be specific. Don't say "they discussed X" — say what was actually argued or concluded.
- Each takeaway should be a complete thought that stands alone.
- No filler phrases like "In this episode..." or "The author explains..."
- For news roundups, focus on the most significant individual items.

Content:
[TRANSCRIPT / ARTICLE TEXT]
```

---

## 6. Data Model

### Sources table
| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| name | string | Display name (e.g. "Lex Fridman") |
| type | enum | `youtube`, `spotify`, `gmail`, `blog` |
| url | string | Channel/feed/inbox identifier |
| status | enum | `active`, `paused` |
| last_checked_at | timestamp | |
| created_at | timestamp | |

### Content items table
| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| source_id | UUID | Foreign key → Sources |
| external_id | string | YouTube video ID, Spotify episode ID, Gmail message ID, or post URL — used for dedup |
| title | string | |
| published_at | timestamp | Original publish date |
| ingested_at | timestamp | When Pulse pulled it in |
| original_url | string | Link back to original content |
| raw_text | text | Full transcript, article, or email body |
| summary_tldr | text | |
| summary_takeaways | text | Stored as JSON array of strings |
| summary_quotes | text | Optional, stored as JSON array |
| type | enum | `video`, `podcast`, `newsletter`, `article` |

### Read status table
| Field | Type | Notes |
|---|---|---|
| id | UUID | |
| date | date | Calendar date (YYYY-MM-DD) |
| is_read | boolean | User-toggled "mark as read" per date |

---

## 7. UI — Views & Navigation

### Global navigation
- **Left sidebar**, collapsible by content type section
- Top-level nav items: **Daily Feed**, **AI Chat**, **Manage Sources**
- Below top-level: collapsible sections for **YouTube**, **Podcasts**, **Newsletters**, **Blogs / Substack**
- Each source listed under its section; clicking navigates to that source's page
- Paused sources shown with reduced opacity and a pause indicator (⏸)

### View 1: Daily Feed
- Accessible via "Daily Feed" nav link
- All ingested content grouped by calendar date, newest date first
- Each date is a collapsible row (expand/collapse via caret)
- The date header contains: caret, date label, "Mark as read" checkbox + label, item count badge
- When "Mark as read" is checked: header dims, label changes to "Read" — state persists
- Within each expanded date, content is grouped by source (with a source label/tag above each group)
- Each content item shows: title, date, TL;DR, Key Takeaways list, link to original content

### View 2: By Source
- Each source has its own page, navigated to from the sidebar
- Shows all ingested content for that source, newest first
- Each item: title, date, TL;DR, Key Takeaways, link to original
- Page header shows source name, type, and item count

### View 3: AI Chat
- Chat interface: message history + text input + send button
- User submits free-form natural language prompts
- AI queries the content database and returns a response citing specific sources and dates
- Citations appear inline in the response (e.g. "↗ Lex Fridman · Mar 22")
- No scope selector in v1 — searches all content by default

### View 4: Manage Sources
- Grid of all sources (active and paused), each showing name, type, status badge
- Each source has a Pause / Resume toggle
- "Add new source" form: dropdown for source type + URL/link input + Add button
- Adding a source creates it in the database with status = active

---

## 8. AI Chat — Implementation

- On each user message, retrieve relevant content items from the database (semantic search or keyword search depending on what's feasible)
- Pass retrieved items as context to the Anthropic API alongside the user's query
- System prompt should instruct the model to: answer based only on the provided content, cite sources by name and date, acknowledge if the answer is not found in the library
- Display citations inline in the response

---

## 9. Authentication

- Gmail: OAuth 2.0, one-time authorization, store refresh token server-side
- Spotify: OAuth 2.0, one-time authorization, store refresh token server-side
- YouTube Data API: API key (no user OAuth required for public channel data)
- App itself: single-user, no login screen required in v1

---

## 10. Recommended Tech Stack

| Layer | Recommendation | Notes |
|---|---|---|
| Frontend | React + Tailwind | Standard choice for AI build tools |
| Backend | Node.js or Python (FastAPI) | Either works; FastAPI slightly easier for ML/AI integrations |
| Database | PostgreSQL + pgvector | pgvector enables semantic search for AI chat |
| Job scheduling | cron / background workers | For 24hr polling loop |
| YouTube API | YouTube Data API v3 | Free tier sufficient for personal use |
| Spotify API | Spotify Web API | Free; requires app registration |
| Gmail API | Gmail API | Free; requires OAuth consent screen |
| Blog ingestion | RSS parsing + Cheerio/BeautifulSoup | RSS first; scrape as fallback |
| Transcription | AssemblyAI | Primary recommendation |
| AI summaries + chat | Anthropic API (Claude) | claude-sonnet-4-5 |
| Hosting | Railway, Render, or Fly.io | Simple, low-cost for personal use |

---

## 11. Notes for the Future (Do Not Build at This Time)

- **AI chat scope selector**: Allow the user to restrict AI chat queries to a subset of sources (e.g. "search only these 3 podcasts") rather than always searching all content. UI was mocked up as chips/pills in the chat view.
- **Multi-user support**: Auth, per-user source lists, per-user read state
- **Mobile app**: Native iOS/Android client
- **Email / push notifications**: Daily digest delivered to inbox
- **Custom summary prompts per source**: Different prompt templates for different source types or individual sources
- **Export**: Download summaries as PDF or Markdown
