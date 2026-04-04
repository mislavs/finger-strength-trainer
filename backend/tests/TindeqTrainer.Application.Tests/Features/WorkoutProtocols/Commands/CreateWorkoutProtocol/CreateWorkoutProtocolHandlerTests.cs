using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using TindeqTrainer.Application.Features.WorkoutProtocols;
using TindeqTrainer.Application.Features.WorkoutProtocols.Commands.CreateWorkoutProtocol;

namespace TindeqTrainer.Application.Tests.Features.WorkoutProtocols.Commands.CreateWorkoutProtocol;

[Collection(nameof(IntegrationTestsCollection))]
public class CreateWorkoutProtocolHandlerTests(IntegrationTestFactory factory) : IntegrationTest(factory)
{
    [Fact]
    public async Task Handle_WhenValidCommand_CreatesAndPersistsWorkoutProtocol()
    {
        var repeaterProtocolIds = await DbContext.RepeaterProtocols
            .OrderBy(x => x.Name)
            .Select(x => x.Id)
            .Take(2)
            .ToListAsync(TestContext.Current.CancellationToken);

        var handler = new CreateWorkoutProtocolHandler(DbContext);
        var command = new CreateWorkoutProtocolCommand(
            Name: "Power Ladder",
            Items:
            [
                new WorkoutProtocolItemInput(repeaterProtocolIds[0], 1, 90),
                new WorkoutProtocolItemInput(repeaterProtocolIds[1], 4, 90),
            ]);

        var result = await handler.Handle(command, CancellationToken.None);

        var workoutProtocol = await DbContext.WorkoutProtocols
            .Include(x => x.Items)
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == result, TestContext.Current.CancellationToken);

        workoutProtocol.Should().NotBeNull();
        workoutProtocol!.Name.Should().Be("Power Ladder");
        workoutProtocol.Items.Should().HaveCount(2);
        workoutProtocol.Items.Sum(x => x.Repetitions).Should().Be(5);
    }
}
