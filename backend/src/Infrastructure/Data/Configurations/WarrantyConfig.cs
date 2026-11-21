using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Data.Configurations;

public class WarrantyConfig : IEntityTypeConfiguration<Warranty>
{
    public void Configure(EntityTypeBuilder<Warranty> builder)
    {
        builder.ToTable("warranties");
        builder.HasKey(w => w.Id).HasName("pk_warranties");

        builder.Property(w => w.Id).HasColumnName("id");
        builder.Property(w => w.InstallationId).HasColumnName("installation_id");
        builder.Property(w => w.CustomerId).HasColumnName("customer_id");
        builder.Property(w => w.ItemName).HasColumnName("item_name").HasMaxLength(255).IsRequired();
        builder.Property(w => w.Category).HasColumnName("category").HasConversion<string>().HasMaxLength(50).IsRequired();
        builder.Property(w => w.SerialNumber).HasColumnName("serial_number").HasMaxLength(100).IsRequired();
        builder.Property(w => w.WarrantyYears).HasColumnName("warranty_years");
        builder.Property(w => w.StartDate).HasColumnName("start_date");
        builder.Property(w => w.ExpiryDate).HasColumnName("expiry_date");
        builder.Property(w => w.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(30).IsRequired();
        builder.Property(w => w.CreatedAt).HasColumnName("created_at");

        builder.HasIndex(w => w.SerialNumber).HasDatabaseName("ix_warranties_serial_number");
        builder.HasIndex(w => w.InstallationId).HasDatabaseName("ix_warranties_installation_id");
        builder.HasIndex(w => w.CustomerId).HasDatabaseName("ix_warranties_customer_id");

        builder.HasOne(w => w.Installation)
            .WithMany(i => i.Warranties)
            .HasForeignKey(w => w.InstallationId)
            .HasConstraintName("fk_warranties_installations_installation_id")
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(w => w.Customer)
            .WithMany(c => c.Warranties)
            .HasForeignKey(w => w.CustomerId)
            .HasConstraintName("fk_warranties_customers_customer_id")
            .OnDelete(DeleteBehavior.Cascade);
    }
}
