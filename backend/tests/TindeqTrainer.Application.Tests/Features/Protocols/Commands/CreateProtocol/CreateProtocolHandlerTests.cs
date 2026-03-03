using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using TindeqTrainer.Application.Features.Protocols.Commands.CreateProtocol;

namespace TindeqTrainer.Application.Tests.Features.Protocols.Commands.CreateProtocol;

[Collection(nameof(IntegrationTestsCollection))]
public class CreateProtocolHandlerTests(IntegrationTestFactory factory) : IntegrationTest(factory)
{
    [Fact]
    public async Task Handle_WhenValidCommand_CreatesAndPersistsProtocol()
    {
        // Arrange
        var handler = new CreateProtocolHandler(DbContext);
        var command = new CreateProtocolCommand(
            Name: "Custom 75%",
            MaxWeightKg: 55,
            WeightPercentage: 75,
            SetsPerHand: 8,
            WorkSeconds: 10,
            RestSeconds: 5,
            HandSwitchSeconds: 20,
            CountdownSeconds: 4,
            AudioCues: true,
            CountdownBeeps: false);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.Should().NotBeEmpty();

        var protocol = await DbContext.Protocols
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == result, TestContext.Current.CancellationToken);

        protocol.Should().NotBeNull();
        protocol!.Name.Should().Be("Custom 75%");
        protocol.TargetWeightKg.Should().Be(41.25);
    }
}
