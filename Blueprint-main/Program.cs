using FastEndpoints;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddAuthorization();
builder.Services.AddFastEndpoints();
builder.Services.AddAWSLambdaHosting(LambdaEventSource.HttpApi);

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

// The blueprint ships with no auth — every endpoint and page is public. Each
// project decides what it needs (or that it needs none). If you add auth as a
// middleware, register it here, before the static files, so it gates the UI
// too; see the Stripe/StoreRocket/AwsLambda projects' CookieAuthMiddleware
// for the house example (a shared-password login cookie plus a Bearer token
// for scripts and AI agents).
app.UseDefaultFiles();
app.UseStaticFiles(new StaticFileOptions() { OnPrepareResponse = x => x.Context.Response.Headers.CacheControl = "no-cache" });
app.UseAuthorization();
// FastEndpoints is "secure by default"; with no auth configured, every
// endpoint must be marked anonymous or nothing would be reachable. Projects
// that gate requests in a middleware instead (the house pattern) keep this
// line as-is.
app.UseFastEndpoints(c => c.Endpoints.Configurator = ep => ep.AllowAnonymous());
app.MapFallbackToFile("index.html", new StaticFileOptions() { OnPrepareResponse = x => x.Context.Response.Headers.CacheControl = "no-cache" });

app.Run();
