using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Data.Configurations;

public class ServiceTicketConfig : IEntityTypeConfiguration<ServiceTicket>
{
    public void Configure(EntityTypeBuilder<ServiceTicket> builder)
    {
        builder.ToTable("service_tickets");
        builder.HasKey(t => t.Id).HasName("pk_service_tickets");

        builder.Property(t => t.Id).HasColumnName("id");
        builder.Property(t => t.InstallationId).HasColumnName("installation_id");
        builder.Property(t => t.CustomerId).HasColumnName("customer_id");
        builder.Property(t => t.AssignedTechnicianId).HasColumnName("assigned_technician_id");
        builder.Property(t => t.ScheduledVisitAt).HasColumnName("scheduled_visit_at");
        builder.Property(t => t.SerialNumber).HasColumnName("serial_number").HasMaxLength(100).IsRequired();
        builder.Property(t => t.HardwareItem).HasColumnName("hardware_item").HasMaxLength(255).IsRequired();
        builder.Property(t => t.Category).HasColumnName("category").HasConversion<string>().HasMaxLength(50).IsRequired();
        builder.Property(t => t.FaultCode).HasColumnName("fault_code").HasMaxLength(50).IsRequired();
        builder.Property(t => t.Description).HasColumnName("description").HasMaxLength(2000).IsRequired();
        builder.Property(t => t.PhotoUrl).HasColumnName("photo_url");

        builder.Property(t => t.DamageType).HasColumnName("damage_type").HasConversion<string>().HasMaxLength(50).IsRequired();
        builder.Property(t => t.IsWarrantyCovered).HasColumnName("is_warranty_covered");

        builder.Property(t => t.PartsCostRupees).HasColumnName("parts_cost_rupees").HasPrecision(12, 2);
        builder.Property(t => t.LaborCostRupees).HasColumnName("labor_cost_rupees").HasPrecision(12, 2);
        builder.Property(t => t.TotalBilledRupees).HasColumnName("total_billed_rupees").HasPrecision(12, 2);

        builder.Property(t => t.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(50).IsRequired();
        builder.Property(t => t.AdminNotes).HasColumnName("admin_notes");
        builder.Property(t => t.ReviewedAt).HasColumnName("reviewed_at");
        builder.Property(t => t.CustomerApprovedAt).HasColumnName("customer_approved_at");

        builder.Property(t => t.ReplacementPackingOrderId).HasColumnName("replacement_packing_order_id");
        builder.Property(t => t.ReplacementSerialNumber).HasColumnName("replacement_serial_number").HasMaxLength(100);
        builder.Property(t => t.TestedGenerationKw).HasColumnName("tested_generation_kw").HasPrecision(6, 2);
        builder.Property(t => t.ReplacementPhotoUrl).HasColumnName("replacement_photo_url");
        builder.Property(t => t.TechnicianResolutionNotes).HasColumnName("technician_resolution_notes");
        builder.Property(t => t.ResolvedAt).HasColumnName("resolved_at");

        builder.Property(t => t.CustomerSignatureData).HasColumnName("customer_signature_data");
        builder.Property(t => t.SignedByName).HasColumnName("signed_by_name").HasMaxLength(150);
        builder.Property(t => t.TechnicianSignedAt).HasColumnName("technician_signed_at");
        builder.Property(t => t.CustomerConfirmedAt).HasColumnName("customer_confirmed_at");
        builder.Property(t => t.CreatedAt).HasColumnName("created_at");

        builder.HasIndex(t => t.InstallationId).HasDatabaseName("ix_service_tickets_installation_id");
        builder.HasIndex(t => t.CustomerId).HasDatabaseName("ix_service_tickets_customer_id");
        builder.HasIndex(t => t.SerialNumber).HasDatabaseName("ix_service_tickets_serial_number");
        builder.HasIndex(t => t.Status).HasDatabaseName("ix_service_tickets_status");
        builder.HasIndex(t => t.AssignedTechnicianId).HasDatabaseName("ix_service_tickets_assigned_technician_id");
        builder.HasIndex(t => t.ReplacementPackingOrderId).HasDatabaseName("ix_service_tickets_replacement_packing_order_id");

        builder.HasOne(t => t.Installation)
            .WithMany(i => i.ServiceTickets)
            .HasForeignKey(t => t.InstallationId)
            .HasConstraintName("fk_service_tickets_installations_installation_id")
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(t => t.Customer)
            .WithMany(c => c.ServiceTickets)
            .HasForeignKey(t => t.CustomerId)
            .HasConstraintName("fk_service_tickets_customers_customer_id")
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(t => t.AssignedTechnician)
            .WithMany()
            .HasForeignKey(t => t.AssignedTechnicianId)
            .HasConstraintName("fk_service_tickets_users_assigned_technician_id")
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(t => t.ReplacementPackingOrder)
            .WithMany()
            .HasForeignKey(t => t.ReplacementPackingOrderId)
            .HasConstraintName("fk_service_tickets_packing_orders_replacement_packing_order_id")
            .OnDelete(DeleteBehavior.SetNull);
    }
}
