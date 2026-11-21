using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Data.Configurations;

public class SurveyConfig : IEntityTypeConfiguration<Survey>
{
    public void Configure(EntityTypeBuilder<Survey> builder)
    {
        builder.ToTable("surveys");
        builder.HasKey(s => s.Id).HasName("pk_surveys");
        builder.Property(s => s.Id).HasColumnName("id");
        builder.Property(s => s.InstallationId).HasColumnName("installation_id");
        builder.Property(s => s.TechnicianId).HasColumnName("technician_id");
        builder.Property(s => s.ScheduledAt).HasColumnName("scheduled_at");
        builder.Property(s => s.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(30).IsRequired();
        builder.Property(s => s.CreatedAt).HasColumnName("created_at");
        builder.Property(s => s.CreatedById).HasColumnName("created_by_id");
        builder.Property(s => s.ShadowFreeRoofAreaSquareMetres).HasColumnName("shadow_free_roof_area_square_metres").HasPrecision(12, 2);
        builder.Property(s => s.MonthlyBillRupees).HasColumnName("monthly_bill_rupees").HasPrecision(12, 2);
        builder.Property(s => s.GridSuitable).HasColumnName("grid_suitable");
        builder.Property(s => s.RoofDirectionDegrees).HasColumnName("roof_direction_degrees").HasPrecision(5, 2);
        builder.Property(s => s.RoofTiltDegrees).HasColumnName("roof_tilt_degrees").HasPrecision(4, 2);
        builder.Property(s => s.CableDistanceMetres).HasColumnName("cable_distance_metres").HasPrecision(12, 2);
        builder.Property(s => s.Notes).HasColumnName("notes").HasMaxLength(2000);
        builder.Property(s => s.SubmittedById).HasColumnName("submitted_by_id");
        builder.Property(s => s.SubmittedAt).HasColumnName("submitted_at");
        builder.Property(s => s.ReviewedById).HasColumnName("reviewed_by_id");
        builder.Property(s => s.ReviewedAt).HasColumnName("reviewed_at");
        builder.Property(s => s.ReviewNotes).HasColumnName("review_notes").HasMaxLength(2000);
        builder.Property(s => s.Version).HasColumnName("version").IsConcurrencyToken();

        builder.HasIndex(s => s.InstallationId).IsUnique()
            .HasFilter("status IN ('Scheduled', 'Submitted', 'Approved')")
            .HasDatabaseName("ux_surveys_installation_open_or_approved");
        builder.HasIndex(s => new { s.TechnicianId, s.Status, s.ScheduledAt }).HasDatabaseName("ix_surveys_technician_status_scheduled_at");
        builder.HasIndex(s => s.CreatedById).HasDatabaseName("ix_surveys_created_by_id");
        builder.HasIndex(s => s.SubmittedById).HasDatabaseName("ix_surveys_submitted_by_id");
        builder.HasIndex(s => s.ReviewedById).HasDatabaseName("ix_surveys_reviewed_by_id");
        builder.HasOne(s => s.Installation).WithMany().HasForeignKey(s => s.InstallationId).HasConstraintName("fk_surveys_installations_installation_id").OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(s => s.Technician).WithMany().HasForeignKey(s => s.TechnicianId).HasConstraintName("fk_surveys_users_technician_id").OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<User>().WithMany().HasForeignKey(s => s.CreatedById).HasConstraintName("fk_surveys_users_created_by_id").OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<User>().WithMany().HasForeignKey(s => s.SubmittedById).HasConstraintName("fk_surveys_users_submitted_by_id").OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<User>().WithMany().HasForeignKey(s => s.ReviewedById).HasConstraintName("fk_surveys_users_reviewed_by_id").OnDelete(DeleteBehavior.Restrict);
    }
}
