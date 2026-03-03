namespace TindeqTrainer.Domain.Constants;

public static class ProgressorCommands
{
    public const byte Tare = 0x64;
    public const byte StartMeasurement = 0x65;
    public const byte StopMeasurement = 0x66;
    public const byte GetAppVersion = 0x6B;
    public const byte Shutdown = 0x6E;
    public const byte SampleBattery = 0x6F;
}
