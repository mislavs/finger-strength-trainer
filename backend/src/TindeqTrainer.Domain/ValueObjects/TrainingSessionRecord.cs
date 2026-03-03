using TindeqTrainer.Domain.Entities;

namespace TindeqTrainer.Domain.ValueObjects;

public sealed record TrainingSessionRecord(
    Guid Id,
    DateTime Date,
    bool IsComplete,
    Protocol Protocol,
    HandData Hand1,
    HandData? Hand2);
