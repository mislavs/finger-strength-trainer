using FluentAssertions;
using TindeqTrainer.Application.Features.Protocols.Queries.ListProtocols;
using TindeqTrainer.Domain.Entities;

namespace TindeqTrainer.Application.Tests.Features.Protocols.Queries.ListProtocols;

[Collection(nameof(IntegrationTestsCollection))]
public class ListProtocolsHandlerTests(IntegrationTestFactory factory) : IntegrationTest(factory)
{
    [Fact]
    public async Task Handle_WhenCalled_ReturnsProtocolsOrderedByName()
    {
        // Arrange
        var additionalProtocols = new[]
        {
            Protocol.Create("Alpha Protocol", 70, 4, 1, 6, 3, 20, 0, 3, false, false),
            Protocol.Create("Zulu Protocol", 85, 6, 2, 8, 4, 20, 120, 3, true, true)
        };
        await InsertMany(additionalProtocols);

        var handler = new ListProtocolsHandler(DbContext);
        var query = new ListProtocolsQuery();

        // Act
        var result = await handler.Handle(query, CancellationToken.None);

        // Assert
        result.Should().HaveCount(5);
        result.Select(x => x.Name).Should().BeInAscendingOrder();
        result.Select(x => x.Name).Should().Contain("Alpha Protocol");
        result.Select(x => x.Name).Should().Contain("Endurance 60%");
        result.Select(x => x.Name).Should().Contain("Max Repeaters 80%");
        result.Select(x => x.Name).Should().Contain("Short Power 90%");
        result.Select(x => x.Name).Should().Contain("Zulu Protocol");
        result.Single(x => x.Name == "Zulu Protocol").NumberOfSets.Should().Be(2);
    }
}
