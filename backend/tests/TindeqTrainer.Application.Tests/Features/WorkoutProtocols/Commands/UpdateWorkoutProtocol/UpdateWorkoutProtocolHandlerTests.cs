using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using TindeqTrainer.Application.Features.WorkoutProtocols;
using TindeqTrainer.Application.Features.WorkoutProtocols.Commands.UpdateWorkoutProtocol;
using TindeqTrainer.Domain.Entities;
using TindeqTrainer.Domain.Exceptions;

namespace TindeqTrainer.Application.Tests.Features.WorkoutProtocols.Commands.UpdateWorkoutProtocol;

[Collection(nameof(IntegrationTestsCollection))]
public class UpdateWorkoutProtocolHandlerTests(IntegrationTestFactory factory) : IntegrationTest(factory)
{
    [Fact]
    public async Task Handle_WhenWorkoutProtocolExists_UpdatesWorkoutProtocol()
    {
        var repeaterProtocolIds = await DbContext.RepeaterProtocols
            .OrderBy(x => x.Name)
            .Select(x => x.Id)
            .Take(2)
            .ToListAsync(TestContext.Current.CancellationToken);

        var workoutProtocol = WorkoutProtocol.Create(
            "Original",
            [(repeaterProtocolIds[0], 1, 60.0)]);
        await Insert(workoutProtocol);

        var handler = new UpdateWorkoutProtocolHandler(DbContext);
        var command = new UpdateWorkoutProtocolCommand(
            Id: workoutProtocol.Id,
            Name: "Updated",
            Items:
            [
                new WorkoutProtocolItemInput(repeaterProtocolIds[1], 2, 90),
                new WorkoutProtocolItemInput(repeaterProtocolIds[0], 3, 90),
            ]);

        await handler.Handle(command, CancellationToken.None);

        var updated = await DbContext.WorkoutProtocols
            .Include(x => x.Items)
            .AsNoTracking()
            .FirstAsync(x => x.Id == workoutProtocol.Id, TestContext.Current.CancellationToken);

        updated.Name.Should().Be("Updated");
        updated.Items.Should().HaveCount(2);
        updated.Items.Sum(x => x.Repetitions).Should().Be(5);
    }

    [Fact]
    public async Task Handle_WhenWorkoutProtocolDoesNotExist_ThrowsNotFoundException()
    {
        var repeaterProtocolId = await DbContext.RepeaterProtocols
            .Select(x => x.Id)
            .FirstAsync(TestContext.Current.CancellationToken);

        var handler = new UpdateWorkoutProtocolHandler(DbContext);
        var command = new UpdateWorkoutProtocolCommand(
            Id: Guid.NewGuid(),
            Name: "Missing",
            Items: [new WorkoutProtocolItemInput(repeaterProtocolId, 1, 90)]);

        Func<Task> act = () => handler.Handle(command, CancellationToken.None);

        await act.Should().ThrowAsync<NotFoundException>();
    }
}
