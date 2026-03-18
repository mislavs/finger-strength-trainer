using FluentAssertions;
using TindeqTrainer.Domain.Entities;
using TindeqTrainer.Domain.Enums;

namespace TindeqTrainer.Domain.Tests.Entities;

public class MaxWeightRecordTests
{
    [Fact]
    public void Create_WhenValidParameters_SetsAllProperties()
    {
        var id = Guid.NewGuid();
        var recordedAt = new DateTime(2026, 3, 17, 12, 0, 0, DateTimeKind.Utc);

        var record = MaxWeightRecord.Create(Hand.Left, 42.5, recordedAt, id);

        record.Id.Should().Be(id);
        record.Hand.Should().Be(Hand.Left);
        record.WeightKg.Should().Be(42.5);
        record.RecordedAt.Should().Be(recordedAt);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Create_WhenWeightIsNotPositive_Throws(double weightKg)
    {
        var act = () => MaxWeightRecord.Create(Hand.Right, weightKg);

        act.Should().Throw<ArgumentOutOfRangeException>();
    }
}
