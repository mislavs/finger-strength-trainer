using MediatR;
using Microsoft.AspNetCore.Http.HttpResults;
using TindeqTrainer.Application.Features.Sessions.Commands.DeleteSession;
using TindeqTrainer.Application.Features.Sessions.Queries.GetSession;
using TindeqTrainer.Application.Features.Sessions.Queries.ListSessions;

namespace TindeqTrainer.Api.Endpoints;

public static class SessionEndpoints
{
    public static void MapSessionEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/sessions")
            .WithTags("Sessions");

        group.MapGet("/", GetAll)
            .WithName("GetSessions")
            .Produces<List<SessionSummaryDto>>();

        group.MapGet("/{id:guid}", GetById)
            .WithName("GetSessionById")
            .Produces<SessionDetailDto>()
            .Produces(StatusCodes.Status404NotFound);

        group.MapDelete("/{id:guid}", Delete)
            .WithName("DeleteSession")
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status404NotFound);
    }

    private static async Task<Ok<List<SessionSummaryDto>>> GetAll(
        ISender sender,
        CancellationToken cancellationToken)
    {
        var result = await sender.Send(new ListSessionsQuery(), cancellationToken);
        return TypedResults.Ok(result);
    }

    private static async Task<Ok<SessionDetailDto>> GetById(
        Guid id,
        ISender sender,
        CancellationToken cancellationToken)
    {
        var result = await sender.Send(new GetSessionQuery(id), cancellationToken);
        return TypedResults.Ok(result);
    }

    private static async Task<NoContent> Delete(
        Guid id,
        ISender sender,
        CancellationToken cancellationToken)
    {
        await sender.Send(new DeleteSessionCommand(id), cancellationToken);
        return TypedResults.NoContent();
    }
}
