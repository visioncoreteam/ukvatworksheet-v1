using FastEndpoints;

namespace VATWorksheet.Api
{
    public sealed class Ping : EndpointWithoutRequest<string>
    {
        public override void Configure()
        {
            AllowAnonymous();
            // Routed under /api/ so the CDN in front of the Lambda passes it
            // through uncached — endpoints outside /api/* would be cached at
            // the edge and could serve stale responses.
            Get("/api/ping");
        }

        public override async Task HandleAsync(CancellationToken ct)
        {
            this.Response = "pong";
        }
    }
}
