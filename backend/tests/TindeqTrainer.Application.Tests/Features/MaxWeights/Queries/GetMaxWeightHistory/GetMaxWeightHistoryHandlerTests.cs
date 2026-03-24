using FluentAssertions;
using TindeqTrainer.Application.Features.MaxWeights.Queries.GetMaxWeightHistory;
using TindeqTrainer.Domain.Entities;

namespace TindeqTrainer.Application.Tests.Features.MaxWeights.Queries.GetMaxWeightHistory;

[Collection(nameof(IntegrationTestsCollection))]
public class GetMaxWeightHistoryHandlerTests(IntegrationTestFactory factory) : IntegrationTest(factory)
{
    [Fact]
    public async Task Handle_WhenCalled_ReturnsHistoryOrderedNewestFirst()
    {
        await InsertMany([
            MaxWeightRecord.Create(40, null, new DateTime(2026, 3, 15, 10, 0, 0, DateTimeKind.Utc)),
            MaxWeightRecord.Create(null, 41, new DateTime(2026, 3, 17, 9, 0, 0, DateTimeKind.Utc)),
            MaxWeightRecord.Create(42, 43, new DateTime(2026, 3, 16, 10, 0, 0, DateTimeKind.Utc))
        ]);

        var handler = new GetMaxWeightHistoryHandler(DbContext);

        var result = await handler.Handle(new GetMaxWeightHistoryQuery(), CancellationToken.None);

        result.Select(x => x.RecordedAt).Should().BeInDescendingOrder();
        result[0].LeftWeightKg.Should().BeNull();
        result[0].RightWeightKg.Should().Be(41);
        result[1].LeftWeightKg.Should().Be(42);
        result[1].RightWeightKg.Should().Be(43);
        result[2].LeftWeightKg.Should().Be(40);
        result[2].RightWeightKg.Should().BeNull();
    }
}
