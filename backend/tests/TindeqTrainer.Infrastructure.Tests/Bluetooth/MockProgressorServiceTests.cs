using FluentAssertions;
using TindeqTrainer.Infrastructure.Bluetooth;

namespace TindeqTrainer.Infrastructure.Tests.Bluetooth;

public class MockProgressorServiceTests
{
    [Fact]
    public async Task ConnectAndDisconnect_WhenCalled_RaisesConnectionStatusEvents()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        await using var service = new MockProgressorService();
        var statusTransitions = new List<bool>();
        service.ConnectionStatusChanged += isConnected => statusTransitions.Add(isConnected);

        await service.ConnectAsync(cancellationToken);
        await service.DisconnectAsync();

        statusTransitions.Should().Equal(true, false);
    }

    [Fact]
    public async Task StartMeasurement_WhenConnected_EmitsSampleBatches()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        await using var service = new MockProgressorService();
        var firstBatch = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
        service.SamplesReceived += samples =>
        {
            if (samples.Length > 0)
            {
                firstBatch.TrySetResult(true);
            }
        };

        await service.ConnectAsync(cancellationToken);
        await service.StartMeasurementAsync(cancellationToken);

        var completedTask = await Task.WhenAny(firstBatch.Task, Task.Delay(TimeSpan.FromSeconds(2), cancellationToken));

        completedTask.Should().Be(firstBatch.Task);
        (await firstBatch.Task).Should().BeTrue();
    }

    [Fact]
    public async Task StopMeasurement_WhenCalled_StopsFurtherSampleEmission()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        await using var service = new MockProgressorService();
        var sampleBatchCount = 0;
        service.SamplesReceived += _ => Interlocked.Increment(ref sampleBatchCount);

        await service.ConnectAsync(cancellationToken);
        await service.StartMeasurementAsync(cancellationToken);
        await Task.Delay(TimeSpan.FromMilliseconds(400), cancellationToken);

        await service.StopMeasurementAsync(cancellationToken);
        var countAfterStop = sampleBatchCount;

        await Task.Delay(TimeSpan.FromMilliseconds(300), cancellationToken);

        sampleBatchCount.Should().Be(countAfterStop);
    }

    [Fact]
    public async Task CancelConnect_DuringConnect_ThrowsAndDoesNotConnect()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        await using var service = new MockProgressorService();

        var connectTask = service.ConnectAsync(cancellationToken);
        await Task.Yield();

        service.CancelConnect();

        Func<Task> act = async () => await connectTask;

        await act.Should().ThrowAsync<OperationCanceledException>();
        service.IsConnected.Should().BeFalse();
    }

    [Fact]
    public async Task CancelConnect_WhenNotConnecting_DoesNotThrow()
    {
        await using var service = new MockProgressorService();

        var act = () => service.CancelConnect();

        act.Should().NotThrow();
    }

    [Fact]
    public async Task CancelConnect_AfterConnected_RemainsConnected()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        await using var service = new MockProgressorService();

        await service.ConnectAsync(cancellationToken);

        service.CancelConnect();

        service.IsConnected.Should().BeTrue();
    }
}
