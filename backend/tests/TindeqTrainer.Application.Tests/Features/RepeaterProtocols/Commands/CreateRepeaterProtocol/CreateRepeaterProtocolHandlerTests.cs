using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using TindeqTrainer.Application.Features.RepeaterProtocols.Commands.CreateRepeaterProtocol;

namespace TindeqTrainer.Application.Tests.Features.RepeaterProtocols.Commands.CreateRepeaterProtocol;

[Collection(nameof(IntegrationTestsCollection))]
public class CreateRepeaterProtocolHandlerTests(IntegrationTestFactory factory) : IntegrationTest(factory)
{
    [Fact]
    public async Task Handle_WhenValidCommand_CreatesAndPersistsRepeaterProtocol()
    {
        // Arrange
        var handler = new CreateRepeaterProtocolHandler(DbContext);
        var command = new CreateRepeaterProtocolCommand(
            Name: "Custom 75%",
            WeightPercentage: 75,
            RepsPerSet: 8,
            NumberOfSets: 2,
            WorkSeconds: 10,
            RestSeconds: 5,
            HandSwitchSeconds: 20,
            SetRestSeconds: 120,
            CountdownSeconds: 4,
            AudioCues: true,
            CountdownBeeps: false);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.Should().NotBeEmpty();

        var protocol = await DbContext.RepeaterProtocols
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == result, TestContext.Current.CancellationToken);

        protocol.Should().NotBeNull();
        protocol!.Name.Should().Be("Custom 75%");
        protocol.RepsPerSet.Should().Be(8);
        protocol.NumberOfSets.Should().Be(2);
        protocol.SetRestSeconds.Should().Be(120);
        protocol.WeightPercentage.Should().Be(75);
    }
}
