# Blueprint

The starting point for new Alfabase projects hosted on AWS Lambda. Copy it,
rename it, build your own API and UI on top — the architecture, scaffolding
and deployment pipeline are already in place and working.

Real projects built from this pattern: `Stripe` (billing tool over the Stripe
API), `StoreRocket` (store locator management), `AwsLambda` (Lambda function
manager). When in doubt about how to grow the blueprint into a real feature,
look there.

## The architecture: API-first

Every project is one small ASP.NET Core app with two halves:

- **The API is the product** — a JSON API under `/api/…` built with
  [FastEndpoints](https://fast-endpoints.com/), one endpoint per file in
  `Api/`. All business logic lives here.
- **The UI is just a client** — plain static files (HTML/CSS/vanilla JS, no
  framework, no build step) in `wwwroot/`, served at the root URL. It calls
  the API with `fetch` and has no special access: anything the UI can do, a
  script or an AI agent can do by calling the same API.

This keeps projects automatable by default (agents get the full feature set
for free), trivially debuggable (the API is curl-able), and free of
server-side rendering or frontend toolchains.

The two halves are split this way because they carry very different risk, and
that makes projects easy to audit:

- **The API must always be reviewed by a human.** It holds the credentials,
  talks to the real systems, and decides what is allowed — every capability
  the project has is an endpoint someone deliberately wrote and reviewed. If
  an operation isn't exposed as an endpoint, it cannot happen.
- **The UI is safe to generate with AI.** It is static files with no secrets
  and no privileged access, so by definition nothing it does can be dangerous
  — the worst a bad UI can do is call the same reviewed endpoints any script
  could call. It can be regenerated freely without widening the audit
  surface.

Auditing a project therefore means reading `Program.cs` and `Api/`, not the
whole codebase.

The blueprint demonstrates the whole loop with the least possible surface:
one endpoint (`GET /api/ping`, returning `"pong"`) and one page with a Ping
button that calls it and shows the response.

## Auth

The blueprint ships with **no auth** — every endpoint and page is public.
Each project decides for itself what it needs, which may be nothing at all.
Projects that do need auth typically add a small middleware in `Program.cs`
(registered before the static files, so it gates the UI too); see the
`CookieAuthMiddleware` in the `Stripe`/`StoreRocket`/`AwsLambda` projects for
the house example — a shared-password login cookie for browsers plus an
`Authorization: Bearer` token for scripts and AI agents. (HTTP Basic Auth is
deliberately avoided there: AWS Lambda function URLs remap the
`WWW-Authenticate` header, so browsers never show the native prompt.)
Projects that need real user accounts use Supabase Auth (see the next
section).

## Database, auth and storage: Supabase

Projects that need a database, user auth or blob/file storage use
[Supabase](https://supabase.com) rather than running their own or stitching
together AWS services. The Supabase project **must be hosted in the same AWS
region as the Lambda function** (`ap-southeast-1`, Singapore — chosen when
creating the Supabase project) — every API request may make several
round-trips to the database, so cross-region latency multiplies fast.

As with everything else, Supabase is accessed only from the API side
(`Api/`, with keys in environment variables) — never directly from the UI.

## API endpoints

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/ping` | Health check, returns `"pong"`. |

Errors are returned as FastEndpoints problem responses:
`{ "statusCode": 400, "errors": { "generalErrors": ["…"] } }`.

## Project layout

```
Blueprint.csproj            Web SDK project; wwwroot copied to output for Lambda
Program.cs                  Pipeline: static files → FastEndpoints
Api/Ping.cs                 The one demo endpoint — add yours alongside it
wwwroot/                    Static UI: index.html, styles.css, app.js
.github/workflows/dotnet.yml  Build, zip, deploy to the Lambda function on push
Properties/launchSettings.json  Local dev profile and ports
```

## Running locally

```
dotnet run
```

Then open the URL from `Properties/launchSettings.json`. Or skip the browser:

```
curl http://localhost:64513/api/ping
```

## Starting a new project from this blueprint

1. Copy the folder, then rename `Blueprint.csproj`, `Blueprint.slnx` (and the
   project path inside it), and the `Blueprint` identifiers in `Program.cs`
   and `Properties/launchSettings.json`. The root namespace follows the
   project file name automatically.
2. Generate a fresh `UserSecretsId` GUID in the `.csproj` and fresh local
   ports in `Properties/launchSettings.json`.
3. Decide on auth (see the Auth section above) — none, the house
   cookie-plus-Bearer middleware, or whatever the project calls for.
4. Create the Lambda function (and its function URL) with the AwsLambda
   manager tool, and put the function name into
   `.github/workflows/dotnet.yml`.
5. Build the real thing: add endpoints in `Api/` (keep `Ping.cs`), register
   their dependencies in `Program.cs`, and grow `wwwroot/` around your
   workflows.
6. Rewrite this README for the new project: why it exists, who it is for,
   features, the endpoint table, configuration, deployment. Follow the
   structure of the `Stripe`/`StoreRocket`/`AwsLambda` READMEs.

Configuration and secrets (API keys etc.) are environment variables: set them
in the Lambda function configuration in production, and locally in .NET user
secrets (`dotnet user-secrets set NAME value`), your shell, or
`Properties/launchSettings.json`. Never commit them.

## Tech stack

- .NET 10
- [FastEndpoints](https://fast-endpoints.com/)
- [Sentry](https://sentry.io/) for error monitoring (configured in
  `Program.cs`, Release builds only; all Alfabase projects share the same
  DSN, so keep it as-is)

## Deployment

Projects deploy to AWS Lambda (Singapore data center, `ap-southeast-1`) as a
single function with a public function URL; pushes to GitHub deploy
automatically via `.github/workflows/dotnet.yml` (build → zip →
`aws lambda update-function-code`, authenticated through the GitHub OIDC
role).

The blueprint itself is deployed as the `Blueprint` function, reachable at
<https://gvck2ppy6ykzsx4mkx75ypixzq0dnzfi.lambda-url.ap-southeast-1.on.aws/>.
