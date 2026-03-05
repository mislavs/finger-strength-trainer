using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using TindeqTrainer.Application.Features.Sessions.Commands.DeleteSession;
using TindeqTrainer.Domain.Entities;
using TindeqTrainer.Domain.Enums;
using TindeqTrainer.Domain.Exceptions;

namespace TindeqTrainer.Application.Tests.Features.Sessions.Commands.DeleteSession;

[Collection(nameof(IntegrationTestsCollection))]
public class DeleteSessionHandlerTests(IntegrationTestFactory factory) : IntegrationTest(factory)
{
    [Fact]
    public async Task Handle_WhenSessionExists_DeletesSessionAndSamples()
    {
        // Arrange
        var session = Session.Create(
            date: new DateTime(2026, 3, 5, 9, 0, 0, DateTimeKind.Utc),
            type: SessionType.LiveStream,
            protocolId: null,
            protocolName: "Live Stream",
            isComplete: false,
            peakForceKg: 19,
            avgForceKg: 14,
            durationSeconds: 18);
        await Insert(session);

        var samples = new[]
        {
            SessionSample.Create(session.Id, 14f, 0.1),
            SessionSample.Create(session.Id, 16f, 0.2)
        };
        await InsertMany(samples);

        var handler = new DeleteSessionHandler(DbContext);

        // Act
        await handler.Handle(new DeleteSessionCommand(session.Id), CancellationToken.None);

        // Assert
        var sessionExists = await DbContext.Sessions
            .AsNoTracking()
            .AnyAsync(x => x.Id == session.Id, TestContext.Current.CancellationToken);
        var sampleExists = await DbContext.SessionSamples
            .AsNoTracking()
            .AnyAsync(x => x.SessionId == session.Id, TestContext.Current.CancellationToken);

        sessionExists.Should().BeFalse();
        sampleExists.Should().BeFalse();
    }

    [Fact]
    public async Task Handle_WhenSessionDoesNotExist_ThrowsNotFoundException()
    {
        // Arrange
        var handler = new DeleteSessionHandler(DbContext);

        // Act
        Func<Task> act = () => handler.Handle(new DeleteSessionCommand(Guid.NewGuid()), CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<NotFoundException>();
    }
}
