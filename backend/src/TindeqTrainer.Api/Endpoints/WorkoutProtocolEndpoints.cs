using MediatR;
using Microsoft.AspNetCore.Http.HttpResults;
using TindeqTrainer.Api.Contracts;
using TindeqTrainer.Application.Features.WorkoutProtocols;
using TindeqTrainer.Application.Features.WorkoutProtocols.Commands.CreateWorkoutProtocol;
using TindeqTrainer.Application.Features.WorkoutProtocols.Commands.DeleteWorkoutProtocol;
using TindeqTrainer.Application.Features.WorkoutProtocols.Commands.UpdateWorkoutProtocol;
using TindeqTrainer.Application.Features.WorkoutProtocols.Queries.GetWorkoutProtocol;
using TindeqTrainer.Application.Features.WorkoutProtocols.Queries.ListWorkoutProtocols;

namespace TindeqTrainer.Api.Endpoints;

public static class WorkoutProtocolEndpoints
{
    public static void MapWorkoutProtocolEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/workout-protocols")
            .WithTags("WorkoutProtocols");

        group.MapGet("/", GetAll)
            .WithName("GetWorkoutProtocols")
            .Produces<List<WorkoutProtocolSummaryDto>>();

        group.MapGet("/{id:guid}", GetById)
            .WithName("GetWorkoutProtocolById")
            .Produces<WorkoutProtocolDto>()
            .Produces(StatusCodes.Status404NotFound);

        group.MapPost("/", Create)
            .WithName("CreateWorkoutProtocol")
            .Produces<Guid>(StatusCodes.Status201Created)
            .Produces(StatusCodes.Status400BadRequest);

        group.MapPut("/{id:guid}", Update)
            .WithName("UpdateWorkoutProtocol")
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status404NotFound);

        group.MapDelete("/{id:guid}", Delete)
            .WithName("DeleteWorkoutProtocol")
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status404NotFound);
    }

    private static async Task<Ok<List<WorkoutProtocolSummaryDto>>> GetAll(
        ISender sender,
        CancellationToken cancellationToken)
    {
        var result = await sender.Send(new ListWorkoutProtocolsQuery(), cancellationToken);
        return TypedResults.Ok(result);
    }

    private static async Task<Ok<WorkoutProtocolDto>> GetById(
        Guid id,
        ISender sender,
        CancellationToken cancellationToken)
    {
        var result = await sender.Send(new GetWorkoutProtocolQuery(id), cancellationToken);
        return TypedResults.Ok(result);
    }

    private static async Task<CreatedAtRoute<Guid>> Create(
        CreateWorkoutProtocolRequest request,
        ISender sender,
        CancellationToken cancellationToken)
    {
        var protocolId = await sender.Send(
            new CreateWorkoutProtocolCommand(
                request.Name,
                request.Items.Select(MapItem).ToList()),
            cancellationToken);

        return TypedResults.CreatedAtRoute(protocolId, "GetWorkoutProtocolById", new { id = protocolId });
    }

    private static async Task<NoContent> Update(
        Guid id,
        UpdateWorkoutProtocolRequest request,
        ISender sender,
        CancellationToken cancellationToken)
    {
        await sender.Send(
            new UpdateWorkoutProtocolCommand(
                id,
                request.Name,
                request.Items.Select(MapItem).ToList()),
            cancellationToken);

        return TypedResults.NoContent();
    }

    private static async Task<NoContent> Delete(
        Guid id,
        ISender sender,
        CancellationToken cancellationToken)
    {
        await sender.Send(new DeleteWorkoutProtocolCommand(id), cancellationToken);
        return TypedResults.NoContent();
    }

    private static WorkoutProtocolItemInput MapItem(WorkoutProtocolItemRequest request)
        => new(request.RepeaterProtocolId, request.Repetitions, request.RestAfterSeconds);
}
