using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Data.Configurations;

public class QuoteItemConfig : IEntityTypeConfiguration<QuoteItem>
{
    public void Configure(EntityTypeBuilder<QuoteItem> builder)
    {
        builder.ToTable("quote_items");
        builder.HasKey(i => i.Id).HasName("pk_quote_items");

        builder.Property(i => i.Id).HasColumnName("id");
        builder.Property(i => i.QuoteId).HasColumnName("quote_id");
        builder.Property(i => i.Category).HasColumnName("category").HasConversion<string>().HasMaxLength(50).IsRequired();
        builder.Property(i => i.ItemName).HasColumnName("item_name").HasMaxLength(255).IsRequired();
        builder.Property(i => i.Specification).HasColumnName("specification").HasMaxLength(1000).IsRequired();
        builder.Property(i => i.Quantity).HasColumnName("quantity").HasPrecision(10, 2);
        builder.Property(i => i.Unit).HasColumnName("unit").HasMaxLength(20).IsRequired();
        builder.Property(i => i.UnitCostRupees).HasColumnName("unit_cost_rupees").HasPrecision(12, 2);
        builder.Property(i => i.TotalCostRupees).HasColumnName("total_cost_rupees").HasPrecision(12, 2);

        builder.HasIndex(i => i.QuoteId).HasDatabaseName("ix_quote_items_quote_id");
    }
}
