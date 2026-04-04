using FluentAssertions;
using TindeqTrainer.Application.Features.RepeaterProtocols.Queries.GetRepeaterProtocol;
using TindeqTrainer.Domain.Entities;
using TindeqTrainer.Domain.Exceptions;

namespace TindeqTrainer.Application.Tests.Features.RepeaterProtocols.Queries.GetRepeaterProtocol;

[Collection(nameof(IntegrationTestsCollection))]
public class GetRepeaterProtocolHandlerTests(IntegrationTestFactory factory) : IntegrationTest(factory)
{
    [Fact]
    public async Task Handle_WhenProtocolExists_ReturnsDto()
    {
        // Arrange
        var protocol = RepeaterProtocol.Create(
            name: "Lookup Protocol",
            weightPercentage: 75,
            repsPerSet: 5,
            numberOfSets: 2,
            workSeconds: 8,
            restSeconds: 4,
            handSwitchSeconds: 25,
            setRestSeconds: 150,
            countdownSeconds: 3,
            audioCues: true,
            countdownBeeps: true);
        await Insert(protocol);

        var handler = new GetRepeaterProtocolHandler(DbContext);
        var query = new GetRepeaterProtocolQuery(protocol.Id);

        // Act
        var result = await handler.Handle(query, CancellationToken.None);

        // Assert
        result.Id.Should().Be(protocol.Id);
        result.Name.Should().Be("Lookup Protocol");
        result.RepsPerSet.Should().Be(5);
        result.NumberOfSets.Should().Be(2);
        result.SetRestSeconds.Should().Be(150);
        result.WeightPercentage.Should().Be(75);
    }

    [Fact]
    public async Task Handle_WhenProtocolDoesNotExist_ThrowsNotFoundException()
    {
        // Arrange
        var handler = new GetRepeaterProtocolHandler(DbContext);
        var query = new GetRepeaterProtocolQuery(Guid.NewGuid());

        // Act
        Func<Task> act = () => handler.Handle(query, CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<NotFoundException>();
    }
}
