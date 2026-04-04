using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using TindeqTrainer.Application.Features.WorkoutProtocols.Queries.ListWorkoutProtocols;
using TindeqTrainer.Domain.Entities;

namespace TindeqTrainer.Application.Tests.Features.WorkoutProtocols.Queries.ListWorkoutProtocols;

[Collection(nameof(IntegrationTestsCollection))]
public class ListWorkoutProtocolsHandlerTests(IntegrationTestFactory factory) : IntegrationTest(factory)
{
    [Fact]
    public async Task Handle_WhenCalled_ReturnsWorkoutProtocolsOrderedByName()
    {
        var repeaterProtocolId = await DbContext.RepeaterProtocols
            .Select(x => x.Id)
            .FirstAsync(TestContext.Current.CancellationToken);

        await InsertMany(
        [
            WorkoutProtocol.Create("Zulu Workout", [(repeaterProtocolId, 2, 90.0)]),
            WorkoutProtocol.Create("Alpha Workout", [(repeaterProtocolId, 1, 60.0), (repeaterProtocolId, 4, 0.0)]),
        ]);

        var handler = new ListWorkoutProtocolsHandler(DbContext);
        var result = await handler.Handle(new ListWorkoutProtocolsQuery(), CancellationToken.None);

        result.Should().HaveCount(2);
        result.Select(x => x.Name).Should().BeInAscendingOrder();
        result.Single(x => x.Name == "Alpha Workout").TotalBlocks.Should().Be(5);
        result.Single(x => x.Name == "Zulu Workout").ItemCount.Should().Be(1);
    }
}
