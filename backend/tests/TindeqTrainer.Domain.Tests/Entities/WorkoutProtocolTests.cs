using FluentAssertions;
using TindeqTrainer.Domain.Entities;

namespace TindeqTrainer.Domain.Tests.Entities;

public class WorkoutProtocolTests
{
    [Fact]
    public void Create_WhenValidParameters_SetsAllPropertiesAndOrdersItems()
    {
        var id = Guid.NewGuid();
        var firstRepeaterProtocolId = Guid.NewGuid();
        var secondRepeaterProtocolId = Guid.NewGuid();

        var protocol = WorkoutProtocol.Create(
            name: "Power Ladder",
            items:
            [
                (firstRepeaterProtocolId, 1, 90),
                (secondRepeaterProtocolId, 4, 0),
            ],
            id: id);

        protocol.Id.Should().Be(id);
        protocol.Name.Should().Be("Power Ladder");
        protocol.Items.Should().HaveCount(2);
        protocol.Items[0].RepeaterProtocolId.Should().Be(firstRepeaterProtocolId);
        protocol.Items[0].Repetitions.Should().Be(1);
        protocol.Items[0].RestAfterSeconds.Should().Be(90);
        protocol.Items[0].SortOrder.Should().Be(0);
        protocol.Items[1].RepeaterProtocolId.Should().Be(secondRepeaterProtocolId);
        protocol.Items[1].Repetitions.Should().Be(4);
        protocol.Items[1].RestAfterSeconds.Should().Be(0);
        protocol.Items[1].SortOrder.Should().Be(1);
    }

    [Fact]
    public void UpdateDetails_WhenCalled_UpdatesName()
    {
        var protocol = WorkoutProtocol.Create(
            name: "Original",
            items:
            [
                (Guid.NewGuid(), 1, 60),
            ]);

        protocol.UpdateDetails(name: "Updated");

        protocol.Name.Should().Be("Updated");
        protocol.Items.Should().HaveCount(1);
    }
}
