using FluentAssertions;
using TindeqTrainer.Domain.Entities;

namespace TindeqTrainer.Domain.Tests.Entities;

public class ProtocolTests
{
    [Fact]
    public void TargetWeightKg_WhenMaxWeightAndPercentageSet_ReturnsCorrectValue()
    {
        // Arrange
        var protocol = Protocol.Create(
            name: "Endurance 60%",
            maxWeightKg: 40,
            weightPercentage: 60,
            repsPerSet: 10,
            numberOfSets: 1,
            workSeconds: 7,
            restSeconds: 3,
            handSwitchSeconds: 30,
            setRestSeconds: 0,
            countdownSeconds: 5,
            audioCues: true,
            countdownBeeps: true);

        // Act
        var result = protocol.TargetWeightKg;

        // Assert
        result.Should().Be(24);
    }

    [Fact]
    public void Create_WhenValidParameters_SetsAllProperties()
    {
        // Arrange
        var id = Guid.NewGuid();

        // Act
        var protocol = Protocol.Create(
            name: "Short Power 90%",
            maxWeightKg: 50,
            weightPercentage: 90,
            repsPerSet: 4,
            numberOfSets: 3,
            workSeconds: 5,
            restSeconds: 5,
            handSwitchSeconds: 30,
            setRestSeconds: 240,
            countdownSeconds: 3,
            audioCues: true,
            countdownBeeps: false,
            isDefault: true,
            id: id);

        // Assert
        protocol.Id.Should().Be(id);
        protocol.Name.Should().Be("Short Power 90%");
        protocol.MaxWeightKg.Should().Be(50);
        protocol.WeightPercentage.Should().Be(90);
        protocol.RepsPerSet.Should().Be(4);
        protocol.NumberOfSets.Should().Be(3);
        protocol.WorkSeconds.Should().Be(5);
        protocol.RestSeconds.Should().Be(5);
        protocol.HandSwitchSeconds.Should().Be(30);
        protocol.SetRestSeconds.Should().Be(240);
        protocol.CountdownSeconds.Should().Be(3);
        protocol.AudioCues.Should().BeTrue();
        protocol.CountdownBeeps.Should().BeFalse();
        protocol.IsDefault.Should().BeTrue();
    }

    [Theory]
    [InlineData(0, 0)]
    [InlineData(100, 40)]
    public void TargetWeightKg_WhenPercentageAtBounds_ReturnsExpectedValue(double percentage, double expected)
    {
        // Arrange
        var protocol = Protocol.Create(
            name: "Bounds Test",
            maxWeightKg: 40,
            weightPercentage: percentage,
            repsPerSet: 6,
            numberOfSets: 1,
            workSeconds: 7,
            restSeconds: 3,
            handSwitchSeconds: 30,
            setRestSeconds: 0,
            countdownSeconds: 5,
            audioCues: false,
            countdownBeeps: false);

        // Act
        var result = protocol.TargetWeightKg;

        // Assert
        result.Should().Be(expected);
    }
}
