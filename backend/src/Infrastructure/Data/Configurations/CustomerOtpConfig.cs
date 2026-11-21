using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Data.Configurations;

public class CustomerOtpConfig : IEntityTypeConfiguration<CustomerOtp>
{
    public void Configure(EntityTypeBuilder<CustomerOtp> builder)
    {
        builder.ToTable("customer_otps");

        builder.HasKey(o => o.Id)
            .HasName("pk_customer_otps");

        builder.Property(o => o.Id)
            .HasColumnName("id");

        builder.Property(o => o.NormalizedEmail)
            .HasColumnName("normalized_email")
            .HasMaxLength(255)
            .IsRequired();

        builder.Property(o => o.Email)
            .HasColumnName("email")
            .HasMaxLength(255)
            .IsRequired();

        builder.Property(o => o.OtpHash)
            .HasColumnName("otp_hash")
            .HasMaxLength(255)
            .IsRequired();

        builder.Property(o => o.Salt)
            .HasColumnName("salt")
            .HasMaxLength(128)
            .IsRequired();

        builder.Property(o => o.FailedAttempts)
            .HasColumnName("failed_attempts")
            .IsRequired();

        builder.Property(o => o.CreatedAtUtc)
            .HasColumnName("created_at_utc")
            .IsRequired();

        builder.Property(o => o.ExpiresAtUtc)
            .HasColumnName("expires_at_utc")
            .IsRequired();

        builder.Property(o => o.ConsumedAtUtc)
            .HasColumnName("consumed_at_utc");

        builder.Property(o => o.CreatedByIp)
            .HasColumnName("created_by_ip")
            .HasMaxLength(45);

        builder.HasIndex(o => o.NormalizedEmail)
            .HasDatabaseName("ix_customer_otps_normalized_email");

        builder.HasIndex(o => o.ExpiresAtUtc)
            .HasDatabaseName("ix_customer_otps_expires_at_utc");
    }
}
