using FastEndpoints;

namespace Blueprint.Api
{
    public sealed class Ping : EndpointWithoutRequest<string>
    {
        public override void Configure()
        {
            Get("/api/ping");
        }

        public override async Task HandleAsync(CancellationToken ct)
        {
            this.Response = "pong";
        }
    }
}
