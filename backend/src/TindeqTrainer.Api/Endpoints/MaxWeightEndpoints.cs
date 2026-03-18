using MediatR;
using Microsoft.AspNetCore.Http.HttpResults;
using TindeqTrainer.Api.Contracts;
using TindeqTrainer.Application.Features.MaxWeights.Commands.CreateMaxWeightRecord;
using TindeqTrainer.Application.Features.MaxWeights.Queries.GetCurrentMaxWeights;
using TindeqTrainer.Application.Features.MaxWeights.Queries.GetMaxWeightHistory;
using TindeqTrainer.Domain.Enums;

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
            .Produces(StatusCodes.Status400BadRequest);

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

    private static async Task<Results<Ok<List<MaxWeightRecordDto>>, ValidationProblem>> GetHistory(
        string? hand,
        ISender sender,
        CancellationToken cancellationToken)
    {
        Hand? parsedHand = null;

        if (!string.IsNullOrWhiteSpace(hand))
        {
            if (!TryParseHand(hand, out var h))
            {
                return InvalidHandResult();
            }

            parsedHand = h;
        }

        var result = await sender.Send(new GetMaxWeightHistoryQuery(parsedHand), cancellationToken);
        return TypedResults.Ok(result);
    }

    private static async Task<Results<Created<Guid>, ValidationProblem>> Create(
        CreateMaxWeightRecordRequest request,
        ISender sender,
        CancellationToken cancellationToken)
    {
        if (!TryParseHand(request.Hand, out var hand))
        {
            return InvalidHandResult();
        }

        var id = await sender.Send(
            new CreateMaxWeightRecordCommand(hand, request.WeightKg, request.RecordedAt),
            cancellationToken);

        return TypedResults.Created($"/api/max-weights/{id}", id);
    }

    private static ValidationProblem InvalidHandResult()
    {
        return TypedResults.ValidationProblem(new Dictionary<string, string[]>
        {
            ["hand"] = ["Hand must be 'left' or 'right'."]
        });
    }

    private static bool TryParseHand(string? value, out Hand hand)
    {
        if (string.Equals(value, nameof(Hand.Left), StringComparison.OrdinalIgnoreCase))
        {
            hand = Hand.Left;
            return true;
        }

        if (string.Equals(value, nameof(Hand.Right), StringComparison.OrdinalIgnoreCase))
        {
            hand = Hand.Right;
            return true;
        }

        hand = default;
        return false;
    }
}
