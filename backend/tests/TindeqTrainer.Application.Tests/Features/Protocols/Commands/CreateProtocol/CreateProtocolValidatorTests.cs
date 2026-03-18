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
    public void Validate_WhenRepsPerSetIsNotPositive_ShouldHaveErrorForRepsPerSet(int value)
    {
        // Arrange
        var command = CreateValidCommand() with { RepsPerSet = value };

        // Act
        var result = _sut.TestValidate(command);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.RepsPerSet);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Validate_WhenNumberOfSetsIsNotPositive_ShouldHaveErrorForNumberOfSets(int value)
    {
        // Arrange
        var command = CreateValidCommand() with { NumberOfSets = value };

        // Act
        var result = _sut.TestValidate(command);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.NumberOfSets);
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
    [InlineData("RestSeconds")]
    [InlineData("HandSwitchSeconds")]
    [InlineData("SetRestSeconds")]
    [InlineData("CountdownSeconds")]
    public void Validate_WhenNumericFieldIsNegative_ShouldHaveError(string fieldName)
    {
        // Arrange
        var command = fieldName switch
        {
            nameof(CreateProtocolCommand.RestSeconds) => CreateValidCommand() with { RestSeconds = -1 },
            nameof(CreateProtocolCommand.HandSwitchSeconds) => CreateValidCommand() with { HandSwitchSeconds = -1 },
            nameof(CreateProtocolCommand.SetRestSeconds) => CreateValidCommand() with { SetRestSeconds = -1 },
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
            WeightPercentage: 80,
            RepsPerSet: 6,
            NumberOfSets: 1,
            WorkSeconds: 7,
            RestSeconds: 3,
            HandSwitchSeconds: 30,
            SetRestSeconds: 0,
            CountdownSeconds: 5,
            AudioCues: true,
            CountdownBeeps: true);
    }
}
