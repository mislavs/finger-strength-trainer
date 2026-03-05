using FluentAssertions;
using TindeqTrainer.Application.Features.Sessions.Queries.ListSessions;
using TindeqTrainer.Domain.Entities;
using TindeqTrainer.Domain.Enums;

namespace TindeqTrainer.Application.Tests.Features.Sessions.Queries.ListSessions;

[Collection(nameof(IntegrationTestsCollection))]
public class ListSessionsHandlerTests(IntegrationTestFactory factory) : IntegrationTest(factory)
{
    [Fact]
    public async Task Handle_WhenSessionsExist_ReturnsSessionsOrderedByDateDescending()
    {
        // Arrange
        var sessions = new[]
        {
            Session.Create(new DateTime(2026, 3, 1, 8, 0, 0, DateTimeKind.Utc), SessionType.Repeater, null, "Protocol A", true, 30, 20, 60),
            Session.Create(new DateTime(2026, 3, 3, 8, 0, 0, DateTimeKind.Utc), SessionType.LiveStream, null, "Live Stream", false, 22, 15, 45),
            Session.Create(new DateTime(2026, 3, 2, 8, 0, 0, DateTimeKind.Utc), SessionType.Repeater, null, "Protocol B", true, 35, 25, 70)
        };
        await InsertMany(sessions);

        var handler = new ListSessionsHandler(DbContext);

        // Act
        var result = await handler.Handle(new ListSessionsQuery(), CancellationToken.None);

        // Assert
        result.Should().HaveCount(3);
        result.Select(x => x.Id).Should().ContainInOrder(sessions[1].Id, sessions[2].Id, sessions[0].Id);

        result[0].Type.Should().Be("LiveStream");
        result[0].IsComplete.Should().BeFalse();
        result[0].ProtocolName.Should().Be("Live Stream");
        result[0].PeakForceKg.Should().Be(22);
        result[0].AvgForceKg.Should().Be(15);
        result[0].DurationSeconds.Should().Be(45);
    }
}
