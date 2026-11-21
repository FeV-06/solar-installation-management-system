using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Data.Configurations;

public class PackingOrderConfig : IEntityTypeConfiguration<PackingOrder>
{
    public void Configure(EntityTypeBuilder<PackingOrder> builder)
    {
        builder.ToTable("packing_orders");
        builder.HasKey(p => p.Id).HasName("pk_packing_orders");

        builder.Property(p => p.Id).HasColumnName("id");
        builder.Property(p => p.InstallationId).HasColumnName("installation_id");
        builder.Property(p => p.QuoteId).HasColumnName("quote_id");
        builder.Property(p => p.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(30).IsRequired();
        builder.Property(p => p.CreatedAt).HasColumnName("created_at");
        builder.Property(p => p.PackedAt).HasColumnName("packed_at");
        builder.Property(p => p.DispatchedAt).HasColumnName("dispatched_at");
        builder.Property(p => p.DeliveredAt).HasColumnName("delivered_at");

        builder.HasIndex(p => p.InstallationId).HasDatabaseName("ix_packing_orders_installation_id");
        builder.HasIndex(p => p.QuoteId).IsUnique().HasDatabaseName("ux_packing_orders_quote_id");

        builder.HasOne(p => p.Installation)
            .WithMany(i => i.PackingOrders)
            .HasForeignKey(p => p.InstallationId)
            .HasConstraintName("fk_packing_orders_installations_installation_id")
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(p => p.Quote)
            .WithOne(q => q.PackingOrder)
            .HasForeignKey<PackingOrder>(p => p.QuoteId)
            .HasConstraintName("fk_packing_orders_quotes_quote_id")
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(p => p.Items)
            .WithOne(i => i.PackingOrder)
            .HasForeignKey(i => i.PackingOrderId)
            .HasConstraintName("fk_packing_order_items_packing_orders_packing_order_id")
            .OnDelete(DeleteBehavior.Cascade);
    }
}
