using FluentAssertions;
using TindeqTrainer.Domain.Entities;

namespace TindeqTrainer.Domain.Tests.Entities;

public class ProtocolTests
{
    [Fact]
    public void Create_WhenValidParameters_SetsAllProperties()
    {
        // Arrange
        var id = Guid.NewGuid();

        // Act
        var protocol = Protocol.Create(
            name: "Short Power 90%",
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
            id: id);

        // Assert
        protocol.Id.Should().Be(id);
        protocol.Name.Should().Be("Short Power 90%");
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
    }

}
