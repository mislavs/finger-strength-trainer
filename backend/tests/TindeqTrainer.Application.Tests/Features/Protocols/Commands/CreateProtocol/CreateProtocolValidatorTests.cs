using FluentAssertions;
using FluentValidation.TestHelper;
using TindeqTrainer.Application.Features.Protocols.Commands.CreateProtocol;

namespace TindeqTrainer.Application.Tests.Features.Protocols.Commands.CreateProtocol;

public class CreateProtocolValidatorTests
{
    private readonly CreateProtocolValidator _sut = new();

    [Fact]
    public void Validate_WhenInputIsValid_ShouldNotHaveErrors()
    {
        // Arrange
        var command = CreateValidCommand();

        // Act
        var result = _sut.TestValidate(command);

        // Assert
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Validate_WhenNameIsEmpty_ShouldHaveErrorForName()
    {
        // Arrange
        var command = CreateValidCommand() with { Name = string.Empty };

        // Act
        var result = _sut.TestValidate(command);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.Name);
    }

    [Fact]
    public void Validate_WhenNameExceeds150Characters_ShouldHaveErrorForName()
    {
        // Arrange
        var command = CreateValidCommand() with { Name = new string('a', 151) };

        // Act
        var result = _sut.TestValidate(command);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.Name);
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(101)]
    public void Validate_WhenWeightPercentageOutOfRange_ShouldHaveErrorForWeightPercentage(double value)
    {
        // Arrange
        var command = CreateValidCommand() with { WeightPercentage = value };

        // Act
        var result = _sut.TestValidate(command);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.WeightPercentage);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Validate_WhenSetsPerHandIsNotPositive_ShouldHaveErrorForSetsPerHand(int value)
    {
        // Arrange
        var command = CreateValidCommand() with { SetsPerHand = value };

        // Act
        var result = _sut.TestValidate(command);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.SetsPerHand);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Validate_WhenWorkSecondsIsNotPositive_ShouldHaveErrorForWorkSeconds(double value)
    {
        // Arrange
        var command = CreateValidCommand() with { WorkSeconds = value };

        // Act
        var result = _sut.TestValidate(command);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.WorkSeconds);
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
            nameof(CreateProtocolCommand.MaxWeightKg) => CreateValidCommand() with { MaxWeightKg = -1 },
            nameof(CreateProtocolCommand.RestSeconds) => CreateValidCommand() with { RestSeconds = -1 },
            nameof(CreateProtocolCommand.HandSwitchSeconds) => CreateValidCommand() with { HandSwitchSeconds = -1 },
            nameof(CreateProtocolCommand.CountdownSeconds) => CreateValidCommand() with { CountdownSeconds = -1 },
            _ => throw new ArgumentOutOfRangeException(nameof(fieldName), fieldName, "Unsupported field.")
        };

        // Act
        var result = _sut.TestValidate(command);

        // Assert
        result.Errors.Should().Contain(x => x.PropertyName == fieldName);
    }

    private static CreateProtocolCommand CreateValidCommand()
    {
        return new CreateProtocolCommand(
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
