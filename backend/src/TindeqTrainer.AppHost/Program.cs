var builder = DistributedApplication.CreateBuilder(args);

var api = builder.AddProject<Projects.TindeqTrainer_Api>("api")
    .WithHttpHealthCheck("/health");

builder.AddViteApp("frontend", "../../../frontend")
    .WithReference(api)
    .WithExternalHttpEndpoints()
    .WithEnvironment("VITE_API_BASE_URL", $"{api.GetEndpoint("http")}/api");

builder.Build().Run();
