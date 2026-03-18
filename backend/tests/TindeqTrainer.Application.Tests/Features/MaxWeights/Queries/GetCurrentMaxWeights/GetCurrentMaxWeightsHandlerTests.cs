using FluentAssertions;
using TindeqTrainer.Application.Features.MaxWeights.Queries.GetCurrentMaxWeights;
using TindeqTrainer.Domain.Entities;
using TindeqTrainer.Domain.Enums;

namespace TindeqTrainer.Application.Tests.Features.MaxWeights.Queries.GetCurrentMaxWeights;

[Collection(nameof(IntegrationTestsCollection))]
public class GetCurrentMaxWeightsHandlerTests(IntegrationTestFactory factory) : IntegrationTest(factory)
{
    [Fact]
    public async Task Handle_WhenRecordsExist_ReturnsLatestPerHand()
    {
        await InsertMany([
            MaxWeightRecord.Create(Hand.Left, 40, new DateTime(2026, 3, 16, 10, 0, 0, DateTimeKind.Utc)),
            MaxWeightRecord.Create(Hand.Left, 43, new DateTime(2026, 3, 17, 10, 0, 0, DateTimeKind.Utc)),
            MaxWeightRecord.Create(Hand.Right, 38, new DateTime(2026, 3, 15, 10, 0, 0, DateTimeKind.Utc)),
            MaxWeightRecord.Create(Hand.Right, 41, new DateTime(2026, 3, 17, 11, 0, 0, DateTimeKind.Utc))
        ]);

        var handler = new GetCurrentMaxWeightsHandler(DbContext);

        var result = await handler.Handle(new GetCurrentMaxWeightsQuery(), CancellationToken.None);

        result.LeftKg.Should().Be(43);
        result.RightKg.Should().Be(41);
    }

    [Fact]
    public async Task Handle_WhenNoRecordsExist_ReturnsNullValues()
    {
        var handler = new GetCurrentMaxWeightsHandler(DbContext);

        var result = await handler.Handle(new GetCurrentMaxWeightsQuery(), CancellationToken.None);

        result.LeftKg.Should().BeNull();
        result.RightKg.Should().BeNull();
    }
}
