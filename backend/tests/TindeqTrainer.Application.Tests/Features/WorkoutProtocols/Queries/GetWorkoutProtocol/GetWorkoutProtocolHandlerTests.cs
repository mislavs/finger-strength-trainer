using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using TindeqTrainer.Application.Features.WorkoutProtocols.Queries.GetWorkoutProtocol;
using TindeqTrainer.Domain.Entities;
using TindeqTrainer.Domain.Exceptions;

namespace TindeqTrainer.Application.Tests.Features.WorkoutProtocols.Queries.GetWorkoutProtocol;

[Collection(nameof(IntegrationTestsCollection))]
public class GetWorkoutProtocolHandlerTests(IntegrationTestFactory factory) : IntegrationTest(factory)
{
    [Fact]
    public async Task Handle_WhenWorkoutProtocolExists_ReturnsDto()
    {
        var repeaterProtocols = await DbContext.RepeaterProtocols
            .OrderBy(x => x.Name)
            .Select(x => new { x.Id, x.Name })
            .Take(2)
            .ToListAsync(TestContext.Current.CancellationToken);

        var workoutProtocol = WorkoutProtocol.Create(
            "Lookup Workout",
            [
                (repeaterProtocols[0].Id, 1, 90.0),
                (repeaterProtocols[1].Id, 4, 0.0),
            ]);
        await Insert(workoutProtocol);

        var handler = new GetWorkoutProtocolHandler(DbContext);
        var result = await handler.Handle(new GetWorkoutProtocolQuery(workoutProtocol.Id), CancellationToken.None);

        result.Name.Should().Be("Lookup Workout");
        result.Items.Should().HaveCount(2);
        result.Items[0].RepeaterProtocolName.Should().Be(repeaterProtocols[0].Name);
        result.Items[1].Repetitions.Should().Be(4);
    }

    [Fact]
    public async Task Handle_WhenWorkoutProtocolDoesNotExist_ThrowsNotFoundException()
    {
        var handler = new GetWorkoutProtocolHandler(DbContext);

        Func<Task> act = () => handler.Handle(new GetWorkoutProtocolQuery(Guid.NewGuid()), CancellationToken.None);

        await act.Should().ThrowAsync<NotFoundException>();
    }
}
