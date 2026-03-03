using FluentAssertions;
using NetArchTest.Rules;
using TindeqTrainer.Domain.Entities;

namespace TindeqTrainer.Architecture.Tests;

public class DependencyTests
{
    [Fact]
    public void Domain_Should_Not_Reference_Infrastructure()
    {
        var result = Types.InAssembly(typeof(Protocol).Assembly)
            .ShouldNot()
            .HaveDependencyOn("TindeqTrainer.Infrastructure")
            .GetResult();

        result.IsSuccessful.Should().BeTrue();
    }

    [Fact]
    public void Domain_Should_Not_Reference_Application()
    {
        var result = Types.InAssembly(typeof(Protocol).Assembly)
            .ShouldNot()
            .HaveDependencyOn("TindeqTrainer.Application")
            .GetResult();

        result.IsSuccessful.Should().BeTrue();
    }
}
