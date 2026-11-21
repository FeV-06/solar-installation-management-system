namespace Domain.Enums;

/// <summary>
/// Root cause classification for hardware breakdown (Scene 5).
/// Equipment failure under warranty is ₹0; accidental damage or out-of-warranty is billable.
/// </summary>
public enum DamageType
{
    EquipmentFailure,
    AccidentalDamage,
    WearAndTear
}
