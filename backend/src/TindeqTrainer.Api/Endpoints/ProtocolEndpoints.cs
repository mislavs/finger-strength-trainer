using MediatR;
using Microsoft.AspNetCore.Http.HttpResults;
using TindeqTrainer.Api.Contracts;
using TindeqTrainer.Application.Features.Protocols.Commands.CreateProtocol;
using TindeqTrainer.Application.Features.Protocols.Commands.DeleteProtocol;
using TindeqTrainer.Application.Features.Protocols.Commands.UpdateProtocol;
using TindeqTrainer.Application.Features.Protocols.Queries.GetProtocol;
using TindeqTrainer.Application.Features.Protocols.Queries.ListProtocols;

namespace TindeqTrainer.Api.Endpoints;

public static class ProtocolEndpoints
{
    public static void MapProtocolEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/protocols")
            .WithTags("Protocols");

        group.MapGet("/", GetAll)
            .WithName("GetProtocols")
            .Produces<List<ProtocolSummaryDto>>();

        group.MapGet("/{id:guid}", GetById)
            .WithName("GetProtocolById")
            .Produces<ProtocolDto>()
            .Produces(StatusCodes.Status404NotFound);

        group.MapPost("/", Create)
            .WithName("CreateProtocol")
            .Produces<Guid>(StatusCodes.Status201Created)
            .Produces(StatusCodes.Status400BadRequest);

        group.MapPut("/{id:guid}", Update)
            .WithName("UpdateProtocol")
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status404NotFound);

        group.MapDelete("/{id:guid}", Delete)
            .WithName("DeleteProtocol")
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status404NotFound);
    }

    private static async Task<Ok<List<ProtocolSummaryDto>>> GetAll(
        ISender sender,
        CancellationToken cancellationToken)
    {
        var result = await sender.Send(new ListProtocolsQuery(), cancellationToken);
        return TypedResults.Ok(result);
    }

    private static async Task<Ok<ProtocolDto>> GetById(
        Guid id,
        ISender sender,
        CancellationToken cancellationToken)
    {
        var result = await sender.Send(new GetProtocolQuery(id), cancellationToken);
        return TypedResults.Ok(result);
    }

    private static async Task<CreatedAtRoute<Guid>> Create(
        CreateProtocolRequest request,
        ISender sender,
        CancellationToken cancellationToken)
    {
        var protocolId = await sender.Send(
            new CreateProtocolCommand(
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

        return TypedResults.CreatedAtRoute(protocolId, "GetProtocolById", new { id = protocolId });
    }

    private static async Task<NoContent> Update(
        Guid id,
        UpdateProtocolRequest request,
        ISender sender,
        CancellationToken cancellationToken)
    {
        await sender.Send(
            new UpdateProtocolCommand(
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
        await sender.Send(new DeleteProtocolCommand(id), cancellationToken);
        return TypedResults.NoContent();
    }
}
