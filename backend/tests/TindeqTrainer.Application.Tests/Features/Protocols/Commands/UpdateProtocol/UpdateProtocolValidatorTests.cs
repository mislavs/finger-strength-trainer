using FluentAssertions;
using TindeqTrainer.Application.Features.Protocols.Commands.UpdateProtocol;

namespace TindeqTrainer.Application.Tests.Features.Protocols.Commands.UpdateProtocol;

public class UpdateProtocolValidatorTests
{
    private readonly UpdateProtocolValidator _sut = new();

    [Fact]
    public void Validate_WhenInputIsValid_ShouldNotHaveErrors()
    {
        // Arrange
        var command = CreateValidCommand();

        // Act
        var result = _sut.Validate(command);

        // Assert
        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void Validate_WhenIdIsEmpty_ShouldHaveErrorForId()
    {
        // Arrange
        var command = CreateValidCommand() with { Id = Guid.Empty };

        // Act
        var result = _sut.Validate(command);

        // Assert
        result.Errors.Should().Contain(x => x.PropertyName == nameof(UpdateProtocolCommand.Id));
    }

    [Fact]
    public void Validate_WhenNameIsEmpty_ShouldHaveErrorForName()
    {
        // Arrange
        var command = CreateValidCommand() with { Name = string.Empty };

        // Act
        var result = _sut.Validate(command);

        // Assert
        result.Errors.Should().Contain(x => x.PropertyName == nameof(UpdateProtocolCommand.Name));
    }

    [Fact]
    public void Validate_WhenNameExceeds150Characters_ShouldHaveErrorForName()
    {
        // Arrange
        var command = CreateValidCommand() with { Name = new string('a', 151) };

        // Act
        var result = _sut.Validate(command);

        // Assert
        result.Errors.Should().Contain(x => x.PropertyName == nameof(UpdateProtocolCommand.Name));
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(101)]
    public void Validate_WhenWeightPercentageOutOfRange_ShouldHaveErrorForWeightPercentage(double value)
    {
        // Arrange
        var command = CreateValidCommand() with { WeightPercentage = value };

        // Act
        var result = _sut.Validate(command);

        // Assert
        result.Errors.Should().Contain(x => x.PropertyName == nameof(UpdateProtocolCommand.WeightPercentage));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Validate_WhenSetsPerHandIsNotPositive_ShouldHaveErrorForSetsPerHand(int value)
    {
        // Arrange
        var command = CreateValidCommand() with { SetsPerHand = value };

        // Act
        var result = _sut.Validate(command);

        // Assert
        result.Errors.Should().Contain(x => x.PropertyName == nameof(UpdateProtocolCommand.SetsPerHand));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Validate_WhenWorkSecondsIsNotPositive_ShouldHaveErrorForWorkSeconds(double value)
    {
        // Arrange
        var command = CreateValidCommand() with { WorkSeconds = value };

        // Act
        var result = _sut.Validate(command);

        // Assert
        result.Errors.Should().Contain(x => x.PropertyName == nameof(UpdateProtocolCommand.WorkSeconds));
    }

    [Theory]
    [InlineData("MaxWeightKg")]
    [InlineData("RestSeconds")]
    [InlineData("HandSwitchSeconds")]
    [InlineData("CountdownSeconds")]
    public void Validate_WhenNumericFieldIsNegative_ShouldHaveError(string fieldName)
    {
        // Arrange
        var command = fieldName switch
        {
            nameof(UpdateProtocolCommand.MaxWeightKg) => CreateValidCommand() with { MaxWeightKg = -1 },
            nameof(UpdateProtocolCommand.RestSeconds) => CreateValidCommand() with { RestSeconds = -1 },
            nameof(UpdateProtocolCommand.HandSwitchSeconds) => CreateValidCommand() with { HandSwitchSeconds = -1 },
            nameof(UpdateProtocolCommand.CountdownSeconds) => CreateValidCommand() with { CountdownSeconds = -1 },
            _ => throw new ArgumentOutOfRangeException(nameof(fieldName), fieldName, "Unsupported field.")
        };

        // Act
        var result = _sut.Validate(command);

        // Assert
        result.Errors.Should().Contain(x => x.PropertyName == fieldName);
    }

    private static UpdateProtocolCommand CreateValidCommand()
    {
        return new UpdateProtocolCommand(
            Id: Guid.NewGuid(),
            Name: "Protocol A",
            MaxWeightKg: 40,
            WeightPercentage: 80,
            SetsPerHand: 6,
            WorkSeconds: 7,
            RestSeconds: 3,
            HandSwitchSeconds: 30,
            CountdownSeconds: 5,
            AudioCues: true,
            CountdownBeeps: true);
    }
}
