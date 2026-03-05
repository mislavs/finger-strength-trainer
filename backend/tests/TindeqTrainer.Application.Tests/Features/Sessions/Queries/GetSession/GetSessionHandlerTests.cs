using FluentAssertions;
using TindeqTrainer.Application.Features.Sessions.Queries.GetSession;
using TindeqTrainer.Domain.Entities;
using TindeqTrainer.Domain.Enums;
using TindeqTrainer.Domain.Exceptions;

namespace TindeqTrainer.Application.Tests.Features.Sessions.Queries.GetSession;

[Collection(nameof(IntegrationTestsCollection))]
public class GetSessionHandlerTests(IntegrationTestFactory factory) : IntegrationTest(factory)
{
    [Fact]
    public async Task Handle_WhenSessionExists_ReturnsSessionDetailWithSamples()
    {
        // Arrange
        var session = Session.Create(
            date: new DateTime(2026, 3, 4, 10, 30, 0, DateTimeKind.Utc),
            type: SessionType.Repeater,
            protocolId: null,
            protocolName: "Endurance 60%",
            isComplete: true,
            peakForceKg: 41.25,
            avgForceKg: 28.5,
            durationSeconds: 123.5);
        await Insert(session);

        var samples = new[]
        {
            SessionSample.Create(session.Id, 17.5f, 0.4, "left", 1),
            SessionSample.Create(session.Id, 19.25f, 0.2, "left", 1)
        };
        await InsertMany(samples);

        var handler = new GetSessionHandler(DbContext);

        // Act
        var result = await handler.Handle(new GetSessionQuery(session.Id), CancellationToken.None);

        // Assert
        result.Id.Should().Be(session.Id);
        result.Type.Should().Be("Repeater");
        result.ProtocolName.Should().Be("Endurance 60%");
        result.IsComplete.Should().BeTrue();
        result.PeakForceKg.Should().Be(41.25);
        result.AvgForceKg.Should().Be(28.5);
        result.DurationSeconds.Should().Be(123.5);

        result.Samples.Should().HaveCount(2);
        result.Samples.Select(x => x.TimestampSeconds).Should().ContainInOrder(0.2, 0.4);
        result.Samples[0].Hand.Should().Be("left");
        result.Samples[0].SetNumber.Should().Be(1);
        result.Samples[0].WeightKg.Should().Be(19.25f);
    }

    [Fact]
    public async Task Handle_WhenSessionDoesNotExist_ThrowsNotFoundException()
    {
        // Arrange
        var handler = new GetSessionHandler(DbContext);

        // Act
        Func<Task> act = () => handler.Handle(new GetSessionQuery(Guid.NewGuid()), CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<NotFoundException>();
    }
}
