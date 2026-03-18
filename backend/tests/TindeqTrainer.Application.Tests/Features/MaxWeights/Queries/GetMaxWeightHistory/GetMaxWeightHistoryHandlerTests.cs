using FluentAssertions;
using TindeqTrainer.Application.Features.MaxWeights.Queries.GetMaxWeightHistory;
using TindeqTrainer.Domain.Entities;
using TindeqTrainer.Domain.Enums;

namespace TindeqTrainer.Application.Tests.Features.MaxWeights.Queries.GetMaxWeightHistory;

[Collection(nameof(IntegrationTestsCollection))]
public class GetMaxWeightHistoryHandlerTests(IntegrationTestFactory factory) : IntegrationTest(factory)
{
    [Fact]
    public async Task Handle_WhenCalled_ReturnsHistoryOrderedNewestFirst()
    {
        await InsertMany([
            MaxWeightRecord.Create(Hand.Left, 40, new DateTime(2026, 3, 15, 10, 0, 0, DateTimeKind.Utc)),
            MaxWeightRecord.Create(Hand.Right, 41, new DateTime(2026, 3, 17, 9, 0, 0, DateTimeKind.Utc)),
            MaxWeightRecord.Create(Hand.Left, 42, new DateTime(2026, 3, 16, 10, 0, 0, DateTimeKind.Utc))
        ]);

        var handler = new GetMaxWeightHistoryHandler(DbContext);

        var result = await handler.Handle(new GetMaxWeightHistoryQuery(), CancellationToken.None);

        result.Select(x => x.WeightKg).Should().ContainInOrder(41, 42, 40);
        result.First().Hand.Should().Be("Right");
    }

    [Fact]
    public async Task Handle_WhenHandFilterProvided_ReturnsOnlyThatHand()
    {
        await InsertMany([
            MaxWeightRecord.Create(Hand.Left, 40, new DateTime(2026, 3, 15, 10, 0, 0, DateTimeKind.Utc)),
            MaxWeightRecord.Create(Hand.Right, 41, new DateTime(2026, 3, 17, 9, 0, 0, DateTimeKind.Utc))
        ]);

        var handler = new GetMaxWeightHistoryHandler(DbContext);

        var result = await handler.Handle(new GetMaxWeightHistoryQuery(Hand.Left), CancellationToken.None);

        result.Should().HaveCount(1);
        result.Single().Hand.Should().Be("Left");
        result.Single().WeightKg.Should().Be(40);
    }
}
