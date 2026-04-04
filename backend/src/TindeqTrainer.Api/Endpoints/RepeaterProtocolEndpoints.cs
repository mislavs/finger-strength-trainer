using MediatR;
using Microsoft.AspNetCore.Http.HttpResults;
using TindeqTrainer.Api.Contracts;
using TindeqTrainer.Application.Features.RepeaterProtocols.Commands.CreateRepeaterProtocol;
using TindeqTrainer.Application.Features.RepeaterProtocols.Commands.DeleteRepeaterProtocol;
using TindeqTrainer.Application.Features.RepeaterProtocols.Commands.UpdateRepeaterProtocol;
using TindeqTrainer.Application.Features.RepeaterProtocols.Queries.GetRepeaterProtocol;
using TindeqTrainer.Application.Features.RepeaterProtocols.Queries.ListRepeaterProtocols;

namespace TindeqTrainer.Api.Endpoints;

public static class RepeaterProtocolEndpoints
{
    public static void MapRepeaterProtocolEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/repeater-protocols")
            .WithTags("RepeaterProtocols");

        group.MapGet("/", GetAll)
            .WithName("GetRepeaterProtocols")
            .Produces<List<RepeaterProtocolSummaryDto>>();

        group.MapGet("/{id:guid}", GetById)
            .WithName("GetRepeaterProtocolById")
            .Produces<RepeaterProtocolDto>()
            .Produces(StatusCodes.Status404NotFound);

        group.MapPost("/", Create)
            .WithName("CreateRepeaterProtocol")
            .Produces<Guid>(StatusCodes.Status201Created)
            .Produces(StatusCodes.Status400BadRequest);

        group.MapPut("/{id:guid}", Update)
            .WithName("UpdateRepeaterProtocol")
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status404NotFound);

        group.MapDelete("/{id:guid}", Delete)
            .WithName("DeleteRepeaterProtocol")
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status404NotFound);
    }

    private static async Task<Ok<List<RepeaterProtocolSummaryDto>>> GetAll(
        ISender sender,
        CancellationToken cancellationToken)
    {
        var result = await sender.Send(new ListRepeaterProtocolsQuery(), cancellationToken);
        return TypedResults.Ok(result);
    }

    private static async Task<Ok<RepeaterProtocolDto>> GetById(
        Guid id,
        ISender sender,
        CancellationToken cancellationToken)
    {
        var result = await sender.Send(new GetRepeaterProtocolQuery(id), cancellationToken);
        return TypedResults.Ok(result);
    }

    private static async Task<CreatedAtRoute<Guid>> Create(
        CreateRepeaterProtocolRequest request,
        ISender sender,
        CancellationToken cancellationToken)
    {
        var protocolId = await sender.Send(
            new CreateRepeaterProtocolCommand(
                request.Name,
                request.WeightPercentage,
                request.RepsPerSet,
                request.NumberOfSets,
                request.WorkSeconds,
                request.RestSeconds,
                request.HandSwitchSeconds,
                request.SetRestSeconds,
                request.CountdownSeconds,
                request.AudioCues,
                request.CountdownBeeps),
            cancellationToken);

        return TypedResults.CreatedAtRoute(protocolId, "GetRepeaterProtocolById", new { id = protocolId });
    }

    private static async Task<NoContent> Update(
        Guid id,
        UpdateRepeaterProtocolRequest request,
        ISender sender,
        CancellationToken cancellationToken)
    {
        await sender.Send(
            new UpdateRepeaterProtocolCommand(
                id,
                request.Name,
                request.WeightPercentage,
                request.RepsPerSet,
                request.NumberOfSets,
                request.WorkSeconds,
                request.RestSeconds,
                request.HandSwitchSeconds,
                request.SetRestSeconds,
                request.CountdownSeconds,
                request.AudioCues,
                request.CountdownBeeps),
            cancellationToken);

        return TypedResults.NoContent();
    }

    private static async Task<NoContent> Delete(
        Guid id,
        ISender sender,
        CancellationToken cancellationToken)
    {
        await sender.Send(new DeleteRepeaterProtocolCommand(id), cancellationToken);
        return TypedResults.NoContent();
    }
}
