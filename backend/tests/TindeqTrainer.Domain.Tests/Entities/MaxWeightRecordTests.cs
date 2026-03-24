using FluentAssertions;
using TindeqTrainer.Domain.Entities;

namespace TindeqTrainer.Domain.Tests.Entities;

public class MaxWeightRecordTests
{
    [Fact]
    public void Create_WhenValidParameters_SetsAllProperties()
    {
        var id = Guid.NewGuid();
        var recordedAt = new DateTime(2026, 3, 17, 12, 0, 0, DateTimeKind.Utc);

        var record = MaxWeightRecord.Create(42.5, 39.1, recordedAt, id);

        record.Id.Should().Be(id);
        record.LeftWeightKg.Should().Be(42.5);
        record.RightWeightKg.Should().Be(39.1);
        record.RecordedAt.Should().Be(recordedAt);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Create_WhenLeftWeightIsNotPositive_Throws(double leftWeightKg)
    {
        var act = () => MaxWeightRecord.Create(leftWeightKg, 40);

        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Create_WhenRightWeightIsNotPositive_Throws(double rightWeightKg)
    {
        var act = () => MaxWeightRecord.Create(40, rightWeightKg);

        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Fact]
    public void Create_WhenNoWeightsAreProvided_Throws()
    {
        var act = () => MaxWeightRecord.Create(null, null);

        act.Should().Throw<ArgumentException>();
    }
}
