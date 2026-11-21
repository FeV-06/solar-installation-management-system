using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Data.Configurations;

public class InstallationProofConfig : IEntityTypeConfiguration<InstallationProof>
{
    public void Configure(EntityTypeBuilder<InstallationProof> builder)
    {
        builder.ToTable("installation_proofs");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");

        builder.Property(x => x.InstallationId).HasColumnName("installation_id");
        builder.Property(x => x.TechnicianId).HasColumnName("technician_id");

        builder.Property(x => x.WorkStartedAt).HasColumnName("work_started_at");
        builder.Property(x => x.WorkCompletedAt).HasColumnName("work_completed_at");

        builder.Property(x => x.SystemCapacityKw).HasColumnName("system_capacity_kw").HasPrecision(6, 2);
        builder.Property(x => x.TestedGenerationKw).HasColumnName("tested_generation_kw").HasPrecision(6, 2);
        builder.Property(x => x.GridConnected).HasColumnName("grid_connected");

        builder.Property(x => x.PanelArrayPhotoUrl).HasColumnName("panel_array_photo_url");
        builder.Property(x => x.InverterPhotoUrl).HasColumnName("inverter_photo_url");
        builder.Property(x => x.MeterPhotoUrl).HasColumnName("meter_photo_url");

        builder.Property(x => x.CustomerSignatureData).HasColumnName("customer_signature_data");
        builder.Property(x => x.SignedByName).HasColumnName("signed_by_name").HasMaxLength(150);
        builder.Property(x => x.SignedAt).HasColumnName("signed_at");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");

        builder.HasOne(x => x.Installation)
            .WithOne(i => i.Proof)
            .HasForeignKey<InstallationProof>(x => x.InstallationId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Technician)
            .WithMany()
            .HasForeignKey(x => x.TechnicianId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => x.InstallationId).IsUnique().HasDatabaseName("ix_installation_proofs_installation_id");
    }
}
