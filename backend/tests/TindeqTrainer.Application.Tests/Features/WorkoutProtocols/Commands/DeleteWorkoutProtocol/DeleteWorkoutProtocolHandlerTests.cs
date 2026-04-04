using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using TindeqTrainer.Application.Features.WorkoutProtocols.Commands.DeleteWorkoutProtocol;
using TindeqTrainer.Domain.Entities;
using TindeqTrainer.Domain.Exceptions;

namespace TindeqTrainer.Application.Tests.Features.WorkoutProtocols.Commands.DeleteWorkoutProtocol;

[Collection(nameof(IntegrationTestsCollection))]
public class DeleteWorkoutProtocolHandlerTests(IntegrationTestFactory factory) : IntegrationTest(factory)
{
    [Fact]
    public async Task Handle_WhenWorkoutProtocolExists_DeletesWorkoutProtocol()
    {
        var repeaterProtocolId = await DbContext.RepeaterProtocols
            .Select(x => x.Id)
            .FirstAsync(TestContext.Current.CancellationToken);

        var workoutProtocol = WorkoutProtocol.Create("To Delete", [(repeaterProtocolId, 1, 0.0)]);
        await Insert(workoutProtocol);

        var handler = new DeleteWorkoutProtocolHandler(DbContext);
        await handler.Handle(new DeleteWorkoutProtocolCommand(workoutProtocol.Id), CancellationToken.None);

        var exists = await DbContext.WorkoutProtocols
            .AsNoTracking()
            .AnyAsync(x => x.Id == workoutProtocol.Id, TestContext.Current.CancellationToken);

        exists.Should().BeFalse();
    }

    [Fact]
    public async Task Handle_WhenWorkoutProtocolDoesNotExist_ThrowsNotFoundException()
    {
        var handler = new DeleteWorkoutProtocolHandler(DbContext);

        Func<Task> act = () => handler.Handle(new DeleteWorkoutProtocolCommand(Guid.NewGuid()), CancellationToken.None);

        await act.Should().ThrowAsync<NotFoundException>();
    }
}
