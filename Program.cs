using FastEndpoints;
using Microsoft.AspNetCore.DataProtection;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddAuthorization();
builder.Services.AddFastEndpoints();
builder.Services.AddAWSLambdaHosting(LambdaEventSource.HttpApi);

// Data Protection encrypts auth cookies, antiforgery tokens, and anything
// else that must survive a round trip through the browser. On Lambda the
// filesystem is ephemeral and instances come and go, so the default
// file-based key ring would be lost on every cold start — logging everyone
// out. Persisting the keys to SSM Parameter Store keeps them stable across
// instances and deploys. Locally (DEBUG) the default per-user key store is
// fine and needs no AWS credentials.
var dataProtection = builder.Services.AddDataProtection().SetApplicationName(typeof(Program).Assembly.GetName().Name!);
#if !DEBUG
dataProtection.PersistKeysToAWSSystemsManager($"/DataProtection/{typeof(Program).Assembly.GetName().Name}");
#endif

// A real project registers its dependencies here — a third-party API client,
// an AWS SDK client, a database. Secrets come from environment variables
// (Lambda configuration in production, .NET user secrets or
// launchSettings.json locally); see the README.

#if !DEBUG
builder.WebHost.UseSentry(o =>
{
    o.IncludeActivityData = true;
    o.MaxRequestBodySize = Sentry.Extensibility.RequestSize.Always;
    // Lambda freezes the process as soon as the response is sent, so flush
    // queued events before each request completes or they may never arrive.
    o.FlushOnCompletedRequest = true;
    o.Dsn = "https://8385ed7e55906aaa3986e9b268dc3e01@o274819.ingest.us.sentry.io/4511709100703744";
});
#endif

var app = builder.Build();

// VATWorksheet ships with no auth — every endpoint and page is public. Each
// project decides what it needs (or that it needs none). If you add auth as a
// middleware, register it here, before the static files, so it gates the UI
// too; see the Stripe/StoreRocket/AwsLambda projects' CookieAuthMiddleware
// for the house example (a shared-password login cookie plus a Bearer token
// for scripts and AI agents).
//
// In production this Lambda typically sits behind a CDN. The CDN forwards
// /api/* requests straight through without caching (they're dynamic), while
// everything else — the static files and the SPA fallback below — is cached
// at the edge. So only the FastEndpoints routes under /api/* can rely on
// seeing every request; anything served outside /api/* must be safe to cache
// and identical for all users.
app.UseDefaultFiles();
app.UseStaticFiles();
app.UseAuthorization();
// FastEndpoints is "secure by default"; with no auth configured, every
// endpoint must be marked anonymous or nothing would be reachable. Projects
// that gate requests in a middleware instead (the house pattern) keep this
// line as-is.
app.UseFastEndpoints();
app.MapFallbackToFile("index.html");

app.Run();
