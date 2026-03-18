using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using TindeqTrainer.Application.Features.MaxWeights.Commands.CreateMaxWeightRecord;
using TindeqTrainer.Domain.Enums;

namespace TindeqTrainer.Application.Tests.Features.MaxWeights.Commands.CreateMaxWeightRecord;

[Collection(nameof(IntegrationTestsCollection))]
public class CreateMaxWeightRecordHandlerTests(IntegrationTestFactory factory) : IntegrationTest(factory)
{
    [Fact]
    public async Task Handle_WhenValidCommand_CreatesRecord()
    {
        var handler = new CreateMaxWeightRecordHandler(DbContext);
        var recordedAt = new DateTime(2026, 3, 17, 8, 30, 0, DateTimeKind.Utc);
        var command = new CreateMaxWeightRecordCommand(Hand.Left, 45.2, recordedAt);

        var result = await handler.Handle(command, CancellationToken.None);

        var record = await DbContext.MaxWeightRecords
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == result, TestContext.Current.CancellationToken);

        record.Should().NotBeNull();
        record!.Hand.Should().Be(Hand.Left);
        record.WeightKg.Should().Be(45.2);
        record.RecordedAt.Should().Be(recordedAt);
    }
}
