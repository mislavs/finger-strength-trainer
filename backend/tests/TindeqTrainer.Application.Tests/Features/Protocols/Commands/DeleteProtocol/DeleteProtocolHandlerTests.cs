using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using TindeqTrainer.Application.Features.Protocols.Commands.DeleteProtocol;
using TindeqTrainer.Domain.Entities;
using TindeqTrainer.Domain.Exceptions;

namespace TindeqTrainer.Application.Tests.Features.Protocols.Commands.DeleteProtocol;

[Collection(nameof(IntegrationTestsCollection))]
public class DeleteProtocolHandlerTests(IntegrationTestFactory factory) : IntegrationTest(factory)
{
    [Fact]
    public async Task Handle_WhenProtocolExists_DeletesProtocol()
    {
        // Arrange
        var protocol = Protocol.Create(
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

        var handler = new DeleteProtocolHandler(DbContext);
        var command = new DeleteProtocolCommand(protocol.Id);

        // Act
        await handler.Handle(command, CancellationToken.None);

        // Assert
        var exists = await DbContext.Protocols
            .AsNoTracking()
            .AnyAsync(x => x.Id == protocol.Id, TestContext.Current.CancellationToken);

        exists.Should().BeFalse();
    }

    [Fact]
    public async Task Handle_WhenProtocolDoesNotExist_ThrowsNotFoundException()
    {
        // Arrange
        var handler = new DeleteProtocolHandler(DbContext);
        var command = new DeleteProtocolCommand(Guid.NewGuid());

        // Act
        Func<Task> act = () => handler.Handle(command, CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<NotFoundException>();
    }
}
