<div align="center">

# ⚙️ AI Resume Analyzer — Backend

**NestJS + GraphQL API that reads, stores, and AI-analyzes resumes.**

Google OAuth login, JWT-secured GraphQL, MongoDB persistence, and OpenAI-powered ATS scoring.

![NestJS](https://img.shields.io/badge/NestJS-GraphQL-e0234e?style=for-the-badge&logo=nestjs&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-gpt--4o-412991?style=for-the-badge&logo=openai&logoColor=white)
![Status](https://img.shields.io/badge/status-active-brightgreen?style=for-the-badge)

</div>

---

## 📑 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [GraphQL Schema](#-graphql-schema)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Request Flow](#-request-flow)
- [Known Limitations](#-known-limitations--notes-for-reviewers)
- [Roadmap](#-roadmap)

---

## ✨ Features

| | |
|---|---|
| 📤 **File ingestion** | Base64-encoded PDF/DOCX (5MB limit), text extracted via `pdf-parse` / `mammoth` |
| 🤖 **AI analysis** | Resume text + optional job context sent to OpenAI (`gpt-4o`), returns structured ATS score, keywords, suggestions, strengths |
| 🕓 **Persistent history** | Every analysis run appends to the resume's `analyses` array — nothing overwrites past runs |
| 🔐 **Google OAuth login** | Users sign in with Google; the API issues its own JWT for GraphQL requests |
| 🛡️ **Auth-scoped** | All mutations/queries run behind `GqlAuthGuard`, tied to the requesting user |

## 🛠️ Tech Stack

<div align="left">

![NestJS](https://img.shields.io/badge/NestJS-Framework-e0234e?logo=nestjs&logoColor=white)
![GraphQL](https://img.shields.io/badge/GraphQL-Schema--first-E10098?logo=graphql&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-SDK-412991?logo=openai&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-Session_Auth-000000?logo=jsonwebtokens&logoColor=white)
![Google OAuth](https://img.shields.io/badge/Google-OAuth_2.0-4285F4?logo=google&logoColor=white)

</div>

## 📁 Project Structure

```
resume/
├── resume.module.ts     # Wires up Mongoose feature + providers
├── resume.resolver.ts   # GraphQL resolver — auth-guarded mutations/queries
├── resume.service.ts    # File parsing, OpenAI call, persistence
├── resume.schema.ts     # Mongoose schema for Resume + embedded analyses
└── resume.graphql       # SDL: types, inputs, Query, Mutation
```

## 🔌 GraphQL Schema

```graphql
type Mutation {
  uploadResume(createResumeInput: CreateResumeInput!): Resume!
  analyzeResume(analyzeResumeInput: AnalyzeResumeInput!): AnalysisResponse!
  deleteResume(id: ID!): Boolean!
}

type Query {
  myResumes: [Resume!]!
  resume(id: ID!): Resume
}
```

See [`resume.graphql`](./resume.graphql) for the full SDL (types, inputs, scalars).

## 🚀 Getting Started

```bash
pnpm install
cp .env.example .env   # fill in the values below
pnpm run start:dev
```

GraphQL Playground/Sandbox will be available at `http://localhost:{PORT}/graphql`.

## 🔑 Environment Variables

```dotenv
JWT_SECRET=
JWT_EXPIRATION=7d
OPENAI_API_KEY=
NODE_ENV=
PORT=5000

FRONTEND_URL=https://ai-resume-analyzer-frontend-nu-ruby.vercel.app

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=
```

| Variable | Description |
|---|---|
| `JWT_SECRET` | Signing secret for access tokens issued after login |
| `JWT_EXPIRATION` | Token lifetime (e.g. `7d`) |
| `OPENAI_API_KEY` | Required — `ResumeService` throws on startup if this is missing |
| `NODE_ENV` | `development` / `production` — gates things like GraphQL Playground and error verbosity |
| `PORT` | Port the Nest app listens on |
| `FRONTEND_URL` | Deployed frontend origin — used for CORS and as the post-OAuth redirect target |
| `GOOGLE_CLIENT_ID` | OAuth 2.0 client ID from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | OAuth 2.0 client secret |
| `GOOGLE_CALLBACK_URL` | Must match the authorized redirect URI in Google Cloud Console |

> **Not listed above but still needed:** a MongoDB connection string (e.g. `MONGODB_URI`) for Mongoose — add it here once you confirm the variable name you're using.

### Google OAuth flow

Users authenticate via Google, and the API issues its own JWT (`JWT_SECRET` / `JWT_EXPIRATION`) on top of that for subsequent GraphQL requests — the same token `GqlAuthGuard` checks on every resume mutation/query. After a successful Google callback, the user is redirected back to `FRONTEND_URL`.

## 🔄 Request Flow

1. **`uploadResume`** — client sends `{ fileBase64, filename, mimetype }`. The service validates mimetype and size, extracts raw text, and saves a new `Resume` document scoped to `ctx.req.user.userId`.
2. **`analyzeResume`** — client sends `{ resumeId, jobDescription? }`. The service loads `rawText`, builds a prompt, calls OpenAI, parses the JSON response, appends it to `resume.analyses`, and returns the result.

## ⚠️ Known Limitations / Notes for Reviewers

- `findOne` and `remove` currently pass `{ userId }` as the Mongoose *options* argument rather than filtering by it — a user could fetch/delete another user's resume by ID. Fix: `findOne({ _id: id, userId })`.
- `AnalyzeResumeInput.jobDescription` is the only free-text context field — the frontend composes role/experience/focus into this single string.
- No rate limiting on `analyzeResume` yet — each call is a paid OpenAI request.

## 🗺️ Roadmap

- [ ] Fix user-scoping on `findOne` / `remove`
- [ ] Rate limit `analyzeResume` per user
- [ ] Add `jobTitle` / `experienceLevel` as first-class input fields
- [ ] Streaming analysis response for faster perceived latency

---

<div align="center">

Built by [Ram](https://github.com/) · MIT License

</div>