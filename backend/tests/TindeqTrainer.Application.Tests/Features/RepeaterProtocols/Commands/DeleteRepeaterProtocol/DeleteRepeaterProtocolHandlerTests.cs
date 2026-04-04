using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using TindeqTrainer.Application.Features.RepeaterProtocols.Commands.DeleteRepeaterProtocol;
using TindeqTrainer.Domain.Entities;
using TindeqTrainer.Domain.Exceptions;

namespace TindeqTrainer.Application.Tests.Features.RepeaterProtocols.Commands.DeleteRepeaterProtocol;

[Collection(nameof(IntegrationTestsCollection))]
public class DeleteRepeaterProtocolHandlerTests(IntegrationTestFactory factory) : IntegrationTest(factory)
{
    [Fact]
    public async Task Handle_WhenProtocolExists_DeletesRepeaterProtocol()
    {
        // Arrange
        var protocol = RepeaterProtocol.Create(
            name: "To Delete",
            weightPercentage: 65,
            repsPerSet: 6,
            numberOfSets: 1,
            workSeconds: 7,
            restSeconds: 3,
            handSwitchSeconds: 30,
            setRestSeconds: 0,
            countdownSeconds: 5,
            audioCues: false,
            countdownBeeps: false);
        await Insert(protocol);

        var handler = new DeleteRepeaterProtocolHandler(DbContext);
        var command = new DeleteRepeaterProtocolCommand(protocol.Id);

        // Act
        await handler.Handle(command, CancellationToken.None);

        // Assert
        var exists = await DbContext.RepeaterProtocols
            .AsNoTracking()
            .AnyAsync(x => x.Id == protocol.Id, TestContext.Current.CancellationToken);

        exists.Should().BeFalse();
    }

    [Fact]
    public async Task Handle_WhenProtocolDoesNotExist_ThrowsNotFoundException()
    {
        // Arrange
        var handler = new DeleteRepeaterProtocolHandler(DbContext);
        var command = new DeleteRepeaterProtocolCommand(Guid.NewGuid());

        // Act
        Func<Task> act = () => handler.Handle(command, CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<NotFoundException>();
    }
}
