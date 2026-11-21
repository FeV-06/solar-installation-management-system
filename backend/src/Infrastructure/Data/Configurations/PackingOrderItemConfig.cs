using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Data.Configurations;

public class PackingOrderItemConfig : IEntityTypeConfiguration<PackingOrderItem>
{
    public void Configure(EntityTypeBuilder<PackingOrderItem> builder)
    {
        builder.ToTable("packing_order_items");
        builder.HasKey(i => i.Id).HasName("pk_packing_order_items");

        builder.Property(i => i.Id).HasColumnName("id");
        builder.Property(i => i.PackingOrderId).HasColumnName("packing_order_id");
        builder.Property(i => i.ItemName).HasColumnName("item_name").HasMaxLength(255).IsRequired();
        builder.Property(i => i.Category).HasColumnName("category").HasConversion<string>().HasMaxLength(50).IsRequired();
        builder.Property(i => i.Quantity).HasColumnName("quantity").HasPrecision(10, 2);
        builder.Property(i => i.Unit).HasColumnName("unit").HasMaxLength(20).IsRequired();
        builder.Property(i => i.IsPacked).HasColumnName("is_packed");
        builder.Property(i => i.RequiresSerialNumber).HasColumnName("requires_serial_number");
        builder.Property(i => i.SerialNumber).HasColumnName("serial_number").HasMaxLength(100);

        builder.HasIndex(i => i.PackingOrderId).HasDatabaseName("ix_packing_order_items_packing_order_id");
    }
}
