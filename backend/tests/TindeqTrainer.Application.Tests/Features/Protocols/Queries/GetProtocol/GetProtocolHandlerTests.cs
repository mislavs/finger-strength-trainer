using FluentAssertions;
using TindeqTrainer.Application.Features.Protocols.Queries.GetProtocol;
using TindeqTrainer.Domain.Entities;
using TindeqTrainer.Domain.Exceptions;

namespace TindeqTrainer.Application.Tests.Features.Protocols.Queries.GetProtocol;

[Collection(nameof(IntegrationTestsCollection))]
public class GetProtocolHandlerTests(IntegrationTestFactory factory) : IntegrationTest(factory)
{
    [Fact]
    public async Task Handle_WhenProtocolExists_ReturnsDto()
    {
        // Arrange
        var protocol = Protocol.Create(
            name: "Lookup Protocol",
            maxWeightKg: 42,
            weightPercentage: 75,
            setsPerHand: 5,
            workSeconds: 8,
            restSeconds: 4,
            handSwitchSeconds: 25,
            countdownSeconds: 3,
            audioCues: true,
            countdownBeeps: true);
        await Insert(protocol);

        var handler = new GetProtocolHandler(DbContext);
        var query = new GetProtocolQuery(protocol.Id);

        // Act
        var result = await handler.Handle(query, CancellationToken.None);

        // Assert
        result.Id.Should().Be(protocol.Id);
        result.Name.Should().Be("Lookup Protocol");
        result.TargetWeightKg.Should().Be(31.5);
    }

    [Fact]
    public async Task Handle_WhenProtocolDoesNotExist_ThrowsNotFoundException()
    {
        // Arrange
        var handler = new GetProtocolHandler(DbContext);
        var query = new GetProtocolQuery(Guid.NewGuid());

        // Act
        Func<Task> act = () => handler.Handle(query, CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<NotFoundException>();
    }
}
