using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using TindeqTrainer.Application.Features.Protocols.Commands.UpdateProtocol;
using TindeqTrainer.Domain.Entities;
using TindeqTrainer.Domain.Exceptions;

namespace TindeqTrainer.Application.Tests.Features.Protocols.Commands.UpdateProtocol;

[Collection(nameof(IntegrationTestsCollection))]
public class UpdateProtocolHandlerTests(IntegrationTestFactory factory) : IntegrationTest(factory)
{
    [Fact]
    public async Task Handle_WhenProtocolExists_UpdatesProtocol()
    {
        // Arrange
        var protocol = Protocol.Create(
            name: "Original",
            maxWeightKg: 40,
            weightPercentage: 70,
            setsPerHand: 6,
            workSeconds: 7,
            restSeconds: 3,
            handSwitchSeconds: 30,
            countdownSeconds: 5,
            audioCues: false,
            countdownBeeps: false);
        await Insert(protocol);

        var handler = new UpdateProtocolHandler(DbContext);
        var command = new UpdateProtocolCommand(
            Id: protocol.Id,
            Name: "Updated",
            MaxWeightKg: 50,
            WeightPercentage: 80,
            SetsPerHand: 8,
            WorkSeconds: 10,
            RestSeconds: 4,
            HandSwitchSeconds: 25,
            CountdownSeconds: 3,
            AudioCues: true,
            CountdownBeeps: true);

        // Act
        await handler.Handle(command, CancellationToken.None);

        // Assert
        var updated = await DbContext.Protocols
            .AsNoTracking()
            .FirstAsync(x => x.Id == protocol.Id, TestContext.Current.CancellationToken);

        updated.Name.Should().Be("Updated");
        updated.MaxWeightKg.Should().Be(50);
        updated.WeightPercentage.Should().Be(80);
        updated.SetsPerHand.Should().Be(8);
        updated.WorkSeconds.Should().Be(10);
        updated.RestSeconds.Should().Be(4);
        updated.HandSwitchSeconds.Should().Be(25);
        updated.CountdownSeconds.Should().Be(3);
        updated.AudioCues.Should().BeTrue();
        updated.CountdownBeeps.Should().BeTrue();
    }

    [Fact]
    public async Task Handle_WhenProtocolDoesNotExist_ThrowsNotFoundException()
    {
        // Arrange
        var handler = new UpdateProtocolHandler(DbContext);
        var command = new UpdateProtocolCommand(
            Id: Guid.NewGuid(),
            Name: "Missing",
            MaxWeightKg: 40,
            WeightPercentage: 70,
            SetsPerHand: 6,
            WorkSeconds: 7,
            RestSeconds: 3,
            HandSwitchSeconds: 30,
            CountdownSeconds: 5,
            AudioCues: true,
            CountdownBeeps: true);

        // Act
        Func<Task> act = () => handler.Handle(command, CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<NotFoundException>();
    }
}
