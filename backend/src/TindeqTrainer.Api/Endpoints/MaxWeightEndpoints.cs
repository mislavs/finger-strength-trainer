using MediatR;
using Microsoft.AspNetCore.Http.HttpResults;
using TindeqTrainer.Api.Contracts;
using TindeqTrainer.Application.Features.MaxWeights.Commands.CreateMaxWeightRecord;
using TindeqTrainer.Application.Features.MaxWeights.Queries.GetCurrentMaxWeights;
using TindeqTrainer.Application.Features.MaxWeights.Queries.GetMaxWeightHistory;

namespace TindeqTrainer.Api.Endpoints;

public static class MaxWeightEndpoints
{
    public static void MapMaxWeightEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/max-weights")
            .WithTags("MaxWeights");

        group.MapGet("/current", GetCurrent)
            .WithName("GetCurrentMaxWeights")
            .Produces<CurrentMaxWeightsDto>();

        group.MapGet("/", GetHistory)
            .WithName("GetMaxWeightHistory")
            .Produces<List<MaxWeightRecordDto>>()
            .Produces(StatusCodes.Status200OK);

        group.MapPost("/", Create)
            .WithName("CreateMaxWeightRecord")
            .Produces<Guid>(StatusCodes.Status201Created)
            .ProducesValidationProblem()
            .Produces(StatusCodes.Status400BadRequest);
    }

    private static async Task<Ok<CurrentMaxWeightsDto>> GetCurrent(
        ISender sender,
        CancellationToken cancellationToken)
    {
        var result = await sender.Send(new GetCurrentMaxWeightsQuery(), cancellationToken);
        return TypedResults.Ok(result);
    }

    private static async Task<Ok<List<MaxWeightRecordDto>>> GetHistory(
        ISender sender,
        CancellationToken cancellationToken)
    {
        var result = await sender.Send(new GetMaxWeightHistoryQuery(), cancellationToken);
        return TypedResults.Ok(result);
    }

    private static async Task<Results<Created<Guid>, ValidationProblem>> Create(
        CreateMaxWeightRecordRequest request,
        ISender sender,
        CancellationToken cancellationToken)
    {
        var id = await sender.Send(
            new CreateMaxWeightRecordCommand(request.LeftWeightKg, request.RightWeightKg, request.RecordedAt),
            cancellationToken);

        return TypedResults.Created($"/api/max-weights/{id}", id);
    }
}
