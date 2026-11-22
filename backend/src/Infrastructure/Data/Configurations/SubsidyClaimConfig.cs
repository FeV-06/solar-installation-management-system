using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Data.Configurations;

public class SubsidyClaimConfig : IEntityTypeConfiguration<SubsidyClaim>
{
    public void Configure(EntityTypeBuilder<SubsidyClaim> builder)
    {
        builder.ToTable("subsidy_claims");
        builder.HasKey(s => s.Id).HasName("pk_subsidy_claims");

        builder.Property(s => s.Id).HasColumnName("id");
        builder.Property(s => s.InstallationId).HasColumnName("installation_id");
        builder.Property(s => s.SubsidyAmountRupees).HasColumnName("subsidy_amount_rupees").HasPrecision(12, 2);
        builder.Property(s => s.ApplicationReference).HasColumnName("application_reference").HasMaxLength(100).IsRequired();
        builder.Property(s => s.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(50).IsRequired();
        builder.Property(s => s.SubmittedAt).HasColumnName("submitted_at");
        builder.Property(s => s.ClearedAt).HasColumnName("cleared_at");
        builder.Property(s => s.DisbursedAt).HasColumnName("disbursed_at");
        builder.Property(s => s.DisbursementReference).HasColumnName("disbursement_reference").HasMaxLength(100);
        builder.Property(s => s.Notes).HasColumnName("notes");

        builder.HasIndex(s => s.InstallationId).IsUnique().HasDatabaseName("ix_subsidy_claims_installation_id");
        builder.HasIndex(s => s.Status).HasDatabaseName("ix_subsidy_claims_status");

        builder.HasOne(s => s.Installation)
            .WithOne(i => i.SubsidyClaim)
            .HasForeignKey<SubsidyClaim>(s => s.InstallationId)
            .HasConstraintName("fk_subsidy_claims_installations_installation_id")
            .OnDelete(DeleteBehavior.Cascade);
    }
}
